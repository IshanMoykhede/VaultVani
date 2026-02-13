import Dexie from "dexie";

const db = new Dexie("VaultVaniDB");
db.version(1).stores({
  models: "name, blobs, downloaded, version",
  folders: "++id, folderName, createdAt",
  documents:
    "++id, fileName, folderId, uploadDate, fileSize, mimeType, backendFileId",
  chunks: "++id, documentId, chunkIdx, encryptedText, iv, embedding",
  blobs: "id",
  userKeys: "userId",
});

// Existing functions (unchanged)
export async function isModelDownloaded(name) {
  const record = await db.models.get(name);
  return !!record && record.downloaded === true;
}

export async function getFolders() {
  const allFolders = await db.folders.toArray();
  return allFolders ? allFolders : [];
}

export async function saveModelBlobs(name, blobs) {
  await db.models.put({ name, blobs, downloaded: true });
}

export async function getModelBlobs(name) {
  const record = await db.models.get(name);
  return record ? record.blobs : [];
}

export async function addFolder(folderName) {
  const createdAt = new Date().toISOString(); // better than toLocaleDateString
  await db.folders.add({ folderName, createdAt });
  return await db.folders.where("folderName").equals(folderName).first(); // return new folder
}

// NEW: Add document metadata & return ID
export async function addDocument(docData) {
  const id = await db.documents.add({
    ...docData,
    uploadDate: new Date().toISOString(),
    mimeType: "application/pdf", // default
  });
  return id;
}

// NEW: Save one encrypted chunk
export async function addEncryptedChunk(chunkData) {
  await db.chunks.add(chunkData);
}

// NEW: Bulk save all encrypted chunks (faster)
export async function bulkAddEncryptedChunks(chunksArray) {
  await db.chunks.bulkAdd(chunksArray);
}
