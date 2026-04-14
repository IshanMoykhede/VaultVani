import React, { useState } from "react";
import * as pdfjs from "pdfjs-dist";
import Tesseract from "tesseract.js";
import * as webllm from "@mlc-ai/web-llm";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

// ─────────────────────────────────────────────────────────────────────────────
// Singleton WebLLM engine
// ─────────────────────────────────────────────────────────────────────────────
let _engine = null;

async function getOrCreateEngine(onStatus) {
  if (_engine) return _engine;
  onStatus("⬇️ Downloading on-device AI model (first time only)...");
  _engine = await webllm.CreateMLCEngine("Qwen2.5-1.5B-Instruct-q4f16_1-MLC", {
    initProgressCallback: (p) => {
      if (p.text) onStatus(`⬇️ ${p.text}`);
    },
  });
  return _engine;
}

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM PROMPT — Universal document extractor (no fixed schema)
// ─────────────────────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a universal document data extractor. You read OCR text from any document and extract ALL information into structured JSON.

STRICT OUTPUT RULES:
- Output ONLY raw JSON. First char must be {. Last char must be }.
- No markdown. No explanation. No code fences. No preamble.
- Every value must be a string, number, null, array, or nested object.
- null for missing/unreadable values. Numbers as numbers not strings.
- Fix obvious OCR errors: 0 vs O, 1 vs I, l vs 1, broken spacing.
- Extract EVERY piece of information visible. Do not skip any field.

OUTPUT STRUCTURE — always use this exact shape:
{
  "document_type": "detected type e.g. Marksheet, PAN Card, Aadhaar Card, Cast Certificate, Domain Certificate, Driving License, etc.",
  "confidence": 0.0 to 1.0 how confident you are in the extraction,
  "issuer": {
    "organization": "name of issuing organization or null",
    "department": "department or board name or null",
    "address": "issuer address or null",
    "website": "website if visible or null",
    "code": "any issuer code or null"
  },
  "subject": {
    "name": "primary person or entity name or null",
    "father_name": "father name if present or null",
    "mother_name": "mother name if present or null",
    "dob": "date of birth if present or null",
    "gender": "gender if present or null",
    "address": "subject address if present or null",
    "photo_present": true or false
  },
  "document_ids": {
    "primary_id": "the main ID number of this document or null",
    "primary_id_label": "what the primary ID is called e.g. PAN, Aadhaar, Roll No, PRN, Seat No or null",
    "secondary_ids": {}
  },
  "dates": {
    "issue_date": "null or date string",
    "valid_from": "null or date string",
    "valid_until": "null or date string",
    "exam_date": "null or date string",
    "other_dates": {}
  },
  "document_specific": {},
  "raw_fields": {}
}

RULES FOR document_specific and raw_fields:
- document_specific: put ALL fields that are specific to this document type here as key-value pairs. For marksheets put all courses, grades, SGPA here. For certificates put certificate number, purpose, validity here. For ID cards put ID numbers, category, blood group here. For domain certs put domain name, registrar, expiry here. Do not leave this empty.
- raw_fields: put any remaining fields that do not fit anywhere else.

EXAMPLES OF document_specific content:
- Marksheet: {"semester": 3, "program": "B.Tech", "courses": [{"code":"...", "name":"...", "grade":"...", "credits":3, "grade_point":24}], "sgpa": 7.68, "total_credits": 44, "medium": "English", "pattern": "2023 Credit Pattern"}
- PAN Card: {"pan_number": "ABCDE1234F", "pan_type": "Individual"}
- Aadhaar: {"aadhaar_number": "1234 5678 9012", "vid": null, "category": null}
- Cast Certificate: {"caste": "...", "category": "OBC/SC/ST/...", "certificate_number": "...", "valid_in_state": "..."}
- Domain Certificate: {"domain_name": "example.com", "registrar": "...", "nameservers": [], "ssl_valid_until": null}
- Driving License: {"license_number": "...", "vehicle_classes": [], "badge_number": null}`;

// ─────────────────────────────────────────────────────────────────────────────
// Smart PDF extraction — Y-bucketed line sorting for correct reading order
// ─────────────────────────────────────────────────────────────────────────────
async function extractTextFromPDF(pdf) {
  let fullText = "";
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    const lineMap = new Map();
    for (const item of content.items) {
      if (!item.str?.trim()) continue;
      const x = Math.round(item.transform[4]);
      const y = Math.round(item.transform[5] / 6) * 6;
      if (!lineMap.has(y)) lineMap.set(y, []);
      lineMap.get(y).push({ x, str: item.str });
    }

    const sortedYs = [...lineMap.keys()].sort((a, b) => b - a);
    for (const y of sortedYs) {
      const line = lineMap
        .get(y)
        .sort((a, b) => a.x - b.x)
        .map((i) => i.str)
        .join("  ");
      fullText += line + "\n";
    }
    fullText += "\n--- Page Break ---\n";
  }
  return fullText;
}

// ─────────────────────────────────────────────────────────────────────────────
// Safe JSON parser — tries multiple recovery strategies
// ─────────────────────────────────────────────────────────────────────────────
function safeParseJSON(raw) {
  if (!raw) return null;

  // Strip markdown fences
  let cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  // Extract outermost { ... }
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end !== -1) {
    cleaned = cleaned.slice(start, end + 1);
  }

  // Attempt 1: direct parse
  try {
    return JSON.parse(cleaned);
  } catch (_) {}

  // Attempt 2: fix trailing commas before } or ]
  try {
    const fixed = cleaned.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");
    return JSON.parse(fixed);
  } catch (_) {}

  // Attempt 3: fix unquoted keys
  try {
    const fixed = cleaned.replace(
      /([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g,
      '$1"$2":',
    );
    return JSON.parse(fixed);
  } catch (_) {}

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Two-stage LLM extraction for maximum field coverage
// Stage 1: raw key-value dump (small model excels here)
// Stage 2: structure it into the universal schema
// ─────────────────────────────────────────────────────────────────────────────
async function runTwoStageLLM(rawOcrText, engine, setLlmStatus) {
  // ── STAGE 1: Raw dump — ask model to list every visible field ──────────────
  setLlmStatus("🔍 Stage 1/2 — scanning all visible fields...");

  const stage1Reply = await engine.chat.completions.create({
    messages: [
      {
        role: "system",
        content: `You read document text and list every visible label and value as JSON key-value pairs.
Output ONLY raw JSON object. Start with {. End with }.
No markdown. No explanation.
List EVERY field you see. Use the exact label from the document as the key.
Values must be strings or arrays. null for unreadable values.
For tables like course lists, output as an array of objects.`,
      },
      {
        role: "user",
        content: `List every field and value from this document:\n\n${rawOcrText}`,
      },
    ],
    temperature: 0.05,
    max_tokens: 1500,
    stream: false,
  });

  const rawDump = safeParseJSON(stage1Reply.choices[0]?.message?.content || "");

  // ── STAGE 2: Structure the dump into the universal schema ─────────────────
  setLlmStatus("🧠 Stage 2/2 — structuring into universal JSON schema...");

  const stage2Input = rawDump
    ? `Document type detection and structuring task.

Raw extracted fields from stage 1:
${JSON.stringify(rawDump, null, 2)}

Original OCR text (for reference):
${rawOcrText.slice(0, 1500)}`
    : `Structure this OCR text into the required JSON schema:\n\n${rawOcrText}`;

  const stage2Reply = await engine.chat.completions.create({
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: stage2Input },
    ],
    temperature: 0.05,
    max_tokens: 2000,
    stream: false,
  });

  return safeParseJSON(stage2Reply.choices[0]?.message?.content || "");
}

// ─────────────────────────────────────────────────────────────────────────────
// JavaScript post-processor — merges stage1 raw dump into final result
// Ensures no fields from OCR are silently dropped
// ─────────────────────────────────────────────────────────────────────────────
function mergeRawDump(structured, rawDump) {
  if (!structured || !rawDump) return structured;

  // Collect all values already present in structured output as strings
  const structuredStr = JSON.stringify(structured).toLowerCase();

  const missed = {};
  for (const [key, value] of Object.entries(rawDump)) {
    if (value === null || value === undefined) continue;
    const valueStr = String(value).toLowerCase().trim();
    if (valueStr.length < 2) continue;
    // If this value is not present anywhere in the structured output, keep it
    if (!structuredStr.includes(valueStr.slice(0, 8))) {
      missed[key] = value;
    }
  }

  if (Object.keys(missed).length > 0) {
    structured.raw_fields = { ...structured.raw_fields, ...missed };
  }

  return structured;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main LLM runner
// ─────────────────────────────────────────────────────────────────────────────
async function runLLMExtractor(
  rawOcrText,
  startTime,
  setStatus,
  setLlmStatus,
  setResult,
  setRawOcr,
) {
  setStatus("✅ OCR complete · Loading on-device AI...");
  setRawOcr(rawOcrText);

  let finalResult = null;
  let rawDump = null;

  try {
    const engine = await getOrCreateEngine((text) => setLlmStatus(text));

    // Run two-stage extraction
    const stage1Reply = await engine.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You read document text and list every visible label and value as JSON key-value pairs.
Output ONLY raw JSON object. Start with {. End with }.
No markdown. No explanation.
List EVERY field you see. Use the exact label from the document as the key.
Values must be strings or arrays. null for unreadable values.
For tables like course lists, output as an array of objects.`,
        },
        {
          role: "user",
          content: `List every field and value from this document:\n\n${rawOcrText}`,
        },
      ],
      temperature: 0.05,
      max_tokens: 1500,
      stream: false,
    });

    rawDump = safeParseJSON(stage1Reply.choices[0]?.message?.content || "");
    setLlmStatus("🧠 Stage 2/2 — structuring into universal JSON schema...");

    const stage2Input = rawDump
      ? `Document type detection and structuring task.

Raw extracted fields from stage 1:
${JSON.stringify(rawDump, null, 2)}

Original OCR text (for reference):
${rawOcrText.slice(0, 1500)}`
      : `Structure this OCR text into the required JSON schema:\n\n${rawOcrText}`;

    const stage2Reply = await engine.chat.completions.create({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: stage2Input },
      ],
      temperature: 0.05,
      max_tokens: 2000,
      stream: false,
    });

    const structured = safeParseJSON(
      stage2Reply.choices[0]?.message?.content || "",
    );

    // Merge any missed fields from stage 1 raw dump
    finalResult = mergeRawDump(structured, rawDump);

    // Attach stage1 raw dump for transparency
    if (finalResult && rawDump) {
      finalResult._stage1_raw = rawDump;
    }

    setStatus(
      `✅ Extraction complete in ${((performance.now() - startTime) / 1000).toFixed(2)}s`,
    );
  } catch (err) {
    console.error("LLM Extraction failed:", err);

    // Fallback: return stage1 raw dump if available
    if (rawDump) {
      finalResult = {
        document_type: "Unknown (AI structuring failed)",
        confidence: 0.3,
        _fallback: true,
        raw_fields: rawDump,
      };
      setStatus("⚠️ Stage 2 failed — showing raw field extraction.");
    } else {
      setStatus("⚠️ AI extraction failed — showing raw OCR as fallback.");
    }
  }

  setResult(finalResult);
  return finalResult;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tesseract fallback for scanned PDFs
// ─────────────────────────────────────────────────────────────────────────────
async function runTesseractWithLLM(
  pdfPage,
  setStatus,
  setProgress,
  setLlmStatus,
  setResult,
  setRawOcr,
) {
  setStatus("No native text found — Tesseract OCR analyzing image...");
  const viewport = pdfPage.getViewport({ scale: 2.5 });
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.height = viewport.height;
  canvas.width = viewport.width;
  await pdfPage.render({ canvasContext: ctx, viewport }).promise;
  const dataUrl = canvas.toDataURL("image/png");

  const startTime = performance.now();
  const {
    data: { text },
  } = await Tesseract.recognize(dataUrl, "eng", {
    logger: (m) => {
      if (m.status === "recognizing text")
        setProgress(Math.round(m.progress * 100));
    },
  });

  return await runLLMExtractor(
    text,
    startTime,
    setStatus,
    setLlmStatus,
    setResult,
    setRawOcr,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Interactive JSON Viewer
// ─────────────────────────────────────────────────────────────────────────────
const JsonViewer = ({ data }) => {
  const [collapsed, setCollapsed] = useState({});
  const toggle = (key) =>
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));

  const renderValue = (value, depth = 0, parentKey = "") => {
    if (value === null) return <span style={jv.null}>null</span>;
    if (typeof value === "boolean")
      return <span style={jv.bool}>{String(value)}</span>;
    if (typeof value === "number")
      return <span style={jv.number}>{value}</span>;
    if (typeof value === "string")
      return <span style={jv.string}>"{value}"</span>;

    if (Array.isArray(value)) {
      const key = `${parentKey}_arr_${depth}`;
      const isCollapsed = collapsed[key];
      return (
        <span>
          <button style={jv.toggleBtn} onClick={() => toggle(key)}>
            {isCollapsed ? "▶" : "▼"}
          </button>
          <span style={jv.bracket}>[</span>
          {isCollapsed ? (
            <span style={jv.ellipsis} onClick={() => toggle(key)}>
              {" "}
              …{value.length} items{" "}
            </span>
          ) : (
            <div style={{ marginLeft: `${(depth + 1) * 16}px` }}>
              {value.map((item, idx) => (
                <div key={idx} style={jv.row}>
                  <span style={jv.index}>{idx}: </span>
                  {renderValue(item, depth + 1, `${key}_${idx}`)}
                  {idx < value.length - 1 && <span style={jv.comma}>,</span>}
                </div>
              ))}
            </div>
          )}
          <span style={jv.bracket}>]</span>
        </span>
      );
    }

    if (typeof value === "object") {
      const key = `${parentKey}_obj_${depth}`;
      const isCollapsed = collapsed[key];
      const entries = Object.entries(value);
      return (
        <span>
          <button style={jv.toggleBtn} onClick={() => toggle(key)}>
            {isCollapsed ? "▶" : "▼"}
          </button>
          <span style={jv.bracket}>{"{"}</span>
          {isCollapsed ? (
            <span style={jv.ellipsis} onClick={() => toggle(key)}>
              {" "}
              …{entries.length} keys{" "}
            </span>
          ) : (
            <div style={{ marginLeft: `${(depth + 1) * 16}px` }}>
              {entries.map(([k, v], idx) => (
                <div key={k} style={jv.row}>
                  <span style={jv.key}>"{k}"</span>
                  <span style={jv.colon}>: </span>
                  {renderValue(v, depth + 1, `${key}_${k}`)}
                  {idx < entries.length - 1 && <span style={jv.comma}>,</span>}
                </div>
              ))}
            </div>
          )}
          <span style={jv.bracket}>{"}"}</span>
        </span>
      );
    }

    return <span>{String(value)}</span>;
  };

  return <div style={jv.root}>{renderValue(data, 0, "root")}</div>;
};

const jv = {
  root: {
    fontFamily: "'Courier New', monospace",
    fontSize: "12px",
    lineHeight: "1.8",
    color: "#ccc",
    userSelect: "text",
  },
  row: { display: "block" },
  key: { color: "#03dac6" },
  colon: { color: "#666" },
  string: { color: "#a8ff78" },
  number: { color: "#ffd700" },
  bool: { color: "#ff8c69" },
  null: { color: "#888", fontStyle: "italic" },
  bracket: { color: "#fff", fontWeight: "bold" },
  comma: { color: "#666" },
  index: { color: "#888" },
  ellipsis: { color: "#555", cursor: "pointer" },
  toggleBtn: {
    background: "none",
    border: "none",
    color: "#555",
    cursor: "pointer",
    padding: "0 4px 0 0",
    fontSize: "10px",
    fontFamily: "monospace",
    outline: "none",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Document type badge colors
// ─────────────────────────────────────────────────────────────────────────────
function getDocTypeBadgeColor(docType) {
  if (!docType) return "#333";
  const t = docType.toLowerCase();
  if (t.includes("marksheet") || t.includes("grade")) return "#1a3a2a";
  if (t.includes("pan")) return "#2a1a3a";
  if (t.includes("aadhaar")) return "#1a2a3a";
  if (t.includes("cast") || t.includes("caste")) return "#3a2a1a";
  if (t.includes("domain") || t.includes("certificate")) return "#1a2a2a";
  if (t.includes("license") || t.includes("licence")) return "#3a1a1a";
  return "#1a1a3a";
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
const VaultVaniOCR = () => {
  const [filePreview, setFilePreview] = useState(null);
  const [status, setStatus] = useState("Waiting for document...");
  const [llmStatus, setLlmStatus] = useState("");
  const [result, setResult] = useState(null);
  const [rawOcr, setRawOcr] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activeTab, setActiveTab] = useState("json");

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    setResult(null);
    setRawOcr("");
    setProgress(0);
    setStatus("Processing document...");
    setLlmStatus("");
    setActiveTab("json");

    try {
      let imageDataUrl;

      if (file.type === "application/pdf") {
        setStatus("Extracting text from PDF...");
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

        const startTime = performance.now();
        const textOutput = await extractTextFromPDF(pdf);

        const page = await pdf.getPage(1);
        const vp = page.getViewport({ scale: 1.5 });
        const cv = document.createElement("canvas");
        const cx = cv.getContext("2d");
        cv.height = vp.height;
        cv.width = vp.width;
        await page.render({ canvasContext: cx, viewport: vp }).promise;
        imageDataUrl = cv.toDataURL("image/png");

        const cleanLen = textOutput
          .replace(/--- Page Break ---/g, "")
          .trim().length;

        if (cleanLen < 10) {
          await runTesseractWithLLM(
            page,
            setStatus,
            setProgress,
            setLlmStatus,
            setResult,
            setRawOcr,
          );
        } else {
          setStatus(
            `✅ PDF extracted in ${((performance.now() - startTime) / 1000).toFixed(2)}s — running AI...`,
          );
          await runLLMExtractor(
            textOutput,
            startTime,
            setStatus,
            setLlmStatus,
            setResult,
            setRawOcr,
          );
        }
      } else {
        setStatus("Tesseract OCR analyzing image...");
        imageDataUrl = URL.createObjectURL(file);
        const startTime = performance.now();
        const {
          data: { text },
        } = await Tesseract.recognize(imageDataUrl, "eng", {
          logger: (m) => {
            if (m.status === "recognizing text")
              setProgress(Math.round(m.progress * 100));
          },
        });
        await runLLMExtractor(
          text,
          startTime,
          setStatus,
          setLlmStatus,
          setResult,
          setRawOcr,
        );
      }

      setFilePreview(imageDataUrl);
    } catch (err) {
      console.error(err);
      setStatus("❌ Extraction failed. Check console.");
    } finally {
      setLoading(false);
      setProgress(0);
      setLlmStatus("");
    }
  };

  const handleCopyJson = () => {
    if (result) navigator.clipboard.writeText(JSON.stringify(result, null, 2));
  };

  const docType = result?.document_type || null;
  const confidence = result?.confidence
    ? Math.round(result.confidence * 100)
    : null;

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <span style={styles.headerIcon}>🔒</span>
          <div>
            <h2 style={styles.title}>Vault Vani | Universal Document Parser</h2>
            <p style={styles.subtitle}>
              100% On-Device · Works for any document · Data never leaves your
              browser
            </p>
          </div>
        </div>

        {/* Privacy Badge */}
        <div style={styles.privacyBadge}>
          🛡️&nbsp;<strong>Privacy First:</strong> Two-stage AI extraction runs
          entirely on your device via WebGPU. Marksheets, PAN cards, Aadhaar,
          certificates, domain certs — any document works.
        </div>

        {/* File Input */}
        <input
          type="file"
          accept="image/*,.pdf"
          onChange={handleFileChange}
          disabled={loading}
          style={styles.fileInput}
        />

        {/* Status Bar */}
        <div style={styles.statusBox}>
          <div>{status}</div>
          {llmStatus && <div style={styles.llmStatus}>{llmStatus}</div>}
          {loading && progress > 0 && (
            <div style={styles.progressBarWrapper}>
              <div style={{ ...styles.progressBar, width: `${progress}%` }} />
            </div>
          )}
        </div>

        {/* Document type + confidence pill */}
        {docType && (
          <div
            style={{
              ...styles.docTypePill,
              backgroundColor: getDocTypeBadgeColor(docType),
            }}
          >
            <span style={styles.docTypeLabel}>📄 {docType}</span>
            {confidence !== null && (
              <span style={styles.confidenceBadge}>
                {confidence}% confidence
              </span>
            )}
            {result?._fallback && (
              <span style={styles.fallbackBadge}>⚠️ Partial</span>
            )}
          </div>
        )}

        {/* Workspace */}
        <div style={styles.workspace}>
          {/* Preview */}
          <div style={styles.panel}>
            <h3 style={styles.panelTitle}>📄 Document Preview</h3>
            <div style={styles.previewBox}>
              {filePreview ? (
                <img
                  src={filePreview}
                  alt="Document Preview"
                  style={styles.img}
                />
              ) : (
                <p style={styles.placeholder}>
                  Upload a PDF or image to preview
                </p>
              )}
            </div>
          </div>

          {/* Result */}
          <div style={styles.panel}>
            <div style={styles.panelHeader}>
              <h3 style={styles.panelTitle}>✨ Extracted Output</h3>
              <div
                style={{ display: "flex", gap: "8px", alignItems: "center" }}
              >
                {(result || rawOcr) && (
                  <>
                    <button
                      style={{
                        ...styles.tabBtn,
                        ...(activeTab === "json" ? styles.tabBtnActive : {}),
                      }}
                      onClick={() => setActiveTab("json")}
                    >
                      JSON
                    </button>
                    <button
                      style={{
                        ...styles.tabBtn,
                        ...(activeTab === "stage1" ? styles.tabBtnActive : {}),
                      }}
                      onClick={() => setActiveTab("stage1")}
                    >
                      Raw Fields
                    </button>
                    <button
                      style={{
                        ...styles.tabBtn,
                        ...(activeTab === "raw" ? styles.tabBtnActive : {}),
                      }}
                      onClick={() => setActiveTab("raw")}
                    >
                      OCR Text
                    </button>
                  </>
                )}
                {result && (
                  <button style={styles.copyBtn} onClick={handleCopyJson}>
                    📋 Copy
                  </button>
                )}
              </div>
            </div>

            <div style={styles.resultBox}>
              {activeTab === "json" ? (
                result ? (
                  <JsonViewer data={result} />
                ) : rawOcr ? (
                  <pre style={styles.rawText}>{rawOcr}</pre>
                ) : (
                  <p style={styles.placeholder}>
                    Structured JSON will appear here...
                  </p>
                )
              ) : activeTab === "stage1" ? (
                result?._stage1_raw ? (
                  <JsonViewer data={result._stage1_raw} />
                ) : (
                  <p style={styles.placeholder}>
                    Stage 1 raw field dump will appear here...
                  </p>
                )
              ) : rawOcr ? (
                <pre style={styles.rawText}>{rawOcr}</pre>
              ) : (
                <p style={styles.placeholder}>
                  Raw OCR text will appear here...
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = {
  container: {
    backgroundColor: "#0d0d0d",
    minHeight: "100vh",
    padding: "24px",
    color: "#fff",
    fontFamily: "'Segoe UI', sans-serif",
  },
  card: {
    maxWidth: "1300px",
    margin: "0 auto",
    backgroundColor: "#141414",
    padding: "32px",
    borderRadius: "16px",
    border: "1px solid #222",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    marginBottom: "16px",
  },
  headerIcon: { fontSize: "32px" },
  title: { color: "#03dac6", margin: 0, fontSize: "22px", fontWeight: "bold" },
  subtitle: { color: "#555", margin: "4px 0 0", fontSize: "13px" },
  privacyBadge: {
    backgroundColor: "#051a19",
    border: "1px solid #03dac640",
    borderRadius: "8px",
    padding: "10px 16px",
    fontSize: "13px",
    color: "#03dac6",
    marginBottom: "16px",
    lineHeight: "1.6",
  },
  fileInput: {
    width: "100%",
    padding: "10px",
    margin: "12px 0",
    backgroundColor: "#1a1a1a",
    color: "#ccc",
    border: "1px solid #2a2a2a",
    borderRadius: "8px",
    cursor: "pointer",
    boxSizing: "border-box",
    fontSize: "13px",
  },
  statusBox: {
    padding: "12px 16px",
    backgroundColor: "#1a1a1a",
    borderRadius: "8px",
    border: "1px solid #2a2a2a",
    textAlign: "center",
    fontWeight: "bold",
    fontSize: "14px",
    color: "#ccc",
    marginBottom: "10px",
  },
  llmStatus: {
    fontSize: "12px",
    color: "#666",
    marginTop: "6px",
    fontWeight: "normal",
  },
  progressBarWrapper: {
    marginTop: "10px",
    height: "4px",
    backgroundColor: "#222",
    borderRadius: "4px",
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#03dac6",
    transition: "width 0.2s ease-out",
  },
  docTypePill: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "8px 16px",
    borderRadius: "8px",
    border: "1px solid #333",
    marginBottom: "12px",
    flexWrap: "wrap",
  },
  docTypeLabel: {
    fontSize: "13px",
    fontWeight: "bold",
    color: "#03dac6",
  },
  confidenceBadge: {
    fontSize: "11px",
    backgroundColor: "#03dac615",
    color: "#03dac6",
    border: "1px solid #03dac630",
    borderRadius: "4px",
    padding: "2px 8px",
  },
  fallbackBadge: {
    fontSize: "11px",
    backgroundColor: "#3a2000",
    color: "#ffa500",
    border: "1px solid #ffa50030",
    borderRadius: "4px",
    padding: "2px 8px",
  },
  workspace: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "20px",
    marginTop: "8px",
  },
  panel: {
    backgroundColor: "#0f0f0f",
    padding: "16px",
    borderRadius: "10px",
    border: "1px solid #1e1e1e",
    display: "flex",
    flexDirection: "column",
  },
  panelHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "2px",
  },
  panelTitle: {
    margin: "0 0 10px",
    fontSize: "14px",
    color: "#888",
    fontWeight: "600",
  },
  tabBtn: {
    fontSize: "11px",
    backgroundColor: "transparent",
    color: "#555",
    border: "1px solid #2a2a2a",
    borderRadius: "4px",
    padding: "2px 10px",
    marginBottom: "8px",
    cursor: "pointer",
    fontFamily: "'Segoe UI', sans-serif",
  },
  tabBtnActive: {
    backgroundColor: "#03dac615",
    color: "#03dac6",
    border: "1px solid #03dac630",
  },
  copyBtn: {
    fontSize: "11px",
    backgroundColor: "#03dac615",
    color: "#03dac6",
    border: "1px solid #03dac630",
    borderRadius: "4px",
    padding: "2px 10px",
    marginBottom: "8px",
    cursor: "pointer",
    fontFamily: "'Segoe UI', sans-serif",
  },
  previewBox: {
    flexGrow: 1,
    minHeight: "520px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: "#000",
    borderRadius: "6px",
  },
  resultBox: {
    flexGrow: 1,
    height: "520px",
    overflowY: "auto",
    padding: "16px",
    backgroundColor: "#000",
    borderRadius: "6px",
    color: "#ccc",
  },
  img: { maxWidth: "100%", maxHeight: "100%", objectFit: "contain" },
  placeholder: { color: "#2a2a2a", textAlign: "center", fontSize: "13px" },
  rawText: {
    margin: 0,
    whiteSpace: "pre-wrap",
    lineHeight: "1.6",
    fontFamily: "'Courier New', monospace",
    fontSize: "12px",
    color: "#03dac6",
  },
};

export default VaultVaniOCR;
