import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router";

import ProtectedRoute from "../components/auth/ProtectedRoute";
import RouteLoader from "../components/common/RouteLoader";

const Home = lazy(() => import("../pages/Home/Home"));
const Login = lazy(() => import("../pages/Login/Login"));
const AdminDashboard = lazy(() => import("../pages/admin/Dashboard"));
const ManageIssuers = lazy(() => import("../pages/admin/ManageIssuers"));
const BlockchainMonitor = lazy(() => import("../pages/admin/BlockchainMonitor"));
const AuditLogs = lazy(() => import("../pages/admin/AuditLogs"));
const IssuerDashboard = lazy(() => import("../pages/issuer/Dashboard"));
const IssueDocument = lazy(() => import("../pages/issuer/IssueDocument"));
const DocumentRegistry = lazy(() => import("../pages/issuer/DocumentRegistry"));
const RevokedDocuments = lazy(() => import("../pages/issuer/RevokedDocuments"));
const IssuerProfile = lazy(() => import("../pages/issuer/Profile"));
const CitizenDashboard = lazy(() => import("../pages/citizen/Dashboard"));
const VerifyDocument = lazy(() => import("../pages/citizen/VerifyDocument"));
const MyDocuments = lazy(() => import("../pages/citizen/MyDocuments"));
const VerificationHistory = lazy(() => import("../pages/citizen/VerificationHistory"));
const ConnectInstitution = lazy(() => import("../pages/citizen/ConnectInstitution"));
const CitizenRequests = lazy(() => import("../pages/citizen/CitizenRequests"));

function AppRoutes() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteLoader message="Loading PramaanChain…" />}>
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
          path="/citizen/connect"
          element={
            <ProtectedRoute allowedRoles={["UNLINKED", "CITIZEN"]}>
              <ConnectInstitution />
            </ProtectedRoute>
          }
        />
        <Route path="/citizen/claim" element={<Navigate to="/citizen/connect" replace />} />
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
      </Suspense>
    </BrowserRouter>
  );
}

export default AppRoutes;
