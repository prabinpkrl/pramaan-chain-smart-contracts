import API from "./api";

// --- Issuer (write) operations -------------------------------------------
// These call the authenticated backend gateway, which signs and submits the
// transaction with the server-side issuer key. The browser never touches a
// private key or WRITE_API_KEY.

export const issueDocument = async (documentHash) => {
  const response = await API.post("/write/issue", { documentHash });
  return response.data;
};

export const revokeDocument = async (documentHash) => {
  const response = await API.post("/write/revoke", { documentHash });
  return response.data;
};

// --- Public (read) operations ---------------------------------------------

export const verifyDocument = async (documentHash) => {
  const response = await API.get(`/verify/${documentHash}`);
  return response.data;
};

export const getDocument = async (documentHash) => {
  const response = await API.get(`/certificates/${documentHash}`);
  return response.data;
};

export const getDocuments = async (params = {}) => {
  const response = await API.get("/certificates", { params });
  return response.data;
};

export const getDocumentSummary = async () => {
  const response = await API.get("/certificates/summary");
  return response.data;
};

export const checkIssuer = async (address) => {
  const response = await API.get(`/issuer/${address}`);
  return response.data;
};

export const getHealth = async () => {
  const response = await API.get("/health");
  return response.data;
};

export const getEvents = async (params = {}) => {
  const response = await API.get("/events", { params });
  return response.data;
};

export const getRecentEvents = async (params = {}) => {
  const response = await API.get("/events/transformed", { params });
  return response.data;
};
