// src/components/ModelDownloader.jsx
import { useState, useEffect } from "react";
import { isModelDownloaded, saveModelBlobs } from "../services/db";
import toast from "react-hot-toast";
import { FaDownload, FaCheckCircle } from "react-icons/fa";

const EMBEDDING_NAME = "embedding";
const SLM_NAME = "slm";
const BASE_URL = "https://huggingface.co/Xenova/all-MiniLM-L6-v2/resolve/main/";

const EMBEDDING_FILES = [
  "config.json",
  "tokenizer.json",
  "tokenizer_config.json",
  "vocab.txt",
  "special_tokens_map.json",
  "onnx/model.onnx",
];

const SLM_MODEL = "gemma-2-2b-it-q4f16_1-MLC";

export default function ModelDownloader() {
  const [embeddingDownloaded, setEmbeddingDownloaded] = useState(false);
  const [slmDownloaded, setSlmDownloaded] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");

  useEffect(() => {
    isModelDownloaded(EMBEDDING_NAME).then(setEmbeddingDownloaded);
    isModelDownloaded(SLM_NAME).then(setSlmDownloaded);
  }, []);

  async function downloadEmbedding() {
    setDownloading(true);
    setProgress(0);
    toast.loading("Downloading embedding model...");

    const blobs = [];

    try {
      for (let i = 0; i < EMBEDDING_FILES.length; i++) {
        const file = EMBEDDING_FILES[i];
        setStatus(`Fetching ${file}...`);

        const url = BASE_URL + file;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed ${file}`);

        const blob = await response.blob();
        blobs.push({ file, blob });

        setProgress(Math.round(((i + 1) / EMBEDDING_FILES.length) * 100));
      }

      await saveModelBlobs(EMBEDDING_NAME, blobs);
      setEmbeddingDownloaded(true);
      toast.success("Embedding model ready!");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDownloading(false);
      setStatus("");
    }
  }

  async function downloadSLM() {
    setDownloading(true);
    setProgress(0);
    setStatus("Initializing SLM...");
    toast.loading("Downloading generation model...");

    try {
      const { CreateMLCEngine } = await import("@mlc-ai/web-llm");

      await CreateMLCEngine(SLM_MODEL, {
        initProgressCallback: (report) => {
          setStatus(report.text);
          // Rough progress parsing from WebLLM string
          const match = report.text.match(/(\d+)%/);
          if (match) setProgress(parseInt(match[1]));
        },
      });

      await saveModelBlobs(SLM_NAME, []); // WebLLM caches itself
      setSlmDownloaded(true);
      toast.success("Generation model ready!");
    } catch (err) {
      console.error("SLM error:", err);
      toast.error("SLM failed: " + err.message);
    } finally {
      setDownloading(false);
      setStatus("");
    }
  }

  return (
    <div className="flex flex-col items-center gap-8 max-w-lg mx-auto">
      {/* Embedding Status */}
      <div className="w-full">
        {embeddingDownloaded ? (
          <div className="flex items-center justify-center gap-4 px-8 py-5 bg-black/45 backdrop-blur-2xl border border-purple-900/25 rounded-full shadow-xl">
            <FaCheckCircle className="text-green-400 text-2xl animate-pulse" />
            <span className="text-green-300 font-medium">Embedding Ready</span>
          </div>
        ) : (
          <button
            onClick={downloadEmbedding}
            disabled={downloading}
            className="w-full px-8 py-5 bg-gradient-to-r from-amber-700 via-purple-700 to-indigo-700 hover:from-amber-600 hover:via-purple-600 hover:to-indigo-600 text-white font-medium rounded-full transition-all shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center justify-center gap-3"
          >
            <FaDownload />
            Download Embedding Model
          </button>
        )}
      </div>

      {/* SLM Status */}
      <div className="w-full">
        {slmDownloaded ? (
          <div className="flex items-center justify-center gap-4 px-8 py-5 bg-black/45 backdrop-blur-2xl border border-purple-900/25 rounded-full shadow-xl">
            <FaCheckCircle className="text-green-400 text-2xl animate-pulse" />
            <span className="text-green-300 font-medium">Generation Ready</span>
          </div>
        ) : (
          <button
            onClick={downloadSLM}
            disabled={downloading}
            className="w-full px-8 py-5 bg-gradient-to-r from-amber-700 via-purple-700 to-indigo-700 hover:from-amber-600 hover:via-purple-600 hover:to-indigo-600 text-white font-medium rounded-full transition-all shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center justify-center gap-3"
          >
            <FaDownload />
            Download Generation Model (~650 MB)
          </button>
        )}
      </div>

      {downloading && (
        <div className="text-amber-400 text-sm font-medium mt-4">
          {status || `Downloading... ${progress}%`}
        </div>
      )}

      <p className="text-gray-500 text-sm text-center mt-4">
        One-time downloads required for full offline AI
      </p>
    </div>
  );
}
