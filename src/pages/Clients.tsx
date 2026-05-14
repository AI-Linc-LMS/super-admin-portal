import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Search,
  Plus,
  Eye,
  Users,
  BookOpen,
  TrendingUp,
  MapPin,
  Download,
  Grid,
  List,
  Building2,
  Edit,
  AlertTriangle,
  ChevronDown,
  LucideIcon,
} from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import ClientFormModal from '../components/ui/ClientFormModal';
import StatusToggle from '../components/ui/StatusToggle';
import {
  useClients,
  useCreateClient,
  useUpdateClient,
  useToggleClientStatus,
} from '../hooks/useClients';
import { Client } from '../types/client';
import { formatDate, formatNumber, cn } from '../utils/helpers';
import toast from 'react-hot-toast';

const Clients: React.FC = () => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const { data: clients, isLoading, error } = useClients();
  const createClientMutation = useCreateClient();
  const updateClientMutation = useUpdateClient();
  const toggleStatusMutation = useToggleClientStatus();

  const fallbackClients: Client[] = [
    {
      id: 1,
      name: 'TechCorp Solutions',
      slug: 'techcorp-solutions',
      organization_name: 'TechCorp Solutions Ltd.',
      email: 'admin@techcorp.com',
      phone: '+1-555-0123',
      phone_number: '+1-555-0123',
      joining_date: '2023-08-15T10:30:00Z',
      poc_name: 'John Smith',
      address: '123 Business Ave, San Francisco, CA',
      status: 'active',
      subscription_tier: 'enterprise',
      is_active: true,
      total_students: 1250,
      student_count: 1250,
      students_count: 1250,
      instructor_count: 45,
      course_count: 24,
      courses_count: 24,
      total_courses: 24,
      active_enrollments: 980,
      created_at: '2023-08-15T10:30:00Z',
      updated_at: '2024-05-20T14:45:00Z',
      last_login: '2024-05-20T14:45:00Z',
      total_revenue: 125000,
      monthly_revenue: 12500,
      logo_url: undefined,
      contact_person: 'John Smith',
      industry: 'Technology',
    },
    {
      id: 2,
      name: 'EduMaster Institute',
      slug: 'edumaster-institute',
      organization_name: 'EduMaster Institute Inc.',
      email: 'contact@edumaster.edu',
      phone: '+1-555-0456',
      phone_number: '+1-555-0456',
      joining_date: '2023-11-20T09:15:00Z',
      poc_name: 'Dr. Sarah Johnson',
      address: '456 Education Blvd, Boston, MA',
      status: 'active',
      subscription_tier: 'premium',
      is_active: true,
      total_students: 890,
      student_count: 890,
      students_count: 890,
      instructor_count: 32,
      course_count: 18,
      courses_count: 18,
      total_courses: 18,
      active_enrollments: 765,
      created_at: '2023-11-20T09:15:00Z',
      updated_at: '2024-05-19T11:20:00Z',
      last_login: '2024-05-19T11:20:00Z',
      total_revenue: 89000,
      monthly_revenue: 8900,
      logo_url: undefined,
      contact_person: 'Dr. Sarah Johnson',
      industry: 'Education',
    },
    {
      id: 3,
      name: 'Healthcare Training Co',
      slug: 'healthcare-training-co',
      organization_name: 'Healthcare Training Company',
      email: 'info@healthtraining.com',
      phone: '+1-555-0789',
      phone_number: '+1-555-0789',
      joining_date: '2024-01-10T16:45:00Z',
      poc_name: 'Michael Davis',
      address: '789 Medical Center Dr, Chicago, IL',
      status: 'inactive',
      subscription_tier: 'basic',
      is_active: false,
      total_students: 345,
      student_count: 345,
      students_count: 345,
      instructor_count: 12,
      course_count: 8,
      courses_count: 8,
      total_courses: 8,
      active_enrollments: 234,
      created_at: '2024-01-10T16:45:00Z',
      updated_at: '2024-05-18T08:30:00Z',
      last_login: '2024-05-18T08:30:00Z',
      total_revenue: 28000,
      monthly_revenue: 2800,
      logo_url: undefined,
      contact_person: 'Michael Davis',
      industry: 'Healthcare',
    },
  ];

  const clientsData = clients || fallbackClients;

  const filteredClients = clientsData.filter((client) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      client.name?.toLowerCase().includes(q) ||
      client.organization_name?.toLowerCase().includes(q) ||
      client.email?.toLowerCase().includes(q) ||
      client.poc_name?.toLowerCase().includes(q);
    let matchesStatus = true;
    if (statusFilter === 'active') matchesStatus = client.is_active === true;
    else if (statusFilter === 'inactive') matchesStatus = client.is_active === false;
    return matchesSearch && matchesStatus;
  });

  const handleOpenCreateModal = () => {
    setModalMode('create');
    setSelectedClient(null);
    setIsModalOpen(true);
  };
  const handleOpenEditModal = (client: Client) => {
    setModalMode('edit');
    setSelectedClient(client);
    setIsModalOpen(true);
  };
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedClient(null);
  };

  const handleSubmitClient = async (clientData: Partial<Client>) => {
    try {
      if (modalMode === 'create') {
        await createClientMutation.mutateAsync(clientData);
      } else if (modalMode === 'edit' && selectedClient) {
        await updateClientMutation.mutateAsync({
          id: selectedClient.id,
          data: clientData,
          method: 'PATCH',
        });
      }
    } catch (error) {
      console.error('Client submission error:', error);
      throw error;
    }
  };

  const handleToggleStatus = async (clientId: number, newStatus: boolean) => {
    try {
      await toggleStatusMutation.mutateAsync({ id: clientId, isActive: newStatus });
      toast.success(t('messages.itemUpdatedSuccessfully'));
    } catch (error) {
      console.error('Status toggle error:', error);
      toast.error(t('errors.somethingWentWrong'));
      throw error;
    }
  };

  const exportClients = () => {
    const csvData = filteredClients.map((client) => ({
      Name: client.name,
      Organization: client.organization_name || client.name,
      Email: client.email,
      Phone: client.phone_number || client.phone,
      'POC Name': client.poc_name || client.contact_person,
      Status: client.is_active ? 'Active' : 'Inactive',
      'Subscription Tier': client.subscription_tier,
      Students: client.total_students,
      Courses: client.total_courses,
      'Monthly Revenue': client.monthly_revenue,
      'Joining Date': formatDate(client.joining_date || client.created_at),
    }));
    const headers = Object.keys(csvData[0] || {});
    const csvContent = [
      headers.join(','),
      ...csvData.map((row) =>
        headers.map((h) => `"${row[h as keyof typeof row] || ''}"`).join(',')
      ),
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `clients-${new Date().toISOString().split('T')[0]}.csv`
    );
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(t('messages.dataLoadedSuccessfully'));
  };

  if (isLoading && !clients) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-themed border-t-brand-cyan" />
        <span className="ml-3 text-text-dim">{t('clients.loadingClients')}</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {!!error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 rounded-xl border border-brand-gold/25 bg-brand-gold/[0.05] px-4 py-3"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-brand-gold" />
          <div className="text-[13px] leading-relaxed text-text-dim">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-widest2 text-brand-gold">
              {t('dashboard.demoMode')}
            </span>
            <span className="ml-2">{t('dashboard.apiWarning')}</span>
          </div>
        </motion.div>
      )}

      {/* Hero header */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <span className="kicker mb-3">
            <Building2 className="mr-2 h-3 w-3" />
            Tenants
          </span>
          <h1 className="serif-display text-[40px] leading-[1.05] text-text">
            {t('clients.title').split(' ')[0]}{' '}
            <span className="gradient-text">
              {t('clients.title').split(' ').slice(1).join(' ') || 'directory'}
            </span>
          </h1>
          <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-text-dim">
            {t('clients.subtitle', {
              defaultValue: 'Manage your AI-Linc platform clients',
            })}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex items-center rounded-lg border border-themed-2 bg-ink-1/40 p-1">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={cn(
                'rounded-md px-2.5 py-1.5 transition-colors',
                viewMode === 'grid'
                  ? 'bg-brand-cyan/15 text-brand-cyan shadow-[inset_0_0_0_1px_rgba(0,224,255,0.3)]'
                  : 'text-text-mute hover:text-text'
              )}
              aria-label="Grid view"
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={cn(
                'rounded-md px-2.5 py-1.5 transition-colors',
                viewMode === 'list'
                  ? 'bg-brand-cyan/15 text-brand-cyan shadow-[inset_0_0_0_1px_rgba(0,224,255,0.3)]'
                  : 'text-text-mute hover:text-text'
              )}
              aria-label="List view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
          <Button
            variant="outline"
            leftIcon={<Download className="h-4 w-4" />}
            onClick={exportClients}
          >
            {t('common.export', { defaultValue: 'Export' })}
          </Button>
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={handleOpenCreateModal}>
            {t('clients.addClient')}
          </Button>
        </div>
      </motion.section>

      {/* Filter bar */}
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
              placeholder={t('clients.searchClients')}
              leftIcon={<Search className="h-4 w-4" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="h-10 appearance-none rounded-lg border border-themed-2 bg-ink-1/60 pl-3 pr-9
                text-[14px] text-text transition-colors
                focus:outline-none focus:border-brand-cyan/40 focus:bg-ink-1/90
                focus:shadow-[0_0_0_3px_rgba(0,224,255,0.10)]"
            >
              <option value="all">
                {t('filters.all')} {t('clients.status')}
              </option>
              <option value="active">{t('clients.active')}</option>
              <option value="inactive">{t('clients.inactive')}</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-mute" />
          </div>
        </div>
      </motion.section>

      {/* Body */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.12 }}
      >
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filteredClients.map((client, i) => (
              <ClientCard
                key={client.id}
                client={client}
                index={i}
                onEdit={() => handleOpenEditModal(client)}
                onToggle={(s) => handleToggleStatus(client.id, s)}
                togglePending={toggleStatusMutation.isPending}
                t={t}
              />
            ))}
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-xl border border-themed surface-card shadow-glass">
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-cyan/30 to-transparent"
            />
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-themed bg-ink-1/30">
                    {['Client', 'Status', 'Students', 'Courses', 'Contact', 'Toggle', 'Actions'].map(
                      (h) => (
                        <th
                          key={h}
                          className={cn(
                            'whitespace-nowrap px-6 py-3 text-left font-mono text-[10px] font-semibold uppercase tracking-widest2 text-text-mute',
                            h === 'Actions' && 'text-right'
                          )}
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.map((client) => (
                    <tr
                      key={client.id}
                      className={cn(
                        'group border-b border-themed transition-colors last:border-b-0 hover:bg-line/[0.03]',
                        client.is_active === false && 'opacity-70'
                      )}
                    >
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center gap-3">
                          <BrandLogo client={client} size="sm" />
                          <div>
                            <div className="text-[14px] font-medium text-text">
                              {client.name}
                            </div>
                            <div className="text-[12px] text-text-dim">
                              {client.email || 'No email'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <StatusPill active={client.is_active !== false} />
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-[13px] text-text">
                        {formatNumber(client.total_students)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-[13px] text-text">
                        {client.total_courses}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-[13px] text-text">
                        {client.poc_name || client.contact_person || '—'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <StatusToggle
                          isActive={client.is_active !== false}
                          onToggle={(s) => handleToggleStatus(client.id, s)}
                          size="sm"
                          showLabels={false}
                        />
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            leftIcon={<Edit className="h-3.5 w-3.5" />}
                            onClick={() => handleOpenEditModal(client)}
                            disabled={toggleStatusMutation.isPending}
                          >
                            {t('common.edit')}
                          </Button>
                          <Link to={`/clients/${client.id}`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              leftIcon={<Eye className="h-3.5 w-3.5" />}
                            >
                              {t('common.view')}
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {filteredClients.length === 0 && (
          <div className="mt-2 flex flex-col items-center justify-center rounded-xl border border-dashed border-themed-2 bg-line/[0.02] py-16 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-themed bg-line/[0.03]">
              <Users className="h-6 w-6 text-text-mute" />
            </div>
            <h3 className="text-[16px] font-semibold text-text">
              {t('clients.noClientsAvailable')}
            </h3>
            <p className="mt-2 text-[13px] text-text-dim">
              {t('filters.tryAdjusting', {
                defaultValue: 'Try adjusting your search or filter criteria',
              })}
            </p>
          </div>
        )}
      </motion.section>

      <ClientFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleSubmitClient}
        mode={modalMode}
        client={selectedClient}
      />
    </div>
  );
};

/* ---------- Helpers ---------- */

const BrandLogo: React.FC<{ client: Client; size?: 'sm' | 'md' }> = ({
  client,
  size = 'md',
}) => {
  const cls = size === 'sm' ? 'h-10 w-10 rounded-lg' : 'h-12 w-12 rounded-xl';
  const inactive = client.is_active === false;
  return (
    <div className={cn('relative shrink-0', cls)}>
      <div
        className={cn(
          'absolute inset-0',
          cls,
          inactive ? 'bg-ink-3' : 'bg-brand-grad shadow-[0_8px_24px_-8px_rgba(0,224,255,0.45)]'
        )}
        aria-hidden
      />
      <div className={cn('relative flex h-full w-full items-center justify-center')}>
        {client.logo_url ? (
          <img
            src={client.logo_url}
            alt={client.name}
            className={cn(
              size === 'sm' ? 'h-6 w-6' : 'h-7 w-7',
              'rounded',
              inactive && 'grayscale'
            )}
          />
        ) : (
          <Building2
            className={cn(
              size === 'sm' ? 'h-5 w-5' : 'h-6 w-6',
              inactive ? 'text-text-mute' : 'text-white'
            )}
            strokeWidth={1.75}
          />
        )}
      </div>
    </div>
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

const InfoRow: React.FC<{
  icon: LucideIcon;
  label: string;
  inactive?: boolean;
}> = ({ icon: Icon, label, inactive }) => (
  <div
    className={cn(
      'flex items-center gap-2 text-[13px]',
      inactive ? 'text-text-mute' : 'text-text-dim'
    )}
  >
    <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
    <span className="truncate">{label}</span>
  </div>
);

interface ClientCardProps {
  client: Client;
  index: number;
  onEdit: () => void;
  onToggle: (s: boolean) => Promise<void>;
  togglePending: boolean;
  t: (key: string, opts?: any) => string;
}

const ClientCard: React.FC<ClientCardProps> = ({
  client,
  index,
  onEdit,
  onToggle,
  togglePending,
  t,
}) => {
  const inactive = client.is_active === false;
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

      <div className="flex flex-col gap-5 p-6">
        {/* Top: brand mark + name + status */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <BrandLogo client={client} />
            <div className="min-w-0">
              <h3
                className={cn(
                  'truncate text-[16px] font-semibold leading-tight',
                  inactive ? 'text-text-dim' : 'text-text'
                )}
              >
                {client.name}
              </h3>
              <p className="mt-1 truncate font-mono text-[10px] uppercase tracking-widest2 text-text-mute">
                {client.organization_name || client.slug}
              </p>
            </div>
          </div>
          <StatusPill active={!inactive} />
        </div>

        {/* Inactive warning */}
        {inactive && (
          <div className="flex items-start gap-2 rounded-lg border border-brand-gold/20 bg-brand-gold/[0.05] px-3 py-2 text-[12px] leading-relaxed text-text-dim">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-gold" />
            <span>
              {t('clients.inactiveWarning', {
                defaultValue:
                  'This client is currently inactive and cannot access the platform.',
              })}
            </span>
          </div>
        )}

        {/* Info rows */}
        <div className="space-y-2">
          <InfoRow
            icon={Users}
            inactive={inactive}
            label={`${formatNumber(client.total_students)} ${t('dashboard.students')}`}
          />
          <InfoRow
            icon={BookOpen}
            inactive={inactive}
            label={`${client.total_courses} ${t('navigation.courses').toLowerCase()}`}
          />
          {client.monthly_revenue ? (
            <InfoRow
              icon={TrendingUp}
              inactive={inactive}
              label={`$${formatNumber(client.monthly_revenue)}/mo`}
            />
          ) : null}
          <InfoRow
            icon={MapPin}
            inactive={inactive}
            label={client.industry || t('common.noDataAvailable')}
          />
        </div>

        {/* Meta strip */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-themed pt-4 text-[12px]">
          <Meta label={t('clients.contact', { defaultValue: 'Contact' })}>
            {client.poc_name || client.contact_person || '—'}
          </Meta>
          <Meta label={t('clients.joinedDate')}>
            {formatDate(client.joining_date || client.created_at)}
          </Meta>
          {client.email && (
            <Meta label={t('clients.email')} className="col-span-2">
              <span className="break-all">{client.email}</span>
            </Meta>
          )}
        </div>

        {/* Status toggle + actions */}
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-themed pt-4">
          <StatusToggle
            isActive={!inactive}
            onToggle={onToggle}
            size="sm"
            showLabels
          />
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Edit className="h-3.5 w-3.5" />}
              onClick={onEdit}
              disabled={togglePending}
            >
              {t('common.edit')}
            </Button>
            <Link to={`/clients/${client.id}`}>
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<Eye className="h-3.5 w-3.5" />}
              >
                {t('common.view')}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const Meta: React.FC<{
  label: string;
  children: React.ReactNode;
  className?: string;
}> = ({ label, children, className }) => (
  <div className={cn('min-w-0', className)}>
    <div className="font-mono text-[10px] uppercase tracking-widest2 text-text-mute">
      {label}
    </div>
    <div className="mt-0.5 truncate text-text-dim">{children}</div>
  </div>
);

export default Clients;
