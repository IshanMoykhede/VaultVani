// models/encryptedFile.model.js

import mongoose from "mongoose";

const encryptedFileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },

    fileName: {
      type: String,
      required: true,
    },

    folderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Folder",
      default: null,
    },

    encryptedFile: {
      type: Buffer, // 🔐 Encrypted binary data
      required: true,
    },

    iv: {
      type: [Number], // AES-GCM IV (12 bytes)
      required: true,
    },

    fileSize: {
      type: Number,
      required: true,
    },

    mimeType: {
      type: String,
      default: "application/pdf",
    },
  },
  { timestamps: true },
);

const filesCollection = mongoose.model("EncryptedFile", encryptedFileSchema);
export default filesCollection;
