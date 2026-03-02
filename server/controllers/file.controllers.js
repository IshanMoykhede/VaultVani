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

// Get list of user's documents
export const getMyDocuments = async (req, res) => {
  try {
    const userId = req.id;

    const documents = await filesCollection
      .find({ userId })
      .select("fileName fileSize mimeType createdAt _id")
      .sort({ createdAt: -1 })
      .lean();

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
