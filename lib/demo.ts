/** Fictitious city used by the sample catalog and the preview banner. */
export const municipality = {
  name: "Vale Claro",
  product: "Digital Protocol",
} as const;

/** Stand-in for the signed-in user until authentication exists. */
export const previewAnalyst = {
  name: "Helena Duarte",
  email: "helena.duarte@valeclaro.test",
  role: "analyst" as const,
  sectorKeys: ["environment"] as const,
  sectorNames: ["Environment"] as const,
};
