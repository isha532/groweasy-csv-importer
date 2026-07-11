import { Router } from "express";
import { z } from "zod";
import { upload } from "../middleware/upload";
import { asyncHandler } from "../middleware/asyncHandler";
import { ApiError } from "../middleware/errorHandler";
import { parseCsvBuffer } from "../services/csvParser";
import { extractCrmRecords } from "../services/batchExtractor";
import { createAIProvider } from "../services/providerFactory";
import { createJob, getJob, updateJob } from "../services/jobStore";
import type { RawCsvRow } from "../types/crm";

export const csvRouter = Router();

const PREVIEW_ROW_CAP = 500; // guard against pathologically huge single-page previews

/**
 * POST /api/csv/preview
 * Accepts a CSV file, parses it (no AI involved), and returns headers + rows
 * so the frontend can render the preview table before the user confirms.
 */
csvRouter.post(
  "/preview",
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new ApiError(400, "No CSV file was uploaded.");

    const { headers, rows } = parseCsvBuffer(req.file.buffer);

    res.json({
      headers,
      rows: rows.slice(0, PREVIEW_ROW_CAP),
      rowCount: rows.length,
      truncated: rows.length > PREVIEW_ROW_CAP,
      allRows: rows, // full set the frontend must send back on confirm
    });
  })
);

const importRequestSchema = z.object({
  rows: z
    .array(z.record(z.string()))
    .min(1, "At least one row is required to run the import."),
});

/**
 * POST /api/csv/import
 * Kicks off async AI extraction over the confirmed rows and immediately
 * returns a jobId. Poll GET /api/csv/import/:jobId for progress + result.
 */
csvRouter.post(
  "/import",
  asyncHandler(async (req, res) => {
    const parsed = importRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message || "Invalid request body.");
    }

    const rows: RawCsvRow[] = parsed.data.rows;
    const provider = createAIProvider();
    const job = createJob();

    // Fire and forget — the client polls for status/result.
    extractCrmRecords(provider, rows, (batchesDone, totalBatches) => {
      updateJob(job.id, { batchesDone, totalBatches });
    })
      .then((result) => updateJob(job.id, { status: "done", result }))
      .catch((err) =>
        updateJob(job.id, {
          status: "error",
          error: err instanceof Error ? err.message : "AI extraction failed.",
        })
      );

    res.status(202).json({ jobId: job.id });
  })
);

/**
 * GET /api/csv/import/:jobId
 * Returns current progress, and the final ImportResult once status is "done".
 */
csvRouter.get(
  "/import/:jobId",
  asyncHandler(async (req, res) => {
    const job = getJob(req.params.jobId);
    if (!job) throw new ApiError(404, "Import job not found or expired.");

    res.json({
      status: job.status,
      batchesDone: job.batchesDone,
      totalBatches: job.totalBatches,
      result: job.result,
      error: job.error,
    });
  })
);
