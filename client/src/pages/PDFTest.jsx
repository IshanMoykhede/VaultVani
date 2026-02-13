// src/components/RAGDemo.jsx
import { useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker?url";
import {
  chunkText,
  generateEmbeddings,
  retrieveTopChunks,
  generateAnswer,
} from "../utils/ragUtils.js";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

function RAGDemo() {
  const [extractedText, setExtractedText] = useState("");
  const [chunks, setChunks] = useState([]);
  const [embeddings, setEmbeddings] = useState([]);
  const [question, setQuestion] = useState("");
  const [topChunks, setTopChunks] = useState([]);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [embeddingLoading, setEmbeddingLoading] = useState(false);
  const [retrievalLoading, setRetrievalLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [modelStatus, setModelStatus] = useState("Ready to upload");

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !file.name.endsWith(".pdf")) {
      setError("Please upload a valid PDF file");
      return;
    }

    setLoading(true);
    setExtractedText("");
    setChunks([]);
    setEmbeddings([]);
    setTopChunks([]);
    setAnswer("");
    setQuestion("");
    setError("");
    setModelStatus("");

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      let fullText = "";
      const batchSize = 5;

      for (
        let startPage = 1;
        startPage <= pdf.numPages;
        startPage += batchSize
      ) {
        const endPage = Math.min(startPage + batchSize - 1, pdf.numPages);

        for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const content = await page.getTextContent();
          const pageText = content.items.map((item) => item.str).join(" ");
          fullText += `Page ${pageNum}:\n${pageText}\n\n`;
        }

        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      const cleanedText = fullText.trim();
      if (cleanedText.length === 0) {
        setError(
          "No readable text found. It may be image-only (OCR coming soon).",
        );
        return;
      }

      setExtractedText(cleanedText);

      const newChunks = chunkText(cleanedText);
      setChunks(newChunks);

      if (newChunks.length > 0) {
        const result = await generateEmbeddings(
          newChunks,
          setEmbeddingLoading,
          setModelStatus,
          setError,
        );

        if (result && result.length > 0) {
          setEmbeddings(result);
        }
      }
    } catch (err) {
      console.error("PDF processing failed:", err);
      setError("Failed to process PDF. Try a smaller file.");
    } finally {
      setLoading(false);
    }
  };

  const handleAsk = async () => {
    if (embeddings.length === 0) {
      setError("Please wait for embeddings to finish generating.");
      return;
    }

    setAnswer("");
    setError("");
    setGenerating(true);

    try {
      let topMatches = [];

      await retrieveTopChunks(
        question,
        embeddings,
        setRetrievalLoading,
        (matches) => {
          topMatches = matches;
        }, // capture directly
        setError,
      );

      if (topMatches.length > 0) {
        await generateAnswer(
          question,
          topMatches,
          setGenerating,
          setAnswer,
          setError,
        );
      } else {
        setAnswer("No relevant information found in the document.");
      }
    } catch (err) {
      console.error("Ask failed:", err);
      setError("Failed to process question.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#0f0b12] to-[#0a0a0f] text-gray-100 flex flex-col items-center px-6 py-12 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-40%] left-[-30%] w-[1200px] h-[1200px] bg-gradient-to-br from-purple-900/5 via-indigo-900/5 to-transparent rounded-full blur-[180px] opacity-50" />
        <div className="absolute bottom-[-40%] right-[-40%] w-[1400px] h-[1400px] bg-gradient-to-tl from-amber-900/4 via-purple-900/4 to-transparent rounded-full blur-[200px] opacity-40" />
      </div>

      <div className="relative z-10 w-full max-w-5xl">
        <div className="backdrop-blur-3xl bg-white/[0.06] border border-white/[0.08] rounded-3xl p-10 md:p-12 shadow-2xl shadow-black/70 ring-1 ring-inset ring-purple-900/15 transition-all duration-300 hover:ring-purple-700/25 hover:shadow-purple-900/10">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-amber-500/2 via-purple-500/2 to-indigo-500/2 pointer-events-none" />

          <div className="text-center mb-10 relative z-10">
            <h1 className="text-4xl md:text-5xl font-medium tracking-tight bg-gradient-to-r from-amber-300 via-purple-300 to-indigo-300 bg-clip-text text-transparent">
              RAG Demo – Private Document Intelligence
            </h1>
            <p className="text-lg text-gray-400 mt-4 max-w-2xl mx-auto leading-relaxed">
              Upload PDF → extract → chunk → embed → ask → see relevant parts
            </p>
          </div>

          {/* Upload Area */}
          <div className="mb-12 relative z-10">
            <label className="block cursor-pointer">
              <div className="w-full px-8 py-12 bg-black/30 border-2 border-dashed border-purple-900/40 rounded-2xl text-center transition-all duration-300 hover:border-purple-700/60 hover:bg-black/40 hover:shadow-lg hover:shadow-purple-900/10">
                <div className="text-6xl mb-6 text-purple-400 opacity-80">
                  📄
                </div>
                <p className="text-xl font-medium text-gray-200">
                  Drop your PDF here or click to select
                </p>
                <p className="text-sm text-gray-500 mt-3">
                  Start with a small digital passbook PDF
                </p>
              </div>
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                disabled={loading}
                className="hidden"
              />
            </label>
          </div>

          {/* Question Input */}
          {embeddings.length > 0 && (
            <div className="mb-12 relative z-10">
              <div className="flex flex-col md:flex-row gap-4 max-w-3xl mx-auto">
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ask anything about your document..."
                  className="flex-1 px-6 py-4 bg-black/40 border border-purple-900/40 rounded-xl text-gray-200 placeholder-gray-500 focus:outline-none focus:border-purple-700/60 transition-all duration-300"
                  disabled={retrievalLoading || generating}
                />
                <button
                  onClick={handleAsk}
                  disabled={!question.trim() || retrievalLoading || generating}
                  className="px-8 py-4 bg-gradient-to-r from-amber-700 via-purple-700 to-indigo-700 hover:from-amber-600 hover:via-purple-600 hover:to-indigo-600 text-white font-medium rounded-xl transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {retrievalLoading
                    ? "Searching..."
                    : generating
                      ? "Generating..."
                      : "Ask"}
                </button>
              </div>
            </div>
          )}

          {/* Loading States */}
          {loading && (
            <div className="text-center text-amber-400 animate-pulse mb-8 relative z-10 flex items-center justify-center gap-3">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8h8a8 8 0 01-8 8 8 8 0 01-8-8z"
                />
              </svg>
              Extracting text...
            </div>
          )}

          {embeddingLoading && (
            <div className="text-center text-amber-400 animate-pulse mb-8 relative z-10">
              {modelStatus || "Generating embeddings..."}
            </div>
          )}

          {retrievalLoading && (
            <div className="text-center text-amber-400 animate-pulse mb-8 relative z-10">
              Finding most relevant parts...
            </div>
          )}

          {generating && (
            <div className="text-center text-amber-400 animate-pulse mb-8 relative z-10 flex items-center justify-center gap-3">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8h8a8 8 0 01-8 8 8 8 0 01-8-8z"
                />
              </svg>
              Generating answer...
            </div>
          )}

          {error && (
            <div className="text-center text-red-400 mb-8 p-4 bg-red-900/20 rounded-xl relative z-10">
              {error}
            </div>
          )}

          {/* Results Section */}
          {(extractedText ||
            chunks.length > 0 ||
            embeddings.length > 0 ||
            topChunks.length > 0 ||
            answer) && (
            <div className="mt-8 space-y-10 relative z-10">
              {/* Extracted Full Text */}
              {extractedText && (
                <div className="p-8 bg-black/40 backdrop-blur-sm border border-purple-900/30 rounded-2xl max-h-[50vh] overflow-auto">
                  <h3 className="text-2xl font-medium mb-5 text-purple-300">
                    Extracted Full Text
                  </h3>
                  <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">
                    {extractedText.substring(0, 2000)}...
                  </pre>
                </div>
              )}

              {/* Chunks */}
              {chunks.length > 0 && (
                <div className="p-8 bg-black/40 backdrop-blur-sm border border-purple-900/30 rounded-2xl">
                  <h3 className="text-2xl font-medium mb-5 text-purple-300">
                    Text Chunks ({chunks.length} pieces)
                  </h3>
                  <div className="grid md:grid-cols-2 gap-6 max-h-[50vh] overflow-auto">
                    {chunks.slice(0, 8).map((chunk, index) => (
                      <div
                        key={index}
                        className="p-6 bg-black/50 rounded-xl border border-purple-900/10 hover:border-purple-700/40 transition-all duration-300"
                      >
                        <p className="text-xs text-purple-400 mb-3 font-medium">
                          Chunk {index + 1} • {chunk.length} chars
                        </p>
                        <p className="text-sm text-gray-300 leading-relaxed line-clamp-6">
                          {chunk}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Embeddings */}
              {embeddings.length > 0 && (
                <div className="p-8 bg-black/40 backdrop-blur-sm border border-purple-900/30 rounded-2xl">
                  <h3 className="text-2xl font-medium mb-5 text-purple-300">
                    Generated Embeddings ({embeddings.length} vectors)
                  </h3>
                  <p className="text-sm text-gray-400 mb-4">
                    Each chunk is now a 384-dimensional vector for similarity
                    search.
                  </p>
                  <div className="grid md:grid-cols-2 gap-6 max-h-[50vh] overflow-auto">
                    {embeddings.slice(0, 6).map((item, index) => (
                      <div
                        key={index}
                        className="p-6 bg-black/50 rounded-xl border border-purple-900/10"
                      >
                        <p className="text-xs text-purple-400 mb-3 font-medium">
                          Chunk {index + 1} Vector (first 10 values)
                        </p>
                        <p className="text-sm text-gray-300 font-mono break-all">
                          [{item.embedding.slice(0, 10).join(", ")}...]
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Top Relevant Chunks */}
              {topChunks.length > 0 && (
                <div className="p-8 bg-black/40 backdrop-blur-sm border border-purple-900/30 rounded-2xl">
                  <h3 className="text-2xl font-medium mb-5 text-purple-300">
                    Most Relevant Chunks
                  </h3>
                  <p className="text-sm text-gray-400 mb-4">
                    Top matches for: "{question}"
                  </p>
                  <div className="space-y-6">
                    {topChunks.map((item, index) => (
                      <div
                        key={index}
                        className="p-6 bg-black/50 rounded-xl border border-purple-900/10"
                      >
                        <p className="text-xs text-purple-400 mb-3 font-medium">
                          Relevance: {(item.score * 100).toFixed(1)}%
                        </p>
                        <p className="text-sm text-gray-300 leading-relaxed line-clamp-6">
                          {item.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Answer from SLM */}
              {answer && (
                <div className="p-8 bg-black/40 backdrop-blur-sm border border-purple-900/30 rounded-2xl mt-8">
                  <h3 className="text-2xl font-medium mb-5 text-purple-300">
                    Answer
                  </h3>
                  <p className="text-gray-200 leading-relaxed whitespace-pre-wrap">
                    {answer}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default RAGDemo;
