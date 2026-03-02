// src/components/RAGDemo.jsx
import { useState, useRef, useEffect } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker?url";
import {
  chunkText,
  generateEmbeddings,
  retrieveTopChunks,
  generateAnswer,
} from "../utils/ragUtils.js";
import { toast } from "react-toastify";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export default function RAGDemo() {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasDocument, setHasDocument] = useState(false);
  const [chunks, setChunks] = useState([]); // kept for RAG
  const [embeddings, setEmbeddings] = useState([]); // kept for RAG
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const addMessage = (role, content, isLoading = false) => {
    setMessages((prev) => [...prev, { role, content, isLoading }]);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Please upload a PDF file");
      return;
    }

    setIsProcessingFile(true);
    addMessage("assistant", "Processing your document…", true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      let fullText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        fullText += content.items.map((item) => item.str).join(" ") + "\n\n";
      }

      const cleaned = fullText.trim();
      if (!cleaned) {
        throw new Error("No readable text found in PDF");
      }

      const newChunks = chunkText(cleaned);
      setChunks(newChunks);

      const embedded = await generateEmbeddings(
        newChunks,
        () => {}, // you can remove or keep progress if you want
        (msg) => toast.info(msg),
        (err) => toast.error(err),
      );

      setEmbeddings(embedded);
      setHasDocument(true);

      // Update last message
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: `Document processed successfully.\nReady to answer questions about **${file.name}**.`,
          isLoading: false,
        };
        return updated;
      });

      toast.success("Document ready!");
    } catch (err) {
      console.error(err);
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content:
            "Sorry, failed to process the document.\n" +
            (err.message || "Unknown error"),
          isLoading: false,
        };
        return updated;
      });
      toast.error("Processing failed");
    } finally {
      setIsProcessingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim()) return;
    if (!hasDocument) {
      toast.warn("Please upload a document first");
      return;
    }

    const userMessage = inputValue.trim();
    setInputValue("");
    addMessage("user", userMessage);

    setIsGenerating(true);
    addMessage("assistant", "", true); // placeholder loading message

    try {
      let topMatches = [];
      await retrieveTopChunks(
        userMessage,
        embeddings,
        setIsGenerating, // can be used for finer progress
        (matches) => (topMatches = matches),
        (err) => toast.error(err),
      );

      if (topMatches.length === 0) {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: "I couldn't find relevant information in the document.",
            isLoading: false,
          };
          return updated;
        });
        return;
      }

      await generateAnswer(
        userMessage,
        topMatches,
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
        (err) => toast.error(err),
      );
    } catch (err) {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "Sorry, something went wrong while generating the answer.",
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
          PRIVATE CHAT
        </h1>
        <p className="text-xl font-bold text-center mt-2">
          Ask anything — answers from your documents only
        </p>
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8">
        {messages.length === 0 && (
          <div className="text-center py-20 text-gray-600">
            <p className="text-2xl font-bold uppercase mb-6">
              Upload a PDF to start chatting
            </p>
            <p className="text-lg">Your document stays local • Fully private</p>
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
                max-w-3xl px-6 py-5 rounded-none border-4 border-black
                ${
                  msg.role === "user"
                    ? "bg-yellow-100 shadow-[8px_8px_0_#000]"
                    : "bg-white shadow-[8px_8px_0_#000]"
                }
              `}
            >
              {msg.isLoading ? (
                <div className="flex items-center gap-3">
                  <div className="animate-pulse text-2xl">●●●</div>
                  <span className="text-xl font-bold">Thinking...</span>
                </div>
              ) : (
                <p className="text-lg leading-relaxed whitespace-pre-wrap">
                  {msg.content}
                </p>
              )}
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t-4 border-black bg-white p-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                hasDocument
                  ? "Ask anything about your document..."
                  : "Upload a document first..."
              }
              disabled={isGenerating || isProcessingFile || !hasDocument}
              rows={2}
              className="
                w-full px-6 py-5 text-xl font-bold
                border-4 border-black
                shadow-[8px_8px_0_#000] focus:shadow-[12px_12px_0_#000]
                focus:outline-none resize-none
                disabled:opacity-50
              "
            />
          </div>

          <div className="flex gap-4 md:flex-col">
            {/* Upload button */}
            <label className="cursor-pointer">
              <div
                className={`
                  px-8 py-5 text-xl font-black uppercase text-center
                  border-4 border-black
                  ${
                    isProcessingFile
                      ? "bg-gray-300 cursor-not-allowed"
                      : "bg-yellow-400 hover:bg-yellow-300 shadow-[8px_8px_0_#000] hover:shadow-[12px_12px_0_#000]"
                  }
                `}
              >
                {isProcessingFile ? "PROCESSING..." : "UPLOAD PDF"}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                disabled={isProcessingFile}
                className="hidden"
              />
            </label>

            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isGenerating || !hasDocument}
              className={`
                px-10 py-5 text-xl font-black uppercase
                border-4 border-black
                ${
                  !inputValue.trim() || isGenerating || !hasDocument
                    ? "bg-gray-300 cursor-not-allowed"
                    : "bg-black text-white shadow-[8px_8px_0_#000] hover:shadow-[12px_12px_0_#000] hover:bg-yellow-400 hover:text-black"
                }
              `}
            >
              SEND
            </button>
          </div>
        </div>

        <p className="text-center text-sm font-bold mt-4 uppercase tracking-wider">
          Your document stays local • No data leaves your device
        </p>
      </div>
    </div>
  );
}
