import type { RawCsvRow } from "../types/crm";
import type { ExtractionResponse } from "./extractionSchema";

/**
 * A provider takes a batch of raw CSV rows and returns the raw (unvalidated)
 * extraction response. Validation + business rules are applied by the
 * orchestrator (see batchExtractor.ts), so every provider only needs to
 * worry about talking to its respective LLM API.
 */
export interface AIProvider {
  extractBatch(rows: RawCsvRow[]): Promise<ExtractionResponse>;
}
