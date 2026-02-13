// src/components/UploadDocument.jsx
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { addFolder, getFolders } from "../services/db";

export default function UploadDocument() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFolder, setSelectedFolder] = useState("Root");
  const [showSelectFolder, setShowSelectFolder] = useState(false);
  const [userFolders, setUserFolders] = useState();
  const [addNewFolder, setAddNewFolder] = useState(true);
  const [newFolder, setNewFolder] = useState();

  useEffect(() => {
    const getUserFolders = async () => {
      let folders = await getFolders();
      const hasRoot = folders.some((f) => f.folderName == "Root");
      if (!hasRoot) {
        await addFolder("Root");
        folders = await getFolders();
        setUserFolders(folders);
      } else setUserFolders(folders);

      console.log(folders);
    };
    getUserFolders();
  }, []);

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
                <span className="font-medium">{selectedFolder}</span>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowSelectFolder(true);
                }}
                className="flex-1 py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
              >
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

        {showSelectFolder && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            {/* Modal card */}
            <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 w-full max-w-md p-6 m-4">
              {/* Modal title */}
              <h3 className="text-xl font-bold text-center mb-6 text-white">
                Choose Folder
              </h3>

              {/* Folder list area */}
              <div className="max-h-64 overflow-y-auto space-y-2 mb-6">
                {/* Placeholder for folder items - you will map userFolders here */}
                {userFolders.map((f) => {
                  return (
                    <button
                      key={f.id}
                      onClick={() => {
                        setSelectedFolder(f.folderName);
                      }}
                      className={`
                              w-full p-4 text-left rounded-lg transition-colors font-medium
                              ${
                                selectedFolder === f.folderName
                                  ? "bg-blue-700 text-white border-2 border-blue-500 shadow-md"
                                  : "bg-gray-700 text-gray-200 hover:bg-gray-600 border border-gray-600"
                              }
                              `}
                    >
                      <span className="text-gray-200">{f.folderName}</span>
                    </button>
                  );
                })}

                {/* More buttons will come here when you map */}
              </div>

              {/* Buttons row */}
              <div className="flex gap-4">
                {/* New Folder button */}
                <button
                  onClick={() => {
                    setAddNewFolder(true);
                  }}
                  className="flex-1 py-3 px-6 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
                >
                  New Folder
                </button>

                {/* Select Folder button (for current selection) */}
                <button
                  onClick={() => {
                    setShowSelectFolder(false);
                  }}
                  className="flex-1 py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                >
                  Select Folder
                </button>
              </div>

              {/* New folder input - shown when New Folder clicked (placeholder) */}
              {addNewFolder && (
                <div className="mt-6 ">
                  <input
                    type="text"
                    placeholder="Enter new folder name..."
                    className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  />

                  <div className="flex gap-4 mt-4">
                    <button className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                      Create
                    </button>
                    <button className="flex-1 py-3 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Close modal button */}
              <button
                onClick={() => setShowSelectFolder(false)}
                className="mt-6 w-full py-3 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
