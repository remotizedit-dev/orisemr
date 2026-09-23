/**
 * Clinical Constants and Allergy Checking Engine for Oris EMR.
 * Defines standard medical conditions, allergy flags, and cross-reactivity rules.
 */

export const MEDICAL_CONDITIONS = [
  "Diabetes",
  "Hypertension",
  "Heart disease",
  "Asthma",
  "Bleeding disorder",
  "On blood thinners",
  "Pregnancy",
  "Breastfeeding",
  "Hepatitis B",
  "Hepatitis C",
  "Kidney disease",
  "Liver disease",
  "Epilepsy",
  "Thyroid disorder",
] as const;

export type MedicalCondition = (typeof MEDICAL_CONDITIONS)[number];

export const ALLERGY_FLAGS = [
  "Penicillin",
  "Cephalosporin",
  "Sulfa drugs",
  "NSAIDs / Aspirin",
  "Metronidazole",
  "Local anaesthetic",
  "Latex",
  "Chlorhexidine",
] as const;

export type AllergyFlag = (typeof ALLERGY_FLAGS)[number];

export type AllergyCheckResult = {
  hasConflict: boolean;
  level?: "block" | "caution";
  matchedFlag?: AllergyFlag;
  message?: string;
};

/**
 * Evaluates whether a medicine conflicts with a patient's documented allergy flags.
 */
export function checkMedicineAllergy(
  medicine: {
    genericName: string;
    drugClass?: string | null;
  },
  patientAllergies: string[]
): AllergyCheckResult {
  if (!patientAllergies || patientAllergies.length === 0) {
    return { hasConflict: false };
  }

  const drugClass = (medicine.drugClass || "").toLowerCase();
  const generic = medicine.genericName.toLowerCase();

  for (const flag of patientAllergies) {
    // 1. Penicillin allergy
    if (flag === "Penicillin") {
      if (drugClass === "penicillin") {
        return {
          hasConflict: true,
          level: "block",
          matchedFlag: "Penicillin",
          message: "Patient has documented Penicillin allergy. Prescription blocked.",
        };
      }
      if (drugClass === "cephalosporin") {
        return {
          hasConflict: true,
          level: "caution",
          matchedFlag: "Penicillin",
          message: "Patient allergic to Penicillin. Possible cross-reactivity with Cephalosporins.",
        };
      }
    }

    // 2. Cephalosporin allergy
    if (flag === "Cephalosporin") {
      if (drugClass === "cephalosporin") {
        return {
          hasConflict: true,
          level: "block",
          matchedFlag: "Cephalosporin",
          message: "Patient has documented Cephalosporin allergy. Prescription blocked.",
        };
      }
    }

    // 3. NSAIDs / Aspirin allergy
    if (flag === "NSAIDs / Aspirin") {
      if (drugClass === "nsaid") {
        return {
          hasConflict: true,
          level: "block",
          matchedFlag: "NSAIDs / Aspirin",
          message: "Patient has documented NSAID / Aspirin allergy. Prescription blocked.",
        };
      }
    }

    // 4. Metronidazole allergy
    if (flag === "Metronidazole") {
      if (drugClass === "nitroimidazole" || generic.includes("metronidazole")) {
        return {
          hasConflict: true,
          level: "block",
          matchedFlag: "Metronidazole",
          message: "Patient has documented Metronidazole allergy. Prescription blocked.",
        };
      }
    }

    // 5. Local anaesthetic allergy
    if (flag === "Local anaesthetic") {
      if (drugClass === "local_anaesthetic" || generic.includes("lidocaine")) {
        return {
          hasConflict: true,
          level: "block",
          matchedFlag: "Local anaesthetic",
          message: "Patient has documented Local Anaesthetic allergy. Prescription blocked.",
        };
      }
    }

    // 6. Chlorhexidine allergy
    if (flag === "Chlorhexidine") {
      if (generic.includes("chlorhexidine")) {
        return {
          hasConflict: true,
          level: "block",
          matchedFlag: "Chlorhexidine",
          message: "Patient has documented Chlorhexidine allergy. Prescription blocked.",
        };
      }
    }
  }

  return { hasConflict: false };
}
