import { HttpError } from "../utils/httpError.js";
import { redactSecrets } from "../utils/redact.js";

export function errorHandler(err, req, res, _next) {
  if (err?.type === "entity.parse.failed") {
    return res.status(400).json({
      error: {
        code: "INVALID_JSON",
        message: "Request body must contain valid JSON",
      },
    });
  }

  if (err instanceof HttpError) {
    const body = {
      error: {
        code: err.code || "REQUEST_FAILED",
        message: err.message || "Request failed",
      },
    };
    if (err.details !== undefined) body.error.details = err.details;
    return res.status(err.status).json(body);
  }

  console.error("Unhandled error:", {
    name: err?.name || "Error",
    code: err?.code || "UNKNOWN",
    message: redactSecrets(err?.message || "Unexpected error"),
  });
  return res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "Internal server error",
    },
  });
}
