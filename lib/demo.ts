/** Fictitious city used by the sample catalog and the preview banner. */
export const municipality = {
  name: "Vale Claro",
  product: "Protocolo Digital",
} as const;

/** Stand-in for the signed-in user until authentication exists. */
export const previewAnalyst = {
  name: "Helena Duarte",
  email: "helena.duarte@valeclaro.test",
  role: "analyst" as const,
  sectorKeys: ["meio-ambiente"] as const,
  sectorNames: ["Meio Ambiente"] as const,
};
