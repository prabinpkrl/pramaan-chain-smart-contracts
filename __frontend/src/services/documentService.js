import { appApi, blockchainApi } from "./api";

export const verifyDocument = async (documentHash) => {
  const response = await blockchainApi.get(`/verify/${documentHash}`);
  return response.data;
};

export const getDocument = async (documentHash) => {
  const response = await blockchainApi.get(`/certificates/${documentHash}`);
  return response.data;
};

export const getDocuments = async (params = {}) => {
  const response = await blockchainApi.get("/certificates", { params });
  return response.data;
};

export const getDocumentSummary = async () => {
  const response = await blockchainApi.get("/certificates/summary");
  return response.data;
};

export const checkIssuer = async (address) => {
  const response = await blockchainApi.get(`/issuer/${address}`);
  return response.data;
};

export const getHealth = async () => {
  const response = await blockchainApi.get("/health");
  return response.data;
};

export const getEvents = async (params = {}) => {
  const response = await blockchainApi.get("/events", { params });
  return response.data;
};

export const getRecentEvents = async (params = {}) => {
  const response = await blockchainApi.get("/events/transformed", { params });
  return response.data;
};

export async function listIssuerRequests(institutionId) {
  const response = await appApi.get("/issuer/requests", { params: { institutionId } });
  return response.data.requests;
}

export async function prepareIssuance(requestId, institutionId, documentHash) {
  const response = await appApi.post(`/issuer/requests/${requestId}/prepare-issuance`, {
    institutionId,
    documentHash,
  });
  return response.data;
}

export async function confirmIssuance(
  requestId,
  institutionId,
  attemptId,
  transactionHash,
) {
  const response = await appApi.post(`/issuer/requests/${requestId}/confirm-issuance`, {
    institutionId,
    attemptId,
    transactionHash,
  });
  return response.data;
}

export async function rejectRequest(requestId, institutionId) {
  await appApi.post(`/issuer/requests/${requestId}/reject`, { institutionId });
}

export async function listIssuerCertificates(institutionId) {
  const response = await appApi.get("/issuer/certificates", { params: { institutionId } });
  return response.data.certificates;
}

export async function prepareRevocation(certificateId, institutionId) {
  const response = await appApi.post(
    `/issuer/certificates/${certificateId}/prepare-revocation`,
    { institutionId },
  );
  return response.data;
}

export async function confirmRevocation(
  certificateId,
  institutionId,
  attemptId,
  transactionHash,
) {
  const response = await appApi.post(
    `/issuer/certificates/${certificateId}/confirm-revocation`,
    { institutionId, attemptId, transactionHash },
  );
  return response.data;
}

export async function listAdminInstitutions() {
  const response = await appApi.get("/admin/institutions");
  return response.data.institutions;
}

export async function registerInstitution(publicId, name, issuerAddress) {
  const response = await appApi.post("/admin/institutions", {
    publicId,
    name,
    issuerAddress,
  });
  return response.data;
}

export async function connectInstitution(publicId) {
  const response = await appApi.post("/citizen/institutions/connect", { publicId });
  return response.data;
}

export async function listCitizenInstitutions() {
  const response = await appApi.get("/citizen/institutions");
  return response.data.institutions;
}

export async function createCitizenRequest(institutionId, certificateType) {
  const response = await appApi.post("/citizen/requests", {
    institutionId,
    certificateType,
  });
  return response.data;
}

export async function listCitizenRequests() {
  const response = await appApi.get("/citizen/requests");
  return response.data.requests;
}

export async function listCitizenCertificates() {
  const response = await appApi.get("/citizen/certificates");
  return response.data.certificates;
}
