import { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";

// 1️⃣ Create CONTEXT (container)
const AuthContext = createContext(null);

// 2️⃣ Create PROVIDER (component)
export const AuthProvider = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  // console.log("Context mounted");

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await axios.get("http://localhost:8000/api/auth/get-user", {
          withCredentials: true,
        });

        if (res.data.success) {
          setUser(res.data.user);
          setIsAuthenticated(true);
          console.log(res.data.user);
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

  return (
    <AuthContext.Provider
      value={{
        loading,
        isAuthenticated,
        user,
        setUser,
        setIsAuthenticated,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// 3️⃣ Custom hook (clean usage everywhere)
export const useAuth = () => useContext(AuthContext);
