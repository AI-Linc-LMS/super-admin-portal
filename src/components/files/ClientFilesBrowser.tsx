import React, { useEffect, useMemo, useState } from 'react';
import { Search, Trash2, X } from 'lucide-react';
import Input from '../ui/Input';
import Button from '../ui/Button';
import FileCategorySidebar from './FileCategorySidebar';
import FileGrid from './FileGrid';
import FilePreviewModal from './FilePreviewModal';
import FileDeletionModal from './FileDeletionModal';
import FileAuditPanel from './FileAuditPanel';
import {
  useFileCategories,
  useFileList,
} from '../../hooks/useClientFiles';
import type { FileCategory, FileObject } from '../../types/clientFiles';
import { useQueryClient } from '@tanstack/react-query';
import { formatBytes } from './formatBytes';

interface Props {
  clientId: number;
}

const ClientFilesBrowser: React.FC<Props> = ({ clientId }) => {
  const queryClient = useQueryClient();
  const {
    data: categories,
    isLoading: categoriesLoading,
    isFetching: categoriesFetching,
    refetch: refetchCategories,
  } = useFileCategories(clientId);

  const [selected, setSelected] = useState<FileCategory | null>(null);
  const [auditOpen, setAuditOpen] = useState(false);
  const [accumulated, setAccumulated] = useState<FileObject[]>([]);
  const [continuationToken, setContinuationToken] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<FileObject | null>(null);
  const [pendingDelete, setPendingDelete] = useState<FileObject[] | null>(null);

  // Pick the first category once they load.
  useEffect(() => {
    if (!selected && !auditOpen && categories && categories.length > 0) {
      setSelected(categories[0]);
    }
  }, [categories, selected, auditOpen]);

  // Reset accumulator + continuation when category or search changes.
  useEffect(() => {
    setAccumulated([]);
    setContinuationToken(null);
    setSelectedKeys(new Set());
  }, [selected?.prefix, search]);

  // Debounce search input.
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const {
    data: listPage,
    isLoading: listLoading,
    isFetching: listFetching,
  } = useFileList(
    clientId,
    auditOpen ? null : selected?.prefix ?? null,
    continuationToken,
    search,
  );

  // Merge incoming page into the accumulated list.
  useEffect(() => {
    if (!listPage) return;
    setAccumulated((prev) => {
      const seen = new Set(prev.map((o) => o.key));
      const merged = [...prev];
      for (const obj of listPage.objects) {
        if (!seen.has(obj.key)) merged.push(obj);
      }
      return merged;
    });
  }, [listPage]);

  const handleSelectCategory = (cat: FileCategory) => {
    setAuditOpen(false);
    setSelected(cat);
  };

  const handleToggleSelect = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const visibleKeys = useMemo(
    () => new Set(accumulated.map((o) => o.key)),
    [accumulated],
  );
  const allSelected =
    accumulated.length > 0 && [...visibleKeys].every((k) => selectedKeys.has(k));

  const handleToggleAll = () => {
    if (allSelected) {
      setSelectedKeys(
        new Set([...selectedKeys].filter((k) => !visibleKeys.has(k))),
      );
    } else {
      setSelectedKeys(new Set([...selectedKeys, ...visibleKeys]));
    }
  };

  const selectedObjects = useMemo(
    () => accumulated.filter((o) => selectedKeys.has(o.key)),
    [accumulated, selectedKeys],
  );
  const selectedTotalBytes = selectedObjects.reduce((acc, o) => acc + (o.size || 0), 0);

  const handleLoadMore = () => {
    if (listPage?.next_token) setContinuationToken(listPage.next_token);
  };

  const handleDeleted = (deletedKeys: string[]) => {
    const deletedSet = new Set(deletedKeys);
    setAccumulated((prev) => prev.filter((o) => !deletedSet.has(o.key)));
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      for (const k of deletedKeys) next.delete(k);
      return next;
    });
    if (preview && deletedSet.has(preview.key)) setPreview(null);
    // Cache invalidation in the mutation hook also refetches categories.
    queryClient.invalidateQueries({ queryKey: ['client-files'] });
  };

  return (
    <div className="grid gap-6 md:grid-cols-[260px,1fr]">
      <FileCategorySidebar
        categories={categories}
        isLoading={categoriesLoading}
        selectedKey={selected?.key ?? null}
        onSelect={handleSelectCategory}
        auditOpen={auditOpen}
        onToggleAudit={() => {
          setAuditOpen((v) => !v);
          if (!auditOpen) setSelectedKeys(new Set());
        }}
        onRefresh={() => {
          // ?refresh=1 busts the in-process backend cache too — pass it via URL.
          queryClient.removeQueries({ queryKey: ['client-files', 'categories', clientId] });
          refetchCategories();
        }}
        isRefreshing={categoriesFetching}
      />

      <div className="space-y-5">
        {auditOpen ? (
          <FileAuditPanel clientId={clientId} />
        ) : selected ? (
          <>
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-[240px] flex-1">
                <Input
                  leftIcon={<Search className="h-4 w-4" />}
                  placeholder={`Search in ${selected.label.toLowerCase()}…`}
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
              </div>
              <div className="font-mono text-[10px] uppercase tracking-widest2 text-text-mute">
                {accumulated.length}
                {listPage?.is_truncated ? '+' : ''} loaded · {selected.label}
              </div>
            </div>

            {/* Sticky selection bar */}
            {selectedKeys.size > 0 ? (
              <div
                className="sticky top-[64px] z-20 flex flex-wrap items-center justify-between gap-3
                  rounded-xl border border-brand-cyan/30 bg-brand-cyan/[0.05] px-4 py-3
                  shadow-[0_8px_30px_-12px_rgba(0,224,255,0.35)] backdrop-blur"
              >
                <div className="flex items-center gap-3 text-[13px] text-text">
                  <span
                    className="rounded-full bg-brand-cyan/15 px-2.5 py-0.5 font-mono text-[11px]
                      font-semibold uppercase tracking-widest2 text-brand-cyan"
                  >
                    {selectedKeys.size} selected
                  </span>
                  <span className="text-text-dim">
                    {formatBytes(selectedTotalBytes)} total
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<X className="h-3.5 w-3.5" />}
                    onClick={() => setSelectedKeys(new Set())}
                  >
                    Clear
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                    onClick={() => setPendingDelete(selectedObjects)}
                  >
                    Delete selected
                  </Button>
                </div>
              </div>
            ) : null}

            <FileGrid
              objects={accumulated}
              isLoading={listLoading && accumulated.length === 0}
              isFetching={listFetching}
              selectedKeys={selectedKeys}
              onToggleSelect={handleToggleSelect}
              onToggleAll={handleToggleAll}
              allSelected={allSelected}
              onPreview={setPreview}
              hasMore={Boolean(listPage?.next_token)}
              onLoadMore={handleLoadMore}
              isLoadingMore={listFetching && Boolean(continuationToken)}
            />
          </>
        ) : (
          <div className="px-6 py-20 text-center text-[13px] text-text-mute">
            Pick a category from the left to browse files.
          </div>
        )}
      </div>

      <FilePreviewModal
        file={preview}
        onClose={() => setPreview(null)}
        onDelete={(file) => setPendingDelete([file])}
      />

      <FileDeletionModal
        clientId={clientId}
        files={pendingDelete || []}
        isOpen={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onDeleted={handleDeleted}
      />
    </div>
  );
};

export default ClientFilesBrowser;
