import API from "./api";

export const issueCertificate = async (documentHash) => {
  const response = await API.post("/write/issue", {
    documentHash,
  });
  return response.data;
};

export const verifyCertificate = async (documentHash) => {
  const response = await API.get(`/verify/${documentHash}`);
  return response.data;
};

export const getCertificates = async (params = {}) => {
  const response = await API.get("/certificates", {
    params,
  });

  return response.data;
};

export const revokeCertificate = async (documentHash) => {
  const response = await API.post("/write/revoke", {
    documentHash,
  });
  return response.data;
};

export const getHealth = async () => {
  const response = await API.get("/health");
  return response.data;
};

export const getEvents = async () => {
  const response = await API.get("/events");
  return response.data;
};

export const checkIssuer = async (address) => {
  const response = await API.get(`/issuer/${address}`);
  return response.data;
};

export const getCertificateSummary = async () => {
  const response = await API.get("/certificates/summary");
  return response.data;
};

export const getRecentEvents = async () => {
  const response = await API.get("/events/transformed");
  return response.data;
};
