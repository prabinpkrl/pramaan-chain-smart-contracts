import { appApi, blockchainApi } from "./api";

export const verifyCertificate = async (hash) => {
  const response = await blockchainApi.get(`/verify/${hash}`);
  return response.data;
};

export const listIssuerRequests = async (institutionId) => {
  const response = await appApi.get("/issuer/requests", { params: { institutionId } });
  return response.data.requests;
};

export const prepareIssuance = async (requestId, institutionId, documentHash) => {
  const response = await appApi.post(`/issuer/requests/${requestId}/prepare-issuance`, {
    institutionId,
    documentHash,
  });
  return response.data;
};

export const confirmIssuance = async (
  requestId,
  institutionId,
  attemptId,
  transactionHash,
) => {
  const response = await appApi.post(`/issuer/requests/${requestId}/confirm-issuance`, {
    institutionId,
    attemptId,
    transactionHash,
  });
  return response.data;
};

export const rejectRequest = async (requestId, institutionId) => {
  await appApi.post(`/issuer/requests/${requestId}/reject`, { institutionId });
};

export const listIssuerCertificates = async (institutionId) => {
  const response = await appApi.get("/issuer/certificates", { params: { institutionId } });
  return response.data.certificates;
};

export const prepareRevocation = async (certificateId, institutionId) => {
  const response = await appApi.post(
    `/issuer/certificates/${certificateId}/prepare-revocation`,
    { institutionId },
  );
  return response.data;
};

export const confirmRevocation = async (
  certificateId,
  institutionId,
  attemptId,
  transactionHash,
) => {
  const response = await appApi.post(
    `/issuer/certificates/${certificateId}/confirm-revocation`,
    { institutionId, attemptId, transactionHash },
  );
  return response.data;
};

export const createClaimCode = async (institutionId, recipientReference) => {
  const response = await appApi.post("/issuer/claim-codes", {
    institutionId,
    recipientReference,
  });
  return response.data;
};

export const claimCode = async (code) => {
  const response = await appApi.post("/citizen/claim-codes/claim", { code });
  return response.data;
};

export const listCitizenInstitutions = async () => {
  const response = await appApi.get("/citizen/institutions");
  return response.data.institutions;
};

export const createCitizenRequest = async (institutionId, certificateType) => {
  const response = await appApi.post("/citizen/requests", {
    institutionId,
    certificateType,
  });
  return response.data;
};

export const listCitizenRequests = async () => {
  const response = await appApi.get("/citizen/requests");
  return response.data.requests;
};

export const listCitizenCertificates = async () => {
  const response = await appApi.get("/citizen/certificates");
  return response.data.certificates;
};
