import { useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

import Select from "../../components/common/Select";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import DashboardLayout from "../../components/layout/DashboardLayout";

import { issueCertificate } from "../../services/certificateService";
import { hashDocument } from "../../utils/hashDocument";
import { isValidDocumentHash } from "../../utils/validateHash";

function CreateCertificate() {
  const [formData, setFormData] = useState({
    certificateType: "",
    fullName: "",
    citizenId: "",
    dateOfBirth: "",
    issueDate: new Date().toISOString().split("T")[0],
    remarks: "",
  });

  const navigate = useNavigate();

  const [selectedFile, setSelectedFile] = useState(null);

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.certificateType ||
      !formData.fullName ||
      !formData.citizenId ||
      !formData.dateOfBirth
    ) {
      toast.error("Please fill all required fields.");
      return;
    }

    if (!selectedFile) {
      toast.error("Please upload a certificate PDF.");
      return;
    }

    try {
      setLoading(true);

      const documentHash = await hashDocument(selectedFile);

      if (!isValidDocumentHash(documentHash)) {
        throw new Error("Generated document hash is invalid.");
      }

      console.log("Generated Hash:", documentHash);

      await issueCertificate(documentHash);

      toast.success("Certificate issued successfully!");

      navigate("/dashboard");

      setFormData({
        certificateType: "",
        fullName: "",
        citizenId: "",
        dateOfBirth: "",
        issueDate: new Date().toISOString().split("T")[0],
        remarks: "",
      });

      setSelectedFile(null);
    } catch (error) {
      console.error(error);

      toast.error(
        error.response?.data?.error || "Certificate issuance failed.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <h1 className="text-3xl font-bold mb-6">Issue Certificate</h1>

      <div className="bg-white rounded-xl shadow p-8 max-w-3xl">
        <form onSubmit={handleSubmit}>
          <Select
            label="Credential Type"
            name="certificateType"
            value={formData.certificateType}
            onChange={handleChange}
            options={[
              "Academic Certificate",
              "Birth Certificate",
              "Citizenship Certificate",
              "Driving License",
              "Employment Certificate",
            ]}
          />
          <Input
            label="Full Name"
            name="fullName"
            placeholder="Firstname Lastname"
            value={formData.fullName}
            onChange={handleChange}
          />
          <Input
            label="Citizen ID"
            name="citizenId"
            placeholder="123456789"
            value={formData.citizenId}
            onChange={handleChange}
          />
          <Input
            label="Date of Birth"
            type="date"
            name="dateOfBirth"
            value={formData.dateOfBirth}
            onChange={handleChange}
          />
          <Input
            label="Certificate Issue Date"
            type="date"
            name="issueDate"
            value={formData.issueDate}
            onChange={handleChange}
          />
          <p className="text-xs text-gray-500 mb-5">
            Enter the issue date printed on the certificate document.
          </p>
          <div className="mb-5">
            <label className="block text-sm font-medium mb-2">
              Upload Certificate PDF
            </label>

            <div className="space-y-3">
              <input
                id="certificateFile"
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden"
              />

              <label
                htmlFor="certificateFile"
                className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-white cursor-pointer hover:bg-blue-700 transition"
              >
                Select PDF
              </label>

              <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-3 text-sm text-gray-600">
                {selectedFile ? (
                  <div>
                    <p className="font-medium text-gray-800">
                      📄 {selectedFile.name}
                    </p>

                    <p className="text-xs text-gray-500 mt-1">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                ) : (
                  <p>No file selected</p>
                )}
              </div>
            </div>
          </div>
          <Input
            label="Remarks"
            name="remarks"
            placeholder="Optional"
            value={formData.remarks}
            onChange={handleChange}
          />
          <Button type="submit" loading={loading}>
            Issue Certificate
          </Button>{" "}
        </form>
      </div>
    </DashboardLayout>
  );
}

export default CreateCertificate;
