import { createHash, randomBytes } from "node:crypto";

const SHARE_TOKEN_BYTE_LENGTH = 32;
const SHARE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export class ShareTokenValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ShareTokenValidationError";
  }
}

export function generateShareToken() {
  return randomBytes(SHARE_TOKEN_BYTE_LENGTH).toString("base64url");
}

export function hashShareToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function buildShareTokenPreview(token: string) {
  const validToken = assertShareToken(token);

  return validToken.slice(-8);
}

export function assertShareToken(token: string) {
  if (!SHARE_TOKEN_PATTERN.test(token)) {
    throw new ShareTokenValidationError("share token is invalid.");
  }

  return token;
}

export function isShareToken(value: string) {
  return SHARE_TOKEN_PATTERN.test(value);
}
