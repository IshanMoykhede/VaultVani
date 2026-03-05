// src/components/RAGDemo.jsx
import { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";
import {
  generateEmbeddings,
  retrieveTopChunks,
  generateAnswer,
} from "../utils/ragUtils.js";
import { decryptData } from "../services/CryptoServices";
import { getAllEncryptedChunks } from "../services/db";

export default function RAGDemo() {
  const { vaultKey } = useAuth();

  // ─────────────────────────────────────────────
  // States for generateEmbeddings (same as UploadDocument)
  // ─────────────────────────────────────────────
  const [embeddingLoading, setEmbeddingLoading] = useState(false);
  const [modelStatus, setModelStatus] = useState("Ready");
  const [error, setError] = useState("");

  // ─────────────────────────────────────────────
  // States for retrieveTopChunks (exactly as per your function signature)
  // ─────────────────────────────────────────────
  const [retrievalLoading, setRetrievalLoading] = useState(false);
  const [topChunks, setTopChunks] = useState([]); // ← will hold [{id, score}, ...]

  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [vaultChunks, setVaultChunks] = useState([]);
  const [hasDocuments, setHasDocuments] = useState(false);
  const messagesEndRef = useRef(null);

  // Load all chunks from Dexie once
  useEffect(() => {
    const loadVaultChunks = async () => {
      try {
        const chunksFromDB = await getAllEncryptedChunks();
        console.log("[DEBUG] Loaded chunks from DB:", chunksFromDB.length);
        if (chunksFromDB.length === 0) {
          toast.info("No documents uploaded yet — go to Upload page first");
          setHasDocuments(false);
        } else {
          setVaultChunks(chunksFromDB);
          setHasDocuments(true);
        }
      } catch (err) {
        console.error("[DEBUG] Failed to load vault chunks:", err);
        toast.error("Failed to load vault data");
      }
    };

    loadVaultChunks();
  }, []);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const addMessage = (role, content, isLoading = false) => {
    setMessages((prev) => [...prev, { role, content, isLoading }]);
  };

  const handleSend = async () => {
    if (!inputValue.trim()) return;

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
    addMessage("user", userQuery);

    setIsGenerating(true);
    addMessage("assistant", "", true);

    try {
      console.log("[DEBUG] Starting query:", userQuery);

      // ─────────────────────────────────────────────
      // 1. Embed the query (4-param call, same as UploadDocument)
      // ─────────────────────────────────────────────
      console.log("[DEBUG] Embedding query...");
      const queryEmbedResult = await generateEmbeddings(
        [userQuery],
        setEmbeddingLoading,
        setModelStatus,
        setError,
      );

      const queryEmbedding = queryEmbedResult[0]?.embedding;
      console.log(
        "[DEBUG] Query embedding length:",
        queryEmbedding?.length || "MISSING",
      );

      if (!queryEmbedding || !Array.isArray(queryEmbedding)) {
        throw new Error("Query embedding failed");
      }

      // ─────────────────────────────────────────────
      // 2. Prepare indexed items
      // ─────────────────────────────────────────────
      const indexedItems = vaultChunks
        .filter((chunk) => chunk?.id != null && Array.isArray(chunk.embedding))
        .map((chunk) => ({
          id: chunk.id,
          embedding: chunk.embedding,
        }));

      console.log("[DEBUG] Indexed items count:", indexedItems.length);

      if (indexedItems.length === 0) {
        throw new Error("No valid embedded chunks in vault");
      }

      // ─────────────────────────────────────────────
      // 3. Retrieve top chunks — EXACT 5-param call as you showed
      // ─────────────────────────────────────────────
      console.log("[DEBUG] Calling retrieveTopChunks...");
      await retrieveTopChunks(
        userQuery,
        indexedItems,
        setRetrievalLoading,
        setTopChunks, // ← updates topChunks state
        setError, // ← updates error state
      );

      console.log("[DEBUG] Top chunks after retrieval:", topChunks);

      if (topChunks.length === 0) {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: "No relevant information found in your documents.",
            isLoading: false,
          };
          return updated;
        });
        return;
      }

      // ─────────────────────────────────────────────
      // 4. Decrypt top chunks using topChunks state
      // ─────────────────────────────────────────────
      console.log("[DEBUG] Decrypting top chunks...");
      const decryptedTop = [];
      for (const match of topChunks) {
        const dbChunk = vaultChunks.find((c) => c.id === match.id);
        if (!dbChunk) {
          console.warn("[DEBUG] Chunk not found for id:", match.id);
          continue;
        }

        try {
          const decryptedBuffer = await decryptData(
            vaultKey,
            dbChunk.encryptedText,
            new Uint8Array(dbChunk.iv),
          );

          const plainText = new TextDecoder().decode(decryptedBuffer);
          decryptedTop.push({ text: plainText, score: match.score });
          console.log("[DEBUG] Decrypted chunk:", match.id, plainText);
        } catch (decryptErr) {
          console.warn(
            "[DEBUG] Decryption failed for chunk",
            match.id,
            decryptErr,
          );
        }
      }

      if (decryptedTop.length === 0) {
        throw new Error("Could not decrypt any relevant chunks");
      }

      // ─────────────────────────────────────────────
      // 5. Generate answer
      // ─────────────────────────────────────────────
      console.log("[DEBUG] Generating answer...");
      await generateAnswer(
        userQuery,
        decryptedTop,
        setIsGenerating,
        (finalAnswer) => {
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              role: "assistant",
              content: finalAnswer,
              isLoading: false,
            };
            return updated;
          });
        },
        setError,
      );

      console.log("[DEBUG] Answer generated successfully");
    } catch (err) {
      console.error("[DEBUG] Query failed:", err);
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "Sorry — failed to generate answer. Try again.",
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

  return (
    <div className="min-h-screen bg-white text-black font-mono flex flex-col">
      {/* Header */}
      <div className="border-b-4 border-black bg-white py-5 px-6 md:px-12">
        <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight text-center">
          VAULT CHAT
        </h1>
        <p className="text-xl font-bold text-center mt-2 uppercase">
          Ask anything — answers from your uploaded documents only
        </p>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-6 md:p-12 space-y-10">
        {messages.length === 0 && (
          <div className="text-center py-24">
            <p className="text-4xl font-black uppercase mb-6">
              Ask your first question
            </p>
            <p className="text-2xl font-bold">
              Your uploaded documents are ready to answer
            </p>
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
                ${msg.role === "user" ? "bg-yellow-50 shadow-[10px_10px_0_#000]" : "bg-white shadow-[10px_10px_0_#000]"}
              `}
            >
              {msg.isLoading ? (
                <p className="text-2xl font-black animate-pulse">THINKING...</p>
              ) : (
                <p className="text-xl leading-relaxed whitespace-pre-wrap font-bold">
                  {msg.content}
                </p>
              )}
            </div>
          </div>
        ))}

        {/* Status & Error display (like UploadDocument) */}
        {embeddingLoading && (
          <div className="text-center text-yellow-600 font-bold py-4">
            {modelStatus || "Processing query..."}
          </div>
        )}
        {retrievalLoading && (
          <div className="text-center text-yellow-600 font-bold py-4">
            Searching relevant parts...
          </div>
        )}
        {error && (
          <div className="text-center text-red-600 font-bold py-4 border-4 border-red-600 bg-red-100">
            Error: {error}
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
            placeholder="Ask anything about your documents..."
            disabled={isGenerating || !hasDocuments}
            rows={1}
            className="
              flex-1 px-6 py-5 text-xl font-bold
              border-4 border-black shadow-[8px_8px_0_#000]
              focus:shadow-[12px_12px_0_#000] focus:outline-none
              resize-none disabled:opacity-50
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
            ASK
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t-4 border-black bg-white py-4 text-center text-lg font-bold uppercase">
        VaultVani — Local • Encrypted • Private
      </footer>
    </div>
  );
}
