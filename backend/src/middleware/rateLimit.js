import rateLimit from "express-rate-limit";

export const readLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: "READ_RATE_LIMIT_EXCEEDED",
      message: "Too many requests, please try again later",
    },
  },
});

export const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: "WRITE_RATE_LIMIT_EXCEEDED",
      message: "Too many write requests, please try again later",
    },
  },
});
