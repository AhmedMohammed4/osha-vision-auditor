export interface OshaReference {
  citation: string;
  summary: string;
}

const OSHA_REFERENCE_BY_TYPE: Record<string, OshaReference> = {
  no_hard_hat: {
    citation: "29 CFR 1926.100(a)",
    summary:
      "Employees exposed to impact, falling/flying objects, or electrical shock/burn hazards must wear protective helmets.",
  },
  no_eye_protection: {
    citation: "29 CFR 1926.102(a)(1)",
    summary:
      "Eye or face protection must be provided and used when operations present hazards that can injure eyes or face.",
  },
  no_safety_vest: {
    citation: "29 CFR 1926.651(d)",
    summary:
      "Workers exposed to public vehicular traffic must wear warning vests or other suitable garments marked with high-visibility material.",
  },
  no_gloves: {
    citation: "29 CFR 1910.138(a)",
    summary:
      "Employers must select and require suitable hand protection when employee hands are exposed to hazards.",
  },
  improper_footwear: {
    citation: "29 CFR 1926.96(a)",
    summary:
      "Protective footwear is required where there is danger of foot injuries from falling/rolling objects or puncture hazards.",
  },
  no_fall_harness: {
    citation: "29 CFR 1926.501(b)(1)",
    summary:
      "Employees on unprotected sides/edges 6 feet or more above lower levels must be protected from falls.",
  },
  fall_hazard: {
    citation: "29 CFR 1926.501(b)",
    summary:
      "Applicable fall protection systems (guardrails, safety nets, or personal fall arrest) are required for listed fall exposures.",
  },
  unsafe_ladder: {
    citation: "29 CFR 1926.1053(b)(1)",
    summary:
      "Portable ladders used for upper landing access must extend at least 3 feet above the landing surface.",
  },
  scaffold_violation: {
    citation: "29 CFR 1926.451(g)(1)",
    summary:
      "Each employee on a scaffold more than 10 feet above a lower level must be protected from falling.",
  },
  electrical_hazard: {
    citation: "29 CFR 1926.403(b)(1)",
    summary:
      "Electrical equipment must be free from recognized hazards likely to cause death or serious physical harm.",
  },
  housekeeping_hazard: {
    citation: "29 CFR 1926.25(a)",
    summary:
      "During construction, work areas and access ways must be kept clear of debris, scrap, and unnecessary materials.",
  },
  tool_misuse: {
    citation: "29 CFR 1926.300(b)(1)",
    summary:
      "Employers are responsible for ensuring tools and equipment are maintained in safe condition and properly used.",
  },
  excavation_hazard: {
    citation: "29 CFR 1926.652(a)(1)",
    summary:
      "Each employee in an excavation must be protected from cave-ins by an adequate protective system, subject to limited exceptions.",
  },
  fire_hazard: {
    citation: "29 CFR 1926.150(a)(1)",
    summary:
      "An approved fire extinguisher must be provided and kept immediately available at the job site.",
  },
};

export function getOshaReference(violationType: string): OshaReference | null {
  return OSHA_REFERENCE_BY_TYPE[violationType] ?? null;
}
