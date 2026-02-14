import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router-dom";
import unlockVaultKey from "../services/getVaultKey";

const SecurityRouteForUploadDocument = ({ children }) => {
  const { isAuthenticated, loading, vaultKey, user, setVaultKey } = useAuth();
  const [unlocking, setUnlocking] = useState(false);
  useEffect(() => {
    const unlock = async () => {
      if (isAuthenticated && user?._id) {
        setUnlocking(true);
        const key = await unlockVaultKey(user._id);
        if (key) setVaultKey(key);
        setUnlocking(false);
      }
    };

    unlock();
  }, [user, isAuthenticated]);
  if (loading || unlocking) {
    return <div>Unlocking Vault...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/signIn" replace />;
  }

  if (!vaultKey) {
    return <div>Vault Locked</div>;
  }

  return children;
};

export default SecurityRouteForUploadDocument;
