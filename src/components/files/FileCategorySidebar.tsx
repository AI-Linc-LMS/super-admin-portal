import React from 'react';
import {
  Wand2,
  FolderOpen,
  Camera,
  AlertCircle,
  UserCircle2,
  Briefcase,
  MessagesSquare,
  Palette,
  FilePlus2,
  History,
  RefreshCw,
} from 'lucide-react';
import type { FileCategory } from '../../types/clientFiles';
import { cn } from '../../utils/helpers';
import { formatBytes } from './formatBytes';

const ICON_BY_KEY: Record<string, React.ComponentType<{ className?: string }>> = {
  wizard: Wand2,
  tenant_assets: FolderOpen,
  assessment_screenshots: Camera,
  report_issue: AlertCircle,
  profile_avatar: UserCircle2,
  job_application: Briefcase,
  community_forum: MessagesSquare,
  tenant_branding: Palette,
  other: FilePlus2,
};

interface Props {
  categories: FileCategory[] | undefined;
  isLoading: boolean;
  selectedKey: string | null;
  onSelect: (cat: FileCategory) => void;
  auditOpen: boolean;
  onToggleAudit: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

const FileCategorySidebar: React.FC<Props> = ({
  categories,
  isLoading,
  selectedKey,
  onSelect,
  auditOpen,
  onToggleAudit,
  onRefresh,
  isRefreshing,
}) => {
  return (
    <aside className="relative rounded-xl border border-themed surface-card shadow-glass">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px
          bg-gradient-to-r from-transparent via-brand-cyan/30 to-transparent"
      />
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <span className="kicker inline-flex items-center">
          <FolderOpen className="mr-2 h-3 w-3" />
          S3 Categories
        </span>
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="rounded-md p-1 text-text-mute transition-colors hover:bg-line/[0.06]
            hover:text-text disabled:opacity-50"
          aria-label="Refresh categories"
          title="Refresh"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
        </button>
      </div>

      <ul className="px-2 pb-3">
        {isLoading && !categories ? (
          <li className="px-3 py-8 text-center font-mono text-[11px] uppercase tracking-widest2 text-text-mute">
            Loading…
          </li>
        ) : !categories || categories.length === 0 ? (
          <li className="px-3 py-6 text-center text-[12px] text-text-mute">
            No categories.
          </li>
        ) : (
          categories.map((c) => {
            const Icon = ICON_BY_KEY[c.key] || FolderOpen;
            const isActive = !auditOpen && selectedKey === c.key;
            return (
              <li key={c.key}>
                <button
                  type="button"
                  onClick={() => onSelect(c)}
                  className={cn(
                    'group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5',
                    'text-left transition-all duration-200 border border-transparent',
                    isActive
                      ? 'bg-brand-cyan/[0.06] text-text border-brand-cyan/30'
                      : 'text-text-dim hover:bg-line/[0.04] hover:text-text',
                  )}
                >
                  {isActive && (
                    <span
                      aria-hidden
                      className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full
                        bg-brand-cyan shadow-[0_0_10px_rgba(0,224,255,0.6)]"
                    />
                  )}
                  <Icon
                    className={cn(
                      'h-[18px] w-[18px] shrink-0',
                      isActive ? 'text-brand-cyan' : 'text-text-mute',
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium">{c.label}</p>
                    <p className="mt-0.5 font-mono text-[10px] uppercase tracking-widest2 text-text-mute">
                      {c.object_count}
                      {c.count_truncated ? '+' : ''} files ·{' '}
                      {formatBytes(c.total_size_bytes)}
                    </p>
                  </div>
                </button>
              </li>
            );
          })
        )}
      </ul>

      <div className="border-t border-themed px-2 py-3">
        <button
          type="button"
          onClick={onToggleAudit}
          className={cn(
            'group flex w-full items-center gap-3 rounded-lg px-3 py-2.5',
            'text-left transition-all duration-200 border border-transparent',
            auditOpen
              ? 'bg-brand-gold/[0.06] text-text border-brand-gold/30'
              : 'text-text-dim hover:bg-line/[0.04] hover:text-text',
          )}
        >
          <History
            className={cn(
              'h-[18px] w-[18px]',
              auditOpen ? 'text-brand-gold' : 'text-text-mute',
            )}
          />
          <span className="text-[13px] font-medium">Recent deletions</span>
        </button>
      </div>
    </aside>
  );
};

export default FileCategorySidebar;
