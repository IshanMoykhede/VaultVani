import { Chunk } from "../models/chunk.model.js";

export const uploadChunks = async (req, res) => {
  try {
    const { chunks } = req.body;

    if (!chunks || !Array.isArray(chunks) || chunks.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No chunks provided" });
    }

    const userId = req.id;

    // Attach current user's ID to every single chunk securely
    const chunksWithUserId = chunks.map((chunk) => ({
      ...chunk,
      userId,
    }));

    await Chunk.insertMany(chunksWithUserId);

    return res
      .status(200)
      .json({ success: true, message: "Chunks saved successfully to MongoDB" });
  } catch (error) {
    console.log("Error in uploadChunks:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

export const getAllChunks = async (req, res) => {
  try {
    const userId = req.id;
    // Fast fetch explicitly for the authorized user
    const chunks = await Chunk.find({ userId })
      .select("-userId -createdAt -updatedAt -__v")
      .lean();

    // Map them back to exactly what the frontend RAGDemo.jsx expects
    const formattedChunks = chunks.map((c) => ({
      id: c._id,
      documentId: c.documentId,
      chunkIdx: c.chunkIdx,
      encryptedText: c.encryptedText,
      iv: c.iv,
      embedding: c.embedding,
    }));

    res.status(200).json({ success: true, chunks: formattedChunks });
  } catch (error) {
    console.log("Error in getAllChunks:", error.message);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
