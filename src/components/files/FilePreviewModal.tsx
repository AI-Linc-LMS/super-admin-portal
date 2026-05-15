import React from 'react';
import { Download, ExternalLink, Trash2 } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import type { FileObject } from '../../types/clientFiles';
import { formatBytes } from './formatBytes';

interface Props {
  file: FileObject | null;
  onClose: () => void;
  onDelete: (file: FileObject) => void;
}

const FilePreviewModal: React.FC<Props> = ({ file, onClose, onDelete }) => {
  if (!file) return null;

  const ct = file.content_type || '';
  const lower = file.key.toLowerCase();
  const isImage =
    ct.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg|ico)$/.test(lower);
  const isPdf = ct === 'application/pdf' || lower.endsWith('.pdf');
  const isVideo = ct.startsWith('video/') || /\.(mp4|webm|mov|m4v)$/.test(lower);
  const isAudio = ct.startsWith('audio/') || /\.(mp3|wav|m4a|ogg)$/.test(lower);
  const isText = ct.startsWith('text/') || /\.(txt|md|csv|log|json)$/.test(lower);

  const displayName = file.original_filename || file.key.split('/').pop() || file.key;

  return (
    <Modal isOpen={!!file} onClose={onClose} size="xl" title={displayName}>
      <div className="space-y-5">
        <div className="rounded-xl border border-themed bg-ink-1/30 p-3">
          {isImage && file.url ? (
            // eslint-disable-next-line jsx-a11y/img-redundant-alt
            <img
              src={file.url}
              alt={displayName}
              className="mx-auto max-h-[60vh] w-auto rounded-lg object-contain"
            />
          ) : isPdf && file.url ? (
            <iframe
              src={file.url}
              title={displayName}
              className="h-[70vh] w-full rounded-lg bg-white"
            />
          ) : isVideo && file.url ? (
            <video
              src={file.url}
              controls
              className="mx-auto max-h-[60vh] w-full rounded-lg"
            />
          ) : isAudio && file.url ? (
            <audio src={file.url} controls className="w-full" />
          ) : isText && file.url ? (
            <iframe
              src={file.url}
              title={displayName}
              className="h-[60vh] w-full rounded-lg bg-ink-0"
            />
          ) : (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <p className="font-mono text-[11px] uppercase tracking-widest2 text-text-mute">
                Preview unavailable for this file type
              </p>
              {file.url ? (
                <a
                  href={file.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-themed-2
                    bg-transparent px-4 py-2 font-mono text-[11px] font-semibold uppercase
                    tracking-widest2 text-text-dim hover:border-brand-cyan/40 hover:text-text"
                >
                  Download <Download className="h-3.5 w-3.5" />
                </a>
              ) : null}
            </div>
          )}
        </div>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-[12px]">
          <Meta label="Size" value={formatBytes(file.size)} />
          <Meta label="Content type" value={file.content_type || 'unknown'} />
          <Meta label="Module" value={file.module || file.category_key || '—'} />
          <Meta
            label="Last modified"
            value={
              file.last_modified
                ? new Date(file.last_modified).toLocaleString()
                : '—'
            }
          />
          {file.uploader_email ? (
            <Meta label="Uploader" value={file.uploader_email} />
          ) : null}
          <Meta label="S3 key" value={file.key} mono full />
        </dl>

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-themed pt-5">
          {file.url ? (
            <a
              href={file.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-themed-2
                bg-transparent px-4 py-2 text-[13px] font-medium text-text-dim
                transition-colors hover:border-brand-cyan/40 hover:text-text"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open in new tab
            </a>
          ) : null}
          <Button variant="danger" leftIcon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => onDelete(file)}>
            Delete this file
          </Button>
        </div>
      </div>
    </Modal>
  );
};

const Meta: React.FC<{ label: string; value: string; mono?: boolean; full?: boolean }> = ({
  label,
  value,
  mono,
  full,
}) => (
  <div className={full ? 'col-span-2' : ''}>
    <dt className="font-mono text-[10px] uppercase tracking-widest2 text-text-mute">
      {label}
    </dt>
    <dd
      className={`mt-1 break-all text-text ${mono ? 'font-mono text-[12px]' : 'text-[13px]'}`}
    >
      {value}
    </dd>
  </div>
);

export default FilePreviewModal;
