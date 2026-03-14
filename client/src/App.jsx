import React from "react";
import Home from "./pages/Home";
import SignUp from "./pages/SignUp";
import { Routes, Route } from "react-router-dom";
import SignIn from "./pages/SignIn";
import { ToastContainer } from "react-toastify";
import ForgotPassword from "./pages/ForgotPassword";
import VerifyOTP from "./pages/VerifyOtp";
import ResetPassword from "./pages/ResetPassword";
// import PDFTest from "./pages/PdfTest";
import ProtectedRoutes from "./components/ProtectedRoutes";
import Dashboard from "./pages/Dashboard";
import { useAuth } from "./context/AuthContext";
import UploadDocument from "./pages/UploadDocument";
import UploadDocumentDemo from "./pages/UploadDocumentDemo.jsx";
import SecurityRouteForUploadDocument from "./components/SecurityRouteForUploadDocument.jsx";
import RAGDemo from "./pages/RagDemo.jsx";
import Browse from "./pages/Browse.jsx";
import Files from "./pages/Files.jsx";
import { Toaster } from "react-hot-toast";
// import BrowseDocuments from "./pages/BrowseDocuments.jsx";
// import AIAssistant from "./pages/AIAssistant.jsx";
// import toast from "react-hot-toast";

const App = () => {
  const { isAuthenticated } = useAuth();
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/signUp" element={<SignUp />} />
        <Route path="/signIn" element={<SignIn />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/verify-otp" element={<VerifyOTP />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoutes>
              <Dashboard />
            </ProtectedRoutes>
          }
        />
        <Route
          path="/ai-assistant"
          element={
            <SecurityRouteForUploadDocument>
              <RAGDemo />
            </SecurityRouteForUploadDocument>
          }
        />
        <Route
          path="/upload"
          element={
            <SecurityRouteForUploadDocument>
              <UploadDocument />
            </SecurityRouteForUploadDocument>
          }
        />
        <Route
          path="/browse"
          element={
            <SecurityRouteForUploadDocument>
              <Browse />
            </SecurityRouteForUploadDocument>
          }
        />
        <Route
          path="/files/:folderId"
          element={
            <ProtectedRoutes>
              <Files />
            </ProtectedRoutes>
          }
        />
      </Routes>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            background: "#1f2937",
            color: "#fff",
            border: "1px solid #f97316",
          },
        }}
      />
    </>
  );
};

export default App;
