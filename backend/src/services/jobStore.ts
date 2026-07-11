import { randomUUID } from "crypto";
import type { ImportResult } from "../types/crm";

export type JobStatus = "processing" | "done" | "error";

export interface ImportJob {
  id: string;
  status: JobStatus;
  totalBatches: number;
  batchesDone: number;
  result?: ImportResult;
  error?: string;
  createdAt: number;
}

// In-memory store — fine for a single-instance take-home deployment.
// Swap for Redis if this ever needs to run behind multiple instances.
const jobs = new Map<string, ImportJob>();

const JOB_TTL_MS = 30 * 60 * 1000; // 30 minutes

export function createJob(): ImportJob {
  const job: ImportJob = {
    id: randomUUID(),
    status: "processing",
    totalBatches: 0,
    batchesDone: 0,
    createdAt: Date.now(),
  };
  jobs.set(job.id, job);
  return job;
}

export function getJob(id: string): ImportJob | undefined {
  return jobs.get(id);
}

export function updateJob(id: string, patch: Partial<ImportJob>): void {
  const job = jobs.get(id);
  if (job) Object.assign(job, patch);
}

// Periodic cleanup so the map doesn't grow unbounded on a long-running server.
setInterval(() => {
  const now = Date.now();
  for (const [id, job] of jobs) {
    if (now - job.createdAt > JOB_TTL_MS) jobs.delete(id);
  }
}, 5 * 60 * 1000).unref();
