// src/utils/ragUtils.js
import { pipeline, env } from "@xenova/transformers";

// Force remote loading (your working config)
env.allowLocalModels = false;
env.useBrowserCache = true;
// env.remoteHost = "https://huggingface.co";
// env.remotePathTemplate = "{model}/resolve/main/{file}";

// Singleton model loader (load once, reuse)
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

/**
 * Breaks text into meaningful chunks at sentence boundaries or spaces
 * @param {string} text
 * @param {number} chunkSize
 * @param {number} overlap
 * @returns {string[]}
 */
export function chunkText(text, chunkSize = 600, overlap = 120) {
  if (!text || text.length === 0) return [];

  const chunks = [];
  let start = 0;

  while (start < text.length) {
    let end = Math.min(start + chunkSize, text.length);

    // If we are not at the very end, find a clean break point
    if (end < text.length) {
      const slice = text.slice(start, end);
      const lastFullStop = slice.lastIndexOf(".");
      const lastSpace = slice.lastIndexOf(" ");

      // Try to break at a period first, then a space
      const breakPoint =
        lastFullStop > chunkSize * 0.8 ? lastFullStop + 1 : lastSpace;

      if (breakPoint > 0) {
        end = start + breakPoint;
      }
    }

    const chunk = text.slice(start, end).trim();
    if (chunk.length > 20) {
      chunks.push(chunk);
    }

    // Move start forward
    start = end - overlap;

    // Safety: Ensure we always move forward to avoid infinite loops
    if (start >= text.length || end >= text.length) break;
  }

  return chunks;
}

/**
 * Cosine similarity between two vectors
 * @param {number[]} a
 * @param {number[]} b
 * @returns {number}
 */
export function cosineSimilarity(a, b) {
  if (a.length !== b.length) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Generate embeddings for all chunks
 * @param {string[]} chunks
 * @param {function} setEmbeddingLoading
 * @param {function} setModelStatus
 * @param {function} setError
 * @returns {Promise<{text: string, embedding: number[]}[]>}
 */
export async function generateEmbeddings(
  chunks,
  setEmbeddingLoading,
  setModelStatus,
  setError,
) {
  if (chunks.length === 0) return [];

  setEmbeddingLoading(true);
  setModelStatus("Loading embedding model... (first time may take 30–90 sec)");

  try {
    const embedder = await getEmbedder();

    setModelStatus("Model loaded! Generating vectors...");

    const embedded = [];

    for (let i = 0; i < chunks.length; i++) {
      const output = await embedder(chunks[i], {
        pooling: "mean",
        normalize: true,
      });

      embedded.push({
        text: chunks[i],
        embedding: Array.from(output.data),
      });

      if (i % 5 === 0) {
        setModelStatus(`Embedding chunk ${i + 1}/${chunks.length}...`);
      }
    }

    setModelStatus(`Success! Generated ${embedded.length} vectors`);
    return embedded;
  } catch (err) {
    console.error("Embedding failed:", err);
    setError("Failed to generate embeddings.");
    setModelStatus("Embedding failed");
    return [];
  } finally {
    setEmbeddingLoading(false);
  }
}

/**
 * Retrieve top relevant chunks for a question
 * @param {string} questionText
 * @param {{text: string, embedding: number[]}[]} embeddings
 * @param {function} setRetrievalLoading
 * @param {function} setTopChunks
 * @param {function} setError
 */
export async function retrieveTopChunks(
  questionText,
  embeddings,
  setRetrievalLoading,
  setTopChunks,
  setError,
) {
  if (!questionText.trim()) {
    setError("Please enter a question.");
    return;
  }
  console.log(questionText);

  if (!embeddings || embeddings.length === 0) {
    setError("Embeddings not ready yet.");
    return;
  }

  console.log("Embeddings received for search:", embeddings);

  setRetrievalLoading(true);
  setError("");

  try {
    const embedder = await getEmbedder();

    const qOutput = await embedder(questionText, {
      pooling: "mean",
      normalize: true,
    });

    const qEmbedding = Array.from(qOutput.data ?? []);
    console.log("Question embedding length:", qEmbedding.length);

    const scored = embeddings
      .map((item, idx) => {
        if (!item.embedding || item.embedding.length !== qEmbedding.length) {
          console.warn("Invalid embedding at index:", idx);
          return null;
        }

        const score = cosineSimilarity(qEmbedding, item.embedding);

        return {
          id: item.id,
          score: isNaN(score) ? 0 : score,
        };
      })
      .filter(Boolean);

    console.log("Scored chunks:", scored);

    if (scored.length === 0) {
      setError("No valid embeddings to compare.");
      return;
    }

    scored.sort((a, b) => b.score - a.score);

    const topMatches = scored.slice(0, 3);
    console.log("Top matches:", topMatches);

    setTopChunks(topMatches);
    console.log("top chunks retrieved");
  } catch (err) {
    console.error("Retrieval failed:", err);
    setError("Search failed.");
  } finally {
    setRetrievalLoading(false);
  }
}
/**
 * Generate natural answer using SLM from retrieved chunks
 * @param {string} question
 * @param {{text: string, score: number}[]} topChunks
 * @param {function} setGenerating
 * @param {function} setAnswer
 * @param {function} setError
 */
// src/utils/ragUtils.js (or wherever generateAnswer lives)

let _engine = null;
let _engineLoading = false;
let _engineLoadCallbacks = [];

export async function getOrCreateEngine(onProgress) {
  // If already ready, return immediately
  if (_engine) return _engine;

  // If currently loading, wait for it
  if (_engineLoading) {
    return new Promise((resolve) => {
      _engineLoadCallbacks.push(resolve);
    });
  }

  _engineLoading = true;

  const { CreateMLCEngine } = await import("@mlc-ai/web-llm");

  _engine = await CreateMLCEngine(
    // Gemma 2B — much better instruction following than Llama 1B
    // Accurate at extracting specific facts and numbers from context
    "gemma-2-2b-it-q4f16_1-MLC",
    {
      initProgressCallback: (progress) => {
        onProgress?.(
          progress.text || "Loading model...",
          progress.progress || 0,
        );
      },
    },
  );

  _engineLoading = false;

  // Resolve all waiting callers
  _engineLoadCallbacks.forEach((cb) => cb(_engine));
  _engineLoadCallbacks = [];

  return _engine;
}

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM PROMPT
// Short and direct — small models perform better with concise instructions
// ─────────────────────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a precise document assistant. You answer questions using ONLY the provided context.

Rules:
- Extract exact values (numbers, names, dates) directly from context
- If the answer is a number or specific value, state it directly
- If context doesn't contain the answer, say: "This information is not in your documents."
- Never guess or use outside knowledge
- Keep answers short and direct`;

// ─────────────────────────────────────────────────────────────────────────────
// MAIN FUNCTION
//
// Parameters:
//   question     — current user question
//   topChunks    — array of { text, score } decrypted chunks
//   history      — array of { role: "user"|"assistant", content: string }
//                  pass full conversation history for memory
//   setGenerating, setAnswer, setError — state setters
// ─────────────────────────────────────────────────────────────────────────────
export async function generateAnswer(
  question,
  topChunks,
  history = [],
  setGenerating,
  setAnswer,
  setError,
  onModelProgress,
) {
  if (topChunks.length === 0) {
    setError("No relevant chunks found.");
    return;
  }

  setGenerating(true);
  setError("");
  setAnswer("...");

  try {
    // Get or reuse engine (no lag on 2nd+ queries)
    setAnswer("Loading model...");
    const engine = await getOrCreateEngine(onModelProgress);

    // Build context from top chunks
    // Sort by score descending — most relevant first
    const sortedChunks = [...topChunks].sort(
      (a, b) => (b.score || 0) - (a.score || 0),
    );
    let context = sortedChunks
      .map((c, i) => `[Document ${i + 1}]\n${c.text}`)
      .join("\n\n");

    // Trim context to fit model window — Gemma 2B handles ~3000 chars well
    if (context.length > 3000) {
      context = context.slice(0, 3000) + "\n...(truncated)";
    }

    // Build message array with full conversation history for memory
    // Structure:
    //   system prompt
    //   [previous turns from history]
    //   current context + question
    const messages = [{ role: "system", content: SYSTEM_PROMPT }];

    // Add conversation history (gives the model memory of previous Q&A)
    // Limit to last 6 turns to avoid exceeding context window
    const recentHistory = history.slice(-6);
    for (const turn of recentHistory) {
      messages.push({ role: turn.role, content: turn.content });
    }

    // Current question with fresh context injected
    messages.push({
      role: "user",
      content: `Context:\n${context}\n\nQuestion: ${question}`,
    });

    setAnswer("Thinking...");

    const reply = await engine.chat.completions.create({
      messages,
      temperature: 0.1, // very low = precise factual extraction
      max_tokens: 200, // short answers = fast + accurate for document QA
      stream: true,
    });

    let fullAnswer = "";

    for await (const chunk of reply) {
      const content = chunk.choices[0]?.delta?.content || "";
      fullAnswer += content;
      setAnswer(fullAnswer.trim());
    }

    setAnswer(fullAnswer.trim() || "No answer generated.");
  } catch (err) {
    console.error("Generation failed:", err);
    setError("Failed to generate answer: " + (err.message || "Unknown error"));
    setAnswer("");
  } finally {
    setGenerating(false);
  }
}
