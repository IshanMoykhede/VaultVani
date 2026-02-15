// models/folder.model.js

import mongoose from "mongoose";

const folderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    folderName: {
      type: String,
      required: true,
    },

    fileStored: {
      type: [mongoose.Schema.Types.ObjectId],
      required: false,
    },
  },
  { timestamps: true },
);

const folderCollection = mongoose.model("Folder", folderSchema);
export default folderCollection;
