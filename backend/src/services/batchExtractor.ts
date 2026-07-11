import type { AIProvider } from "./aiProvider";
import type { CrmRecord, ImportResult, RawCsvRow, SkippedRecord } from "../types/crm";

const BATCH_SIZE = Number(process.env.AI_BATCH_SIZE || 15);
const MAX_CONCURRENT_BATCHES = Number(process.env.AI_MAX_CONCURRENCY || 3);
const MAX_RETRIES = Number(process.env.AI_MAX_RETRIES || 2);

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** A row is only ever valid for import if it has an email or a mobile number. */
function hasContactInfo(record: CrmRecord): boolean {
  return Boolean(record.email.trim()) || Boolean(record.mobile_without_country_code.trim());
}

async function extractBatchWithRetry(
  provider: AIProvider,
  rows: RawCsvRow[],
  onProgress?: (batchDone: number) => void
): Promise<{ success: CrmRecord[]; skipped: SkippedRecord[] }> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await provider.extractBatch(rows);
      const success: CrmRecord[] = [];
      const skipped: SkippedRecord[] = [];

      // Guarantee every input row is accounted for exactly once, even if the
      // model returned results out of order or (rarely) dropped one.
      const byIndex = new Map(response.results.map((r) => [r.row_index, r]));

      rows.forEach((row, index) => {
        const result = byIndex.get(index);

        if (!result || result.skip || !result.record) {
          skipped.push({
            row,
            reason: result?.skip_reason || "Model could not extract a usable record from this row.",
          });
          return;
        }

        // Backend-side safety net: never trust the model's skip judgment alone.
        if (!hasContactInfo(result.record)) {
          skipped.push({ row, reason: "No email or mobile number found in this row." });
          return;
        }

        success.push(result.record);
      });

      onProgress?.(1);
      return { success, skipped };
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES) {
        await sleep(500 * 2 ** attempt); // exponential backoff
      }
    }
  }

  // All retries exhausted for this batch — skip every row in it rather than
  // failing the whole import, and surface why.
  const reason = `AI extraction failed after ${MAX_RETRIES + 1} attempts: ${
    lastError instanceof Error ? lastError.message : "unknown error"
  }`;
  onProgress?.(1);
  return {
    success: [],
    skipped: rows.map((row) => ({ row, reason })),
  };
}

/**
 * Splits all rows into batches and processes them with bounded concurrency,
 * so we get parallelism without slamming the AI provider's rate limits.
 */
export async function extractCrmRecords(
  provider: AIProvider,
  rows: RawCsvRow[],
  onProgress?: (batchesDone: number, totalBatches: number) => void
): Promise<ImportResult> {
  if (rows.length === 0) {
    return { success: [], skipped: [], total_imported: 0, total_skipped: 0 };
  }

  const batches = chunk(rows, BATCH_SIZE);
  const results: { success: CrmRecord[]; skipped: SkippedRecord[] }[] = new Array(batches.length);
  let batchesDone = 0;

  let cursor = 0;
  async function worker() {
    while (cursor < batches.length) {
      const myIndex = cursor++;
      results[myIndex] = await extractBatchWithRetry(provider, batches[myIndex], () => {
        batchesDone++;
        onProgress?.(batchesDone, batches.length);
      });
    }
  }

  const workers = Array.from({ length: Math.min(MAX_CONCURRENT_BATCHES, batches.length) }, worker);
  await Promise.all(workers);

  const success = results.flatMap((r) => r.success);
  const skipped = results.flatMap((r) => r.skipped);

  return {
    success,
    skipped,
    total_imported: success.length,
    total_skipped: skipped.length,
  };
}
