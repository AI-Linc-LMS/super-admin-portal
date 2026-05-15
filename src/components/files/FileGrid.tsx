import React from 'react';
import {
  File as FileIcon,
  FileText,
  FileArchive,
  Image as ImageIcon,
  Video,
  Music,
  ExternalLink,
  Loader2,
  Inbox,
} from 'lucide-react';
import type { FileObject } from '../../types/clientFiles';
import { cn } from '../../utils/helpers';
import { formatBytes } from './formatBytes';

interface Props {
  objects: FileObject[];
  isLoading: boolean;
  isFetching: boolean;
  selectedKeys: Set<string>;
  onToggleSelect: (key: string) => void;
  onToggleAll: () => void;
  allSelected: boolean;
  onPreview: (obj: FileObject) => void;
  hasMore: boolean;
  onLoadMore: () => void;
  isLoadingMore: boolean;
}

function pickIcon(contentType: string, key: string) {
  const ct = contentType || '';
  const lower = key.toLowerCase();
  if (ct.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg|ico)$/.test(lower))
    return ImageIcon;
  if (ct === 'application/pdf' || lower.endsWith('.pdf')) return FileText;
  if (ct.startsWith('video/') || /\.(mp4|webm|mov|m4v|mkv|avi)$/.test(lower))
    return Video;
  if (ct.startsWith('audio/') || /\.(mp3|wav|m4a|ogg)$/.test(lower)) return Music;
  if (/\.(zip|tar|gz|7z|bin)$/.test(lower)) return FileArchive;
  return FileIcon;
}

const FileGrid: React.FC<Props> = ({
  objects,
  isLoading,
  isFetching,
  selectedKeys,
  onToggleSelect,
  onToggleAll,
  allSelected,
  onPreview,
  hasMore,
  onLoadMore,
  isLoadingMore,
}) => {
  if (isLoading && objects.length === 0) {
    return (
      <div className="py-24 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-brand-cyan" />
        <p className="mt-3 font-mono text-[11px] uppercase tracking-widest2 text-text-mute">
          Loading files
        </p>
      </div>
    );
  }

  if (objects.length === 0) {
    return (
      <div className="px-6 py-20 text-center">
        <div
          className="mx-auto mb-4 flex h-14 w-14 items-center justify-center
          rounded-2xl border border-themed bg-line/[0.03]"
        >
          <Inbox className="h-6 w-6 text-text-mute" />
        </div>
        <h3 className="text-[15px] font-semibold text-text">No files here</h3>
        <p className="mt-2 text-[13px] text-text-dim">
          This category has no objects in S3 yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Select-all bar */}
      <div className="flex items-center gap-3 px-1">
        <input
          type="checkbox"
          checked={allSelected}
          onChange={onToggleAll}
          className="h-4 w-4 cursor-pointer rounded border-themed-2 bg-ink-1
            accent-brand-cyan focus:ring-2 focus:ring-brand-cyan/40"
          aria-label="Select all in this page"
        />
        <span className="font-mono text-[10px] uppercase tracking-widest2 text-text-mute">
          {allSelected ? 'Deselect all' : 'Select all on this page'}
          {isFetching && objects.length > 0 ? (
            <span className="ml-3 inline-flex items-center gap-1 text-text-dim">
              <Loader2 className="h-3 w-3 animate-spin" /> refreshing
            </span>
          ) : null}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {objects.map((obj) => {
          const isSelected = selectedKeys.has(obj.key);
          const Icon = pickIcon(obj.content_type, obj.key);
          const isImage =
            obj.content_type.startsWith('image/') ||
            /\.(png|jpe?g|gif|webp|svg)$/.test(obj.key.toLowerCase());
          const displayName = obj.original_filename || obj.key.split('/').pop() || obj.key;
          const lastMod = obj.last_modified
            ? new Date(obj.last_modified).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
            : '—';
          return (
            <div
              key={obj.key}
              className={cn(
                'group relative flex flex-col overflow-hidden rounded-xl border',
                'surface-card transition-all duration-200',
                isSelected
                  ? 'border-brand-cyan/50 shadow-[0_8px_24px_-8px_rgba(0,224,255,0.35)]'
                  : 'border-themed hover:border-brand-cyan/30 hover:-translate-y-0.5',
              )}
            >
              <label
                className="absolute left-3 top-3 z-10 flex h-5 w-5 cursor-pointer items-center
                  justify-center rounded bg-ink-0/70 backdrop-blur-sm"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleSelect(obj.key)}
                  className="h-4 w-4 accent-brand-cyan focus:ring-2 focus:ring-brand-cyan/40"
                  aria-label={`Select ${displayName}`}
                />
              </label>

              <button
                type="button"
                onClick={() => onPreview(obj)}
                className="relative flex aspect-[4/3] w-full items-center justify-center
                  overflow-hidden bg-ink-1/40 focus:outline-none"
                aria-label={`Preview ${displayName}`}
              >
                {isImage && obj.url ? (
                  // eslint-disable-next-line jsx-a11y/img-redundant-alt
                  <img
                    src={obj.url}
                    alt={displayName}
                    className="h-full w-full object-cover transition-transform duration-300
                      group-hover:scale-[1.03]"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <Icon className="h-12 w-12 text-text-mute" />
                )}
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-12
                    bg-gradient-to-t from-ink-0/80 to-transparent opacity-0 transition-opacity
                    duration-200 group-hover:opacity-100"
                />
                <ExternalLink
                  className="pointer-events-none absolute bottom-2 right-2 h-3.5 w-3.5
                    text-text opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                />
              </button>

              <div className="flex flex-1 flex-col gap-1.5 px-3 py-3">
                <p
                  className="truncate text-[13px] font-medium text-text"
                  title={obj.key}
                >
                  {displayName}
                </p>
                <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest2 text-text-mute">
                  <span>{formatBytes(obj.size)}</span>
                  <span>·</span>
                  <span>{lastMod}</span>
                </div>
                {obj.module ? (
                  <span
                    className="mt-0.5 inline-flex w-fit rounded-full border border-themed-2
                      px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest2 text-text-dim"
                  >
                    {obj.module.replace(/_/g, ' ')}
                  </span>
                ) : null}
                {obj.uploader_email ? (
                  <p
                    className="truncate text-[11px] text-text-mute"
                    title={obj.uploader_email}
                  >
                    by {obj.uploader_email}
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {hasMore ? (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="inline-flex items-center gap-2 rounded-lg border border-themed-2
              bg-transparent px-4 py-2 font-mono text-[11px] font-semibold uppercase
              tracking-widest2 text-text-dim transition-all hover:border-brand-cyan/40
              hover:text-text disabled:opacity-50"
          >
            {isLoadingMore ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : null}
            Load more
          </button>
        </div>
      ) : null}
    </div>
  );
};

export default FileGrid;
