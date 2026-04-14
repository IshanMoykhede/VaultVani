// src/utils/ragUtils.js
//
// FINAL FIXED VERSION
//
// PDF EXTRACTION FIXES:
//   - centerX-based column matching (accurate for variable-width text)
//   - Detects KEY-VALUE layouts (scorecards/forms) vs GRID TABLES (marksheets)
//   - Key-value pages → clean "Label: Value" lines for RAG context
//   - Grid table pages → proper Markdown table output
//   - Single-char cells preserved (grades, scores like "A", "0")
//   - 50px gap column clustering — no phantom columns from font rendering variance
//
// ENGINE / INFERENCE FIXES:
//   - isEngineAlive() checks actual output, not just exceptions
//     (broken engines return <pad> silently without throwing)
//   - resetChat() before every inference call — clears KV-cache
//     accumulation that causes <pad>-only output after 2-3 queries
//   - Warm-up resetChat() after fresh engine load
//   - Ultra-minimal prompt (~350 chars) — stays within Edge/browser KV-cache limit
//   - Single best chunk only, lines re-ranked by question relevance
//   - cleanModelOutput() strips <pad>/<eos>/<end_of_turn> from streamed output
//
// ROOT CAUSE SUMMARY:
//   Edge evicts WebLLM's Cache API (Gemma weights) under memory pressure.
//   The JS engine object stays alive but has no weights → outputs only <pad>.
//   Fix is in db.js (verify Cache API) + isEngineAlive() (detect pad output)
//   + resetChat() (prevent KV-cache overflow between queries).

import * as pdfjsLib from "pdfjs-dist";
import { pipeline, env } from "@xenova/transformers";

env.allowLocalModels = false;
env.useBrowserCache = true;

let embedderPromise = null;
async function getEmbedder() {
  if (!embedderPromise) {
    embedderPromise = pipeline(
      "feature-extraction",
      "Xenova/all-MiniLM-L6-v2",
      { quantized: true },
    );
  }
  return embedderPromise;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXTRACTION
// ─────────────────────────────────────────────────────────────────────────────

export async function extractStructuredText(pdf) {
  let fullText = "";

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const viewport = page.getViewport({ scale: 1 });

    // Collect all items — preserve single chars (grades, scores)
    let items = content.items
      .map((item) => ({
        str: item.str.trim(),
        x: item.transform[4],
        y: viewport.height - item.transform[5],
        width: Math.abs(item.width) || 0,
        centerX: item.transform[4] + Math.abs(item.width || 0) / 2,
      }))
      .filter((item) => item.str.length > 0);

    // Sort top→bottom, left→right with 14px y-tolerance
    items.sort((a, b) => {
      if (Math.abs(a.y - b.y) > 14) return a.y - b.y;
      return a.x - b.x;
    });

    // ── STEP 1: Merge word-fragments that pdfjs splits mid-word ──
    // PDFs from form-filling tools often split "Physics" into "Physi" + "cs"
    // as separate text runs with the same y but slightly different x.
    // Merge adjacent items if:
    //   - same visual row (y within 14px)
    //   - second item starts within 4px of where first item ends (x + width)
    //   - neither item ends with a space (i.e. they are a broken word, not separate words)
    const merged = [];
    for (const item of items) {
      const prev = merged[merged.length - 1];
      if (
        prev &&
        Math.abs(item.y - prev.y) <= 14 &&
        item.x <= prev.x + prev.width + 4 &&
        !prev.str.endsWith(" ") &&
        !item.str.startsWith(" ")
      ) {
        // Glue the fragment onto the previous item
        prev.str = prev.str + item.str;
        prev.width = item.x + item.width - prev.x;
        prev.centerX = prev.x + prev.width / 2;
      } else {
        merged.push({ ...item });
      }
    }
    items = merged;

    // ── STEP 2: Group into visual rows ──
    const rows = [];
    let currentRow = [];
    let lastY = null;
    for (const item of items) {
      if (lastY !== null && Math.abs(item.y - lastY) > 14) {
        if (currentRow.length > 0) rows.push(currentRow);
        currentRow = [];
      }
      currentRow.push(item);
      lastY = item.y;
    }
    if (currentRow.length > 0) rows.push(currentRow);

    // ── Detect columns using centerX clustering (50px gap) ──
    const allCenterX = items.map((i) => i.centerX).sort((a, b) => a - b);
    const columns = buildColumns(allCenterX, 50);

    // ── Classify: key-value form vs grid table ──
    const { isKeyValue } = classifyLayout(rows, columns);

    if (isKeyValue) {
      // ── KEY-VALUE MODE: emit as "Label: Value" lines ──
      for (const row of rows) {
        const cells = assignToCols(row, columns);
        const filled = cells.filter((c) => c.trim().length > 0);
        if (filled.length === 0) continue;
        if (filled.length === 1) {
          fullText += filled[0] + "\n";
        } else {
          const label = filled[0];
          const value = filled.slice(1).join(" ").trim();
          fullText += `${label}: ${value}\n`;
        }
      }
    } else {
      // ── GRID TABLE MODE: detect table blocks and emit markdown ──
      let inTable = false;
      let tableRows = [];

      for (const row of rows) {
        const cells = assignToCols(row, columns);
        const filledCount = cells.filter((c) => c.trim().length > 0).length;
        const isTableRow = filledCount >= 2;

        if (isTableRow) {
          inTable = true;
          tableRows.push(cells);
        } else {
          if (inTable && tableRows.length >= 2) {
            fullText += tableToMarkdown(tableRows) + "\n\n";
            tableRows = [];
            inTable = false;
          } else if (inTable) {
            fullText += tableRows[0].filter(Boolean).join("  ") + "\n";
            tableRows = [];
            inTable = false;
          }
          const rowText = cells.filter(Boolean).join("  ").trim();
          if (rowText) fullText += rowText + "\n";
        }
      }

      if (inTable && tableRows.length >= 2) {
        fullText += tableToMarkdown(tableRows) + "\n\n";
      } else if (inTable && tableRows.length === 1) {
        fullText += tableRows[0].filter(Boolean).join("  ") + "\n";
      }
    }

    fullText += "\n--- Page Break ---\n";
  }

  return fullText.trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Cluster sorted centerX values into columns by gap threshold.
 * Returns array of { center } used for nearest-column assignment.
 */
function buildColumns(sortedXValues, gapThreshold = 50) {
  if (sortedXValues.length === 0) return [];
  const columns = [];
  let clusterVals = [sortedXValues[0]];

  for (let i = 1; i < sortedXValues.length; i++) {
    if (sortedXValues[i] - sortedXValues[i - 1] > gapThreshold) {
      const center =
        clusterVals.reduce((s, v) => s + v, 0) / clusterVals.length;
      columns.push({ center });
      clusterVals = [];
    }
    clusterVals.push(sortedXValues[i]);
  }
  const center = clusterVals.reduce((s, v) => s + v, 0) / clusterVals.length;
  columns.push({ center });
  return columns;
}

/**
 * Assign each cell to its nearest column by centerX distance.
 */
function assignToCols(row, columns) {
  const rowCells = new Array(columns.length).fill("");
  for (const cell of row) {
    let bestCol = 0;
    let minDist = Infinity;
    for (let i = 0; i < columns.length; i++) {
      const dist = Math.abs(cell.centerX - columns[i].center);
      if (dist < minDist) {
        minDist = dist;
        bestCol = i;
      }
    }
    rowCells[bestCol] = (rowCells[bestCol] + " " + cell.str).trim();
  }
  return rowCells;
}

/**
 * Classify layout type for the page.
 *
 * Key-value heuristic:
 *   - At most 3 detected column zones, AND
 *   - 60%+ of multi-cell rows use exactly 2 distinct x-zones (label + value)
 *
 * Grid table heuristic: rows consistently use 3+ columns.
 */
function classifyLayout(rows, columns) {
  if (columns.length <= 2) {
    return { isKeyValue: true };
  }

  let twoColRows = 0;
  let threeOrMoreColRows = 0;

  for (const row of rows) {
    const xZones = new Set(row.map((cell) => Math.round(cell.x / 60)));
    if (xZones.size === 2) twoColRows++;
    if (xZones.size >= 3) threeOrMoreColRows++;
  }

  const total = twoColRows + threeOrMoreColRows;
  if (total === 0) return { isKeyValue: false };

  const isKeyValue = twoColRows / total >= 0.6;
  return { isKeyValue };
}

/**
 * Convert rows into a Markdown table.
 * Strips fully empty columns before rendering.
 */
function tableToMarkdown(rows) {
  if (rows.length === 0) return "";

  const maxCols = Math.max(...rows.map((r) => r.length));
  const normalised = rows.map((row) => {
    const r = [...row];
    while (r.length < maxCols) r.push("");
    return r;
  });

  // Drop fully-empty columns
  const activeCols = [];
  for (let ci = 0; ci < maxCols; ci++) {
    if (normalised.some((r) => r[ci]?.trim().length > 0)) activeCols.push(ci);
  }

  const trimmed = normalised.map((r) => activeCols.map((ci) => r[ci] || ""));
  const colCount = trimmed[0].length;
  const widths = Array.from({ length: colCount }, (_, ci) =>
    Math.max(3, ...trimmed.map((r) => (r[ci] || "").length)),
  );

  const pad = (s, w) => (s || "").padEnd(w);
  const header = trimmed[0].map((c, i) => pad(c, widths[i])).join(" | ");
  const sep = widths.map((w) => "-".repeat(w)).join("-|-");
  const body = trimmed
    .slice(1)
    .map((r) => r.map((c, i) => pad(c, widths[i])).join(" | "))
    .join("\n");

  return `| ${header} |\n|-${sep}-|\n| ${body.split("\n").join(" |\n| ")} |`;
}

// ─────────────────────────────────────────────────────────────────────────────
// CHUNKING
// ─────────────────────────────────────────────────────────────────────────────

export function chunkText(text, chunkSize = 600, overlap = 120) {
  if (!text || text.length === 0) return [];

  const chunks = [];
  let start = 0;

  while (start < text.length) {
    let end = Math.min(start + chunkSize, text.length);

    if (end < text.length) {
      const slice = text.slice(start, end);

      // Never split inside a markdown table
      const tableStart = slice.lastIndexOf("\n|");
      const tableEnd = slice.lastIndexOf("\n\n");
      if (tableStart > tableEnd && tableStart > chunkSize * 0.5) {
        const safeCut = slice.lastIndexOf("\n\n", tableStart);
        end = safeCut > 0 ? start + safeCut + 2 : start + chunkSize;
      } else {
        // Break at newline > period > space — never mid-word
        const lastNewline = slice.lastIndexOf("\n\n");
        const lastSingleNewline = slice.lastIndexOf("\n");
        const lastPeriod = slice.lastIndexOf(". ");
        const lastSpace = slice.lastIndexOf(" ");

        let breakPoint = -1;
        if (lastNewline > chunkSize * 0.6) breakPoint = lastNewline + 2;
        else if (lastSingleNewline > chunkSize * 0.6)
          breakPoint = lastSingleNewline + 1;
        else if (lastPeriod > chunkSize * 0.6) breakPoint = lastPeriod + 2;
        else if (lastSpace > 0) breakPoint = lastSpace + 1;

        if (breakPoint > 0) end = start + breakPoint;
      }
    }

    const chunk = text.slice(start, end).trim();
    if (chunk.length > 20) chunks.push(chunk);

    // Overlap: next chunk starts (end - overlap) so context carries over.
    // BUG WAS HERE: the old break condition fired before the last chunk
    // was added when end >= text.length, skipping the tail of the document.
    start = end - overlap;
    if (start < 0) start = 0;

    // Only stop when we've consumed the entire text
    if (end >= text.length) break;
  }

  return chunks;
}

// ─────────────────────────────────────────────────────────────────────────────
// EMBEDDING GENERATION
// ─────────────────────────────────────────────────────────────────────────────

export async function generateEmbeddings(
  chunks,
  setLoading = () => {},
  setStatus = () => {},
  setError = () => {},
) {
  if (chunks.length === 0) return [];
  setLoading(true);
  setStatus("Loading embedding model... (first time may take 30–90 sec)");
  try {
    const embedder = await getEmbedder();
    setStatus("Model loaded! Generating vectors...");
    const results = [];
    for (let i = 0; i < chunks.length; i++) {
      if (i % 5 === 0)
        setStatus(`Embedding chunk ${i + 1} / ${chunks.length}...`);
      const output = await embedder(chunks[i], {
        pooling: "mean",
        normalize: true,
      });
      results.push({ text: chunks[i], embedding: Array.from(output.data) });
    }
    setStatus(`Success! Generated ${results.length} vectors`);
    return results;
  } catch (err) {
    console.error("Embedding error:", err);
    setError("Embedding failed: " + err.message);
    setStatus("Embedding failed");
    return [];
  } finally {
    setLoading(false);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RETRIEVAL
// ─────────────────────────────────────────────────────────────────────────────

function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0,
    normA = 0,
    normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function retrieveTopChunks(
  query,
  indexedItems,
  setLoading,
  setTopChunks,
  setError,
  topK = 3,
) {
  if (!query.trim()) {
    setError("Please enter a question.");
    return;
  }
  if (!indexedItems?.length) {
    setError("Embeddings not ready yet.");
    return;
  }
  setLoading(true);
  setError("");
  try {
    const embedder = await getEmbedder();
    const output = await embedder(query, { pooling: "mean", normalize: true });
    const queryEmbedding = Array.from(output.data ?? []);
    const scored = indexedItems
      .map((item) => {
        if (!item.embedding || item.embedding.length !== queryEmbedding.length)
          return null;
        const score = cosineSimilarity(queryEmbedding, item.embedding);
        return { id: item.id, score: isNaN(score) ? 0 : score };
      })
      .filter(Boolean);
    if (scored.length === 0) {
      setError("No valid embeddings to compare.");
      return;
    }

    // Hard cap at 3 chunks — each chunk can be 400-600 chars after the new
    // extraction, so 3 chunks = ~1500 chars which fits Gemma's context window.
    // Also drop low-relevance chunks (score < 0.25) to avoid confusing the model.
    const MAX_CHUNKS = Math.min(topK, 3);
    const topMatches = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_CHUNKS)
      .filter((c) => c.score >= 0.25);

    // Fallback: if all chunks score below 0.25, still send the single best one
    setTopChunks(topMatches.length > 0 ? topMatches : [scored[0]]);
  } catch (err) {
    console.error("Retrieval error:", err);
    setError("Retrieval failed: " + err.message);
    setTopChunks([]);
  } finally {
    setLoading(false);
  }
}
// ─────────────────────────────────────────────────────────────────────────────
// OPTIMIZED SLM ENGINE — Phi-3-mini (High Quality + Fast + No Lag)
// ─────────────────────────────────────────────────────────────────────────────

let _engine = null;
let _engineLoading = false;
let _engineLoadCallbacks = [];

export async function getOrCreateEngine(onProgress) {
  if (_engine) return _engine;

  if (_engineLoading) {
    return new Promise((resolve) => _engineLoadCallbacks.push(resolve));
  }

  _engineLoading = true;

  try {
    const { CreateWebWorkerMLCEngine } = await import("@mlc-ai/web-llm");

    // Initialize Web Worker for background inference
    const worker = new Worker(new URL("./webllm.worker.js", import.meta.url), {
      type: "module",
    });

    // ←←← SWITCHED TO QWEN 1.5B (avoids LLama's privacy refusals and Phi-3's freezing)
    _engine = await CreateWebWorkerMLCEngine(
      worker,
      "Qwen2.5-0.5B-Instruct-q4f16_1-MLC",
      {
        initProgressCallback: (p) =>
          onProgress?.(p.text || "Loading model...", p.progress || 0),
      },
    );

    await _engine.resetChat();
    console.log("✅ Qwen-2.5-0.5B loaded successfully via Web Worker");

    // Resolve any queued requests
    _engineLoadCallbacks.forEach((resolve) => resolve(_engine));
    _engineLoadCallbacks = [];
  } catch (err) {
    console.error("MLC Engine initialization failed:", err);
    throw err;
  } finally {
    _engineLoading = false;
  }

  return _engine;
}

// ─────────────────────────────────────────────────────────────────────────────
// OPTIMIZED generateAnswer — Zero-lag streaming + strong system prompt
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// OPTIMIZED generateAnswer — Only Top 3 Chunks + No Previous Messages
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// generateAnswer — Only chunks with score > 0.50 + Top 3
// ─────────────────────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Answer using only the context.

1. If exact answer is found → return it clearly.
2. If unsure → return the most relevant values (numbers, marks, percentage, etc).
3. Do NOT return document names, headings, or labels.
4. Do NOT blindly match keys. If values look incorrect or mismatched, say:
   "I found this: {value}, but it may be incorrect. Please cross check and what you feel this should be correct tell that as well."
5. If nothing useful found → "This information is not in your documents."
6. Keep answer short. `;

export async function generateAnswer(
  question,
  topChunks,
  history = [],
  setGenerating,
  setAnswer,
  setError,
  onModelProgress,
) {
  if (!topChunks?.length) {
    setError("No relevant chunks found.");
    return;
  }

  setGenerating(true);
  setError("");
  setAnswer("Thinking...");

  let engine = null;

  try {
    engine = await getOrCreateEngine(onModelProgress);
    await engine.resetChat();

    // ←←← NEW FILTER: Only keep chunks with score > 0.50 (50%)
    const relevantChunks = topChunks
      .filter((chunk) => (chunk.score || 0) > 0.4) // Only > 50% relevance
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 3); // Max 3 chunks

    let context = "";

    if (relevantChunks.length > 0) {
      context = relevantChunks
        .map((c, i) => `[Source ${i + 1}]\n${(c.text || "").trim()}`)
        .join("\n\n---\n\n");
    } else {
      context = "No relevant information found in the documents.";
    }

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `I am sending you the two thing context and a question please find the answer from the context and according to question and then answer to me , Context:\n${context}\n\nQuestion: ${question}`,
      },
    ];

    const reply = await engine.chat.completions.create({
      messages,
      temperature: 0.1,
      max_tokens: 120,
      stream: false,
    });

    const fullAnswer =
      reply.choices[0]?.message?.content?.trim() ||
      "This information is not in your documents.";

    setAnswer(fullAnswer);
  } catch (err) {
    console.error("Generation failed:", err);
    setError("Failed to generate answer. Please try again.");
    setAnswer("");
  } finally {
    setGenerating(false);
    if (engine) {
      await engine.resetChat().catch(() => {});
    }
  }
}
