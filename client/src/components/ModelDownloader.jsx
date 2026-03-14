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
        if (!response.ok) throw new Error(`Failed: ${file}`);

        const blob = await response.blob();
        blobs.push({ file, blob });

        setProgress(Math.round(((i + 1) / EMBEDDING_FILES.length) * 100));
      }

      await saveModelBlobs(EMBEDDING_NAME, blobs);
      setEmbeddingDownloaded(true);
      toast.success("Embedding model downloaded");
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
    setStatus("Initializing model...");
    toast.loading("Downloading generation model...");

    try {
      const { CreateMLCEngine } = await import("@mlc-ai/web-llm");

      await CreateMLCEngine(SLM_MODEL, {
        initProgressCallback: (report) => {
          setStatus(report.text);
          const match = report.text.match(/(\d+)%/);
          if (match) setProgress(parseInt(match[1]));
        },
      });

      await saveModelBlobs(SLM_NAME, []); // WebLLM handles caching
      setSlmDownloaded(true);
      toast.success("Generation model ready");
    } catch (err) {
      console.error("SLM download error:", err);
      toast.error("Failed to load model: " + err.message);
    } finally {
      setDownloading(false);
      setStatus("");
    }
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-md mx-auto">
      {/* Embedding */}
      <div className="w-full">
        {embeddingDownloaded ? (
          <div className="flex items-center justify-center gap-3 px-6 py-4 bg-gray-900/30 backdrop-blur-xl border border-orange-500/20 rounded-2xl shadow-xl shadow-black/40 text-green-400">
            <FaCheckCircle className="text-2xl" />
            <span className="font-medium text-lg">Embedding Model Ready</span>
          </div>
        ) : (
          <button
            onClick={downloadEmbedding}
            disabled={downloading}
            className={`
              w-full px-6 py-4 rounded-2xl font-medium text-lg
              bg-orange-600/80 text-white border border-orange-400/30
              hover:bg-orange-500 hover:border-orange-300/50
              hover:shadow-orange-900/40 transition-all duration-300
              shadow-lg shadow-orange-900/30 flex items-center justify-center gap-3
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            <FaDownload className="text-xl" />
            Download Embedding Model
          </button>
        )}
      </div>

      {/* SLM / Generation Model */}
      <div className="w-full">
        {slmDownloaded ? (
          <div className="flex items-center justify-center gap-3 px-6 py-4 bg-gray-900/30 backdrop-blur-xl border border-orange-500/20 rounded-2xl shadow-xl shadow-black/40 text-green-400">
            <FaCheckCircle className="text-2xl" />
            <span className="font-medium text-lg">Generation Model Ready</span>
          </div>
        ) : (
          <button
            onClick={downloadSLM}
            disabled={downloading}
            className={`
              w-full px-6 py-4 rounded-2xl font-medium text-lg
              bg-orange-600/80 text-white border border-orange-400/30
              hover:bg-orange-500 hover:border-orange-300/50
              hover:shadow-orange-900/40 transition-all duration-300
              shadow-lg shadow-orange-900/30 flex items-center justify-center gap-3
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            <FaDownload className="text-xl" />
            Download Generation Model (~650 MB)
          </button>
        )}
      </div>

      {/* Status / Progress */}
      {downloading && (
        <div className="w-full text-center">
          <div className="text-orange-400 font-medium mb-2">
            {status || "Downloading..."}
          </div>
          {progress > 0 && progress < 100 && (
            <div className="w-full bg-gray-800 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-orange-500 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      )}

      <p className="text-gray-500 text-sm text-center mt-4 leading-relaxed">
        One-time download required for fully offline AI functionality
      </p>
    </div>
  );
}
