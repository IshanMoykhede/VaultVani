import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <div>Loading...</div>; // ⬅ WAIT HERE

  return isAuthenticated ? children : <Navigate to="/signIn" replace />;
};

export default ProtectedRoute;
