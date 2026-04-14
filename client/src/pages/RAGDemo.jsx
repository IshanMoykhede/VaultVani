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
import axios from "axios";
import { FaRobot, FaTrash, FaPaperPlane } from "react-icons/fa";

export default function RAGDemo() {
  const { vaultKey } = useAuth();

  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [vaultChunks, setVaultChunks] = useState([]);
  const [hasDocuments, setHasDocuments] = useState(false);
  const [error, setError] = useState("");

  const [modelReady, setModelReady] = useState(false);
  const [modelLoadText, setModelLoadText] = useState("Initializing model...");
  const [modelLoadProgress, setModelLoadProgress] = useState(0);

  const messagesEndRef = useRef(null);

  // ====================== CONSOLE LOGGER ======================
  const log = (title, data = null, type = "info") => {
    const styles = {
      info: "color: #67e8f9; font-weight: 600;",
      success: "color: #4ade80; font-weight: 700;",
      warning: "color: #fbbf24; font-weight: 700;",
      error: "color: #f87171; font-weight: 700;",
      step: "color: #c4b5fd; font-size: 15px; font-weight: 700; background: #1f2937; padding: 4px 10px; border-radius: 6px;",
    };

    const emoji = {
      info: "🔹",
      success: "✅",
      warning: "⚠️",
      error: "❌",
      step: "🚀",
    };

    console.groupCollapsed(
      `%c${emoji[type] || "🔹"} ${title}`,
      styles[type] || styles.info,
    );

    console.log(
      `%c⏱ ${new Date().toLocaleTimeString()}`,
      "color:#888; font-size:13px;",
    );

    if (data) {
      console.dir(data, { depth: null }); // This ensures full object is visible
    }
    console.groupEnd();
  };

  // Load vault chunks
  useEffect(() => {
    const loadVaultChunks = async () => {
      log("1. Loading Vault Chunks from Backend", null, "step");
      try {
        const res = await axios.get("http://localhost:8000/api/chunks", {
          withCredentials: true,
        });

        const chunksFromDB = res.data.chunks || [];

        log(
          "2. Chunks Received from Server",
          {
            totalChunks: chunksFromDB.length,
            hasDocuments: chunksFromDB.length > 0,
          },
          "success",
        );

        if (chunksFromDB.length === 0) {
          setHasDocuments(false);
          log("3. No documents found in vault", null, "warning");
        } else {
          setVaultChunks(chunksFromDB);
          setHasDocuments(true);
          log(
            "3. Vault Loaded Successfully",
            {
              documentCount: chunksFromDB.length,
              sampleChunkIds: chunksFromDB.slice(0, 3).map((c) => c.id),
            },
            "success",
          );
        }
      } catch (err) {
        log(
          "ERROR: Failed to load vault chunks",
          { message: err.message },
          "error",
        );
        toast.error("Failed to sync secure documents from server");
      }
    };

    loadVaultChunks();
  }, []);

  // Preload model
  useEffect(() => {
    const preloadModel = async () => {
      log("MODEL: Starting Qwen 0.5B Preload", null, "step");

      try {
        await getOrCreateEngine((text, progress) => {
          const percent = Math.round((progress || 0) * 100);
          setModelLoadText(text);
          setModelLoadProgress(percent);
          log("MODEL: Loading Progress", {
            status: text,
            progress: `${percent}%`,
          });
        });

        setModelReady(true);
        setModelLoadText("Qwen 0.5B • Ready");
        log("MODEL: Successfully Loaded & Ready", null, "success");
      } catch (err) {
        log("ERROR: Model preload failed", err.message, "error");
        setModelReady(false);
      }
    };
    preloadModel();
  }, []);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ====================== HANDLE SEND - FULL DECRYPTED CHUNK VISIBLE ======================
  const handleSend = async () => {
    const userQuery = inputValue.trim();

    log("🚀 NEW QUERY PROCESSING STARTED", { userQuery }, "step");

    if (!userQuery || isGenerating) return;
    if (!hasDocuments) {
      toast.warn("Please upload documents first");
      return;
    }
    if (!vaultKey) {
      toast.error("Vault key missing");
      return;
    }

    // Add user message
    setMessages((prev) => [...prev, { role: "user", content: userQuery }]);
    setInputValue("");
    setError("");

    // Add loading message
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: "", isLoading: true },
    ]);
    setIsGenerating(true);

    try {
      log("=== RAG PIPELINE STARTED ===", null, "step");

      const indexedItems = vaultChunks
        .filter((c) => c?.id != null && Array.isArray(c.embedding))
        .map((c) => ({ id: c.id, embedding: c.embedding }));

      let retrievedChunks = [];

      await retrieveTopChunks(
        userQuery,
        indexedItems,
        () => {},
        (chunks) => {
          retrievedChunks = chunks;
          log(
            "Retrieval Completed",
            { retrievedCount: chunks.length },
            "success",
          );
        },
        setError,
      );

      if (retrievedChunks.length === 0) {
        log("No relevant chunks found", null, "warning");
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: "This information is not in your documents.",
            isLoading: false,
          };
          return updated;
        });
        return;
      }

      // ==================== DECRYPTION - FULL TEXT VISIBLE ====================
      log(
        "Starting Decryption - Full Chunk Text Will Be Visible",
        {
          chunksToDecrypt: retrievedChunks.length,
        },
        "step",
      );

      const decryptedTop = [];

      for (let i = 0; i < retrievedChunks.length; i++) {
        const match = retrievedChunks[i];
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

          // 🔥 FULL DECRYPTED CHUNK TEXT IS NOW FULLY VISIBLE
          log(
            `✅ FULL DECRYPTED CHUNK ${i + 1}`,
            {
              chunkId: match.id,
              relevanceScore: match.score ? match.score.toFixed(4) : "N/A",
              fullDecryptedText: plainText, // ← Entire text is shown
              textLength: plainText.length,
            },
            "success",
          );
        } catch (e) {
          log(`❌ Decryption Failed for Chunk ${match.id}`, e.message, "error");
        }
      }

      log(
        "Decryption Completed",
        {
          totalDecryptedChunks: decryptedTop.length,
        },
        "success",
      );

      if (decryptedTop.length === 0) {
        throw new Error("Decryption failed for all chunks");
      }

      // Generate Answer
      log("Generating Final Answer with Qwen 0.5B...", null, "step");

      await generateAnswer(
        userQuery,
        decryptedTop,
        [],
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
        () => {},
      );

      log("🎉 RAG PIPELINE COMPLETED SUCCESSFULLY", null, "success");
    } catch (err) {
      log("❌ RAG PIPELINE FAILED", err.message, "error");
      setError("Something went wrong.");
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "Failed to generate answer.",
          isLoading: false,
        };
        return updated;
      });
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
    setError("");
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col font-sans">
      {/* Header */}
      <div className="bg-zinc-900/80 backdrop-blur-xl border-b border-zinc-800 py-5 px-6 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl flex items-center justify-center">
              <FaRobot className="text-2xl text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Vault Chat</h1>
              <p className="text-sm text-zinc-400">
                Private • Offline • Document-only
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div
                className={`w-3 h-3 rounded-full ${modelReady ? "bg-emerald-500" : "bg-amber-500"}`}
              />
              <span className="text-sm font-medium text-zinc-300">
                {modelReady ? "Qwen 0.5B • Ready" : modelLoadText}
              </span>
            </div>

            {messages.length > 0 && (
              <button
                onClick={handleClearChat}
                className="flex items-center gap-2 px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-2xl text-sm font-medium border border-zinc-700 hover:border-orange-500/30"
              >
                <FaTrash className="text-orange-400" /> Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-[radial-gradient(#27272a_1px,transparent_1px)] bg-[length:40px_40px]">
        <div className="max-w-4xl mx-auto space-y-8 pb-32">
          {messages.length === 0 && (
            <div className="text-center py-24">
              <div className="mx-auto w-24 h-24 bg-gradient-to-br from-orange-500/10 to-amber-500/10 rounded-3xl flex items-center justify-center mb-8 border border-orange-500/20">
                <FaRobot className="text-6xl text-orange-400/70" />
              </div>
              <h2 className="text-5xl font-bold tracking-tighter mb-4">
                Ask anything
              </h2>
              <p className="text-xl text-zinc-400">
                Your documents are securely indexed.
              </p>
            </div>
          )}

          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-2xl px-7 py-6 rounded-3xl text-[17px] leading-relaxed shadow-xl shadow-black/60 backdrop-blur-md
                ${
                  msg.role === "user"
                    ? "bg-gradient-to-br from-orange-600 to-orange-700 text-white rounded-br-none"
                    : "bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-bl-none"
                }`}
              >
                {msg.isLoading ? (
                  <div className="flex items-center gap-4 py-2">
                    <div className="w-5 h-5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                    <span className="text-orange-300">Thinking...</span>
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap break-words">
                    {msg.content}
                  </div>
                )}
              </div>
            </div>
          ))}

          {error && (
            <div className="max-w-2xl mx-auto bg-red-950/50 border border-red-500/30 rounded-3xl p-6 text-center text-red-400">
              {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-zinc-800 bg-zinc-950/90 backdrop-blur-2xl py-6 px-6 sticky bottom-0 z-50">
        <div className="max-w-4xl mx-auto relative">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              !hasDocuments
                ? "Upload documents first..."
                : !modelReady
                  ? "Model is loading..."
                  : "Ask anything about your documents..."
            }
            disabled={isGenerating || !hasDocuments || !modelReady}
            rows={1}
            className="w-full resize-y bg-zinc-900 border border-zinc-700 focus:border-orange-500 rounded-3xl px-7 py-5 pr-20 text-base placeholder-zinc-500 focus:outline-none min-h-[58px] max-h-[180px]"
          />

          <button
            onClick={handleSend}
            disabled={
              !inputValue.trim() || isGenerating || !hasDocuments || !modelReady
            }
            className="absolute bottom-4 right-4 bg-orange-600 hover:bg-orange-500 disabled:bg-zinc-700 p-3.5 rounded-2xl text-white transition-all"
          >
            <FaPaperPlane className="text-xl" />
          </button>
        </div>
      </div>
    </div>
  );
}
