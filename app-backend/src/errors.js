export class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
  }
}

export function badRequest(code, message) {
  return new HttpError(400, code, message);
}

export function unauthorized(code = "AUTHENTICATION_REQUIRED", message = "Authentication is required") {
  return new HttpError(401, code, message);
}

export function forbidden(code = "FORBIDDEN", message = "This action is not allowed") {
  return new HttpError(403, code, message);
}

export function notFound(code, message) {
  return new HttpError(404, code, message);
}

export function conflict(code, message) {
  return new HttpError(409, code, message);
}
