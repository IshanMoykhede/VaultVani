import folderCollection from "../models/folder.model.js";

const createFolder = async (req, res) => {
  try {
    const userId = req.id;
    const { folderName } = req.body;
    if (!folderName) {
      return res.status(400).json({
        success: false,
        message: "FolderName is required",
      });
    }

    const newFolder = await folderCollection.create({
      userId,
      folderName,
      fileStored: [],
    });

    return res.status(201).json({
      success: true,
      message: `${folderName} created successfully`,
      folder: newFolder,
    });
  } catch (error) {
    return res.status(500).json({
      success: fasle,
      message: error.message,
    });
  }
};

const getFolders = async (req, res) => {
  try {
    const userId = req.id; // coming from auth middleware

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // 🔹 Get all folders of logged-in user
    const allFolders = await folderCollection.find({ userId });

    return res.status(200).json({
      success: true,
      folders: allFolders,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export { getFolders, createFolder };
