// src/components/RAGDemo.jsx
import { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";
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

  // Full conversation history — passed to model for memory
  // Each entry: { role: "user"|"assistant", content: string }
  const [history, setHistory] = useState([]);

  // What's displayed in the chat UI
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [vaultChunks, setVaultChunks] = useState([]);
  const [hasDocuments, setHasDocuments] = useState(false);

  // Model loading state
  const [modelReady, setModelReady] = useState(false);
  const [modelLoadText, setModelLoadText] = useState("Initializing model...");
  const [modelLoadProgress, setModelLoadProgress] = useState(0);

  const messagesEndRef = useRef(null);

  // ── Load vault chunks on mount ──────────────────────────────────────────
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

  // ── Preload model in background as soon as page opens ──────────────────
  // This eliminates the freeze on the first query — model is warming up
  // while the user is reading/typing their question.
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

  // ── Auto scroll ─────────────────────────────────────────────────────────
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

    // Add user message to UI and history
    const userMessage = { role: "user", content: userQuery };
    setMessages((prev) => [...prev, userMessage]);
    setHistory((prev) => [...prev, userMessage]);

    // Add placeholder assistant message
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: "", isLoading: true },
    ]);
    setIsGenerating(true);

    try {
      // ── 1. Embed query ────────────────────────────────────────────────
      const queryEmbedResult = await generateEmbeddings(
        [userQuery],
        setEmbeddingLoading,
        setModelStatus,
        setError,
      );

      const queryEmbedding = queryEmbedResult[0]?.embedding;
      if (!queryEmbedding || !Array.isArray(queryEmbedding)) {
        throw new Error("Query embedding failed");
      }

      // ── 2. Retrieve top chunks ────────────────────────────────────────
      const indexedItems = vaultChunks
        .filter((c) => c?.id != null && Array.isArray(c.embedding))
        .map((c) => ({ id: c.id, embedding: c.embedding }));

      if (indexedItems.length === 0)
        throw new Error("No valid embedded chunks in vault");

      // Use a local ref to capture the retrieved chunks synchronously
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
        const noInfoMsg = {
          role: "assistant",
          content: "No relevant information found in your documents.",
          isLoading: false,
        };
        setMessages((prev) => {
          const u = [...prev];
          u[u.length - 1] = noInfoMsg;
          return u;
        });
        setHistory((prev) => [
          ...prev,
          { role: "assistant", content: noInfoMsg.content },
        ]);
        return;
      }

      // ── 3. Decrypt top chunks ─────────────────────────────────────────
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
        } catch (e) {
          console.warn("Decryption failed for chunk", match.id, e);
        }
      }

      if (decryptedTop.length === 0)
        throw new Error("Could not decrypt any relevant chunks");

      // ── 4. Generate answer with conversation history ──────────────────
      // Pass full history so model remembers previous Q&A
      await generateAnswer(
        userQuery,
        decryptedTop,
        history, // ← conversation memory
        setIsGenerating,
        (answer) => {
          // Stream answer into the last message
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
          setModelLoadText(text);
          setModelLoadProgress(Math.round((progress || 0) * 100));
        },
      );

      // Add final assistant answer to history for next turn memory
      setMessages((prev) => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg?.role === "assistant") {
          setHistory((h) => [
            ...h,
            { role: "assistant", content: lastMsg.content },
          ]);
        }
        return prev;
      });
    } catch (err) {
      console.error("Query failed:", err);
      const errMsg = "Sorry — failed to generate answer. Try again.";
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: errMsg,
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
    setHistory([]);
    setTopChunks([]);
    setError("");
  };

  return (
    <div className="min-h-screen bg-white text-black font-mono flex flex-col">
      {/* Header */}
      <div className="border-b-4 border-black bg-white py-5 px-6 md:px-12">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight text-center">
              VAULT CHAT
            </h1>
            <p className="text-xl font-bold text-center mt-2 uppercase">
              Ask anything — answers from your uploaded documents only
            </p>
          </div>
          {messages.length > 0 && (
            <button
              onClick={handleClearChat}
              className="px-6 py-3 text-lg font-black uppercase border-4 border-black hover:bg-yellow-400 transition-all shadow-[4px_4px_0_#000]"
            >
              CLEAR
            </button>
          )}
        </div>

        {/* Model status bar */}
        <div className="mt-4">
          <div className="flex items-center gap-4">
            <div
              className={`w-3 h-3 rounded-full border-2 border-black ${modelReady ? "bg-green-400" : "bg-yellow-400 animate-pulse"}`}
            />
            <span className="text-sm font-bold uppercase">
              {modelReady ? "GEMMA 2B — READY" : modelLoadText}
            </span>
            {!modelReady &&
              modelLoadProgress > 0 &&
              modelLoadProgress < 100 && (
                <div className="flex-1 max-w-xs bg-gray-200 h-3 border-2 border-black">
                  <div
                    className="bg-yellow-400 h-full transition-all duration-300"
                    style={{ width: `${modelLoadProgress}%` }}
                  />
                </div>
              )}
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-6 md:p-12 space-y-10">
        {messages.length === 0 && (
          <div className="text-center py-24">
            <p className="text-4xl font-black uppercase mb-6">
              Ask your first question
            </p>
            <p className="text-2xl font-bold mb-4">
              Your uploaded documents are ready
            </p>
            {!modelReady && (
              <p className="text-xl font-bold text-yellow-600 uppercase">
                Model loading in background — will be ready shortly
              </p>
            )}
          </div>
        )}

        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`
              max-w-3xl px-8 py-6 border-4 border-black
              ${
                msg.role === "user"
                  ? "bg-yellow-50 shadow-[10px_10px_0_#000]"
                  : "bg-white shadow-[10px_10px_0_#000]"
              }
            `}
            >
              {msg.isLoading ? (
                <div className="space-y-2">
                  <p className="text-2xl font-black animate-pulse">
                    {embeddingLoading
                      ? "EMBEDDING..."
                      : retrievalLoading
                        ? "SEARCHING..."
                        : "THINKING..."}
                  </p>
                  {modelStatus && embeddingLoading && (
                    <p className="text-lg font-bold text-yellow-600">
                      {modelStatus}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xl leading-relaxed whitespace-pre-wrap font-bold">
                  {msg.content}
                </p>
              )}
            </div>
          </div>
        ))}

        {error && (
          <div className="text-center text-red-600 font-bold py-4 border-4 border-red-600 bg-red-100 px-6">
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div className="border-t-4 border-black bg-white p-6">
        <div className="max-w-5xl mx-auto flex gap-4">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              !hasDocuments
                ? "Upload documents first..."
                : !modelReady
                  ? "Model loading, please wait..."
                  : "Ask anything about your documents..."
            }
            disabled={isGenerating || !hasDocuments}
            rows={1}
            className="
              flex-1 px-6 py-5 text-xl font-bold
              border-4 border-black shadow-[8px_8px_0_#000]
              focus:shadow-[12px_12px_0_#000] focus:outline-none
              resize-none disabled:opacity-50 transition-all
            "
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isGenerating || !hasDocuments}
            className="
              px-12 py-5 text-xl font-black uppercase
              bg-black text-white border-4 border-black
              shadow-[10px_10px_0_#000] hover:shadow-[14px_14px_0_#000]
              hover:bg-yellow-400 hover:text-black transition-all
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            {isGenerating ? "..." : "ASK"}
          </button>
        </div>

        {/* Conversation memory indicator */}
        {history.length > 0 && (
          <div className="max-w-5xl mx-auto mt-3 flex items-center gap-3">
            <span className="text-sm font-bold uppercase text-gray-500">
              MEMORY: {Math.floor(history.length / 2)} turn
              {Math.floor(history.length / 2) !== 1 ? "s" : ""} remembered
            </span>
            <button
              onClick={handleClearChat}
              className="text-sm font-bold uppercase text-gray-400 hover:text-black underline"
            >
              clear memory
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t-4 border-black bg-white py-4 text-center text-lg font-bold uppercase">
        VaultVani — Local • Encrypted • Private
      </footer>
    </div>
  );
}
