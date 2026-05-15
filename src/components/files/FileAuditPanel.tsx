import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useFileAudit } from '../../hooks/useClientFiles';
import { formatBytes } from './formatBytes';

interface Props {
  clientId: number;
}

const FileAuditPanel: React.FC<Props> = ({ clientId }) => {
  const [page, setPage] = useState(1);
  const { data, isLoading, isFetching } = useFileAudit(clientId, page);

  const hasNext = Boolean(data?.next);
  const hasPrev = page > 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[16px] font-semibold text-text">Recent deletions</h3>
        {isFetching ? (
          <Loader2 className="h-4 w-4 animate-spin text-text-mute" />
        ) : null}
      </div>

      <div className="overflow-hidden rounded-xl border border-themed surface-card shadow-glass">
        <span
          aria-hidden
          className="pointer-events-none block h-px w-full bg-gradient-to-r
            from-transparent via-brand-gold/30 to-transparent"
        />
        {isLoading ? (
          <div className="py-16 text-center">
            <Loader2 className="mx-auto h-5 w-5 animate-spin text-brand-cyan" />
            <p className="mt-3 font-mono text-[11px] uppercase tracking-widest2 text-text-mute">
              Loading audit log
            </p>
          </div>
        ) : !data || data.results.length === 0 ? (
          <div className="py-16 text-center text-[13px] text-text-mute">
            No deletions yet for this client.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-themed bg-ink-1/30">
                  {['When', 'By', 'Module', 'File', 'Size'].map((h) => (
                    <th
                      key={h}
                      className="whitespace-nowrap px-4 py-3 text-left font-mono text-[10px]
                        font-semibold uppercase tracking-widest2 text-text-mute"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.results.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-themed last:border-b-0 hover:bg-line/[0.03]"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-[12px] text-text-dim">
                      {new Date(row.deleted_at).toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-[12px] text-text">
                      {row.deleted_by_email || '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className="rounded-full border border-themed-2 px-2 py-0.5 font-mono
                          text-[10px] uppercase tracking-widest2 text-text-dim"
                      >
                        {(row.module || '—').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="max-w-[420px] truncate px-4 py-3 text-[12px]" title={row.s3_key}>
                      <span className="font-medium text-text">
                        {row.original_filename ||
                          row.s3_key.split('/').pop() ||
                          row.s3_key}
                      </span>
                      <span className="ml-2 font-mono text-[10px] text-text-mute">
                        {row.s3_key}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-[11px] text-text-dim">
                      {formatBytes(row.size_bytes)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {data && (hasPrev || hasNext) ? (
        <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-widest2 text-text-mute">
          <span>
            Page {page} · {data.count} total
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!hasPrev}
              className="inline-flex items-center gap-1 rounded-md border border-themed-2 px-2.5 py-1
                text-text-dim transition-colors hover:border-brand-cyan/40 hover:text-text
                disabled:opacity-30"
            >
              <ChevronLeft className="h-3 w-3" /> Prev
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={!hasNext}
              className="inline-flex items-center gap-1 rounded-md border border-themed-2 px-2.5 py-1
                text-text-dim transition-colors hover:border-brand-cyan/40 hover:text-text
                disabled:opacity-30"
            >
              Next <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default FileAuditPanel;
