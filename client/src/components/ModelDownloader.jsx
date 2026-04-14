// src/components/ModelDownloader.jsx
import { useState, useEffect } from "react";
import { isModelDownloaded, saveModelBlobs } from "../services/db";
import toast from "react-hot-toast";
import { FaDownload, FaCheckCircle } from "react-icons/fa";

const SLM_NAME = "slm";

// ←←← CHANGED TO LIGHTER MODEL FOR SMOOTH EXPERIENCE (Recommended)
const SLM_MODEL = "Qwen2.5-0.5B-Instruct-q4f16_1-MLC"; // Much lighter & smoother

export default function ModelDownloader() {
  const [slmDownloaded, setSlmDownloaded] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");

  useEffect(() => {
    isModelDownloaded(SLM_NAME).then(setSlmDownloaded);
  }, []);

  async function downloadSLM() {
    setDownloading(true);
    setProgress(0);
    setStatus("Initializing Qwen 0.5B...");

    try {
      toast.loading("Downloading generation model (~250 MB)..."); // Smaller size

      const { CreateWebWorkerMLCEngine } = await import("@mlc-ai/web-llm");

      await CreateWebWorkerMLCEngine(
        new Worker(new URL("../utils/webllm.worker.js", import.meta.url), {
          type: "module",
        }),
        SLM_MODEL,
        {
          initProgressCallback: (report) => {
            setStatus(report.text);
            const match = report.text.match(/(\d+)%/);
            if (match) setProgress(parseInt(match[1]));
          },
        },
      );

      await saveModelBlobs(SLM_NAME, []);
      setSlmDownloaded(true);
      toast.success("Generation model ready (much smoother now)");
    } catch (err) {
      console.error(err);
      toast.error("Failed to download model: " + err.message);
    } finally {
      setDownloading(false);
      setStatus("");
    }
  }

  return (
    <div className="p-6 bg-gray-900/30 backdrop-blur-xl border border-white/10 rounded-3xl">
      <h2 className="text-2xl font-bold text-orange-400 mb-6 text-center">
        Initialize Vault AI
      </h2>

      {/* SLM / Generation Model */}
      <div>
        {slmDownloaded ? (
          <div className="flex flex-col items-center justify-center p-8 bg-gradient-to-br from-orange-900/40 to-orange-600/10 border border-orange-500/30 rounded-3xl shadow-[0_0_30px_rgba(249,115,22,0.15)] backdrop-blur-md transition-all duration-500 hover:shadow-[0_0_40px_rgba(249,115,22,0.25)]">
            <div className="w-20 h-20 bg-orange-500/20 rounded-full flex items-center justify-center mb-5 border border-orange-500/40 relative">
              <div className="absolute inset-0 rounded-full bg-orange-500/20 blur-xl animate-pulse"></div>
              <FaCheckCircle className="text-5xl text-orange-400 drop-shadow-[0_0_15px_rgba(249,115,22,0.8)] relative z-10" />
            </div>
            <h3 className="text-2xl font-black text-white mb-2 tracking-wide text-center drop-shadow-md">
              Vault AI is Ready
            </h3>
            <p className="text-gray-300 text-sm text-center leading-relaxed">
              Qwen 0.5B is securely cached in your browser.
              <br />
              Much smoother generation • Your documents never leave your device.
            </p>
          </div>
        ) : (
          <button
            onClick={downloadSLM}
            disabled={downloading}
            className="w-full py-4 bg-orange-600 hover:bg-orange-500 rounded-2xl font-bold flex items-center justify-center gap-3 disabled:opacity-50"
          >
            <FaDownload /> Download Generation Model (~250 MB)
          </button>
        )}
      </div>

      {/* Progress */}
      {downloading && (
        <div className="mt-6 text-center">
          <div className="text-sm text-gray-400 mb-2">{status}</div>
          {progress > 0 && (
            <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-orange-500 h-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-gray-500 text-center mt-8">
        One-time download required for fully offline AI functionality
      </p>
    </div>
  );
}
