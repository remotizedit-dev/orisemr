import { describe, expect, it } from "vitest";
import { generateSignedPrintUrl, verifySignedPrintUrl } from "@/lib/signed-urls";

describe("Signed URLs for Patient Print Sharing", () => {
  it("generates an expiring URL containing expires and sig params", () => {
    const path = "/print/prescription/123e4567-e89b-12d3-a456-426614174000";
    const signedUrl = generateSignedPrintUrl(path, 3600);

    expect(signedUrl).toContain("/print/prescription/123e4567-e89b-12d3-a456-426614174000");
    expect(signedUrl).toContain("expires=");
    expect(signedUrl).toContain("sig=");
  });

  it("verifies a valid signed URL successfully", () => {
    const path = "/print/invoice/inv-12345";
    const signedUrl = generateSignedPrintUrl(path, 3600); // 1 hour validity

    const url = new URL(signedUrl, "https://demo.orise-emr.test");
    const expires = url.searchParams.get("expires") || undefined;
    const sig = url.searchParams.get("sig") || undefined;

    const result = verifySignedPrintUrl(path, { expires, sig });
    expect(result.valid).toBe(true);
  });

  it("rejects an expired signed URL", () => {
    const path = "/print/prescription/rx-expired";
    const signedUrl = generateSignedPrintUrl(path, -10); // Expired 10 seconds ago

    const url = new URL(signedUrl, "https://demo.orise-emr.test");
    const expires = url.searchParams.get("expires") || undefined;
    const sig = url.searchParams.get("sig") || undefined;

    const result = verifySignedPrintUrl(path, { expires, sig });
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("expired");
  });

  it("rejects a tampered path or signature", () => {
    const path = "/print/card/patient-1";
    const signedUrl = generateSignedPrintUrl(path, 3600);

    const url = new URL(signedUrl, "https://demo.orise-emr.test");
    const expires = url.searchParams.get("expires") || undefined;
    const sig = url.searchParams.get("sig") || undefined;

    // Tampered path
    const resultTamperedPath = verifySignedPrintUrl("/print/card/patient-DIFFERENT", { expires, sig });
    expect(resultTamperedPath.valid).toBe(false);
    expect(resultTamperedPath.reason).toBe("invalid_signature");

    // Tampered signature
    const resultTamperedSig = verifySignedPrintUrl(path, { expires, sig: "badsignature12345" });
    expect(resultTamperedSig.valid).toBe(false);
    expect(resultTamperedSig.reason).toBe("invalid_signature");
  });

  it("rejects missing parameters", () => {
    const path = "/print/invoice/inv-test";
    const result = verifySignedPrintUrl(path, {});
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("missing_params");
  });
});
