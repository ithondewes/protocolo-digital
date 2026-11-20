/** Fictitious city used by the sample catalog and the preview banner. */
export const municipality = {
  name: "Vale Claro",
  product: "Digital Protocol",
} as const;

/** Environment-desk analyst included in the fictitious seed. */
export const previewAnalyst = {
  name: "Helena Duarte",
  email: "helena.duarte@valeclaro.test",
  role: "analyst" as const,
  sectorKeys: ["environment"] as const,
  sectorNames: ["Environment"] as const,
};

/** Shared password for every fictitious seeded account. Not a production secret. */
export const demoPassword = "vale-claro-demo";
