export function errorHandler(err, req, res, _next) {
  const message = err.message || "Internal server error";

  if (message.includes("documentHash must be")) {
    return res.status(400).json({ error: message });
  }

  if (message.includes("not authorized")) {
    return res.status(403).json({ error: message });
  }

  if (message.includes("not the original certificate issuer")) {
    return res.status(403).json({ error: message });
  }

  if (message.includes("Write service not initialized")) {
    return res.status(503).json({ error: message });
  }

  if (message.includes("Blockchain not initialized")) {
    return res.status(503).json({ error: message });
  }

  if (message.includes("Blockchain transaction failed")) {
    return res.status(502).json({ error: message });
  }

  if (message.includes("CertificateIssued")) {
    return res.status(502).json({ error: "Issuance failed on-chain" });
  }

  if (message.includes("CertificateRevoked")) {
    return res.status(502).json({ error: "Revocation failed on-chain" });
  }

  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
}
