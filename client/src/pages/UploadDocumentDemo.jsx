// src/components/UploadDocument.jsx
import { useState } from "react";
import { toast } from "react-toastify";

export default function UploadDocument() {
  const [selectedFile, setSelectedFile] = useState(null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    console.log(file);

    if (!file) {
      toast.error("Please select a file");
      return;
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast.warning("Only PDF files are accepted at the moment");
      return;
    }

    setSelectedFile(file);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center p-6">
      {/* Main centered card */}
      <div className="w-full max-w-lg bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-8">
        {/* Heading */}
        <h2 className="text-3xl font-bold text-center mb-8 text-white">
          Upload Document
        </h2>

        {/* Dropzone - shown when no file */}
        {!selectedFile && (
          <label className="block cursor-pointer">
            <div className="w-full p-12 border-2 border-dashed border-gray-600 rounded-xl text-center hover:border-blue-500 transition-colors">
              <p className="text-xl font-medium mb-2">
                Click or drop your PDF here
              </p>
              <p className="text-sm text-gray-400">Only PDF files supported</p>
            </div>

            <input
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>
        )}

        {/* Selected file info - shown when file is selected */}
        {selectedFile && (
          <div className="bg-gray-700 rounded-xl p-6 border border-gray-600">
            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-300">File name:</span>
                <span className="font-medium">{selectedFile.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Size:</span>
                <span className="font-medium">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Folder:</span>
                <span className="font-medium">Root</span>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-4">
              <button className="flex-1 py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium">
                Select Folder
              </button>

              <button
                onClick={() => {
                  setSelectedFile(null);
                }}
                className="flex-1 py-3 px-6 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
              >
                Remove File
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
