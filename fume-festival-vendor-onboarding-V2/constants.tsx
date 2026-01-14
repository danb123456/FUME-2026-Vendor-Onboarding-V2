
export const EQUIPMENT_TYPES = [
  "Lights", "Van", "Till/POS", "Smoker", "Hot Hold", "Oven", 
  "Fridge", "Freezer", "Baine Marie", "Asado", "Other (Hot)", 
  "Other (aesthetic)", "Other (cold)", "Other (misc)"
];

export const POWER_SOCKETS = ["n/a", "13a", "16a", "32a"];

export const STAFF_ROLES = ["Chef", "Pitmaster", "Manager", "Server", "Cleaner", "Driver", "Other"];

export const SPACE_OPTIONS = ["None", "1m", "2m", "3m", "4m", "5m"];

export const REASON_OPTIONS: string[] = ["Smoker", "Fridge/Fridge Van", "Food Truck", "Asado Grill", "Service Counter", "Other"];

export const PAPERWORK_ITEMS = [
  { id: "risk_assessment", label: "Risk Assessment" },
  { id: "method_statement", label: "Method Statement" },
  { id: "public_liability", label: "Public Liability Insurance" },
  { id: "haccp", label: "HACCP Document" },
  { id: "council_reg", label: "Local Council Registration Form" },
  { id: "hygiene_rating", label: "Food Hygiene Rating" },
  { id: "hygiene_qual", label: "Food Hygiene Qualification" },
  { id: "allergen_matrix", label: "Allergen Matrix" },
  { id: "fire_risk", label: "Fire Risk Assessment" },
  { id: "gas_cert", label: "Gas Certificate (If Applicable)" },
  { id: "elec_pat", label: "Electrical/PAT Certificate" }
];

export const MIN_STAFF_COUNT = 6;
export const MIN_EXPIRY_DATE_FUME = "2026-06-14";
export const MIN_EXPIRY_DATE_FAYRE = "2026-07-01";
