import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, FileWarning } from 'lucide-react';

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
 * tenant admin (components/tickets/AttachmentPreviewDialog.tsx), plus PDFs and paging between a
 * ticket's files.
 */
const TicketAttachmentViewer: React.FC<Props> = ({ items, index, onIndex, onClose }) => {
  const open = index !== null && index >= 0 && index < items.length;
  const current = open ? items[index] : null;
  const kind = current ? attachmentKind(current.url) : 'other';
  const many = items.length > 1;
  // Per URL, so moving to the next file does not inherit the previous one's failure.
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !many) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') onIndex((index + 1) % items.length);
      if (e.key === 'ArrowLeft') onIndex((index - 1 + items.length) % items.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, many, index, items.length, onIndex]);

  const broken = !!current && failed === current.url;
  const title = current
    ? many
      ? `${current.label} · ${index + 1} of ${items.length}`
      : current.label
    : '';

  return (
    <Modal isOpen={open} onClose={onClose} size="xl" title={title}>
      {current && (
        <div className="space-y-4" data-testid="ticket-attachment-viewer">
          <div className="relative flex min-h-[320px] items-center justify-center rounded-xl border border-themed bg-ink-1/40 p-3">
            {broken || kind === 'other' ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <FileWarning className="h-6 w-6 text-text-mute" strokeWidth={1.5} />
                <p className="text-[13px] text-text-dim">
                  {broken
                    ? 'This file could not be loaded here. It may have been removed.'
                    : 'This file type cannot be previewed here.'}
                </p>
              </div>
            ) : kind === 'image' ? (
              <img
                key={current.url}
                src={current.url}
                alt={current.label}
                onError={() => setFailed(current.url)}
                className="mx-auto max-h-[70vh] w-auto rounded-lg object-contain"
              />
            ) : kind === 'video' ? (
              <video
                key={current.url}
                src={current.url}
                controls
                playsInline
                onError={() => setFailed(current.url)}
                className="mx-auto max-h-[70vh] w-full rounded-lg bg-black"
              />
            ) : (
              <iframe
                key={current.url}
                src={current.url}
                title={current.label}
                // Served as application/pdf from the storage origin, never this portal's, so the
                // document cannot reach this page. No referrer: the presigned URL is enough.
                referrerPolicy="no-referrer"
                className="h-[70vh] w-full rounded-lg bg-white"
              />
            )}

            {many && (
              <>
                <button
                  type="button"
                  aria-label="Previous attachment"
                  onClick={() => onIndex((index - 1 + items.length) % items.length)}
                  className={cn(NAV, 'left-2')}
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  aria-label="Next attachment"
                  onClick={() => onIndex((index + 1) % items.length)}
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
