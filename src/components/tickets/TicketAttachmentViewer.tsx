import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, FileText, FileWarning } from 'lucide-react';

import Modal from '../ui/Modal';
import { cn } from '../../utils/helpers';

export interface TicketAttachment {
  url: string;
  label: string;
}

export type AttachmentKind = 'image' | 'video' | 'pdf' | 'other';

/**
 * What a ticket attachment is, from its path (the query string of a presigned URL is ignored).
 *
 * Ticket uploads (`report_issue`) are limited server-side to images, PDF and video, so these three
 * cover what exists. 99 of the 100 attachments in production are PNG/JPEG and one is a PDF.
 */
export function attachmentKind(url: string): AttachmentKind {
  const path = (url || '').split('?', 1)[0].toLowerCase();
  if (/\.(png|jpe?g|gif|webp|bmp)$/.test(path)) return 'image';
  if (/\.(mp4|webm|mov|m4v|mpe?g|3gp|mkv|avi)$/.test(path)) return 'video';
  if (/\.pdf$/.test(path)) return 'pdf';
  return 'other';
}

/** A file's identity: its path. The query string is a signature the API renews on every read. */
export function attachmentPath(url: string): string {
  return (url || '').split('?', 1)[0];
}

/** Arrow keys belong to whatever has focus when that thing uses them itself. */
function arrowsBelongToTarget(e: KeyboardEvent): boolean {
  if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return true;
  const el = e.target as HTMLElement | null;
  return !!el?.closest?.('video, audio, input, textarea, select, [contenteditable="true"]');
}

interface Props {
  items: TicketAttachment[];
  /** The attachment on screen, or null when the viewer is closed. */
  index: number | null;
  onIndex: (index: number) => void;
  onClose: () => void;
}

/**
 * A ticket's attachments, viewed inside the portal.
 *
 * They used to open in a new tab, which took the operator out of the queue and left a stack of
 * S3 tabs behind for every ticket they worked through. The same in-page viewing the LMS gives a
 * tenant admin (components/tickets/AttachmentPreviewDialog.tsx), plus paging between a ticket's
 * files. PDFs are the exception and open in their own tab: see the card below for why.
 */
const TicketAttachmentViewer: React.FC<Props> = ({ items, index, onIndex, onClose }) => {
  const open = index !== null && index >= 0 && index < items.length;
  // The last file shown, kept while the modal plays its close animation. Without it the panel
  // collapsed to an empty header the moment `index` went null, then faded out.
  const [shown, setShown] = useState<{ item: TicketAttachment; position: number } | null>(null);
  useEffect(() => {
    if (open) setShown({ item: items[index], position: index });
  }, [open, index, items]);
  const current = open ? items[index] : shown?.item ?? null;
  const position = open ? index : shown?.position ?? 0;
  const kind = current ? attachmentKind(current.url) : 'other';
  const many = items.length > 1;
  // By path, so moving to the next file does not inherit the previous one's failure, and a
  // re-signed URL for the same file keeps it.
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !many) return;
    const onKey = (e: KeyboardEvent) => {
      if (arrowsBelongToTarget(e)) return;
      if (e.key === 'ArrowRight') onIndex((index + 1) % items.length);
      if (e.key === 'ArrowLeft') onIndex((index - 1 + items.length) % items.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, many, index, items.length, onIndex]);

  const path = current ? attachmentPath(current.url) : '';
  const broken = !!current && failed === path;
  const title = current
    ? many
      ? `${current.label} · ${position + 1} of ${items.length}`
      : current.label
    : '';

  return (
    <Modal isOpen={open} onClose={onClose} size="xl" title={title}>
      {current && (
        <div className="space-y-4" data-testid="ticket-attachment-viewer">
          <div className="relative flex min-h-[320px] items-center justify-center rounded-xl border border-themed bg-ink-1/40 p-3">
            {kind === 'pdf' ? (
              // Not embedded. Chrome's PDF viewer follows a link inside the document by navigating
              // the TOP window, so a learner's PDF with one invisible page-sized link could replace
              // this super-admin tab with a fake sign-in page on a single click. Sandboxing the
              // frame would stop that, but Chrome will not render PDFs in a sandboxed frame.
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <FileText className="h-8 w-8 text-text-mute" strokeWidth={1.5} />
                <p className="max-w-sm text-[13px] text-text-dim">
                  PDFs open in their own tab. A document uploaded with a ticket can contain links,
                  and they must not be able to take over the portal.
                </p>
                <a
                  href={current.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-brand-cyan/40 bg-brand-cyan/10
                    px-3 py-1.5 text-[13px] font-medium text-brand-cyan transition-colors hover:bg-brand-cyan/15"
                >
                  <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.75} />
                  Open PDF
                </a>
              </div>
            ) : broken || kind === 'other' ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <FileWarning className="h-6 w-6 text-text-mute" strokeWidth={1.5} />
                <p className="max-w-sm text-[13px] text-text-dim">
                  {!broken
                    ? 'This file type cannot be previewed here. Use Open original below.'
                    : kind === 'video'
                    ? // A decode failure looks the same as a missing file from here, and the upload
                      // endpoint accepts formats Chrome cannot play (.avi, HEVC .mov).
                      'This recording cannot be played here, possibly because of its format. Use Open original below.'
                    : 'This file could not be loaded here. It may have been removed. Use Open original below.'}
                </p>
              </div>
            ) : kind === 'image' ? (
              <img
                // Keyed by path, not URL: the API re-signs every URL on each read, and a refetch
                // (window focus after 20s) must not reload the file on screen.
                key={path}
                src={current.url}
                alt={current.label}
                onError={() => setFailed(path)}
                className="mx-auto max-h-[70vh] w-auto rounded-lg object-contain"
              />
            ) : (
              <video
                key={path}
                src={current.url}
                controls
                playsInline
                onError={() => setFailed(path)}
                className="mx-auto max-h-[70vh] w-full rounded-lg bg-black"
              />
            )}

            {many && (
              <>
                <button
                  type="button"
                  aria-label="Previous attachment"
                  onClick={() => onIndex((position - 1 + items.length) % items.length)}
                  className={cn(NAV, 'left-2')}
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  aria-label="Next attachment"
                  onClick={() => onIndex((position + 1) % items.length)}
                  className={cn(NAV, 'right-2')}
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-[10px] uppercase tracking-widest2 text-text-mute">
              {many ? 'Use ← → to move between files' : ''}
            </span>
            {/* A deliberate second action, for zooming into a screenshot or saving a file. */}
            {kind !== 'pdf' && (
            <a
              href={current.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-themed-2 px-3 py-1.5
                text-[12px] font-medium text-text-dim transition-colors hover:border-brand-cyan/40
                hover:text-brand-cyan"
            >
              <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.75} />
              Open original
            </a>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
};

const NAV =
  'absolute top-1/2 -translate-y-1/2 rounded-full border border-themed-2 bg-ink-0/70 p-1.5 ' +
  'text-text-dim backdrop-blur transition-colors hover:border-brand-cyan/40 hover:text-brand-cyan ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/50';

export default TicketAttachmentViewer;
