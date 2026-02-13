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
          text: item.text,
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
export async function generateAnswer(
  question,
  topChunks,
  setGenerating,
  setAnswer,
  setError,
) {
  if (topChunks.length === 0) {
    setError("No relevant chunks found.");
    return;
  }

  setGenerating(true);
  setError("");

  try {
    const { CreateMLCEngine } = await import("@mlc-ai/web-llm");

    const engine = await CreateMLCEngine("Llama-3.2-1B-Instruct-q4f16_1-MLC");

    // Build prompt
    const context = topChunks.map((c) => c.text).join("\n\n");

    const prompt = `You are a helpful assistant answering questions based only on the provided context. Be concise and accurate.

Context:
${context}

Question: ${question}

Answer:`;

    setAnswer("Generating answer...");

    const reply = await engine.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 256,
      stream: true, // optional: for streaming
    });

    let fullAnswer = "";

    for await (const chunk of reply) {
      const content = chunk.choices[0]?.delta?.content || "";
      fullAnswer += content;
      setAnswer(fullAnswer); // stream answer word by word
    }

    setAnswer(fullAnswer || "No answer generated.");
  } catch (err) {
    console.error("Generation failed:", err);
    setError("Failed to generate answer: " + err.message);
    setAnswer("");
  } finally {
    setGenerating(false);
  }
}
