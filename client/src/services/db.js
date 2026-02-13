import Dexie from "dexie";

const db = new Dexie("VaultVaniDB");
db.version(1).stores({
  models: "name, blobs, downloaded, version", // auto-increment id + name as unique index

  folders: "++id, folderName, createdAt ",

  documents:
    "++id, fileName, folderName, folderId, uploadDate, fileSize, backendFileId",

  chunks: "++id, documentId, chunkIdx, encryptedText, embedding",
});

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
  const createdAt = new Date().toLocaleDateString(); // this will return a string of today date
  await db.folders.put({ FolderName, createdAt });
}
