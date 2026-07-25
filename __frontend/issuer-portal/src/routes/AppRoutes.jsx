import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "../pages/Login/Login";
import Dashboard from "../pages/Dashboard/Dashboard";
import CreateCertificate from "../pages/CreateCertificate/CreateCertificate";
import Certificates from "../pages/Certificates/Certificates";
import Revoked from "../pages/Revoked/Revoked";
import Profile from "../pages/Profile/Profile";
import Verification from "../pages/verifier/Verification";

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/create" element={<CreateCertificate />} />
        <Route path="/certificates" element={<Certificates />} />
        <Route path="/revoked" element={<Revoked />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/verify" element={<Verification />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;
