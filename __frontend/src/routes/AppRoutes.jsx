import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import ProtectedRoute from "../components/auth/ProtectedRoute";

import Home from "../pages/Home/Home";
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
import ClaimInstitution from "../pages/citizen/ClaimInstitution";
import CitizenRequests from "../pages/citizen/CitizenRequests";

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/verify" element={<VerifyDocument />} />
        <Route path="/verify/:documentHash" element={<VerifyDocument />} />

        {/* Admin Portal */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRoles="ADMIN">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/issuers"
          element={
            <ProtectedRoute allowedRoles="ADMIN">
              <ManageIssuers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/monitor"
          element={
            <ProtectedRoute allowedRoles="ADMIN">
              <BlockchainMonitor />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/audit-logs"
          element={
            <ProtectedRoute allowedRoles="ADMIN">
              <AuditLogs />
            </ProtectedRoute>
          }
        />

        {/* Issuer Portal */}
        <Route
          path="/issuer/dashboard"
          element={
            <ProtectedRoute allowedRoles="ISSUER">
              <IssuerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/issuer/issue"
          element={
            <ProtectedRoute allowedRoles="ISSUER">
              <IssueDocument />
            </ProtectedRoute>
          }
        />
        <Route
          path="/issuer/documents"
          element={
            <ProtectedRoute allowedRoles="ISSUER">
              <DocumentRegistry />
            </ProtectedRoute>
          }
        />
        <Route
          path="/issuer/revoked"
          element={
            <ProtectedRoute allowedRoles="ISSUER">
              <RevokedDocuments />
            </ProtectedRoute>
          }
        />
        <Route
          path="/issuer/profile"
          element={
            <ProtectedRoute allowedRoles="ISSUER">
              <IssuerProfile />
            </ProtectedRoute>
          }
        />

        {/* Citizen Portal */}
        <Route
          path="/citizen/dashboard"
          element={
            <ProtectedRoute allowedRoles="CITIZEN">
              <CitizenDashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/citizen/verify" element={<Navigate to="/verify" replace />} />
        <Route
          path="/citizen/my-documents"
          element={
            <ProtectedRoute allowedRoles="CITIZEN">
              <MyDocuments />
            </ProtectedRoute>
          }
        />
        <Route
          path="/citizen/history"
          element={
            <ProtectedRoute allowedRoles="CITIZEN">
              <VerificationHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/citizen/claim"
          element={
            <ProtectedRoute allowedRoles={["UNLINKED", "CITIZEN"]}>
              <ClaimInstitution />
            </ProtectedRoute>
          }
        />
        <Route
          path="/citizen/requests"
          element={
            <ProtectedRoute allowedRoles="CITIZEN">
              <CitizenRequests />
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
