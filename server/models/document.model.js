// models/document.model.js

import mongoose from "mongoose";

const documentSchema = new mongoose.Schema(
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

    fileSize: {
      type: Number,
      required: true,
    },

    uploadDate: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);
const documentCollection = mongoose.model("Document", documentSchema);
export default documentCollection;
