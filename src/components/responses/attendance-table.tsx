"use client";

import type { AttendanceRow } from "@/domain/attendance";
import { formatDateTime } from "@/lib/format-date";
import { ui } from "@/lib/ui-id";

type AttendanceTableProps = {
  rows: AttendanceRow[];
};

export function AttendanceTable({ rows }: AttendanceTableProps) {
  if (rows.length === 0) return null;

  return (
    <section className="forma-section space-y-3" aria-labelledby="attendance-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3
          id="attendance-heading"
          className="text-sm font-medium uppercase tracking-wide text-ink-muted"
        >
          {ui.attendance}
        </h3>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex min-h-11 items-center rounded-md border border-border px-3 text-sm font-medium hover:border-ink-muted print:hidden"
        >
          {ui.printAttendance}
        </button>
      </div>
      <div className="overflow-x-auto rounded-md border border-border bg-bg-elevated">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-border text-ink-muted">
            <tr>
              <th className="px-4 py-3 font-medium">{ui.attendanceName}</th>
              <th className="px-4 py-3 font-medium">{ui.attendanceContact}</th>
              <th className="px-4 py-3 font-medium">{ui.attendanceTime}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3">{row.name || "—"}</td>
                <td className="px-4 py-3">{row.contact || "—"}</td>
                <td className="px-4 py-3 text-ink-muted">
                  {formatDateTime(row.submittedAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
