import filesCollection from "../models/files.model.js";
import folderCollection from "../models/folder.model.js";
import { Chunk } from "../models/chunk.model.js";
import mongoose from "mongoose";

export const uploadEncryptedDocument = async (req, res) => {
  try {
    const userId = req.id;

    const { fileName, folderId, fileSize, mimeType, iv } = req.body;

    if (!fileName || !fileSize || !mimeType || !iv) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Encrypted file missing",
      });
    }

    const newDoc = await filesCollection.create({
      userId,
      folderId: folderId || null,
      fileName,
      fileSize,
      mimeType,
      encryptedFile: req.file.buffer,
      iv: JSON.parse(iv), // 🔥 IMPORTANT
    });

    const folder = await folderCollection.findById(folderId);
    folder.fileStored = [...folder.fileStored, newDoc._id];
    await folder.save();

    res.status(201).json({
      success: true,
      documentId: newDoc._id,
    });
  } catch (error) {
    console.error("Upload error FULL:", error); // log full error
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get list of user's documents
export const getMyDocuments = async (req, res) => {
  try {
    const userId = req.id;
    const { folderId } = req.query;

    const documents = await filesCollection
      .find({
        userId: new mongoose.Types.ObjectId(userId),
        folderId: new mongoose.Types.ObjectId(folderId),
      })
      .select(" -encryptedFile -iv ");

    res.status(200).json({
      success: true,
      documents,
    });
  } catch (error) {
    console.error("Get my documents error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Download encrypted file + IV
export const downloadEncryptedFile = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.id;

    const doc = await filesCollection.findOne({ _id: id, userId });

    if (!doc) {
      return res
        .status(404)
        .json({ success: false, message: "File not found or unauthorized" });
    }

    res.set({
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${doc.fileName}"`,
      "X-Encrypted-IV": JSON.stringify(doc.iv),
      "X-File-Name": doc.fileName,
      "X-Mime-Type": doc.mimeType,
    });

    res.send(doc.encryptedFile);
  } catch (error) {
    console.error("Download encrypted file error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Cascading Chunk & Document Deletion natively
export const deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.id;

    // 1. Locate the file visually to intercept its folder location naturally
    const doc = await filesCollection.findOne({ _id: id, userId });
    if (!doc) {
      return res.status(404).json({ success: false, message: "Document strictly not found" });
    }
    
    // 2. Extrapolate document from folder tree arrays natively preventing ghost references
    if (doc.folderId) {
      await folderCollection.updateOne(
        { _id: doc.folderId, userId },
        { $pull: { fileStored: doc._id } }
      );
    }

    // 3. Delete Document core safely
    await filesCollection.deleteOne({ _id: id, userId });

    // 4. Cascade wipe all RAG indices mapped identically to that Mongo document string
    await Chunk.deleteMany({ documentId: id.toString(), userId });

    res.status(200).json({ success: true, message: "Safely erased document & contextual AI matrices completely" });
  } catch (error) {
    console.error("Deletion error:", error);
    res.status(500).json({ success: false, message: "Deletion algorithm structurally failed" });
  }
};
