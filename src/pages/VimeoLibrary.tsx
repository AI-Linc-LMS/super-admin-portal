import React, { useMemo, useState } from 'react';
import {
  Video,
  Search,
  RefreshCw,
  UploadCloud,
  FolderPlus,
  Folder,
  Captions,
  Link2,
  CheckCircle2,
  AlertTriangle,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import {
  useVimeoVideos,
  useVimeoSyncStatus,
  useTriggerVimeoSync,
  useVimeoFolders,
  useCreateVimeoFolder,
  useAddVideoToFolder,
  useCompleteVimeoUpload,
  useMapVimeoVideos,
} from '../hooks/useVimeo';
import { useAdaptiveCourses, useAdaptiveCourseDetails } from '../hooks/useAdaptiveCourses';
import { apiService } from '../services/api';
import { uploadFileToVimeo } from '../utils/vimeoUpload';
import { VimeoVideoItem } from '../types/vimeo';
import { cn } from '../utils/helpers';
import toast from 'react-hot-toast';

const PAGE = 24;

const fmtDuration = (s: number): string => {
  if (!s) return '—';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`;
};

/* ------------------------------- Map modal ------------------------------- */

const MapModal: React.FC<{ video: VimeoVideoItem; onClose: () => void }> = ({ video, onClose }) => {
  const { data: courses = [] } = useAdaptiveCourses();
  const [courseId, setCourseId] = useState<number | ''>('');
  const [submoduleId, setSubmoduleId] = useState<number | ''>('');
  const { data: course } = useAdaptiveCourseDetails(courseId ? Number(courseId) : 0);
  const mapMutation = useMapVimeoVideos();

  const submodules = useMemo(() => {
    if (!course) return [] as { id: number; label: string }[];
    const out: { id: number; label: string }[] = [];
    (course.modules || []).forEach((m: any) =>
      (m.submodules || []).forEach((s: any) =>
        out.push({ id: s.id, label: `W${m.weekno} · ${s.order}. ${s.title}` })
      )
    );
    return out;
  }, [course]);

  const submit = async () => {
    if (!submoduleId) {
      toast.error('Pick a submodule');
      return;
    }
    try {
      const res = await mapMutation.mutateAsync([
        { vimeo_id: video.vimeo_id, submodule_id: Number(submoduleId) },
      ]);
      const r = res.results[0];
      if (r?.ok) {
        toast.success('Video mapped to submodule (companion built).');
        onClose();
      } else {
        toast.error(r?.error || 'Mapping failed');
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Mapping failed');
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={`Map “${video.title || video.vimeo_id}” to a course`} size="md">
      <div className="space-y-4">
        {!video.has_text_track && (
          <div className="flex items-start gap-2 rounded-md border border-brand-gold/30 bg-brand-gold/10 p-3 text-[13px] text-brand-gold">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            This video has no transcript yet. A companion needs a transcript — mapping may fail until Vimeo finishes captioning.
          </div>
        )}
        <div>
          <label className="mb-1 block text-[13px] text-text-dim">Course</label>
          <select
            value={courseId}
            onChange={(e) => {
              setCourseId(e.target.value ? Number(e.target.value) : '');
              setSubmoduleId('');
            }}
            className="w-full rounded-lg border border-themed-2 bg-ink-2 px-3 py-2 text-sm text-text"
          >
            <option value="">Select a course…</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title} — {c.client?.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[13px] text-text-dim">Submodule</label>
          <select
            value={submoduleId}
            onChange={(e) => setSubmoduleId(e.target.value ? Number(e.target.value) : '')}
            disabled={!courseId}
            className="w-full rounded-lg border border-themed-2 bg-ink-2 px-3 py-2 text-sm text-text disabled:opacity-50"
          >
            <option value="">{courseId ? 'Select a submodule…' : 'Pick a course first'}</option>
            {submodules.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} isLoading={mapMutation.isLoading} disabled={!submoduleId}>
            Map video
          </Button>
        </div>
      </div>
    </Modal>
  );
};

/* ------------------------------ Upload modal ----------------------------- */

const UploadModal: React.FC<{ folders: { id: string; name: string }[]; onClose: () => void }> = ({
  folders,
  onClose,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [folderId, setFolderId] = useState<string>('');
  const [pct, setPct] = useState(0);
  const [phase, setPhase] = useState<'idle' | 'uploading' | 'finishing' | 'done'>('idle');
  const complete = useCompleteVimeoUpload();

  const onPick = (f: File | null) => {
    setFile(f);
    if (f && !name) setName(f.name.replace(/\.[^.]+$/, ''));
  };

  const start = async () => {
    if (!file || !name.trim()) {
      toast.error('Choose a file and a title');
      return;
    }
    try {
      setPhase('uploading');
      const ticket = await apiService.createVimeoUpload({ name: name.trim(), size: file.size });
      await uploadFileToVimeo(file, ticket.upload_link, setPct);
      setPhase('finishing');
      await complete.mutateAsync({ vimeo_id: ticket.vimeo_id, folder_id: folderId || undefined });
      setPhase('done');
      toast.success('Uploaded to Vimeo and added to the catalog.');
      onClose();
    } catch (e: any) {
      setPhase('idle');
      toast.error(e?.response?.data?.detail || e?.message || 'Upload failed (check the token has the upload scope).');
    }
  };

  const busy = phase === 'uploading' || phase === 'finishing';

  return (
    <Modal isOpen onClose={busy ? () => {} : onClose} title="Upload a video to Vimeo" size="md">
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-[13px] text-text-dim">Video file</label>
          <input
            type="file"
            accept="video/*"
            disabled={busy}
            onChange={(e) => onPick(e.target.files?.[0] || null)}
            className="block w-full text-sm text-text-dim file:mr-3 file:rounded-md file:border-0 file:bg-brand-cyan/15 file:px-3 file:py-2 file:text-brand-cyan"
          />
        </div>
        <Input label="Title" value={name} onChange={(e) => setName(e.target.value)} disabled={busy} />
        <div>
          <label className="mb-1 block text-[13px] text-text-dim">Folder (optional)</label>
          <select
            value={folderId}
            onChange={(e) => setFolderId(e.target.value)}
            disabled={busy}
            className="w-full rounded-lg border border-themed-2 bg-ink-2 px-3 py-2 text-sm text-text"
          >
            <option value="">No folder</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>

        {busy && (
          <div>
            <div className="mb-1 flex justify-between text-[12px] text-text-mute">
              <span>{phase === 'finishing' ? 'Finalizing…' : 'Uploading to Vimeo…'}</span>
              <span>{pct}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-line/[0.08]">
              <div className="h-full bg-brand-cyan transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={start} isLoading={busy} disabled={!file || !name.trim()}>
            Upload
          </Button>
        </div>
      </div>
    </Modal>
  );
};

/* ------------------------------- Video card ------------------------------ */

const VideoCard: React.FC<{
  video: VimeoVideoItem;
  onMap: () => void;
  onAddToFolder: () => void;
}> = ({ video, onMap, onAddToFolder }) => (
  <Card padding="none" className="flex flex-col">
    <div className="relative h-32 w-full overflow-hidden bg-ink-2">
      {video.thumbnail_url ? (
        <img src={video.thumbnail_url} alt={video.title} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full items-center justify-center text-text-mute">
          <Video className="h-7 w-7 opacity-50" />
        </div>
      )}
      <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-[11px] text-white">
        {fmtDuration(video.duration_seconds)}
      </span>
      {video.has_text_track && (
        <span className="absolute left-1 top-1 inline-flex items-center gap-1 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] text-emerald-300">
          <Captions className="h-3 w-3" /> CC
        </span>
      )}
    </div>
    <div className="flex flex-1 flex-col gap-2 p-3">
      <p className="line-clamp-2 text-[13px] font-medium text-text" title={video.title}>
        {video.title || `Video ${video.vimeo_id}`}
      </p>
      {video.is_mapped ? (
        <div className="space-y-1">
          {video.mappings.slice(0, 2).map((m) => (
            <p key={m.config_id} className="line-clamp-1 text-[11px] text-text-mute" title={`${m.course_title} · ${m.submodule_title}`}>
              <Link2 className="mr-1 inline h-3 w-3 text-brand-cyan" />
              {m.course_title} · {m.submodule_title}
            </p>
          ))}
          {video.mappings.length > 2 && (
            <p className="text-[11px] text-text-mute">+{video.mappings.length - 2} more</p>
          )}
        </div>
      ) : (
        <p className="text-[11px] text-text-mute">Not mapped to any course.</p>
      )}
      <div className="mt-auto flex gap-2 pt-1">
        <Button size="sm" variant="outline" className="flex-1" onClick={onMap} leftIcon={<Link2 className="h-3.5 w-3.5" />}>
          Map
        </Button>
        <Button size="sm" variant="ghost" onClick={onAddToFolder} leftIcon={<Folder className="h-3.5 w-3.5" />}>
          Folder
        </Button>
      </div>
    </div>
  </Card>
);

/* --------------------------------- Page ---------------------------------- */

const VimeoLibrary: React.FC = () => {
  const [search, setSearch] = useState('');
  const [transcribedOnly, setTranscribedOnly] = useState(false);
  const [mapped, setMapped] = useState<'all' | 'mapped' | 'unmapped'>('all');
  const [page, setPage] = useState(0);

  const params = useMemo(
    () => ({ search: search.trim() || undefined, transcribed_only: transcribedOnly, mapped, limit: PAGE, offset: page * PAGE }),
    [search, transcribedOnly, mapped, page]
  );

  const { data, isLoading, error } = useVimeoVideos(params);
  const { data: status } = useVimeoSyncStatus();
  const { data: foldersResp } = useVimeoFolders();
  const syncMutation = useTriggerVimeoSync();
  const createFolder = useCreateVimeoFolder();
  const addToFolder = useAddVideoToFolder();

  const [uploadOpen, setUploadOpen] = useState(false);
  const [mapVideo, setMapVideo] = useState<VimeoVideoItem | null>(null);
  const [folderVideo, setFolderVideo] = useState<VimeoVideoItem | null>(null);

  const folders = foldersResp?.results || [];
  const videos = data?.results || [];
  const total = data?.count || 0;
  const maxPage = Math.max(0, Math.ceil(total / PAGE) - 1);

  const onCreateFolder = async () => {
    const name = window.prompt('New Vimeo folder name');
    if (!name?.trim()) return;
    try {
      await createFolder.mutateAsync(name.trim());
      toast.success('Folder created on Vimeo.');
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Folder creation failed');
    }
  };

  const onAddToFolder = async (projectId: string) => {
    if (!folderVideo) return;
    try {
      await addToFolder.mutateAsync({ projectId, vimeoId: folderVideo.vimeo_id });
      toast.success('Added to folder.');
      setFolderVideo(null);
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Failed to add to folder');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-text">
            <Video className="h-6 w-6 text-brand-cyan" />
            Vimeo Library
          </h1>
          <p className="mt-1 text-sm text-text-mute">
            Browse the Vimeo catalog, upload videos, organise folders, and map videos onto course submodules.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            leftIcon={<RefreshCw className={cn('h-4 w-4', syncMutation.isLoading && 'animate-spin')} />}
            onClick={() => syncMutation.mutate(true)}
            isLoading={syncMutation.isLoading}
          >
            Sync now
          </Button>
          <Button leftIcon={<UploadCloud className="h-4 w-4" />} onClick={() => setUploadOpen(true)}>
            Upload
          </Button>
        </div>
      </div>

      {/* Sync KPI rail */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card padding="sm">
          <p className="text-[12px] uppercase tracking-wide text-text-mute">Synced / Total on Vimeo</p>
          <p className="mt-1 text-xl font-semibold text-text">
            {status?.synced_count ?? '—'}
            <span className="text-text-mute"> / {status?.total_on_vimeo ?? '—'}</span>
          </p>
        </Card>
        <Card padding="sm">
          <p className="text-[12px] uppercase tracking-wide text-text-mute">With transcript</p>
          <p className="mt-1 text-xl font-semibold text-text">{status?.with_transcript ?? '—'}</p>
        </Card>
        <Card padding="sm">
          <p className="text-[12px] uppercase tracking-wide text-text-mute">Mapped to courses</p>
          <p className="mt-1 text-xl font-semibold text-text">{status?.mapped_count ?? '—'}</p>
        </Card>
        <Card padding="sm">
          <p className="text-[12px] uppercase tracking-wide text-text-mute">Last synced</p>
          <p className="mt-1 text-sm font-medium text-text">
            {status?.last_synced_at ? new Date(status.last_synced_at).toLocaleString() : '—'}
          </p>
        </Card>
      </div>
      {status?.error && (
        <p className="text-[12px] text-brand-gold">Vimeo account check failed: {status.error}</p>
      )}

      {/* Folders */}
      <Card padding="md">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text">Folders</h2>
          <Button size="sm" variant="ghost" leftIcon={<FolderPlus className="h-4 w-4" />} onClick={onCreateFolder}>
            New folder
          </Button>
        </div>
        {folders.length ? (
          <div className="flex flex-wrap gap-2">
            {folders.map((f) => (
              <span key={f.id} className="inline-flex items-center gap-1.5 rounded-md border border-themed-2 bg-line/[0.03] px-2.5 py-1 text-[12px] text-text-dim">
                <Folder className="h-3.5 w-3.5 text-brand-gold" />
                {f.name}
                <span className="text-text-mute">({f.video_count})</span>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-[13px] text-text-mute">No folders on Vimeo yet.</p>
        )}
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-full max-w-xs">
          <Input
            placeholder="Search videos…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            leftIcon={<Search className="h-4 w-4" />}
          />
        </div>
        <label className="inline-flex items-center gap-2 text-[13px] text-text-dim">
          <input
            type="checkbox"
            checked={transcribedOnly}
            onChange={(e) => {
              setTranscribedOnly(e.target.checked);
              setPage(0);
            }}
          />
          Transcribed only
        </label>
        <div className="inline-flex overflow-hidden rounded-lg border border-themed-2">
          {(['all', 'mapped', 'unmapped'] as const).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMapped(m);
                setPage(0);
              }}
              className={cn(
                'px-3 py-2 text-[13px] capitalize transition-colors',
                mapped === m ? 'bg-brand-cyan/15 text-brand-cyan' : 'text-text-dim hover:bg-line/[0.05]'
              )}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="py-20 text-center text-text-mute">Loading videos…</div>
      ) : error ? (
        <Card padding="lg" className="border-danger-500/30">
          <div className="flex items-center gap-3 text-danger-500">
            <AlertTriangle className="h-5 w-5" />
            Couldn't load the Vimeo catalog. Confirm you're a super admin and the backend has VIMEO_API_TOKEN set.
          </div>
        </Card>
      ) : videos.length === 0 ? (
        <div className="py-20 text-center text-text-mute">
          No videos found. Try “Sync now” to pull the catalog from Vimeo.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {videos.map((v) => (
              <VideoCard
                key={v.id}
                video={v}
                onMap={() => setMapVideo(v)}
                onAddToFolder={() => setFolderVideo(v)}
              />
            ))}
          </div>
          {/* Pagination */}
          <div className="flex items-center justify-center gap-3 pt-2 text-[13px] text-text-dim">
            <Button size="sm" variant="ghost" disabled={page === 0} onClick={() => setPage((p) => p - 1)} leftIcon={<ChevronLeft className="h-4 w-4" />}>
              Prev
            </Button>
            <span>
              Page {page + 1} of {maxPage + 1} · {total} videos
            </span>
            <Button size="sm" variant="ghost" disabled={page >= maxPage} onClick={() => setPage((p) => p + 1)} rightIcon={<ChevronRight className="h-4 w-4" />}>
              Next
            </Button>
          </div>
        </>
      )}

      {/* Modals */}
      {uploadOpen && <UploadModal folders={folders} onClose={() => setUploadOpen(false)} />}
      {mapVideo && <MapModal video={mapVideo} onClose={() => setMapVideo(null)} />}
      {folderVideo && (
        <Modal isOpen onClose={() => setFolderVideo(null)} title={`Add “${folderVideo.title || folderVideo.vimeo_id}” to a folder`} size="sm">
          {folders.length ? (
            <div className="space-y-2">
              {folders.map((f) => (
                <button
                  key={f.id}
                  onClick={() => onAddToFolder(f.id)}
                  className="flex w-full items-center justify-between rounded-md border border-themed px-3 py-2 text-left text-[13px] text-text-dim hover:border-brand-cyan/40 hover:text-brand-cyan"
                >
                  <span className="inline-flex items-center gap-2">
                    <Folder className="h-4 w-4 text-brand-gold" />
                    {f.name}
                  </span>
                  <span className="text-text-mute">{f.video_count}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-text-mute">No folders yet — create one first.</p>
          )}
        </Modal>
      )}
    </div>
  );
};

export default VimeoLibrary;
