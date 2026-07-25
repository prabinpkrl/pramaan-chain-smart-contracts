import { timingSafeEqual } from "node:crypto";
import {
  serviceUnavailable,
  unauthorized,
} from "../utils/httpError.js";

function equalSecrets(received, expected) {
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);

  return receivedBuffer.length === expectedBuffer.length
    && timingSafeEqual(receivedBuffer, expectedBuffer);
}

export function authenticateWrite(req, _res, next) {
  const expected = process.env.WRITE_API_KEY;
  if (!expected) {
    return next(serviceUnavailable(
      "WRITE_AUTH_NOT_CONFIGURED",
      "Write operations are disabled because WRITE_API_KEY is not configured",
    ));
  }

  const received = req.get("x-api-key") || "";
  if (!received || !equalSecrets(received, expected)) {
    return next(unauthorized(
      "INVALID_API_KEY",
      "A valid x-api-key header is required",
    ));
  }

  return next();
}
