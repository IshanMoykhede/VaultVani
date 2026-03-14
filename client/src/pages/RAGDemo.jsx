// src/components/RAGDemo.jsx
import { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-hot-toast";
import {
  generateEmbeddings,
  retrieveTopChunks,
  generateAnswer,
  getOrCreateEngine,
} from "../utils/ragUtils.js";
import { decryptData } from "../services/CryptoServices";
import { getAllEncryptedChunks } from "../services/db";

export default function RAGDemo() {
  const { vaultKey } = useAuth();

  const [embeddingLoading, setEmbeddingLoading] = useState(false);
  const [modelStatus, setModelStatus] = useState("");
  const [error, setError] = useState("");
  const [retrievalLoading, setRetrievalLoading] = useState(false);
  const [topChunks, setTopChunks] = useState([]);

  const [history, setHistory] = useState([]);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [vaultChunks, setVaultChunks] = useState([]);
  const [hasDocuments, setHasDocuments] = useState(false);

  const [modelReady, setModelReady] = useState(false);
  const [modelLoadText, setModelLoadText] = useState("Initializing model...");
  const [modelLoadProgress, setModelLoadProgress] = useState(0);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    const loadVaultChunks = async () => {
      try {
        const chunksFromDB = await getAllEncryptedChunks();
        if (chunksFromDB.length === 0) {
          toast.info("No documents uploaded yet — go to Upload page first");
          setHasDocuments(false);
        } else {
          setVaultChunks(chunksFromDB);
          setHasDocuments(true);
        }
      } catch (err) {
        console.error("Failed to load vault chunks:", err);
        toast.error("Failed to load vault data");
      }
    };
    loadVaultChunks();
  }, []);

  useEffect(() => {
    const preloadModel = async () => {
      try {
        setModelLoadText("Downloading model (first time only)...");
        await getOrCreateEngine((text, progress) => {
          setModelLoadText(text);
          setModelLoadProgress(Math.round((progress || 0) * 100));
        });
        setModelReady(true);
        setModelLoadText("Model ready");
        setModelLoadProgress(100);
      } catch (err) {
        console.error("Model preload failed:", err);
        setModelLoadText("Model load failed — will retry on first question");
        setModelReady(false);
      }
    };
    preloadModel();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || isGenerating) return;

    if (!hasDocuments) {
      toast.warn("No documents in vault — upload first");
      return;
    }
    if (!vaultKey) {
      toast.error("Vault key missing — re-login");
      return;
    }

    const userQuery = inputValue.trim();
    setInputValue("");
    setError("");

    // --- LOGGING UI SETUP ---
    console.clear();
    console.log(
      "%c 🛰️ VAULT RAG INITIATED ",
      "background: #f97316; color: white; font-weight: bold; border-radius: 4px;",
    );
    console.log(
      `%cQUERY:%c "${userQuery}"`,
      "color: #94a3b8;",
      "color: #f1f5f9; font-weight: bold;",
    );

    const userMessage = { role: "user", content: userQuery };
    setMessages((prev) => [...prev, userMessage]);
    setHistory((prev) => [...prev, userMessage]);

    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: "", isLoading: true },
    ]);
    setIsGenerating(true);

    try {
      // ── STAGE 1: EMBEDDING ──
      console.group("%c [1/4] Vectorization ", "color: #38bdf8;");
      console.log("Status: Generating embedding for user query...");
      const queryEmbedResult = await generateEmbeddings(
        [userQuery],
        setEmbeddingLoading,
        setModelStatus,
        setError,
      );
      const queryEmbedding = queryEmbedResult[0]?.embedding;
      console.log(
        "Vector Output:",
        queryEmbedding?.slice(0, 5),
        "... (Length: " + queryEmbedding?.length + ")",
      );
      console.groupEnd();

      // ── STAGE 2: RETRIEVAL ──
      console.group("%c [2/4] Semantic Search ", "color: #818cf8;");
      const indexedItems = vaultChunks
        .filter((c) => c?.id != null && Array.isArray(c.embedding))
        .map((c) => ({ id: c.id, embedding: c.embedding }));

      console.log(
        `Database: Scanning ${indexedItems.length} encrypted chunks.`,
      );

      let retrievedChunks = [];
      await retrieveTopChunks(
        userQuery,
        indexedItems,
        setRetrievalLoading,
        (chunks) => {
          retrievedChunks = chunks;
          setTopChunks(chunks);
        },
        setError,
      );

      if (retrievedChunks.length === 0) {
        console.warn("Result: 0 matches found above relevance threshold.");
        console.groupEnd();
        // ... handle no info msg
        return;
      }
      console.table(
        retrievedChunks.map((c) => ({
          "Chunk ID": c.id,
          "Similarity Score": c.score.toFixed(4),
        })),
      );
      console.groupEnd();

      // ── STAGE 3: DECRYPTION ──
      console.group("%c [3/4] Secure Decryption ", "color: #4ade80;");
      const decryptedTop = [];
      for (const match of retrievedChunks) {
        const dbChunk = vaultChunks.find((c) => c.id === match.id);
        if (!dbChunk) continue;

        try {
          const decryptedBuffer = await decryptData(
            vaultKey,
            dbChunk.encryptedText,
            new Uint8Array(dbChunk.iv),
          );
          const plainText = new TextDecoder().decode(decryptedBuffer);
          decryptedTop.push({ text: plainText, score: match.score });
          console.log(`%c✔ Decrypted Chunk ${match.id}`, "color: #22c55e;");
        } catch (e) {
          console.log(
            `%c✘ Failed to decrypt Chunk ${match.id}`,
            "color: #ef4444;",
          );
        }
      }
      console.groupEnd();

      // ── STAGE 4: INFERENCE ──
      console.group("%c [4/4] LLM Inference (Gemma 2B) ", "color: #fb7185;");

      // LOG THE PROMPT TRIMMING:
      // Remember: ragUtils.js trims context to 250 chars for memory safety!
      const topText = decryptedTop[0]?.text || "";
      console.log(
        "%cRAW CONTEXT PASSING TO MODEL:",
        "color: #9ca3af; font-style: italic;",
      );
      console.log(decryptedTop);

      console.log(
        "%cSTATUS:%c Streaming response...",
        "color: #9ca3af;",
        "color: #fb7185; animate: pulse;",
      );

      await generateAnswer(
        userQuery,
        decryptedTop,
        history,
        setIsGenerating,
        (answer) => {
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              role: "assistant",
              content: answer,
              isLoading: false,
            };
            return updated;
          });
        },
        setError,
        (text, progress) => {
          // Track engine loading if not cached
          if (progress < 1) {
            console.log(
              `Model Progress: ${text} (${(progress * 100).toFixed(0)}%)`,
            );
          }
        },
      );
      console.groupEnd();
      console.log(
        "%c 🏁 CYCLE COMPLETE ",
        "background: #22c55e; color: white; font-weight: bold; border-radius: 4px;",
      );
    } catch (err) {
      console.group(
        "%c 🚨 CRITICAL RAG ERROR ",
        "background: #ef4444; color: white; font-weight: bold;",
      );
      console.error(err);
      console.groupEnd();
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setHistory([]);
    setTopChunks([]);
    setError("");
  };

  return (
    <div className="min-h-screen bg-black text-white font-mono antialiased flex flex-col">
      {/* Header / Status Bar */}
      <div className="bg-gray-900/30 backdrop-blur-xl border-b border-white/10 py-5 px-6 md:px-12 shadow-lg shadow-black/40">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-orange-400">
              Vault Chat
            </h1>
            <p className="text-base md:text-lg text-gray-300 mt-1">
              Ask anything — answers from your documents only
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div
              className={`w-3 h-3 rounded-full ${
                modelReady ? "bg-green-400" : "bg-orange-400 animate-pulse"
              } border border-white/20`}
            />
            <span className="text-sm font-semibold uppercase tracking-wide">
              {modelReady ? "Gemma 2B • Ready" : modelLoadText}
            </span>

            {!modelReady &&
              modelLoadProgress > 0 &&
              modelLoadProgress < 100 && (
                <div className="w-32 bg-gray-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-orange-500 h-full transition-all duration-300"
                    style={{ width: `${modelLoadProgress}%` }}
                  />
                </div>
              )}
          </div>

          {messages.length > 0 && (
            <button
              onClick={handleClearChat}
              className="
                px-5 py-2.5 rounded-xl text-sm font-semibold uppercase
                bg-gray-800 border border-white/20 hover:bg-gray-700
                hover:border-orange-500/40 transition-all duration-200
              "
            >
              Clear Chat
            </button>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 md:p-12 space-y-8">
        {messages.length === 0 && (
          <div className="text-center py-32">
            <h2 className="text-4xl md:text-5xl font-black uppercase text-orange-400 mb-6">
              Ask your first question
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Your uploaded documents are indexed and ready. Type naturally —
              answers come only from your vault.
            </p>
            {!modelReady && (
              <p className="mt-6 text-lg text-orange-300/80">
                Model is loading in background — will be ready soon
              </p>
            )}
          </div>
        )}

        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`
                max-w-3xl px-6 py-5 rounded-2xl backdrop-blur-lg border
                ${
                  msg.role === "user"
                    ? "bg-orange-600/20 border-orange-500/30 text-white"
                    : "bg-gray-900/40 border-white/10 text-gray-200"
                }
                shadow-xl shadow-black/40
              `}
            >
              {msg.isLoading ? (
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-lg font-medium text-orange-300">
                    {embeddingLoading
                      ? "Embedding query..."
                      : retrievalLoading
                        ? "Searching vault..."
                        : "Generating answer..."}
                  </span>
                </div>
              ) : (
                <div className="text-base md:text-lg leading-relaxed whitespace-pre-wrap">
                  {msg.content}
                </div>
              )}
            </div>
          </div>
        ))}

        {error && (
          <div className="bg-red-900/30 border border-red-500/40 rounded-2xl p-6 text-center backdrop-blur-lg">
            <p className="text-lg font-medium text-red-300">{error}</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-white/10 bg-gray-950/60 backdrop-blur-xl py-6 px-6">
        <div className="max-w-5xl mx-auto flex flex-col gap-4">
          <div className="flex gap-4">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                !hasDocuments
                  ? "Upload documents first..."
                  : !modelReady
                    ? "Model is loading, please wait..."
                    : "Ask anything about your documents..."
              }
              disabled={isGenerating || !hasDocuments || !modelReady}
              rows={1}
              className="
                flex-1 px-6 py-4 text-base bg-gray-900/50 border border-white/10
                rounded-2xl focus:border-orange-500/50 focus:outline-none
                resize-none disabled:opacity-50 transition-all duration-200
                placeholder-gray-500 shadow-inner shadow-black/30
              "
            />

            <button
              onClick={handleSend}
              disabled={
                !inputValue.trim() ||
                isGenerating ||
                !hasDocuments ||
                !modelReady
              }
              className="
                px-8 py-4 rounded-2xl font-semibold text-base uppercase
                bg-orange-600/90 text-white border border-orange-400/30
                hover:bg-orange-500 hover:border-orange-300/50
                hover:shadow-orange-900/50 transition-all duration-300
                shadow-lg shadow-orange-900/40 disabled:opacity-50
                disabled:cursor-not-allowed flex items-center gap-3
              "
            >
              Ask
              <span className="text-xl">→</span>
            </button>
          </div>

          {history.length > 0 && (
            <div className="text-sm text-gray-500 flex items-center gap-4 justify-center">
              <span>
                Conversation memory: {Math.floor(history.length / 2)} turn
                {Math.floor(history.length / 2) !== 1 ? "s" : ""} remembered
              </span>
              <button
                onClick={handleClearChat}
                className="text-orange-400 hover:text-orange-300 transition-colors underline"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
