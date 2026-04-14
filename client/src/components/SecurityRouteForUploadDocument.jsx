import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router-dom";
import unlockVaultKey from "../services/getVaultKey";
import VaultUnlockModal from "./VaultUnlockModal";
import { toast } from "react-hot-toast";

const SecurityRouteForUploadDocument = ({ children }) => {
  const { isAuthenticated, loading, vaultKey, user, setVaultKey } = useAuth();
  const [unlocking, setUnlocking] = useState(false);

  const handleModalUnlock = async (password) => {
    setUnlocking(true);
    try {
      const key = await unlockVaultKey(user?._id, password);
      if (key) {
        setVaultKey(key);
        toast.success("Vault Unlocked");
      } else {
        toast.error("Invalid password. Please try again.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to unlock vault");
    } finally {
      setUnlocking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/signIn" replace />;
  }

  if (!vaultKey) {
    return <VaultUnlockModal onUnlock={handleModalUnlock} isLoading={unlocking} />;
  }

  return children;
};

export default SecurityRouteForUploadDocument;
