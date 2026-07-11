import { parse } from "csv-parse/sync";
import type { RawCsvRow } from "../types/crm";

export interface ParsedCsv {
  headers: string[];
  rows: RawCsvRow[];
}

/**
 * Parses a CSV buffer into headers + row objects.
 * Does NOT assume any fixed column names — whatever headers exist in row 1
 * become the object keys. Column mapping intelligence lives entirely in the
 * AI extraction step, not here.
 */
export function parseCsvBuffer(buffer: Buffer): ParsedCsv {
  const content = buffer.toString("utf-8");

  if (!content.trim()) {
    throw new Error("The uploaded CSV file is empty.");
  }

  let records: RawCsvRow[];
  try {
    records = parse(content, {
      columns: (headerRow: string[]) =>
        headerRow.map((h) => h.trim()).filter((h) => h.length > 0 || true),
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true, // tolerate ragged rows from messy real-world exports
      bom: true,
    });
  } catch (err) {
    throw new Error(
      `Could not parse CSV: ${err instanceof Error ? err.message : "invalid format"}`
    );
  }

  if (records.length === 0) {
    throw new Error("No data rows found in the CSV file.");
  }

  const headers = Object.keys(records[0]);

  // Drop rows that are entirely blank (common trailing-line artifact).
  const rows = records.filter((row) =>
    Object.values(row).some((v) => v && v.trim().length > 0)
  );

  return { headers, rows };
}
