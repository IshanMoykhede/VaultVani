import filesCollection from "../models/files.model.js";

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
