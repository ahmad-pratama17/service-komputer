/**
 * Bagian AI Copilot yang aman dipakai di client: tipe hasil, daftar bagian,
 * dan pemformat teks. Modul ini sengaja tidak meng-import `server-only`
 * maupun SDK OpenAI supaya bisa dipakai komponen client tanpa menarik kode
 * server ke bundle browser.
 */

export type CopilotSectionKey =
  | "problemSummary"
  | "possibleCauses"
  | "recommendedChecks"
  | "suggestedService"
  | "suggestedCustomerResponse";

export type OrderAnalysis = Record<CopilotSectionKey, string | string[]>;

export const COPILOT_SECTIONS: readonly {
  key: CopilotSectionKey;
  label: string;
  list: boolean;
}[] = [
  { key: "problemSummary", label: "Problem Summary", list: false },
  { key: "possibleCauses", label: "Possible Causes", list: true },
  { key: "recommendedChecks", label: "Recommended Checks", list: true },
  { key: "suggestedService", label: "Suggested Service", list: false },
  {
    key: "suggestedCustomerResponse",
    label: "Suggested Customer Response",
    list: false,
  },
];

export function sectionToText(value: string | string[]): string {
  return Array.isArray(value)
    ? value.map((item) => `- ${item}`).join("\n")
    : value;
}

/** Analisis AI dalam bentuk teks biasa, untuk tombol salin. */
export function analysisToPlainText(analysis: OrderAnalysis): string {
  return COPILOT_SECTIONS.map((section) =>
    [section.label, sectionToText(analysis[section.key])].join("\n"),
  ).join("\n\n");
}