import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { useAuth } from "../context/useAuth";
import ProtectedRoute from "../components/auth/ProtectedRoute";

import Login from "../pages/Login/Login";

import AdminDashboard from "../pages/admin/Dashboard";
import ManageIssuers from "../pages/admin/ManageIssuers";
import BlockchainMonitor from "../pages/admin/BlockchainMonitor";
import AuditLogs from "../pages/admin/AuditLogs";

import IssuerDashboard from "../pages/issuer/Dashboard";
import IssueDocument from "../pages/issuer/IssueDocument";
import DocumentRegistry from "../pages/issuer/DocumentRegistry";
import RevokedDocuments from "../pages/issuer/RevokedDocuments";
import IssuerProfile from "../pages/issuer/Profile";

import CitizenDashboard from "../pages/citizen/Dashboard";
import VerifyDocument from "../pages/citizen/VerifyDocument";
import MyDocuments from "../pages/citizen/MyDocuments";
import VerificationHistory from "../pages/citizen/VerificationHistory";

const ROLE_HOME = {
  admin: "/admin/dashboard",
  issuer: "/issuer/dashboard",
  citizen: "/citizen/dashboard",
};

function RootRedirect() {
  const { address, role } = useAuth();

  if (!address) return <Login />;

  return <Navigate to={ROLE_HOME[role] || "/"} replace />;
}

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootRedirect />} />

        {/* Admin Portal */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/issuers"
          element={
            <ProtectedRoute allowedRole="admin">
              <ManageIssuers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/monitor"
          element={
            <ProtectedRoute allowedRole="admin">
              <BlockchainMonitor />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/audit-logs"
          element={
            <ProtectedRoute allowedRole="admin">
              <AuditLogs />
            </ProtectedRoute>
          }
        />

        {/* Issuer Portal */}
        <Route
          path="/issuer/dashboard"
          element={
            <ProtectedRoute allowedRole="issuer">
              <IssuerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/issuer/issue"
          element={
            <ProtectedRoute allowedRole="issuer">
              <IssueDocument />
            </ProtectedRoute>
          }
        />
        <Route
          path="/issuer/documents"
          element={
            <ProtectedRoute allowedRole="issuer">
              <DocumentRegistry />
            </ProtectedRoute>
          }
        />
        <Route
          path="/issuer/revoked"
          element={
            <ProtectedRoute allowedRole="issuer">
              <RevokedDocuments />
            </ProtectedRoute>
          }
        />
        <Route
          path="/issuer/profile"
          element={
            <ProtectedRoute allowedRole="issuer">
              <IssuerProfile />
            </ProtectedRoute>
          }
        />

        {/* Citizen Portal */}
        <Route
          path="/citizen/dashboard"
          element={
            <ProtectedRoute allowedRole="citizen">
              <CitizenDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/citizen/verify"
          element={
            <ProtectedRoute allowedRole="citizen">
              <VerifyDocument />
            </ProtectedRoute>
          }
        />
        <Route
          path="/citizen/my-documents"
          element={
            <ProtectedRoute allowedRole="citizen">
              <MyDocuments />
            </ProtectedRoute>
          }
        />
        <Route
          path="/citizen/history"
          element={
            <ProtectedRoute allowedRole="citizen">
              <VerificationHistory />
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;
