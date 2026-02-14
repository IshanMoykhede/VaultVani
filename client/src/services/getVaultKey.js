// getVaultKey.js
import axios from "axios";
import { derivePBKDF2Key, decryptData } from "./CryptoServices";
import { toast } from "react-toastify";

const unlockVaultKey = async (userId) => {
  const encryptedRes = await axios.get(
    `http://localhost:8000/api/auth/vault-key/${userId}`,
    { withCredentials: true },
  );

  const { encryptedVaultKey, iv, salt } = encryptedRes.data;

  const password = prompt("Enter your password to unlock the vault");
  if (!password) return null;

  const derivedKey = await derivePBKDF2Key(password, new Uint8Array(salt));

  const decryptedVaultKeyBytes = await decryptData(
    derivedKey,
    new Uint8Array(encryptedVaultKey),
    new Uint8Array(iv),
  );

  const vaultKey = await crypto.subtle.importKey(
    "raw",
    decryptedVaultKeyBytes,
    "AES-GCM",
    false,
    ["encrypt", "decrypt"],
  );

  return vaultKey; // ✅ RETURN IT
};

export default unlockVaultKey;
