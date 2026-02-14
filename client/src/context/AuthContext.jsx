// src/context/AuthContext.jsx

import { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";
// import { derivePBKDF2Key, decryptData } from "../services/CryptoServices"; // Assuming decryptData added
// import { toast } from "react-toastify";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [vaultKey, setVaultKey] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await axios.get("http://localhost:8000/api/auth/get-user", {
          withCredentials: true,
        });

        if (res.data.success) {
          setUser(res.data.user);
          setIsAuthenticated(true);

          // NEW: Unlock vault key on load/reload
          // await unlockVaultKey(res.data.user._id);
        }
      } catch (error) {
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // NEW: Function to unlock vault key (prompt password, fetch encrypted data, decrypt)
  // const unlockVaultKey = async (userId) => {
  //   try {
  //     const encryptedRes = await axios.get(
  //       `http://localhost:8000/api/auth/vault-key/${userId}`,
  //       {
  //         withCredentials: true,
  //       },
  //     );

  //     const { encryptedVaultKey, iv, salt } = encryptedRes.data;

  //     if (!encryptedVaultKey || !iv || !salt) {
  //       toast.error("Vault key data not found – contact support");
  //       return;
  //     }

  //     // Prompt for password (UX can be improved to modal)
  //     const password = prompt("Enter your password to unlock the vault");
  //     if (!password) {
  //       toast.warn("Vault unlock cancelled – some features disabled");
  //       return;
  //     }

  //     // Derive PBKDF2 key from password + salt
  //     const derivedKey = await derivePBKDF2Key(password, new Uint8Array(salt));

  //     // Decrypt Vault Key
  //     const decryptedVaultKeyBytes = await decryptData(
  //       derivedKey,
  //       new Uint8Array(encryptedVaultKey),
  //       new Uint8Array(iv),
  //     );

  //     // Import back as CryptoKey
  //     const vaultKey = await crypto.subtle.importKey(
  //       "raw",
  //       decryptedVaultKeyBytes,
  //       "AES-GCM",
  //       false,
  //       ["encrypt", "decrypt"],
  //     );

  //     setVaultKey(vaultKey);
  //     toast.success("Vault unlocked successfully!");
  //   } catch (err) {
  //     console.error("Vault unlock failed:", err);
  //     toast.error("Failed to unlock vault – check password or try again");
  //   }
  // };

  // Set Vault Key after auth (for signup if needed)
  // const setVaultKeyAfterAuth = (key) => {
  //   setVaultKey(key);
  // };

  // Clear on logout
  // const clearVaultKey = () => {
  //   setVaultKey(null);
  // };

  return (
    <AuthContext.Provider
      value={{
        loading,
        isAuthenticated,
        user,
        setUser,
        setIsAuthenticated,
        vaultKey,
        setVaultKey,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
