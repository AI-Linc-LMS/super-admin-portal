import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  Search,
  Plus,
  Bot,
  Edit,
  Trash2,
  FileText,
  AlertTriangle,
  XCircle,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import ChatbotFormModal from '../components/ui/ChatbotFormModal';
import StatusToggle from '../components/ui/StatusToggle';
import {
  useChatbots,
  useCreateChatbot,
  useUpdateChatbot,
  useDeleteChatbot,
  useToggleChatbotStatus,
} from '../hooks/useChatbots';
import { useClients } from '../hooks/useClients';
import { Chatbot } from '../types/chatbot';
import { formatDate, cn } from '../utils/helpers';
import toast from 'react-hot-toast';

const Chatbots: React.FC = () => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [clientFilter, setClientFilter] = useState<number | 'all'>('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedChatbot, setSelectedChatbot] = useState<Chatbot | null>(null);
  const [chatbotToDelete, setChatbotToDelete] = useState<Chatbot | null>(null);

  const { data: chatbots, isLoading } = useChatbots();
  const { data: clients } = useClients();

  const createChatbotMutation = useCreateChatbot();
  const updateChatbotMutation = useUpdateChatbot();
  const deleteChatbotMutation = useDeleteChatbot();
  const toggleStatusMutation = useToggleChatbotStatus();

  const chatbotsData = chatbots || [];
  const clientsData = clients || [];

  const enrichedChatbots = chatbotsData.map((chatbot) => {
    const client = clientsData.find((c) => c.id === chatbot.client_id);
    return {
      ...chatbot,
      client_name:
        chatbot.client_name || client?.name || `Client ID: ${chatbot.client_id}`,
    };
  });

  const filteredChatbots = enrichedChatbots.filter((chatbot) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      chatbot.name?.toLowerCase().includes(q) ||
      chatbot.instructions?.toLowerCase().includes(q) ||
      chatbot.client_name?.toLowerCase().includes(q);
    let matchesStatus = true;
    if (statusFilter === 'active') matchesStatus = chatbot.is_active === true;
    else if (statusFilter === 'inactive') matchesStatus = chatbot.is_active === false;
    let matchesClient = true;
    if (clientFilter !== 'all') matchesClient = chatbot.client_id === clientFilter;
    return matchesSearch && matchesStatus && matchesClient;
  });

  const handleOpenCreateModal = () => {
    setModalMode('create');
    setSelectedChatbot(null);
    setIsModalOpen(true);
  };
  const handleOpenEditModal = (chatbot: Chatbot) => {
    setModalMode('edit');
    setSelectedChatbot(chatbot);
    setIsModalOpen(true);
  };
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedChatbot(null);
  };
  const handleSubmitChatbot = async (chatbotData: any) => {
    try {
      if (modalMode === 'create') {
        await createChatbotMutation.mutateAsync(chatbotData);
      } else if (modalMode === 'edit' && selectedChatbot) {
        await updateChatbotMutation.mutateAsync({
          id: selectedChatbot.id,
          data: chatbotData,
        });
      }
    } catch (error) {
      console.error('Chatbot submission error:', error);
      throw error;
    }
  };

  const handleToggleStatus = async (chatbotId: number, newStatus: boolean) => {
    try {
      await toggleStatusMutation.mutateAsync({ id: chatbotId, isActive: newStatus });
      toast.success(
        t('messages.itemUpdatedSuccessfully', { defaultValue: 'Status updated' })
      );
    } catch (error) {
      console.error('Status toggle error:', error);
      toast.error(t('errors.somethingWentWrong', { defaultValue: 'Something went wrong' }));
      throw error;
    }
  };

  const handleDeleteConfirm = async () => {
    if (!chatbotToDelete) return;
    try {
      await deleteChatbotMutation.mutateAsync(chatbotToDelete.id);
      toast.success('Chatbot deleted');
      setChatbotToDelete(null);
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete chatbot');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  if (isLoading && !chatbots) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-themed border-t-brand-cyan" />
        <span className="ml-3 text-text-dim">Loading chatbots…</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero header */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <span className="kicker mb-3">
            <Sparkles className="mr-2 h-3 w-3" />
            AI Agents
          </span>
          <h1 className="serif-display text-[40px] leading-[1.05] text-text">
            Chatbot <span className="gradient-text">studio</span>
          </h1>
          <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-text-dim">
            Create and manage chatbots for your clients — each one trained on its own
            knowledge sources.
          </p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={handleOpenCreateModal}>
          Create Chatbot
        </Button>
      </motion.section>

      {/* Filters */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.06 }}
        className="relative overflow-hidden rounded-xl border border-themed surface-card p-4 shadow-glass"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-line/15 to-transparent"
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex-1">
            <Input
              placeholder="Search chatbots…"
              leftIcon={<Search className="h-4 w-4" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ThemedSelect
              value={String(clientFilter)}
              onChange={(v) => setClientFilter(v === 'all' ? 'all' : parseInt(v))}
              options={[
                { value: 'all', label: 'All Clients' },
                ...clientsData.map((c) => ({ value: String(c.id), label: c.name })),
              ]}
            />
            <ThemedSelect
              value={statusFilter}
              onChange={(v) => setStatusFilter(v as any)}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
              ]}
            />
          </div>
        </div>
      </motion.section>

      {/* Grid */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.12 }}
      >
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filteredChatbots.map((chatbot, i) => (
            <ChatbotCard
              key={chatbot.id}
              chatbot={chatbot}
              index={i}
              onEdit={() => handleOpenEditModal(chatbot)}
              onDelete={() => setChatbotToDelete(chatbot)}
              onToggle={(s) => handleToggleStatus(chatbot.id, s)}
              togglePending={toggleStatusMutation.isPending}
              deletePending={deleteChatbotMutation.isPending}
              t={t}
              formatFileSize={formatFileSize}
            />
          ))}
        </div>

        {filteredChatbots.length === 0 && (
          <div className="mt-2 flex flex-col items-center justify-center rounded-xl border border-dashed border-themed-2 bg-line/[0.02] py-16 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-themed bg-line/[0.03]">
              <Bot className="h-6 w-6 text-text-mute" />
            </div>
            <h3 className="text-[16px] font-semibold text-text">No chatbots found</h3>
            <p className="mt-2 max-w-sm text-[13px] text-text-dim">
              Try adjusting your search or filter criteria — or create your first chatbot.
            </p>
            <div className="mt-5">
              <Button leftIcon={<Plus className="h-4 w-4" />} onClick={handleOpenCreateModal}>
                Create Your First Chatbot
              </Button>
            </div>
          </div>
        )}
      </motion.section>

      <ChatbotFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleSubmitChatbot}
        mode={modalMode}
        chatbot={selectedChatbot}
        clients={clientsData}
        isLoading={createChatbotMutation.isPending || updateChatbotMutation.isPending}
      />

      {/* Delete confirmation */}
      <AnimatePresence>
        {chatbotToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink-0/70 p-4 backdrop-blur-md"
            onClick={() => setChatbotToDelete(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md overflow-hidden rounded-2xl border border-themed-2 surface-card p-6 shadow-glass"
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-danger-500/50 to-transparent"
              />
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-danger-500/30 bg-danger-500/10">
                  <XCircle className="h-5 w-5 text-danger-500" />
                </div>
                <div>
                  <h3 className="text-[17px] font-semibold text-text">Delete Chatbot</h3>
                  <p className="mt-0.5 font-mono text-[10px] uppercase tracking-widest2 text-text-mute">
                    This action cannot be undone
                  </p>
                </div>
              </div>
              <p className="mb-6 text-[14px] leading-relaxed text-text-dim">
                Are you sure you want to delete{' '}
                <strong className="text-text">{chatbotToDelete.name}</strong>? This will
                permanently remove the chatbot and all its associated data.
              </p>
              <div className="flex items-center justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setChatbotToDelete(null)}
                  disabled={deleteChatbotMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={handleDeleteConfirm}
                  isLoading={deleteChatbotMutation.isPending}
                >
                  Delete
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ---------- Sub-components ---------- */

const ThemedSelect: React.FC<{
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}> = ({ value, onChange, options }) => (
  <div className="relative">
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 appearance-none rounded-lg border border-themed-2 bg-ink-1/60 pl-3 pr-9
        text-[13px] text-text transition-colors
        focus:outline-none focus:border-brand-cyan/40 focus:bg-ink-1/90
        focus:shadow-[0_0_0_3px_rgba(0,224,255,0.10)]"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-mute" />
  </div>
);

interface ChatbotCardProps {
  chatbot: Chatbot & { client_name?: string };
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: (s: boolean) => Promise<void>;
  togglePending: boolean;
  deletePending: boolean;
  t: (key: string, opts?: any) => string;
  formatFileSize: (bytes: number) => string;
}

const ChatbotCard: React.FC<ChatbotCardProps> = ({
  chatbot,
  index,
  onEdit,
  onDelete,
  onToggle,
  togglePending,
  deletePending,
  t,
  formatFileSize,
}) => {
  const inactive = chatbot.is_active === false;
  const sources = chatbot.knowledge_sources || [];
  const preview =
    chatbot.instructions.length > 110
      ? chatbot.instructions.substring(0, 110) + '…'
      : chatbot.instructions;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.04, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'group relative flex h-full flex-col overflow-hidden rounded-xl border border-themed surface-card shadow-glass',
        'transition-all duration-300 ease-out',
        'hover:-translate-y-0.5 hover:border-brand-cyan/30 hover:shadow-glow',
        inactive && 'opacity-75'
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-line/20 to-transparent"
      />

      <div className="flex flex-1 flex-col gap-4 p-6">
        {/* Top: bot mark + name + status */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="relative h-11 w-11 shrink-0">
              <div
                className={cn(
                  'absolute inset-0 rounded-xl',
                  inactive
                    ? 'bg-ink-3'
                    : 'bg-brand-grad shadow-[0_8px_24px_-8px_rgba(0,224,255,0.45)]'
                )}
                aria-hidden
              />
              <div className="relative flex h-full w-full items-center justify-center">
                <Bot
                  className={cn(
                    'h-5 w-5',
                    inactive ? 'text-text-mute' : 'text-white'
                  )}
                  strokeWidth={1.75}
                />
              </div>
            </div>
            <div className="min-w-0">
              <h3
                className={cn(
                  'truncate text-[16px] font-semibold leading-tight',
                  inactive ? 'text-text-dim' : 'text-text'
                )}
              >
                {chatbot.name}
              </h3>
              <p className="mt-1 truncate font-mono text-[10px] uppercase tracking-widest2 text-text-mute">
                {chatbot.client_name || `Client ${chatbot.client_id}`}
              </p>
            </div>
          </div>
          <StatusPill active={!inactive} />
        </div>

        {/* Inactive warning */}
        {inactive && (
          <div className="flex items-start gap-2 rounded-lg border border-brand-gold/20 bg-brand-gold/[0.05] px-3 py-2 text-[12px] leading-relaxed text-text-dim">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-gold" />
            <span>This chatbot is currently inactive.</span>
          </div>
        )}

        {/* Instructions preview */}
        <div>
          <div className="mb-1.5 font-mono text-[10px] uppercase tracking-widest2 text-text-mute">
            Instructions
          </div>
          <p
            className={cn(
              'text-[13px] leading-relaxed',
              inactive ? 'text-text-mute' : 'text-text-dim'
            )}
          >
            {preview}
          </p>
        </div>

        {/* Knowledge sources */}
        <div className="rounded-lg border border-themed bg-line/[0.03] p-3">
          <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest2 text-text-mute">
            <FileText className="h-3 w-3 text-brand-cyan" />
            {sources.length} knowledge source{sources.length !== 1 ? 's' : ''}
          </div>
          {sources.length > 0 ? (
            <ul className="space-y-1 text-[12px] text-text-dim">
              {sources.slice(0, 3).map((file) => (
                <li key={file.id} className="flex items-center justify-between gap-2">
                  <span className="truncate">{file.name}</span>
                  <span className="shrink-0 font-mono text-[10px] text-text-mute">
                    {formatFileSize(file.size)}
                  </span>
                </li>
              ))}
              {sources.length > 3 && (
                <li className="font-mono text-[10px] uppercase tracking-widest2 text-text-mute">
                  +{sources.length - 3} more
                </li>
              )}
            </ul>
          ) : (
            <p className="text-[12px] text-text-mute">No documents attached</p>
          )}
        </div>

        {/* Meta + toggle */}
        <div className="mt-auto grid grid-cols-2 gap-x-4 gap-y-2 border-t border-themed pt-4 text-[12px]">
          <Meta label="Created">{formatDate(chatbot.created_at)}</Meta>
          <div className="flex flex-col items-end justify-end">
            <div className="mb-0.5 font-mono text-[10px] uppercase tracking-widest2 text-text-mute">
              Status
            </div>
            <StatusToggle
              isActive={!inactive}
              onToggle={onToggle}
              size="sm"
              showLabels={false}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 border-t border-themed pt-4">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Edit className="h-3.5 w-3.5" />}
            onClick={onEdit}
            disabled={togglePending}
          >
            {t('common.edit')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<Trash2 className="h-3.5 w-3.5" />}
            onClick={onDelete}
            disabled={deletePending}
            className="text-danger-500 hover:bg-danger-500/10 hover:text-danger-500"
          >
            {t('common.delete')}
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

const StatusPill: React.FC<{ active: boolean }> = ({ active }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest2',
      active
        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
        : 'border-danger-500/30 bg-danger-500/10 text-danger-500'
    )}
  >
    <span
      className={cn(
        'h-1.5 w-1.5 rounded-full',
        active ? 'bg-emerald-400 animate-pulse-soft' : 'bg-danger-500'
      )}
    />
    {active ? 'Active' : 'Inactive'}
  </span>
);

const Meta: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <div className="min-w-0">
    <div className="font-mono text-[10px] uppercase tracking-widest2 text-text-mute">
      {label}
    </div>
    <div className="mt-0.5 truncate text-text-dim">{children}</div>
  </div>
);

export default Chatbots;
