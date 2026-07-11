"use client";

import type { ReactNode } from "react";

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  width?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  getRowKey: (row: T, index: number) => string | number;
  maxHeight?: string;
  emptyLabel?: string;
}

export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  maxHeight = "26rem",
  emptyLabel = "No rows to show.",
}: DataTableProps<T>) {
  return (
    <div
      className="overflow-auto rounded-xl border border-line bg-surface"
      style={{ maxHeight }}
    >
      <table className="w-full min-w-max border-collapse text-left font-mono text-xs">
        <thead className="sticky top-0 z-10 bg-surface-raised">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                style={{ width: col.width }}
                className="border-b border-line px-3 py-2.5 font-medium text-ink-soft whitespace-nowrap"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-3 py-8 text-center text-ink-soft font-sans">
                {emptyLabel}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={getRowKey(row, i)} className="border-b border-line last:border-b-0 hover:bg-paper/60">
                {columns.map((col) => (
                  <td key={col.key} className="max-w-xs truncate px-3 py-2 text-ink" title={undefined}>
                    {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
