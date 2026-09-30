import crypto from "crypto";

function getSecretKey(): string {
  return (
    process.env.BETTER_AUTH_SECRET ||
    process.env.AUTH_SECRET ||
    "oris-emr-default-signed-link-secret-2026"
  );
}

/**
 * Generates an HMAC SHA-256 signed expiring URL for patient-shareable documents.
 * Defaults to 7 days (7 * 24 * 3600 seconds) expiration.
 */
export function generateSignedPrintUrl(
  path: string,
  expiresInSeconds: number = 7 * 24 * 3600
): string {
  const secret = getSecretKey();
  const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const cleanPath = path.split("?")[0];

  const payload = `${cleanPath}:${expires}`;
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("hex");

  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}expires=${expires}&sig=${sig}`;
}

/**
 * Validates whether an incoming request to a print page has a valid, unexpired HMAC signature.
 */
export function verifySignedPrintUrl(
  path: string,
  searchParams: { expires?: string; sig?: string }
): { valid: boolean; reason?: "expired" | "invalid_signature" | "missing_params" } {
  const { expires, sig } = searchParams;

  if (!expires || !sig) {
    return { valid: false, reason: "missing_params" };
  }

  const expiresNum = parseInt(expires, 10);
  if (isNaN(expiresNum)) {
    return { valid: false, reason: "invalid_signature" };
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (nowSec > expiresNum) {
    return { valid: false, reason: "expired" };
  }

  const secret = getSecretKey();
  const cleanPath = path.split("?")[0];
  const payload = `${cleanPath}:${expires}`;
  const expectedSig = crypto.createHmac("sha256", secret).update(payload).digest("hex");

  try {
    const a = Buffer.from(sig, "hex");
    const b = Buffer.from(expectedSig, "hex");

    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return { valid: false, reason: "invalid_signature" };
    }
  } catch {
    return { valid: false, reason: "invalid_signature" };
  }

  return { valid: true };
}
