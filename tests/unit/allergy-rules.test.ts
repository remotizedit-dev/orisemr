import { describe, expect, it } from "vitest";
import { checkMedicineAllergy } from "@/lib/clinical-flags";

describe("Allergy Rules Engine Tests", () => {
  it("Blocks penicillin class medicines when patient has Penicillin allergy", () => {
    const medicine = {
      genericName: "Amoxicillin",
      drugClass: "penicillin",
    };
    const result = checkMedicineAllergy(medicine, ["Penicillin"]);
    expect(result.hasConflict).toBe(true);
    expect(result.level).toBe("block");
    expect(result.matchedFlag).toBe("Penicillin");
  });

  it("Issues caution banner for cephalosporins when patient has Penicillin allergy", () => {
    const medicine = {
      genericName: "Cefixime",
      drugClass: "cephalosporin",
    };
    const result = checkMedicineAllergy(medicine, ["Penicillin"]);
    expect(result.hasConflict).toBe(true);
    expect(result.level).toBe("caution");
    expect(result.matchedFlag).toBe("Penicillin");
  });

  it("Blocks cephalosporin when patient has Cephalosporin allergy", () => {
    const medicine = {
      genericName: "Cefixime",
      drugClass: "cephalosporin",
    };
    const result = checkMedicineAllergy(medicine, ["Cephalosporin"]);
    expect(result.hasConflict).toBe(true);
    expect(result.level).toBe("block");
  });

  it("Blocks NSAIDs when patient has NSAIDs / Aspirin allergy", () => {
    const medicine = {
      genericName: "Ketorolac Tromethamine",
      drugClass: "nsaid",
    };
    const result = checkMedicineAllergy(medicine, ["NSAIDs / Aspirin"]);
    expect(result.hasConflict).toBe(true);
    expect(result.level).toBe("block");
  });

  it("Blocks Chlorhexidine mouthwash when patient has Chlorhexidine allergy", () => {
    const medicine = {
      genericName: "Chlorhexidine Gluconate",
      drugClass: "antiseptic",
    };
    const result = checkMedicineAllergy(medicine, ["Chlorhexidine"]);
    expect(result.hasConflict).toBe(true);
    expect(result.level).toBe("block");
  });

  it("Allows unrelated medicines without conflict", () => {
    const medicine = {
      genericName: "Paracetamol",
      drugClass: "paracetamol",
    };
    const result = checkMedicineAllergy(medicine, ["Penicillin"]);
    expect(result.hasConflict).toBe(false);
  });
});
