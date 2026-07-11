import { CRM_FIELD_ORDER, type CrmRecord } from "./types";

function escapeCsvValue(value: string): string {
  const needsQuoting = /[",\n]/.test(value);
  const escaped = value.replace(/"/g, '""');
  return needsQuoting ? `"${escaped}"` : escaped;
}

export function recordsToCsv(records: CrmRecord[]): string {
  const header = CRM_FIELD_ORDER.join(",");
  const lines = records.map((record) =>
    CRM_FIELD_ORDER.map((field) => escapeCsvValue(record[field] ?? "")).join(",")
  );
  return [header, ...lines].join("\n");
}

export function downloadCsv(filename: string, csvContent: string): void {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
