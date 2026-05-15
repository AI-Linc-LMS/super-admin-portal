import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import type { FileObject } from '../../types/clientFiles';
import { useDeleteFiles } from '../../hooks/useClientFiles';
import { formatBytes } from './formatBytes';

interface Props {
  clientId: number;
  files: FileObject[]; // single or bulk
  isOpen: boolean;
  onClose: () => void;
  /** Called after a successful delete so the parent can clear selection / close preview. */
  onDeleted: (deletedKeys: string[]) => void;
}

const BULK_THRESHOLD = 5;

const FileDeletionModal: React.FC<Props> = ({
  clientId,
  files,
  isOpen,
  onClose,
  onDeleted,
}) => {
  const [confirmText, setConfirmText] = useState('');
  const { mutateAsync, isLoading } = useDeleteFiles(clientId);

  useEffect(() => {
    if (isOpen) setConfirmText('');
  }, [isOpen]);

  const totalBytes = useMemo(
    () => files.reduce((acc, f) => acc + (f.size || 0), 0),
    [files],
  );

  const requireType = files.length >= BULK_THRESHOLD;
  const canDelete =
    !isLoading && files.length > 0 && (!requireType || confirmText === 'DELETE');

  const previewList = files.slice(0, 8);
  const hidden = Math.max(0, files.length - previewList.length);

  const handleDelete = async () => {
    try {
      const res = await mutateAsync({ keys: files.map((f) => f.key) });
      const okCount = res.deleted.length;
      const failCount = res.failed.length;
      if (okCount > 0) {
        toast.success(
          failCount > 0
            ? `Deleted ${okCount} file${okCount === 1 ? '' : 's'} · ${failCount} failed`
            : `Deleted ${okCount} file${okCount === 1 ? '' : 's'}`,
        );
        onDeleted(res.deleted);
      }
      if (failCount > 0) {
        toast.error(
          `${failCount} delete${failCount === 1 ? '' : 's'} failed. Check the audit log.`,
        );
      }
      onClose();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Delete request failed.';
      toast.error(msg);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={isLoading ? () => undefined : onClose}
      size="md"
      title={
        files.length === 1
          ? 'Delete this file?'
          : `Delete ${files.length} files?`
      }
    >
      <div className="space-y-5">
        <div className="rounded-xl border border-danger-500/30 bg-danger-500/[0.06] p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger-500" />
            <div>
              <p className="text-[13px] font-semibold text-text">
                This is permanent.
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-text-dim">
                The S3 object and any matching DB row will be removed. An audit
                row will be written so the action is traceable.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-themed bg-line/[0.02] p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest2 text-text-mute">
            Impact
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Stat label="Files" value={files.length.toString()} />
            <Stat label="Total size" value={formatBytes(totalBytes)} />
          </div>
          {previewList.length > 0 ? (
            <ul className="mt-4 space-y-1.5 text-[12px] text-text-dim">
              {previewList.map((f) => (
                <li key={f.key} className="flex items-center justify-between gap-3">
                  <span
                    className="truncate font-mono text-[11px]"
                    title={f.key}
                  >
                    {f.original_filename || f.key.split('/').pop() || f.key}
                  </span>
                  <span className="shrink-0 text-text-mute">
                    {formatBytes(f.size)}
                  </span>
                </li>
              ))}
              {hidden > 0 ? (
                <li className="text-text-mute">…and {hidden} more</li>
              ) : null}
            </ul>
          ) : null}
        </div>

        {requireType ? (
          <div>
            <label className="font-mono text-[10px] uppercase tracking-widest2 text-text-mute">
              Type{' '}
              <span className="font-bold text-danger-500">DELETE</span> to
              confirm
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="mt-2 w-full rounded-lg border border-themed-2 bg-ink-1/40 px-3 py-2
                font-mono text-[13px] tracking-[0.2em] text-text outline-none
                focus:border-danger-500/60 focus:ring-2 focus:ring-danger-500/30"
              placeholder="DELETE"
              autoFocus
            />
          </div>
        ) : null}

        <div className="flex flex-wrap justify-end gap-3 border-t border-themed pt-5">
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="danger"
            isLoading={isLoading}
            disabled={!canDelete}
            leftIcon={<Trash2 className="h-3.5 w-3.5" />}
            onClick={handleDelete}
          >
            Delete{files.length > 1 ? ` ${files.length}` : ''} permanently
          </Button>
        </div>
      </div>
    </Modal>
  );
};

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <p className="font-mono text-[10px] uppercase tracking-widest2 text-text-mute">
      {label}
    </p>
    <p className="mt-1 text-[18px] font-semibold text-text">{value}</p>
  </div>
);

export default FileDeletionModal;
