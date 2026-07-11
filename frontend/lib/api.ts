import type { ImportJobStatus, ImportResult, PreviewResponse } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export class ApiError extends Error {}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.error || `Request failed with status ${res.status}`);
  }
  return res.json();
}

export async function previewCsv(file: File): Promise<PreviewResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/api/csv/preview`, {
    method: "POST",
    body: formData,
  });
  return handle<PreviewResponse>(res);
}

export async function startImport(rows: Record<string, string>[]): Promise<{ jobId: string }> {
  const res = await fetch(`${API_BASE}/api/csv/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rows }),
  });
  return handle<{ jobId: string }>(res);
}

export async function getImportJob(jobId: string): Promise<ImportJobStatus> {
  const res = await fetch(`${API_BASE}/api/csv/import/${jobId}`);
  return handle<ImportJobStatus>(res);
}

/** Polls the job until it's done or errored, reporting progress along the way. */
export async function pollImportJob(
  jobId: string,
  onProgress: (status: ImportJobStatus) => void,
  intervalMs = 1200
): Promise<ImportResult> {
  return new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        const status = await getImportJob(jobId);
        onProgress(status);

        if (status.status === "done" && status.result) {
          resolve(status.result);
        } else if (status.status === "error") {
          reject(new ApiError(status.error || "Import failed."));
        } else {
          setTimeout(tick, intervalMs);
        }
      } catch (err) {
        reject(err);
      }
    };
    tick();
  });
}
