/** Result of validating a government ID number against its type's format. */
export type IdValidation = { ok: boolean; reason?: "required" | "format" };

/** Normalize for matching: strip whitespace, upper-case. */
function norm(n: string): string {
  return (n ?? "").replace(/\s+/g, "").toUpperCase();
}

/**
 * Validate a government ID number against its type. Strict patterns for the
 * well-known Indian IDs; a lenient alphanumeric fallback for foreign / varied
 * formats so a legitimate foreign document is never rejected. `nationality`
 * tightens Passport to the Indian format (letter + 7 digits) when "India".
 * This is the single source of truth — the tablet copy must match exactly.
 */
export function validateId(idType: string, idNumber: string, nationality?: string): IdValidation {
  const v = norm(idNumber);
  if (v === "") return { ok: false, reason: "required" };

  const GENERIC = /^[A-Z0-9]{6,}$/;
  let pattern: RegExp;
  switch (idType) {
    case "Aadhaar":
      pattern = /^\d{12}$/;
      break;
    case "PAN":
      pattern = /^[A-Z]{5}\d{4}[A-Z]$/;
      break;
    case "Voter ID":
      pattern = /^[A-Z]{3}\d{7}$/;
      break;
    case "Passport":
      pattern = nationality === "India" ? /^[A-Z]\d{7}$/ : GENERIC;
      break;
    case "Driving License":
      pattern = /^[A-Z0-9]{10,16}$/;
      break;
    default: // OCI Card, PIO Card, anything else
      pattern = GENERIC;
  }
  return pattern.test(v) ? { ok: true } : { ok: false, reason: "format" };
}
