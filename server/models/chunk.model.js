import mongoose from "mongoose";

const chunkSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    documentId: { type: String, required: true },
    chunkIdx: { type: Number, required: true },
    encryptedText: { type: [Number], required: true },
    iv: { type: [Number], required: true },
    embedding: { type: [Number], required: true },
  },
  { timestamps: true },
);

export const Chunk = mongoose.model("Chunk", chunkSchema);
