"use client";

import { useMemo, useState } from "react";
import { Dropzone } from "@/components/Dropzone";
import { DataTable, type Column } from "@/components/DataTable";
import { StepRail } from "@/components/StepRail";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ImportProgress } from "@/components/ImportProgress";
import { StatusBadge } from "@/components/StatusBadge";
import { previewCsv, startImport, pollImportJob, ApiError } from "@/lib/api";
import { downloadCsv, recordsToCsv } from "@/lib/csvExport";
import type { CrmRecord, ImportResult, PreviewResponse, RawCsvRow, SkippedRecord } from "@/lib/types";

type Step = 1 | 2 | 3 | 4;

export default function Home() {
  const [step, setStep] = useState<Step>(1);
  const [fileName, setFileName] = useState<string>("");

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);

  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ batchesDone: 0, totalBatches: 0 });
  const [result, setResult] = useState<ImportResult | null>(null);

  async function handleFileSelected(file: File) {
    setUploadError(null);
    setIsUploading(true);
    setFileName(file.name);
    try {
      const data = await previewCsv(file);
      setPreview(data);
      setStep(2);
    } catch (err) {
      setUploadError(err instanceof ApiError ? err.message : "Could not read that file. Please try again.");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleConfirm() {
    if (!preview) return;
    setImportError(null);
    setIsImporting(true);
    setProgress({ batchesDone: 0, totalBatches: 0 });
    setStep(3);
    try {
      const { jobId } = await startImport(preview.allRows);
      const finalResult = await pollImportJob(jobId, (status) =>
        setProgress({ batchesDone: status.batchesDone, totalBatches: status.totalBatches })
      );
      setResult(finalResult);
      setStep(4);
    } catch (err) {
      setImportError(err instanceof ApiError ? err.message : "The import failed. Please try again.");
    } finally {
      setIsImporting(false);
    }
  }

  function reset() {
    setStep(1);
    setFileName("");
    setPreview(null);
    setUploadError(null);
    setResult(null);
    setImportError(null);
  }

  const previewColumns: Column<RawCsvRow>[] = useMemo(
    () =>
      (preview?.headers ?? []).map((h) => ({
        key: h,
        header: h,
        render: (row: RawCsvRow) => row[h] || <span className="text-ink-soft/50">—</span>,
      })),
    [preview]
  );

  const successColumns: Column<CrmRecord>[] = useMemo(
    () => [
      { key: "name", header: "name" },
      { key: "email", header: "email" },
      {
        key: "mobile",
        header: "mobile",
        render: (r) => (r.country_code || r.mobile_without_country_code ? `${r.country_code} ${r.mobile_without_country_code}` : ""),
      },
      { key: "company", header: "company" },
      { key: "city", header: "city" },
      { key: "crm_status", header: "status", render: (r) => <StatusBadge status={r.crm_status} /> },
      { key: "data_source", header: "source" },
      { key: "created_at", header: "created_at" },
      { key: "crm_note", header: "note" },
    ],
    []
  );

  const skippedColumns: Column<SkippedRecord>[] = useMemo(
    () => [
      {
        key: "identity",
        header: "row",
        render: (s) => s.row.name || s.row.email || s.row.mobile || Object.values(s.row)[0] || "(unlabeled row)",
      },
      { key: "reason", header: "reason", render: (s) => <span className="text-danger">{s.reason}</span> },
    ],
    []
  );

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-lg font-semibold tracking-tight">GrowEasy</span>
            <span className="font-mono text-xs text-ink-soft">/ csv-importer</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <div className="mb-10">
          <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            Import leads from any CSV
          </h1>
          <p className="mt-2 max-w-xl text-sm text-ink-soft">
            Upload a CSV in whatever format it comes in — Facebook exports, Google Ads, a sales
            spreadsheet, anything. AI maps it into GrowEasy CRM fields automatically.
          </p>
        </div>

        <div className="mb-10">
          <StepRail current={step} />
        </div>

        {step === 1 && (
          <section className="max-w-xl">
            <Dropzone onFileSelected={handleFileSelected} disabled={isUploading} error={uploadError} />
            {isUploading && (
              <p className="mt-3 font-mono text-xs text-ink-soft animate-pulse">→ parsing {fileName}…</p>
            )}
          </section>
        )}

        {step === 2 && preview && (
          <section>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="font-mono text-xs text-ink-soft">
                <span className="text-ink">{fileName}</span> · {preview.rowCount} row
                {preview.rowCount === 1 ? "" : "s"} · {preview.headers.length} column
                {preview.headers.length === 1 ? "" : "s"}
                {preview.truncated && <span className="text-warn"> · showing first 500 rows</span>}
              </div>
              <button
                onClick={reset}
                className="text-xs font-medium text-ink-soft underline decoration-line underline-offset-4 hover:text-accent"
              >
                Choose a different file
              </button>
            </div>

            <DataTable
              columns={previewColumns}
              rows={preview.rows}
              getRowKey={(_, i) => i}
              maxHeight="24rem"
            />

            <div className="mt-6 flex items-center gap-4">
              <button
                onClick={handleConfirm}
                className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-strong focus-visible:outline-2 focus-visible:outline-accent"
              >
                Confirm import
              </button>
              <span className="font-mono text-xs text-ink-soft">
                No AI processing happens until you confirm.
              </span>
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="max-w-xl">
            <ImportProgress
              batchesDone={progress.batchesDone}
              totalBatches={progress.totalBatches}
              rowCount={preview?.rowCount ?? 0}
            />
            {importError && (
              <div className="mt-4 rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger">
                {importError}
                <button
                  onClick={handleConfirm}
                  disabled={isImporting}
                  className="ml-3 font-medium underline underline-offset-4 disabled:opacity-50"
                >
                  Retry
                </button>
              </div>
            )}
          </section>
        )}

        {step === 4 && result && (
          <section className="space-y-8">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatCard label="Total rows" value={result.total_imported + result.total_skipped} />
              <StatCard label="Imported" value={result.total_imported} accent />
              <StatCard label="Skipped" value={result.total_skipped} warn={result.total_skipped > 0} />
              <StatCard
                label="Success rate"
                value={`${Math.round(
                  (result.total_imported / Math.max(result.total_imported + result.total_skipped, 1)) * 100
                )}%`}
              />
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-sm font-semibold">Imported records</h2>
                {result.success.length > 0 && (
                  <button
                    onClick={() => downloadCsv("groweasy-crm-import.csv", recordsToCsv(result.success))}
                    className="text-xs font-medium text-accent hover:text-accent-strong"
                  >
                    Download CSV
                  </button>
                )}
              </div>
              <DataTable columns={successColumns} rows={result.success} getRowKey={(_, i) => i} />
            </div>

            {result.skipped.length > 0 && (
              <div>
                <h2 className="mb-3 font-display text-sm font-semibold">Skipped rows</h2>
                <DataTable columns={skippedColumns} rows={result.skipped} getRowKey={(_, i) => i} maxHeight="16rem" />
              </div>
            )}

            <button
              onClick={reset}
              className="rounded-lg border border-line px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent"
            >
              Import another file
            </button>
          </section>
        )}
      </main>

      <footer className="border-t border-line py-6">
        <p className="mx-auto max-w-5xl px-6 font-mono text-[11px] text-ink-soft">
          GrowEasy CSV Importer — built for the Software Developer assignment.
        </p>
      </footer>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
  warn,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
  warn?: boolean;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <p className="text-xs text-ink-soft">{label}</p>
      <p
        className={[
          "mt-1 font-mono text-2xl font-semibold tabular-nums",
          accent ? "text-accent" : warn ? "text-warn" : "text-ink",
        ].join(" ")}
      >
        {value}
      </p>
    </div>
  );
}
