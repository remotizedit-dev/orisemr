export interface SeedCategory {
  key: string;
  name: string;
  sortOrder: number;
}

export interface SeedService {
  key: string;
  categoryKey: string;
  name: string;
  durationMinutes: number;
  priceBdt: number;
  bookableOnline: boolean;
  sortOrder: number;
}

export interface SeedMedicine {
  key: string;
  brandName: string | null;
  genericName: string;
  strength: string | null;
  form:
    | "tablet"
    | "capsule"
    | "syrup"
    | "suspension"
    | "drops"
    | "gel"
    | "paste"
    | "ointment"
    | "mouthwash"
    | "toothpaste"
    | "injection"
    | "other";
  drugClass: string | null;
  sortOrder: number;
}

export interface SeedDosagePattern {
  key: string;
  labelBn: string;
  code: string;
  formGroup: "oral_solid" | "oral_liquid" | "mouthwash" | "topical" | "toothpaste" | "any";
  sortOrder: number;
}

export interface SeedMealTiming {
  key: string;
  labelBn: string;
  code: string;
  sortOrder: number;
}

export interface SeedDurationOption {
  key: string;
  labelBn: string;
  daysCount: number | null;
  sortOrder: number;
}

export interface SeedAdviceTemplate {
  key: string;
  groupName: string;
  textBn: string;
  sortOrder: number;
}

export interface SeedQuickText {
  key: string;
  kind: "chief_complaint" | "examination" | "diagnosis" | "investigation";
  text: string;
  sortOrder: number;
}

// -----------------------------------------------------------------------------
// 1. Categories & Services
// -----------------------------------------------------------------------------
export const MASTER_CATEGORIES: SeedCategory[] = [
  { key: "cat-general", name: "General", sortOrder: 1 },
  { key: "cat-diagnostic", name: "Diagnostic", sortOrder: 2 },
  { key: "cat-preventive", name: "Preventive", sortOrder: 3 },
  { key: "cat-restorative", name: "Restorative", sortOrder: 4 },
  { key: "cat-endodontic", name: "Endodontic", sortOrder: 5 },
  { key: "cat-oral-surgery", name: "Oral Surgery", sortOrder: 6 },
  { key: "cat-periodontal", name: "Periodontal", sortOrder: 7 },
  { key: "cat-prosthodontic", name: "Prosthodontic", sortOrder: 8 },
  { key: "cat-cosmetic", name: "Cosmetic", sortOrder: 9 },
  { key: "cat-orthodontic", name: "Orthodontic", sortOrder: 10 },
  { key: "cat-pediatric", name: "Pediatric", sortOrder: 11 },
  { key: "cat-implant", name: "Implant", sortOrder: 12 },
];

export const MASTER_SERVICES: SeedService[] = [
  // General
  { key: "svc-consultation", categoryKey: "cat-general", name: "Consultation", durationMinutes: 15, priceBdt: 0, bookableOnline: true, sortOrder: 1 },
  { key: "svc-follow-up-visit", categoryKey: "cat-general", name: "Follow-up Visit", durationMinutes: 10, priceBdt: 0, bookableOnline: true, sortOrder: 2 },
  { key: "svc-emergency-visit", categoryKey: "cat-general", name: "Emergency Visit (Pain / Swelling)", durationMinutes: 20, priceBdt: 0, bookableOnline: true, sortOrder: 3 },

  // Diagnostic
  { key: "svc-iopa-xray", categoryKey: "cat-diagnostic", name: "Intraoral X-Ray (IOPA)", durationMinutes: 10, priceBdt: 0, bookableOnline: true, sortOrder: 4 },
  { key: "svc-bitewing-xray", categoryKey: "cat-diagnostic", name: "Bitewing X-Ray", durationMinutes: 10, priceBdt: 0, bookableOnline: false, sortOrder: 5 },
  { key: "svc-opg-xray", categoryKey: "cat-diagnostic", name: "OPG (Panoramic X-Ray)", durationMinutes: 15, priceBdt: 0, bookableOnline: true, sortOrder: 6 },

  // Preventive
  { key: "svc-scaling-polishing", categoryKey: "cat-preventive", name: "Scaling & Polishing", durationMinutes: 30, priceBdt: 0, bookableOnline: true, sortOrder: 7 },
  { key: "svc-fluoride-application", categoryKey: "cat-preventive", name: "Fluoride Application", durationMinutes: 15, priceBdt: 0, bookableOnline: true, sortOrder: 8 },
  { key: "svc-fissure-sealant", categoryKey: "cat-preventive", name: "Fissure Sealant (per tooth)", durationMinutes: 15, priceBdt: 0, bookableOnline: false, sortOrder: 9 },

  // Restorative
  { key: "svc-filling-composite", categoryKey: "cat-restorative", name: "Filling — Composite", durationMinutes: 30, priceBdt: 0, bookableOnline: true, sortOrder: 10 },
  { key: "svc-filling-gic", categoryKey: "cat-restorative", name: "Filling — Glass Ionomer (GIC)", durationMinutes: 20, priceBdt: 0, bookableOnline: true, sortOrder: 11 },
  { key: "svc-filling-amalgam", categoryKey: "cat-restorative", name: "Filling — Amalgam", durationMinutes: 30, priceBdt: 0, bookableOnline: false, sortOrder: 12 },
  { key: "svc-temporary-filling", categoryKey: "cat-restorative", name: "Temporary Filling", durationMinutes: 15, priceBdt: 0, bookableOnline: false, sortOrder: 13 },

  // Endodontic
  { key: "svc-rct-anterior", categoryKey: "cat-endodontic", name: "Root Canal Treatment — Anterior", durationMinutes: 45, priceBdt: 0, bookableOnline: true, sortOrder: 14 },
  { key: "svc-rct-premolar", categoryKey: "cat-endodontic", name: "Root Canal Treatment — Premolar", durationMinutes: 60, priceBdt: 0, bookableOnline: true, sortOrder: 15 },
  { key: "svc-rct-molar", categoryKey: "cat-endodontic", name: "Root Canal Treatment — Molar (per visit)", durationMinutes: 60, priceBdt: 0, bookableOnline: true, sortOrder: 16 },
  { key: "svc-re-rct", categoryKey: "cat-endodontic", name: "Re-Root Canal Treatment", durationMinutes: 60, priceBdt: 0, bookableOnline: false, sortOrder: 17 },
  { key: "svc-pulp-capping", categoryKey: "cat-endodontic", name: "Pulp Capping", durationMinutes: 20, priceBdt: 0, bookableOnline: false, sortOrder: 18 },
  { key: "svc-post-core", categoryKey: "cat-endodontic", name: "Post & Core", durationMinutes: 30, priceBdt: 0, bookableOnline: false, sortOrder: 19 },

  // Oral Surgery
  { key: "svc-extraction-simple", categoryKey: "cat-oral-surgery", name: "Extraction — Simple", durationMinutes: 20, priceBdt: 0, bookableOnline: true, sortOrder: 20 },
  { key: "svc-extraction-surgical", categoryKey: "cat-oral-surgery", name: "Extraction — Surgical", durationMinutes: 45, priceBdt: 0, bookableOnline: false, sortOrder: 21 },
  { key: "svc-impacted-third-molar", categoryKey: "cat-oral-surgery", name: "Impacted Third Molar Surgery", durationMinutes: 60, priceBdt: 0, bookableOnline: false, sortOrder: 22 },
  { key: "svc-incision-drainage", categoryKey: "cat-oral-surgery", name: "Incision & Drainage", durationMinutes: 20, priceBdt: 0, bookableOnline: false, sortOrder: 23 },
  { key: "svc-suture-removal", categoryKey: "cat-oral-surgery", name: "Suture Removal", durationMinutes: 10, priceBdt: 0, bookableOnline: true, sortOrder: 24 },
  { key: "svc-biopsy", categoryKey: "cat-oral-surgery", name: "Biopsy", durationMinutes: 30, priceBdt: 0, bookableOnline: false, sortOrder: 25 },

  // Periodontal
  { key: "svc-scaling-root-planing", categoryKey: "cat-periodontal", name: "Scaling & Root Planing (per quadrant)", durationMinutes: 40, priceBdt: 0, bookableOnline: false, sortOrder: 26 },
  { key: "svc-gingivectomy", categoryKey: "cat-periodontal", name: "Gingivectomy", durationMinutes: 45, priceBdt: 0, bookableOnline: false, sortOrder: 27 },
  { key: "svc-flap-surgery", categoryKey: "cat-periodontal", name: "Flap Surgery", durationMinutes: 60, priceBdt: 0, bookableOnline: false, sortOrder: 28 },

  // Prosthodontic
  { key: "svc-crown-metal", categoryKey: "cat-prosthodontic", name: "Crown — Metal", durationMinutes: 30, priceBdt: 0, bookableOnline: false, sortOrder: 29 },
  { key: "svc-crown-pfm", categoryKey: "cat-prosthodontic", name: "Crown — PFM", durationMinutes: 30, priceBdt: 0, bookableOnline: false, sortOrder: 30 },
  { key: "svc-crown-zirconia", categoryKey: "cat-prosthodontic", name: "Crown — Zirconia", durationMinutes: 30, priceBdt: 0, bookableOnline: false, sortOrder: 31 },
  { key: "svc-crown-emax", categoryKey: "cat-prosthodontic", name: "Crown — E-max", durationMinutes: 30, priceBdt: 0, bookableOnline: false, sortOrder: 32 },
  { key: "svc-bridge-per-unit", categoryKey: "cat-prosthodontic", name: "Bridge (per unit)", durationMinutes: 30, priceBdt: 0, bookableOnline: false, sortOrder: 33 },
  { key: "svc-cementation", categoryKey: "cat-prosthodontic", name: "Crown / Bridge Cementation", durationMinutes: 20, priceBdt: 0, bookableOnline: false, sortOrder: 34 },
  { key: "svc-partial-denture-acrylic", categoryKey: "cat-prosthodontic", name: "Partial Denture — Acrylic", durationMinutes: 30, priceBdt: 0, bookableOnline: false, sortOrder: 35 },
  { key: "svc-partial-denture-flexible", categoryKey: "cat-prosthodontic", name: "Partial Denture — Flexible", durationMinutes: 30, priceBdt: 0, bookableOnline: false, sortOrder: 36 },
  { key: "svc-complete-denture", categoryKey: "cat-prosthodontic", name: "Complete Denture", durationMinutes: 45, priceBdt: 0, bookableOnline: false, sortOrder: 37 },
  { key: "svc-denture-repair", categoryKey: "cat-prosthodontic", name: "Denture Repair", durationMinutes: 20, priceBdt: 0, bookableOnline: false, sortOrder: 38 },

  // Cosmetic
  { key: "svc-teeth-whitening", categoryKey: "cat-cosmetic", name: "Teeth Whitening (In-Office)", durationMinutes: 60, priceBdt: 0, bookableOnline: true, sortOrder: 39 },
  { key: "svc-composite-veneer", categoryKey: "cat-cosmetic", name: "Composite Veneer (per tooth)", durationMinutes: 45, priceBdt: 0, bookableOnline: false, sortOrder: 40 },
  { key: "svc-porcelain-veneer", categoryKey: "cat-cosmetic", name: "Porcelain Veneer (per tooth)", durationMinutes: 45, priceBdt: 0, bookableOnline: false, sortOrder: 41 },
  { key: "svc-diastema-closure", categoryKey: "cat-cosmetic", name: "Diastema Closure", durationMinutes: 45, priceBdt: 0, bookableOnline: false, sortOrder: 42 },

  // Orthodontic
  { key: "svc-orthodontic-consultation", categoryKey: "cat-orthodontic", name: "Orthodontic Consultation", durationMinutes: 20, priceBdt: 0, bookableOnline: true, sortOrder: 43 },
  { key: "svc-fixed-braces-placement", categoryKey: "cat-orthodontic", name: "Fixed Braces — Placement", durationMinutes: 90, priceBdt: 0, bookableOnline: false, sortOrder: 44 },
  { key: "svc-braces-adjustment", categoryKey: "cat-orthodontic", name: "Braces — Adjustment Visit", durationMinutes: 20, priceBdt: 0, bookableOnline: true, sortOrder: 45 },
  { key: "svc-retainer", categoryKey: "cat-orthodontic", name: "Retainer", durationMinutes: 20, priceBdt: 0, bookableOnline: false, sortOrder: 46 },
  { key: "svc-clear-aligner-consultation", categoryKey: "cat-orthodontic", name: "Clear Aligner Consultation", durationMinutes: 20, priceBdt: 0, bookableOnline: true, sortOrder: 47 },

  // Pediatric
  { key: "svc-pediatric-consultation", categoryKey: "cat-pediatric", name: "Pediatric Consultation", durationMinutes: 15, priceBdt: 0, bookableOnline: true, sortOrder: 48 },
  { key: "svc-pulpotomy", categoryKey: "cat-pediatric", name: "Pulpotomy (Primary Tooth)", durationMinutes: 30, priceBdt: 0, bookableOnline: false, sortOrder: 49 },
  { key: "svc-ss-crown", categoryKey: "cat-pediatric", name: "Stainless Steel Crown", durationMinutes: 30, priceBdt: 0, bookableOnline: false, sortOrder: 50 },
  { key: "svc-space-maintainer", categoryKey: "cat-pediatric", name: "Space Maintainer", durationMinutes: 30, priceBdt: 0, bookableOnline: false, sortOrder: 51 },
  { key: "svc-extraction-primary", categoryKey: "cat-pediatric", name: "Extraction — Primary Tooth", durationMinutes: 15, priceBdt: 0, bookableOnline: true, sortOrder: 52 },

  // Implant
  { key: "svc-implant-consultation", categoryKey: "cat-implant", name: "Implant Consultation", durationMinutes: 20, priceBdt: 0, bookableOnline: true, sortOrder: 53 },
  { key: "svc-implant-placement", categoryKey: "cat-implant", name: "Implant Placement", durationMinutes: 60, priceBdt: 0, bookableOnline: false, sortOrder: 54 },
  { key: "svc-implant-crown", categoryKey: "cat-implant", name: "Implant Crown", durationMinutes: 30, priceBdt: 0, bookableOnline: false, sortOrder: 55 },
];

// -----------------------------------------------------------------------------
// 2. Medicines
// -----------------------------------------------------------------------------
export const MASTER_MEDICINES: SeedMedicine[] = [
  // Brand rows
  { key: "med-napa-500", brandName: "Napa", genericName: "Paracetamol", strength: "500 mg", form: "tablet", drugClass: "paracetamol", sortOrder: 1 },
  { key: "med-napa-extra", brandName: "Napa Extra", genericName: "Paracetamol + Caffeine", strength: "500 mg + 65 mg", form: "tablet", drugClass: "paracetamol", sortOrder: 2 },
  { key: "med-ace-500", brandName: "Ace", genericName: "Paracetamol", strength: "500 mg", form: "tablet", drugClass: "paracetamol", sortOrder: 3 },
  { key: "med-rolac-10", brandName: "Rolac", genericName: "Ketorolac Tromethamine", strength: "10 mg", form: "tablet", drugClass: "nsaid", sortOrder: 4 },
  { key: "med-clofenac-50", brandName: "Clofenac", genericName: "Diclofenac Sodium", strength: "50 mg", form: "tablet", drugClass: "nsaid", sortOrder: 5 },
  { key: "med-naprosyn-500", brandName: "Naprosyn", genericName: "Naproxen", strength: "500 mg", form: "tablet", drugClass: "nsaid", sortOrder: 6 },
  { key: "med-flexi-100", brandName: "Flexi", genericName: "Aceclofenac", strength: "100 mg", form: "tablet", drugClass: "nsaid", sortOrder: 7 },
  { key: "med-moxacil-500", brandName: "Moxacil", genericName: "Amoxicillin", strength: "500 mg", form: "capsule", drugClass: "penicillin", sortOrder: 8 },
  { key: "med-moxaclav-625", brandName: "Moxaclav", genericName: "Amoxicillin + Clavulanic Acid", strength: "500 mg + 125 mg", form: "tablet", drugClass: "penicillin", sortOrder: 9 },
  { key: "med-zimax-500", brandName: "Zimax", genericName: "Azithromycin", strength: "500 mg", form: "tablet", drugClass: "macrolide", sortOrder: 10 },
  { key: "med-azithrocin-500", brandName: "Azithrocin", genericName: "Azithromycin", strength: "500 mg", form: "tablet", drugClass: "macrolide", sortOrder: 11 },
  { key: "med-cef3-200", brandName: "Cef-3", genericName: "Cefixime", strength: "200 mg", form: "capsule", drugClass: "cephalosporin", sortOrder: 12 },
  { key: "med-sefrad-500", brandName: "Sefrad", genericName: "Cephradine", strength: "500 mg", form: "capsule", drugClass: "cephalosporin", sortOrder: 13 },
  { key: "med-odoxil-500", brandName: "Odoxil", genericName: "Cefadroxil", strength: "500 mg", form: "capsule", drugClass: "cephalosporin", sortOrder: 14 },
  { key: "med-cefotil-500", brandName: "Cefotil", genericName: "Cefuroxime Axetil", strength: "500 mg", form: "tablet", drugClass: "cephalosporin", sortOrder: 15 },
  { key: "med-amodis-400", brandName: "Amodis", genericName: "Metronidazole", strength: "400 mg", form: "tablet", drugClass: "nitroimidazole", sortOrder: 16 },
  { key: "med-filmet-400", brandName: "Filmet", genericName: "Metronidazole", strength: "400 mg", form: "tablet", drugClass: "nitroimidazole", sortOrder: 17 },
  { key: "med-flagyl-400", brandName: "Flagyl", genericName: "Metronidazole", strength: "400 mg", form: "tablet", drugClass: "nitroimidazole", sortOrder: 18 },
  { key: "med-seclo-20", brandName: "Seclo", genericName: "Omeprazole", strength: "20 mg", form: "capsule", drugClass: "ppi", sortOrder: 19 },
  { key: "med-sergel-20", brandName: "Sergel", genericName: "Esomeprazole", strength: "20 mg", form: "capsule", drugClass: "ppi", sortOrder: 20 },
  { key: "med-maxpro-20", brandName: "Maxpro", genericName: "Esomeprazole", strength: "20 mg", form: "tablet", drugClass: "ppi", sortOrder: 21 },
  { key: "med-pantonix-20", brandName: "Pantonix", genericName: "Pantoprazole", strength: "20 mg", form: "tablet", drugClass: "ppi", sortOrder: 22 },
  { key: "med-alatrol-10", brandName: "Alatrol", genericName: "Cetirizine", strength: "10 mg", form: "tablet", drugClass: "antihistamine", sortOrder: 23 },
  { key: "med-fexo-120", brandName: "Fexo", genericName: "Fexofenadine", strength: "120 mg", form: "tablet", drugClass: "antihistamine", sortOrder: 24 },
  { key: "med-ceevit-250", brandName: "Ceevit", genericName: "Vitamin C (Ascorbic Acid)", strength: "250 mg", form: "tablet", drugClass: "vitamin", sortOrder: 25 },

  // Generic-only rows
  { key: "med-gen-paracetamol-susp", brandName: null, genericName: "Paracetamol", strength: "120 mg/5 ml", form: "suspension", drugClass: "paracetamol", sortOrder: 26 },
  { key: "med-gen-ibuprofen-400", brandName: null, genericName: "Ibuprofen", strength: "400 mg", form: "tablet", drugClass: "nsaid", sortOrder: 27 },
  { key: "med-gen-ibuprofen-susp", brandName: null, genericName: "Ibuprofen", strength: "100 mg/5 ml", form: "suspension", drugClass: "nsaid", sortOrder: 28 },
  { key: "med-gen-etoricoxib-90", brandName: null, genericName: "Etoricoxib", strength: "90 mg", form: "tablet", drugClass: "nsaid", sortOrder: 29 },
  { key: "med-gen-amoxicillin-susp", brandName: null, genericName: "Amoxicillin", strength: "125 mg/5 ml", form: "suspension", drugClass: "penicillin", sortOrder: 30 },
  { key: "med-gen-clindamycin-300", brandName: null, genericName: "Clindamycin", strength: "300 mg", form: "capsule", drugClass: "lincosamide", sortOrder: 31 },
  { key: "med-gen-metronidazole-susp", brandName: null, genericName: "Metronidazole", strength: "200 mg/5 ml", form: "suspension", drugClass: "nitroimidazole", sortOrder: 32 },
  { key: "med-gen-tranexamic-500", brandName: null, genericName: "Tranexamic Acid", strength: "500 mg", form: "tablet", drugClass: "antifibrinolytic", sortOrder: 33 },
  { key: "med-gen-fluconazole-50", brandName: null, genericName: "Fluconazole", strength: "50 mg", form: "capsule", drugClass: "antifungal", sortOrder: 34 },
  { key: "med-gen-nystatin-susp", brandName: null, genericName: "Nystatin", strength: "100,000 IU/ml", form: "suspension", drugClass: "antifungal", sortOrder: 35 },
  { key: "med-gen-miconazole-gel", brandName: null, genericName: "Miconazole", strength: "2%", form: "gel", drugClass: "antifungal", sortOrder: 36 },
  { key: "med-gen-acyclovir-400", brandName: null, genericName: "Acyclovir", strength: "400 mg", form: "tablet", drugClass: "antiviral", sortOrder: 37 },
  { key: "med-gen-acyclovir-oint", brandName: null, genericName: "Acyclovir", strength: "5%", form: "ointment", drugClass: "antiviral", sortOrder: 38 },
  { key: "med-gen-vitamin-b", brandName: null, genericName: "Vitamin B Complex", strength: null, form: "tablet", drugClass: "vitamin", sortOrder: 39 },
  { key: "med-gen-chlorhexidine-02", brandName: null, genericName: "Chlorhexidine Gluconate", strength: "0.2%", form: "mouthwash", drugClass: "antiseptic", sortOrder: 40 },
  { key: "med-gen-povidone-1", brandName: null, genericName: "Povidone-Iodine", strength: "1%", form: "mouthwash", drugClass: "antiseptic", sortOrder: 41 },
  { key: "med-gen-benzydamine-015", brandName: null, genericName: "Benzydamine Hydrochloride", strength: "0.15%", form: "mouthwash", drugClass: "nsaid", sortOrder: 42 },
  { key: "med-gen-lidocaine-gel", brandName: null, genericName: "Lidocaine", strength: "2%", form: "gel", drugClass: "local_anaesthetic", sortOrder: 43 },
  { key: "med-gen-triamcinolone-paste", brandName: null, genericName: "Triamcinolone Acetonide", strength: "0.1%", form: "paste", drugClass: "corticosteroid", sortOrder: 44 },
  { key: "med-gen-metro-chlor-gel", brandName: null, genericName: "Metronidazole + Chlorhexidine", strength: "1% + 0.25%", form: "gel", drugClass: "nitroimidazole", sortOrder: 45 },
  { key: "med-gen-potassium-nitrate-tp", brandName: null, genericName: "Potassium Nitrate", strength: "5%", form: "toothpaste", drugClass: "desensitizing", sortOrder: 46 },
];

// -----------------------------------------------------------------------------
// 3. Dosage Patterns (Bangla)
// -----------------------------------------------------------------------------
export const MASTER_DOSAGE_PATTERNS: SeedDosagePattern[] = [
  { key: "dose-1-0-0", labelBn: "১+০+০", code: "1-0-0", formGroup: "oral_solid", sortOrder: 1 },
  { key: "dose-0-1-0", labelBn: "০+১+০", code: "0-1-0", formGroup: "oral_solid", sortOrder: 2 },
  { key: "dose-0-0-1", labelBn: "০+০+১", code: "0-0-1", formGroup: "oral_solid", sortOrder: 3 },
  { key: "dose-1-0-1", labelBn: "১+০+১", code: "1-0-1", formGroup: "oral_solid", sortOrder: 4 },
  { key: "dose-1-1-1", labelBn: "১+১+১", code: "1-1-1", formGroup: "oral_solid", sortOrder: 5 },
  { key: "dose-1-1-1-1", labelBn: "১+১+১+১", code: "1-1-1-1", formGroup: "oral_solid", sortOrder: 6 },
  { key: "dose-05-0-05", labelBn: "½+০+½", code: "0.5-0-0.5", formGroup: "oral_solid", sortOrder: 7 },
  { key: "dose-2-0-2", labelBn: "২+০+২", code: "2-0-2", formGroup: "oral_solid", sortOrder: 8 },
  { key: "dose-alt-day", labelBn: "একদিন পর পর ১টি", code: "alt-day-1", formGroup: "oral_solid", sortOrder: 9 },
  { key: "dose-weekly", labelBn: "সপ্তাহে ১টি", code: "weekly-1", formGroup: "oral_solid", sortOrder: 10 },
  { key: "dose-single", labelBn: "শুধু একবার ১টি", code: "single-dose", formGroup: "oral_solid", sortOrder: 11 },
  { key: "dose-prn-pain", labelBn: "ব্যথা হলে ১টি (দিনে সর্বোচ্চ ৩টি)", code: "prn-pain", formGroup: "oral_solid", sortOrder: 12 },
  { key: "dose-prn", labelBn: "প্রয়োজন হলে", code: "prn", formGroup: "any", sortOrder: 13 },
  { key: "dose-liq-5ml-bd", labelBn: "১ চামচ (৫ মিলি) করে দিনে ২ বার", code: "liq-5ml-bd", formGroup: "oral_liquid", sortOrder: 14 },
  { key: "dose-liq-5ml-tds", labelBn: "১ চামচ (৫ মিলি) করে দিনে ৩ বার", code: "liq-5ml-tds", formGroup: "oral_liquid", sortOrder: 15 },
  { key: "dose-liq-25ml-tds", labelBn: "½ চামচ (২.৫ মিলি) করে দিনে ৩ বার", code: "liq-2.5ml-tds", formGroup: "oral_liquid", sortOrder: 16 },
  { key: "dose-liq-10ml-tds", labelBn: "২ চামচ (১০ মিলি) করে দিনে ৩ বার", code: "liq-10ml-tds", formGroup: "oral_liquid", sortOrder: 17 },
  { key: "dose-mw-10ml-bd", labelBn: "১০ মিলি দিয়ে দিনে ২ বার ৩০ সেকেন্ড কুলি করবেন (গিলবেন না)", code: "mw-10ml-bd", formGroup: "mouthwash", sortOrder: 18 },
  { key: "dose-mw-10ml-tds", labelBn: "১০ মিলি দিয়ে দিনে ৩ বার ৩০ সেকেন্ড কুলি করবেন (গিলবেন না)", code: "mw-10ml-tds", formGroup: "mouthwash", sortOrder: 19 },
  { key: "dose-mw-diluted-tds", labelBn: "সমপরিমাণ পানির সাথে মিশিয়ে দিনে ৩ বার কুলি করবেন", code: "mw-diluted-tds", formGroup: "mouthwash", sortOrder: 20 },
  { key: "dose-top-bd", labelBn: "আক্রান্ত স্থানে দিনে ২ বার লাগাবেন", code: "top-bd", formGroup: "topical", sortOrder: 21 },
  { key: "dose-top-tds", labelBn: "আক্রান্ত স্থানে দিনে ৩ বার লাগাবেন", code: "top-tds", formGroup: "topical", sortOrder: 22 },
  { key: "dose-top-pc-hs", labelBn: "খাবারের পর ও রাতে ঘুমানোর আগে আক্রান্ত স্থানে লাগাবেন", code: "top-pc-hs", formGroup: "topical", sortOrder: 23 },
  { key: "dose-tp-bd", labelBn: "দিনে ২ বার এই পেস্ট দিয়ে ব্রাশ করবেন", code: "tp-bd", formGroup: "toothpaste", sortOrder: 24 },
  { key: "dose-tp-apply-night", labelBn: "রাতে ব্রাশের পর শিরশির করা দাঁতে অল্প পেস্ট লাগিয়ে রাখবেন (কুলি করবেন না)", code: "tp-apply-night", formGroup: "toothpaste", sortOrder: 25 },
];

// -----------------------------------------------------------------------------
// 4. Meal Timings (Bangla)
// -----------------------------------------------------------------------------
export const MASTER_MEAL_TIMINGS: SeedMealTiming[] = [
  { key: "meal-after-meal", labelBn: "খাবার পরে", code: "after_meal", sortOrder: 1 },
  { key: "meal-before-meal", labelBn: "খাবার আগে", code: "before_meal", sortOrder: 2 },
  { key: "meal-before-meal-30", labelBn: "খাবারের ৩০ মিনিট আগে", code: "before_meal_30", sortOrder: 3 },
  { key: "meal-with-meal", labelBn: "খাবারের সাথে", code: "with_meal", sortOrder: 4 },
  { key: "meal-empty-stomach", labelBn: "খালি পেটে", code: "empty_stomach", sortOrder: 5 },
  { key: "meal-bedtime", labelBn: "রাতে ঘুমানোর আগে", code: "bedtime", sortOrder: 6 },
  { key: "meal-any-time", labelBn: "যেকোনো সময়", code: "any_time", sortOrder: 7 },
];

// -----------------------------------------------------------------------------
// 5. Durations (Bangla)
// -----------------------------------------------------------------------------
export const MASTER_DURATIONS: SeedDurationOption[] = [
  { key: "dur-3", labelBn: "৩ দিন", daysCount: 3, sortOrder: 1 },
  { key: "dur-5", labelBn: "৫ দিন", daysCount: 5, sortOrder: 2 },
  { key: "dur-7", labelBn: "৭ দিন", daysCount: 7, sortOrder: 3 },
  { key: "dur-10", labelBn: "১০ দিন", daysCount: 10, sortOrder: 4 },
  { key: "dur-14", labelBn: "১৪ দিন", daysCount: 14, sortOrder: 5 },
  { key: "dur-21", labelBn: "২১ দিন", daysCount: 21, sortOrder: 6 },
  { key: "dur-30", labelBn: "১ মাস", daysCount: 30, sortOrder: 7 },
  { key: "dur-90", labelBn: "৩ মাস", daysCount: 90, sortOrder: 8 },
  { key: "dur-continue", labelBn: "চলবে", daysCount: null, sortOrder: 9 },
  { key: "dur-prn-pain", labelBn: "ব্যথা থাকা পর্যন্ত", daysCount: null, sortOrder: 10 },
  { key: "dur-until-visit", labelBn: "পরবর্তী সাক্ষাৎ পর্যন্ত", daysCount: null, sortOrder: 11 },
];

// -----------------------------------------------------------------------------
// 6. Advice Templates (Bangla, Grouped)
// -----------------------------------------------------------------------------
export const MASTER_ADVICE_TEMPLATES: SeedAdviceTemplate[] = [
  // General oral care
  { key: "adv-goc-01", groupName: "General oral care", textBn: "দিনে দুইবার (সকালে নাস্তার পর ও রাতে ঘুমানোর আগে) নরম ব্রাশ দিয়ে দাঁত ব্রাশ করবেন।", sortOrder: 1 },
  { key: "adv-goc-02", groupName: "General oral care", textBn: "ফ্লোরাইডযুক্ত টুথপেস্ট ব্যবহার করবেন।", sortOrder: 2 },
  { key: "adv-goc-03", groupName: "General oral care", textBn: "মিষ্টি ও আঠালো খাবার কম খাবেন।", sortOrder: 3 },
  { key: "adv-goc-04", groupName: "General oral care", textBn: "ধূমপান, জর্দা, গুল ও পান-সুপারি এড়িয়ে চলবেন।", sortOrder: 4 },
  { key: "adv-goc-05", groupName: "General oral care", textBn: "প্রতি ৬ মাস পর পর দাঁত পরীক্ষা করাবেন।", sortOrder: 5 },

  // Post-extraction
  { key: "adv-pe-01", groupName: "Post-extraction", textBn: "তুলা/গজ ৩০–৪৫ মিনিট শক্ত করে কামড় দিয়ে রাখবেন।", sortOrder: 6 },
  { key: "adv-pe-02", groupName: "Post-extraction", textBn: "২৪ ঘণ্টা কুলি করবেন না এবং থুথু ফেলবেন না।", sortOrder: 7 },
  { key: "adv-pe-03", groupName: "Post-extraction", textBn: "২৪ ঘণ্টা পর থেকে দিনে ৩–৪ বার কুসুম গরম লবণ পানি দিয়ে আলতো করে কুলি করবেন।", sortOrder: 8 },
  { key: "adv-pe-04", groupName: "Post-extraction", textBn: "প্রথম দিন ঠান্ডা ও নরম খাবার খাবেন; গরম খাবার ও পানীয় এড়িয়ে চলবেন।", sortOrder: 9 },
  { key: "adv-pe-05", groupName: "Post-extraction", textBn: "স্ট্র দিয়ে কিছু পান করবেন না।", sortOrder: 10 },
  { key: "adv-pe-06", groupName: "Post-extraction", textBn: "ক্ষতস্থানে জিহ্বা বা আঙুল লাগাবেন না।", sortOrder: 11 },
  { key: "adv-pe-07", groupName: "Post-extraction", textBn: "প্রথম দিন গালের বাইরে থেকে বরফের সেঁক দেবেন (১০ মিনিট দিয়ে ১০ মিনিট বিরতি)।", sortOrder: 12 },
  { key: "adv-pe-08", groupName: "Post-extraction", textBn: "রক্তপাত বন্ধ না হলে পরিষ্কার গজ দিয়ে চেপে ধরবেন এবং দ্রুত যোগাযোগ করবেন।", sortOrder: 13 },

  // After root canal
  { key: "adv-rct-01", groupName: "After root canal", textBn: "চিকিৎসা শেষ না হওয়া পর্যন্ত ওই পাশে শক্ত খাবার চিবাবেন না।", sortOrder: 14 },
  { key: "adv-rct-02", groupName: "After root canal", textBn: "রুট ক্যানালের পর দাঁতে ক্যাপ/ক্রাউন করে নেবেন, নইলে দাঁত ভেঙে যেতে পারে।", sortOrder: 15 },
  { key: "adv-rct-03", groupName: "After root canal", textBn: "কয়েকদিন হালকা ব্যথা স্বাভাবিক; ব্যথা বা ফোলা বাড়লে যোগাযোগ করবেন।", sortOrder: 16 },

  // After scaling
  { key: "adv-sc-01", groupName: "After scaling", textBn: "স্কেলিংয়ের পর কয়েকদিন দাঁত শিরশির করতে পারে, এটি স্বাভাবিক।", sortOrder: 17 },
  { key: "adv-sc-02", groupName: "After scaling", textBn: "দিনে ২ বার কুসুম গরম লবণ পানি দিয়ে কুলি করবেন।", sortOrder: 18 },
  { key: "adv-sc-03", groupName: "After scaling", textBn: "কয়েকদিন অতিরিক্ত গরম বা ঠান্ডা খাবার এড়িয়ে চলবেন।", sortOrder: 19 },

  // After filling
  { key: "adv-fl-01", groupName: "After filling", textBn: "অবশ ভাব না কাটা পর্যন্ত কিছু খাবেন না।", sortOrder: 20 },
  { key: "adv-fl-02", groupName: "After filling", textBn: "অ্যামালগাম (সিলভার) ফিলিংয়ের পর ২৪ ঘণ্টা ওই পাশে চিবাবেন না।", sortOrder: 21 },
  { key: "adv-fl-03", groupName: "After filling", textBn: "কামড় দিলে দাঁত উঁচু লাগলে যোগাযোগ করবেন।", sortOrder: 22 },

  // Dentures
  { key: "adv-dn-01", groupName: "Dentures", textBn: "রাতে ঘুমানোর আগে ডেনচার খুলে পরিষ্কার পানিতে রেখে দেবেন।", sortOrder: 23 },
  { key: "adv-dn-02", groupName: "Dentures", textBn: "প্রতিদিন নরম ব্রাশ দিয়ে ডেনচার পরিষ্কার করবেন।", sortOrder: 24 },
  { key: "adv-dn-03", groupName: "Dentures", textBn: "ডেনচারে ব্যথা বা ঘা হলে নিজে ঘষাঘষি না করে যোগাযোগ করবেন।", sortOrder: 25 },

  // Braces
  { key: "adv-br-01", groupName: "Braces", textBn: "শক্ত ও আঠালো খাবার (চুইংগাম, চকলেট, হাড়) এড়িয়ে চলবেন।", sortOrder: 26 },
  { key: "adv-br-02", groupName: "Braces", textBn: "প্রতিবার খাবারের পর দাঁত ব্রাশ করবেন।", sortOrder: 27 },
  { key: "adv-br-03", groupName: "Braces", textBn: "ব্র্যাকেট বা তার খুলে গেলে দ্রুত যোগাযোগ করবেন।", sortOrder: 28 },

  // Medication
  { key: "adv-med-01", groupName: "Medication", textBn: "অ্যান্টিবায়োটিকের কোর্স পুরোপুরি শেষ করবেন, মাঝপথে বন্ধ করবেন না।", sortOrder: 29 },
  { key: "adv-med-02", groupName: "Medication", textBn: "ব্যথার ওষুধ খালি পেটে খাবেন না।", sortOrder: 30 },
  { key: "adv-med-03", groupName: "Medication", textBn: "ওষুধ খেয়ে চুলকানি, ফুসকুড়ি বা শ্বাসকষ্ট হলে ওষুধ বন্ধ করে দ্রুত যোগাযোগ করবেন।", sortOrder: 31 },

  // Follow-up
  { key: "adv-fu-01", groupName: "Follow-up", textBn: "নির্ধারিত তারিখে পরবর্তী ফলোআপে আসবেন।", sortOrder: 32 },
  { key: "adv-fu-02", groupName: "Follow-up", textBn: "ব্যথা, ফোলা বা জ্বর বাড়লে দ্রুত যোগাযোগ করবেন।", sortOrder: 33 },
];

// -----------------------------------------------------------------------------
// 7. Quick Texts (English)
// -----------------------------------------------------------------------------
export const MASTER_QUICK_TEXTS: SeedQuickText[] = [
  // Chief Complaint
  { key: "qt-cc-toothache", kind: "chief_complaint", text: "Toothache", sortOrder: 1 },
  { key: "qt-cc-chewing-pain", kind: "chief_complaint", text: "Pain while chewing", sortOrder: 2 },
  { key: "qt-cc-sensitivity", kind: "chief_complaint", text: "Sensitivity to hot/cold", sortOrder: 3 },
  { key: "qt-cc-bleeding-gums", kind: "chief_complaint", text: "Bleeding gums", sortOrder: 4 },
  { key: "qt-cc-swollen-gums", kind: "chief_complaint", text: "Swollen gums/face", sortOrder: 5 },
  { key: "qt-cc-broken-tooth", kind: "chief_complaint", text: "Broken or chipped tooth", sortOrder: 6 },
  { key: "qt-cc-food-lodgement", kind: "chief_complaint", text: "Food lodgement", sortOrder: 7 },
  { key: "qt-cc-bad-breath", kind: "chief_complaint", text: "Bad breath", sortOrder: 8 },
  { key: "qt-cc-loose-tooth", kind: "chief_complaint", text: "Loose tooth", sortOrder: 9 },
  { key: "qt-cc-missing-tooth", kind: "chief_complaint", text: "Missing tooth", sortOrder: 10 },
  { key: "qt-cc-discoloured-teeth", kind: "chief_complaint", text: "Discoloured teeth", sortOrder: 11 },
  { key: "qt-cc-irregular-teeth", kind: "chief_complaint", text: "Irregular teeth", sortOrder: 12 },
  { key: "qt-cc-mouth-ulcer", kind: "chief_complaint", text: "Mouth ulcer", sortOrder: 13 },
  { key: "qt-cc-denture-problem", kind: "chief_complaint", text: "Denture problem", sortOrder: 14 },
  { key: "qt-cc-routine-checkup", kind: "chief_complaint", text: "Routine check-up", sortOrder: 15 },

  // Examination
  { key: "qt-ex-deep-caries", kind: "examination", text: "Deep caries", sortOrder: 16 },
  { key: "qt-ex-top-positive", kind: "examination", text: "Tender on percussion (TOP +ve)", sortOrder: 17 },
  { key: "qt-ex-mobility-1", kind: "examination", text: "Mobility — Grade I", sortOrder: 18 },
  { key: "qt-ex-mobility-2", kind: "examination", text: "Mobility — Grade II", sortOrder: 19 },
  { key: "qt-ex-mobility-3", kind: "examination", text: "Mobility — Grade III", sortOrder: 20 },
  { key: "qt-ex-calculus-stains", kind: "examination", text: "Calculus and stains", sortOrder: 21 },
  { key: "qt-ex-bleeding-probing", kind: "examination", text: "Bleeding on probing", sortOrder: 22 },
  { key: "qt-ex-periodontal-pocket", kind: "examination", text: "Periodontal pocket", sortOrder: 23 },
  { key: "qt-ex-intraoral-swelling", kind: "examination", text: "Intraoral swelling", sortOrder: 24 },
  { key: "qt-ex-sinus-tract", kind: "examination", text: "Sinus tract / pus discharge", sortOrder: 25 },
  { key: "qt-ex-fractured-tooth", kind: "examination", text: "Fractured tooth", sortOrder: 26 },
  { key: "qt-ex-defective-restoration", kind: "examination", text: "Defective restoration", sortOrder: 27 },
  { key: "qt-ex-partially-erupted", kind: "examination", text: "Partially erupted tooth", sortOrder: 28 },
  { key: "qt-ex-gingival-recession", kind: "examination", text: "Gingival recession", sortOrder: 29 },
  { key: "qt-ex-attrition-abrasion", kind: "examination", text: "Attrition / abrasion", sortOrder: 30 },
  { key: "qt-ex-missing-teeth", kind: "examination", text: "Missing teeth", sortOrder: 31 },

  // Diagnosis
  { key: "qt-dx-dental-caries", kind: "diagnosis", text: "Dental caries", sortOrder: 32 },
  { key: "qt-dx-reversible-pulpitis", kind: "diagnosis", text: "Reversible pulpitis", sortOrder: 33 },
  { key: "qt-dx-irreversible-pulpitis", kind: "diagnosis", text: "Irreversible pulpitis", sortOrder: 34 },
  { key: "qt-dx-pulp-necrosis", kind: "diagnosis", text: "Pulp necrosis", sortOrder: 35 },
  { key: "qt-dx-acute-apical-periodontitis", kind: "diagnosis", text: "Acute apical periodontitis", sortOrder: 36 },
  { key: "qt-dx-periapical-abscess", kind: "diagnosis", text: "Periapical abscess", sortOrder: 37 },
  { key: "qt-dx-chronic-gingivitis", kind: "diagnosis", text: "Chronic gingivitis", sortOrder: 38 },
  { key: "qt-dx-chronic-periodontitis", kind: "diagnosis", text: "Chronic periodontitis", sortOrder: 39 },
  { key: "qt-dx-pericoronitis", kind: "diagnosis", text: "Pericoronitis", sortOrder: 40 },
  { key: "qt-dx-impacted-molar", kind: "diagnosis", text: "Impacted third molar", sortOrder: 41 },
  { key: "qt-dx-dentine-hypersensitivity", kind: "diagnosis", text: "Dentine hypersensitivity", sortOrder: 42 },
  { key: "qt-dx-cracked-tooth", kind: "diagnosis", text: "Cracked / fractured tooth", sortOrder: 43 },
  { key: "qt-dx-partially-edentulous", kind: "diagnosis", text: "Partially edentulous", sortOrder: 44 },
  { key: "qt-dx-completely-edentulous", kind: "diagnosis", text: "Completely edentulous", sortOrder: 45 },
  { key: "qt-dx-malocclusion", kind: "diagnosis", text: "Malocclusion", sortOrder: 46 },
  { key: "qt-dx-aphthous-ulcer", kind: "diagnosis", text: "Aphthous ulcer", sortOrder: 47 },
  { key: "qt-dx-oral-candidiasis", kind: "diagnosis", text: "Oral candidiasis", sortOrder: 48 },

  // Investigation
  { key: "qt-inv-iopa", kind: "investigation", text: "IOPA X-ray", sortOrder: 49 },
  { key: "qt-inv-bitewing", kind: "investigation", text: "Bitewing X-ray", sortOrder: 50 },
  { key: "qt-inv-opg", kind: "investigation", text: "OPG", sortOrder: 51 },
  { key: "qt-inv-cbct", kind: "investigation", text: "CBCT", sortOrder: 52 },
  { key: "qt-inv-pulp-vitality", kind: "investigation", text: "Pulp vitality test", sortOrder: 53 },
  { key: "qt-inv-cbc", kind: "investigation", text: "CBC", sortOrder: 54 },
  { key: "qt-inv-rbs", kind: "investigation", text: "RBS", sortOrder: 55 },
  { key: "qt-inv-fbs", kind: "investigation", text: "FBS", sortOrder: 56 },
  { key: "qt-inv-hba1c", kind: "investigation", text: "HbA1c", sortOrder: 57 },
  { key: "qt-inv-bt-ct", kind: "investigation", text: "BT/CT", sortOrder: 58 },
  { key: "qt-inv-pt-inr", kind: "investigation", text: "PT/INR", sortOrder: 59 },
  { key: "qt-inv-hbsag", kind: "investigation", text: "HBsAg", sortOrder: 60 },
  { key: "qt-inv-anti-hcv", kind: "investigation", text: "Anti-HCV", sortOrder: 61 },
  { key: "qt-inv-serum-creatinine", kind: "investigation", text: "Serum creatinine", sortOrder: 62 },
];
