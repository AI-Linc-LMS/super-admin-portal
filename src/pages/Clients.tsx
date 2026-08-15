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
  Info,
  Trash2,
  ExternalLink,
  X,
  Filter,
  LucideIcon,
} from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import ClientFormModal from '../components/ui/ClientFormModal';
import ClientPurgeModal from '../components/ui/ClientPurgeModal';
import StatusToggle from '../components/ui/StatusToggle';
import {
  useClients,
  usePurgedClients,
  useCreateClient,
  useUpdateClient,
  useToggleClientStatus,
} from '../hooks/useClients';
import { Client, PurgedClient } from '../types/client';
import { formatDate, formatNumber, cn } from '../utils/helpers';
import toast from 'react-hot-toast';

/**
 * Whether an institution can take money, and whose account it reaches.
 *
 * Payments fail closed: an institution with no connected Razorpay account cannot charge at all.
 * `settles_to === "platform"` is called out separately because it used to be the invisible default —
 * a tenant with no configuration still took payments, into AI Linc's account rather than its own,
 * and nothing anywhere showed it. This column exists so that can never be true unnoticed again.
 */
const PaymentCell: React.FC<{ payment?: Client['payment'] }> = ({ payment }) => {
  if (!payment || !payment.connected) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest2 text-amber-500">
        Not connected
      </span>
    );
  }
  const onPlatform = payment.settles_to === 'platform';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest2',
        onPlatform ? 'bg-violet-500/10 text-violet-400' : 'bg-emerald-500/10 text-emerald-500'
      )}
      title={payment.key_id_masked || undefined}
    >
      {onPlatform ? 'Platform a/c' : 'Own a/c'}
    </span>
  );
};

/**
 * Everything this activity number cannot see.
 *
 * Copied from the backend serializer that computes it (superadmin_portal/serializers.py,
 * ClientListSerializer.get_last_active_at) rather than paraphrased, because this column is read
 * while deciding who gets switched off and the blind spots have to travel with the number.
 */
const ACTIVITY_CAVEATS =
  'Last day anyone on the tenant was seen. Limits: the heartbeat behind it is posted by one ' +
  'frontend stack only, so tenants served by the Vercel apps or zSkillup can be busy and report ' +
  'nothing. Days are Asia/Kolkata, not the tenant\'s own midnight. It counts staff as well as ' +
  'students, so an admin poking at their dashboard makes a tenant look alive. Partner-API-only ' +
  'tenants never write either table and always read as Never. Treat Never as no evidence, not as ' +
  'proof of an empty tenant.';

/**
 * Why the last-active filter is dead while the graveyard is on screen.
 *
 * Not a UI limitation: UserTimeTracking and UserActivity rows are deleted along with the tenant, so
 * there is no signal left to bucket. Saying so beats leaving the control live and returning
 * everything, which reads as a filter that matched.
 */
const PURGED_NO_ACTIVITY_CAVEAT =
  'Not available for purged tenants. The activity tables were deleted along with the tenant, so ' +
  'there is no last-seen signal left to filter on.';

/**
 * How long ago anyone was seen on this institution.
 *
 * Same chip as PaymentCell above, deliberately: both columns are scanned in one sweep and a second
 * visual language for "status" makes the row harder to read, not easier. The buckets are the
 * backend's (ACTIVITY_LIVE_DAYS / ACTIVITY_QUIET_DAYS) and are never recomputed here, so this list
 * and the dashboard's active-tenant tile cannot classify the same institution two different ways.
 *
 * "Never" is mute rather than red, and an absent field says Unknown rather than Never. The metric
 * has real blind spots (see ACTIVITY_CAVEATS), so no signal is an absence of evidence. Only a
 * tenant we have seen, and have not seen for a month, earns the alarming colour.
 */
const ActivityCell: React.FC<{ client: Client }> = ({ client }) => {
  const status = client.activity_status;
  const days = client.days_since_active;
  const base =
    'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest2';

  // Unreachable against the current backend: activity_status is a SerializerMethodField in
  // Meta.fields, so the key is always present and always a non-empty string. Kept because the
  // failure it guards is a cached bundle talking to a deploy that predates the field, and the
  // alternative to "Unknown" there is a chip that silently reads "Never".
  if (!status) {
    return (
      <span className={cn(base, 'bg-line/[0.06] text-text-mute')} title={ACTIVITY_CAVEATS}>
        Unknown
      </span>
    );
  }
  if (status === 'never') {
    return (
      <span
        className={cn(base, 'bg-line/[0.06] text-text-mute')}
        title="No heartbeat and no completed content, ever. Not proof the tenant is unused."
      >
        Never
      </span>
    );
  }

  const tone =
    status === 'live'
      ? 'bg-emerald-500/10 text-emerald-500'
      : status === 'quiet'
      ? 'bg-amber-500/10 text-amber-500'
      : 'bg-danger-500/10 text-danger-500';
  const label = status === 'live' ? 'Live' : status === 'quiet' ? 'Quiet' : 'Dormant';

  return (
    <span className={cn(base, tone)} title={client.last_active_at || undefined}>
      {/* No day count on Live. Inside the week the exact number is noise, and "Live 0d" reads as a
          measurement of nothing; on the other two the age IS the reason the chip is that colour. */}
      {status !== 'live' && typeof days === 'number' ? `${label} ${days}d` : label}
    </span>
  );
};

/**
 * Why a derived address is not the same kind of thing as a configured one.
 *
 * The backend always returns a site_url, but when nothing is configured it assembles
 * <slug>.ailinc.com and labels that "derived". For every tenant living on its own domain the guess
 * is simply wrong: FDE Academy is served from test.fde.academy while the derived form,
 * fde-academy.ailinc.com, does not resolve. An operator clicking through to a dead host cannot tell
 * a broken tenant from a bad guess, so the guess has to announce itself before it is clicked.
 */
const DERIVED_SITE_CAVEAT =
  'Guessed from the tenant slug because no custom domain or Netlify site is configured. It may ' +
  'not resolve at all. Set a custom domain on this client to correct it.';

/**
 * The host to print for a site link.
 *
 * Operators scan these, they do not read them: "test.fde.academy" is the identifying part and the
 * scheme and trailing slash are noise in a 12px meta row. Falls back to trimming the string by hand
 * rather than rendering nothing, because a URL the backend built but this browser's URL parser
 * rejects is still more useful on screen than a blank cell.
 */
const siteHost = (url: string): string => {
  try {
    return new URL(url).host;
  } catch {
    return url.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '').replace(/\/+$/, '');
  }
};

/**
 * One-click passage from this portal into a customer's live LMS.
 *
 * Two hazards are defended here. First, these are third-party origins: without rel="noopener" the
 * page we open keeps a handle on window.opener and can navigate this portal somewhere else, so the
 * pair noopener+noreferrer is not optional. Second, a derived URL is a guess (see
 * DERIVED_SITE_CAVEAT) and must not be dressed like a fact; it renders in the muted token with a
 * dotted underline and carries an explicit "guess" chip, the same chip vocabulary the activity and
 * payment columns already use, so nothing new has to be learned to read it.
 */
const SiteLink: React.FC<{ client: Client; className?: string }> = ({ client, className }) => {
  // Absent only against a deploy older than the field, the same stale-bundle case ActivityCell
  // guards. "Unknown" rather than a blank or a dash: it says the portal has no address for this
  // tenant, not that the tenant has no site, and it beats re-guessing the address here in the
  // client where the caveat text would not travel with it.
  if (!client.site_url) {
    return <span className={cn('text-text-mute', className)}>Unknown</span>;
  }

  const derived = client.site_url_source === 'derived';
  const host = siteHost(client.site_url);

  return (
    <span className={cn('inline-flex min-w-0 items-center gap-2', className)}>
      <a
        href={client.site_url}
        target="_blank"
        rel="noopener noreferrer"
        // The card is not clickable today, but it is a hover-lifted tile that is one product
        // decision away from being wrapped in a Link. Stopping here means opening the tenant site
        // can never also navigate the portal underneath it.
        onClick={(e) => e.stopPropagation()}
        title={derived ? `${client.site_url} - ${DERIVED_SITE_CAVEAT}` : client.site_url}
        className={cn(
          'inline-flex min-w-0 items-center gap-1.5 transition-colors hover:text-brand-cyan',
          derived
            ? 'text-text-mute underline decoration-dotted underline-offset-2'
            : 'text-text-dim'
        )}
      >
        <span className="truncate">{host}</span>
        <ExternalLink className="h-3 w-3 shrink-0" strokeWidth={1.75} />
      </a>
      {derived && (
        <span
          className="shrink-0 rounded-full bg-line/[0.06] px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest2 text-text-mute"
          title={DERIVED_SITE_CAVEAT}
        >
          Guess
        </span>
      )}
    </span>
  );
};

/**
 * One active filter, wearing the same chip vocabulary as the payment, activity and site columns.
 *
 * `strong` is for the status filter only. It is the one this page now applies before the operator
 * asks for anything, so it has to read as an applied filter at a glance rather than as decoration.
 */
const FilterChip: React.FC<{
  label: string;
  onClear: () => void;
  tone?: 'muted' | 'strong';
}> = ({ label, onClear, tone = 'muted' }) => (
  <span
    className={cn(
      'inline-flex max-w-[240px] items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest2',
      tone === 'strong'
        ? 'border-brand-cyan/30 bg-brand-cyan/10 text-brand-cyan'
        : 'border-themed bg-line/[0.06] text-text-mute'
    )}
  >
    <span className="truncate">{label}</span>
    <button
      type="button"
      onClick={onClear}
      className="shrink-0 rounded-full transition-colors hover:text-text"
      aria-label={`Clear ${label}`}
      title={`Clear ${label}`}
    >
      <X className="h-3 w-3" strokeWidth={2.5} />
    </button>
  </span>
);

const Clients: React.FC = () => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  // Defaults to 'active', not 'all'. 27 of the 45 tenants are switched off, so All Status opened
  // this page on a grid that is mostly noise to scroll past. The cost of the default is that the
  // list no longer shows the whole fleet, which is a quiet lie unless the page says so out loud:
  // see the filter summary strip below, which always prints "<shown> of <total>" and offers one
  // click back to All. Never remove one without removing the other.
  //
  // 'purged' is not a fourth bucket of the same array. It swaps the data source, because those
  // tenants have no Client row left to filter.
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'purged'>(
    'active'
  );
  // Separate from statusFilter because they answer different questions. is_active is a switch
  // somebody threw; activity is what the tenant actually did. The pair an operator hunts for is
  // "active and dormant", which neither filter can express on its own.
  const [activityFilter, setActivityFilter] = useState<
    'all' | 'live' | 'quiet' | 'dormant' | 'never'
  >('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // The purge target survives the close, so the modal keeps rendering its own tenant through the
  // exit animation instead of blanking to "Purge institution?" on the way out.
  const [purgeTarget, setPurgeTarget] = useState<Client | null>(null);
  const [isPurgeModalOpen, setIsPurgeModalOpen] = useState(false);

  // Read once so the header cell and the tooltip lookup below compare against the same string.
  const lastActiveHeader = t('clients.lastActive');

  const { data: clients, isLoading, isFetching, error, refetch } = useClients();

  // True while the graveyard is on screen. Everything below branches on it rather than on
  // statusFilter directly, so the two sources can never be half-swapped.
  const showingPurged = statusFilter === 'purged';

  // Only fetched once an operator asks for it. The graveyard is an audit query nobody opens on a
  // normal day, and the ordinary clients page should not pay for it.
  const {
    data: purgedClients,
    isLoading: purgedLoading,
    isFetching: purgedFetching,
    error: purgedError,
    refetch: refetchPurged,
  } = usePurgedClients(showingPurged);

  const createClientMutation = useCreateClient();
  const updateClientMutation = useUpdateClient();
  const toggleStatusMutation = useToggleClientStatus();

  const filteredClients = (clients ?? []).filter((client) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      client.name?.toLowerCase().includes(q) ||
      client.organization_name?.toLowerCase().includes(q) ||
      client.email?.toLowerCase().includes(q) ||
      client.poc_name?.toLowerCase().includes(q);
    let matchesStatus = true;
    if (statusFilter === 'active') matchesStatus = client.is_active === true;
    else if (statusFilter === 'inactive') matchesStatus = client.is_active === false;
    // Compared against the backend's own bucket rather than re-derived from days_since_active, so
    // a tenant can never be filtered into one bucket and badged as another.
    const matchesActivity =
      activityFilter === 'all' || client.activity_status === activityFilter;
    return matchesSearch && matchesStatus && matchesActivity;
  });

  // Search only. A purge row carries no organization, email or POC, and no activity bucket either:
  // the tables those came from were deleted with the tenant. The activity select is disabled while
  // this list is up rather than left looking applied, so nobody reads an unfiltered graveyard as
  // "no purged tenant was ever dormant".
  const filteredPurged = (purgedClients ?? []).filter((purge) => {
    const q = searchQuery.toLowerCase();
    return (
      purge.client_name?.toLowerCase().includes(q) ||
      purge.slug?.toLowerCase().includes(q) ||
      purge.requested_by?.toLowerCase().includes(q) ||
      String(purge.client_id).includes(q)
    );
  });

  // What the summary strip prints. Two denominators, never mixed: in the graveyard the total is how
  // many tenants have been destroyed, which has nothing to do with the size of the live fleet.
  const shownCount = showingPurged ? filteredPurged.length : filteredClients.length;
  const totalCount = showingPurged ? (purgedClients ?? []).length : (clients ?? []).length;

  // Whichever source is on screen owns the error banner, the retry button and the body gate.
  const sourceError = showingPurged ? purgedError : error;
  const sourceFetching = showingPurged ? purgedFetching : isFetching;
  const refetchSource = showingPurged ? refetchPurged : refetch;

  const searchActive = searchQuery.trim().length > 0;
  const isNarrowed = statusFilter !== 'all' || activityFilter !== 'all' || searchActive;

  const clearAllFilters = () => {
    setStatusFilter('all');
    setActivityFilter('all');
    setSearchQuery('');
  };

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
  const handleOpenPurgeModal = (client: Client) => {
    setPurgeTarget(client);
    setIsPurgeModalOpen(true);
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

  /**
   * The graveyard's own CSV.
   *
   * Exists so the Export button always writes the list that is on screen. Running the tenant
   * exporter while the purged list is up would download live-tenant columns for rows that have no
   * students, no revenue and no payment account, and every one of those cells would read as a
   * measured zero.
   */
  const exportPurged = () => {
    const rows = filteredPurged.map((purge) => ({
      Name: purge.client_name,
      Slug: purge.slug,
      // Labelled "Former" because nothing answers at this id any more. A bare "Client ID" column in
      // a spreadsheet invites somebody to go looking for the tenant.
      'Former Client ID': purge.client_id,
      Status: purge.status_label,
      'Fully Destroyed': purge.fully_destroyed ? 'Yes' : 'No',
      // The whole point of a partial purge. Blank here means nothing was left behind, which is only
      // true for a completed one.
      'Left Behind': purge.degraded_steps.join(' | '),
      'Purged At': purge.completed_at ? formatDate(purge.completed_at) : '',
      Requested: formatDate(purge.created_at),
      // Empty when the operator's own account was deleted afterwards. Not "Unknown operator": the
      // purge was authorised, we just cannot name who by any more.
      'Requested By': purge.requested_by || '',
    }));
    const headers = Object.keys(rows[0] || {});
    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        headers.map((h) => `"${row[h as keyof typeof row] ?? ''}"`).join(',')
      ),
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `purged-clients-${new Date().toISOString().split('T')[0]}.csv`
    );
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(t('messages.dataLoadedSuccessfully'));
  };

  const exportClients = () => {
    // Refuse rather than download nothing. On a failed fetch `filteredClients` is [], which used to
    // produce a 0-byte file AND a green success toast: the operator walks away believing they hold
    // an export of the tenant list. An empty export is never the answer the button was asked for.
    //
    // The same two refusals guard the purged export, keyed off whichever source is on screen, so a
    // 403 on the audit endpoint cannot be downloaded as "we have never purged anyone".
    if (sourceError) {
      toast.error(
        t('clients.exportFailed', {
          defaultValue: 'Cannot export: the client list failed to load.',
        })
      );
      return;
    }
    if (shownCount === 0) {
      toast.error(
        t('clients.exportEmpty', {
          defaultValue: 'Nothing to export for the current filters.',
        })
      );
      return;
    }
    if (showingPurged) {
      exportPurged();
      return;
    }
    const csvData = filteredClients.map((client) => ({
      Name: client.name,
      Organization: client.organization_name || client.name,
      Email: client.email,
      Phone: client.phone_number || client.phone,
      'POC Name': client.poc_name || client.contact_person,
      Status: client.is_active ? 'Active' : 'Inactive',
      // Blank when the backend sent no bucket at all, rather than 'Never': the export is read away
      // from the tooltip that explains the difference, so it must not turn "we did not measure"
      // into "nobody was ever here".
      'Last Active': client.activity_status
        ? client.last_active_at || 'Never'
        : '',
      'Activity Status': client.activity_status || '',
      'Site URL': client.site_url || '',
      // The source ships with the URL for the same reason the chip does on screen. A spreadsheet is
      // read far from this page, and a derived guess pasted into a column headed "Site URL" with
      // nothing beside it becomes a fact the moment someone mails it to a customer.
      'Site URL Source': client.site_url_source || '',
      'Subscription Tier': client.subscription_tier,
      Students: client.total_students,
      Courses: client.total_courses,
      Payments: client.payment?.connected
        ? client.payment.settles_to === 'platform'
          ? 'Platform account'
          : 'Own account'
        : 'Not connected',
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
      {/*
        This used to be a gold "demo mode" notice sitting above three invented tenants, so a 403
        and a working page looked the same. It is now the only thing rendered in place of the list:
        an operator who cannot see the tenants must not be left guessing whether there are none.
      */}
      {!!sourceError && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 rounded-xl border border-danger-500/30 bg-danger-500/[0.06] px-4 py-3"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger-500" />
          <div className="flex-1 text-[13px] leading-relaxed text-text-dim">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-widest2 text-danger-500">
              {t('common.error')}
            </span>
            <span className="ml-2">
              {/* The graveyard gets its own sentence for the same reason the tenant list has one:
                  an empty audit list reads as "nothing was ever purged", which is the most
                  reassuring possible way to render a failed request. */}
              {showingPurged
                ? t('clients.purgedLoadFailed', {
                    defaultValue:
                      'Could not load purged tenants. This list is empty because the request failed, not because nothing has been purged.',
                  })
                : t('clients.loadFailed', {
                    defaultValue:
                      'Could not load clients. This list is empty because the request failed, not because there are no tenants.',
                  })}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchSource()}
            disabled={sourceFetching}
          >
            {t('common.tryAgain')}
          </Button>
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
              // The box searches whatever list is on screen, so it has to say which one. Left on
              // "Search clients..." it invites the reading that typing here goes back to the live
              // tenants.
              placeholder={
                showingPurged
                  ? t('clients.searchPurged', { defaultValue: 'Search purged tenants...' })
                  : t('clients.searchClients')
              }
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
              {/* Not a third state of is_active. Selecting this swaps the whole list for the purge
                  audit trail, because these tenants have no row left to be active or inactive. */}
              <option value="purged">{t('clients.purged', { defaultValue: 'Purged' })}</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-mute" />
          </div>
          <div className="relative">
            <select
              value={activityFilter}
              onChange={(e) => setActivityFilter(e.target.value as any)}
              // Disabled rather than left enabled and quietly ignored while the graveyard is up.
              // The tables this filter reads (UserTimeTracking, UserActivity) were deleted with the
              // tenant, so every purged row would fall out of every bucket, and an operator who set
              // "Dormant" and saw the full graveyard would conclude the filter had matched.
              disabled={showingPurged}
              title={
                showingPurged
                  ? PURGED_NO_ACTIVITY_CAVEAT
                  : ACTIVITY_CAVEATS
              }
              className="h-10 appearance-none rounded-lg border border-themed-2 bg-ink-1/60 pl-3 pr-9
                text-[14px] text-text transition-colors
                focus:outline-none focus:border-brand-cyan/40 focus:bg-ink-1/90
                focus:shadow-[0_0_0_3px_rgba(0,224,255,0.10)]
                disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="all">
                {t('filters.all')} {t('clients.lastActive').toLowerCase()}
              </option>
              <option value="live">{t('clients.activityLive')}</option>
              <option value="quiet">{t('clients.activityQuiet')}</option>
              <option value="dormant">{t('clients.activityDormant')}</option>
              <option value="never">{t('clients.activityNever')}</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-mute" />
          </div>
        </div>

        {/*
          The receipt for the default above.

          This page opens filtered to Active, so the grid is no longer the fleet. Every screen in
          this portal that has ever shown a narrowed list as if it were the whole one has cost
          somebody an afternoon, so the count, the filters that produced it and the way out all sit
          here in one strip, on screen at all times rather than behind a hover.
        */}
        {!sourceError && (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-themed pt-3">
            <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-widest2 text-text-mute">
              <Filter className="h-3 w-3" strokeWidth={1.75} />
              {t('clients.showing', { defaultValue: 'Showing' })}
            </span>
            <span
              className="text-[13px] text-text"
              // The denominator is spelled out because the two lists count different universes and
              // the strip looks identical in both.
              title={
                showingPurged
                  ? 'Out of every tenant that has been destroyed. This total is not part of the live tenant count.'
                  : 'Out of every tenant the backend returned, before any filter on this page.'
              }
            >
              <span className="font-semibold">{shownCount}</span>
              <span className="text-text-mute"> of </span>
              <span className="font-semibold">{totalCount}</span>
              <span className="text-text-dim">
                {' '}
                {showingPurged
                  ? t('clients.purgedTenants', { defaultValue: 'purged tenants' })
                  : t('clients.tenants', { defaultValue: 'tenants' })}
              </span>
            </span>

            {statusFilter !== 'all' && (
              <FilterChip
                label={
                  statusFilter === 'active'
                    ? t('clients.chipActiveOnly', { defaultValue: 'Active only' })
                    : statusFilter === 'inactive'
                    ? t('clients.chipInactiveOnly', { defaultValue: 'Inactive only' })
                    : t('clients.chipPurgedOnly', { defaultValue: 'Purged only' })
                }
                // One click back to the whole fleet, which is the requirement this chip exists for.
                onClear={() => setStatusFilter('all')}
                tone="strong"
              />
            )}
            {activityFilter !== 'all' && !showingPurged && (
              <FilterChip
                label={`${t('clients.lastActive')}: ${activityFilter}`}
                onClear={() => setActivityFilter('all')}
              />
            )}
            {/* The one case where a control still holds a value that is not being applied. The
                select beside it is greyed out, but a greyed-out control still reads its old value
                aloud, so the strip says in words that this list is not narrowed by it. */}
            {activityFilter !== 'all' && showingPurged && (
              <span
                className="inline-flex items-center gap-1.5 rounded-full border border-themed bg-line/[0.06] px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest2 text-text-mute line-through decoration-1"
                title={PURGED_NO_ACTIVITY_CAVEAT}
              >
                {`${t('clients.lastActive')}: ${activityFilter}`}
              </span>
            )}
            {searchActive && (
              <FilterChip
                label={`${t('common.search').replace('...', '')}: ${searchQuery.trim()}`}
                onClear={() => setSearchQuery('')}
              />
            )}

            {isNarrowed && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="ml-auto font-mono text-[10px] font-semibold uppercase tracking-widest2 text-text-mute transition-colors hover:text-brand-cyan"
              >
                {t('clients.clearFilters', { defaultValue: 'Clear filters' })}
              </button>
            )}
          </div>
        )}
      </motion.section>

      {/* Body */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.12 }}
      >
        {/* The graveyard has its own fetch, so it needs its own pending state. Falling through to
            the empty state while it loads would flash "nothing has ever been purged". */}
        {showingPurged && purgedLoading && (
          <div className="flex h-40 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-themed border-t-brand-cyan" />
            <span className="ml-3 text-text-dim">
              {t('clients.loadingPurged', { defaultValue: 'Loading purged tenants...' })}
            </span>
          </div>
        )}

        {showingPurged && !purgedError && !purgedLoading && (viewMode === 'grid' ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filteredPurged.map((purge, i) => (
              // Keyed on purge_id, the audit row's own pk. client_id is NOT unique here: a tenant
              // can be purged, recreated with the same id by a later seed, and purged again.
              <PurgedCard key={purge.purge_id} purge={purge} index={i} t={t} />
            ))}
          </div>
        ) : (
          <PurgedTable rows={filteredPurged} />
        ))}

        {!showingPurged && !error && (viewMode === 'grid' ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filteredClients.map((client, i) => (
              <ClientCard
                key={client.id}
                client={client}
                index={i}
                onEdit={() => handleOpenEditModal(client)}
                onPurge={() => handleOpenPurgeModal(client)}
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
                    {/* Site rides along in the table too. Grid and list are the same page behind a
                        toggle, and a link that exists in one of them is a link operators report as
                        missing rather than one they think to go looking for. */}
                    {['Client', 'Status', lastActiveHeader, 'Students', 'Courses', 'Payments', 'Contact', 'Site', 'Toggle', 'Actions'].map(
                      (h) => (
                        <th
                          key={h}
                          className={cn(
                            'whitespace-nowrap px-6 py-3 text-left font-mono text-[10px] font-semibold uppercase tracking-widest2 text-text-mute',
                            h === 'Actions' && 'text-right'
                          )}
                          // The caveats ride on the header rather than on each chip: the operator
                          // needs them once, while reading the column, not forty times.
                          title={h === lastActiveHeader ? ACTIVITY_CAVEATS : undefined}
                        >
                          {h}
                          {h === lastActiveHeader && (
                            <Info className="ml-1 inline h-3 w-3 align-[-2px] text-text-mute" />
                          )}
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
                      <td className="whitespace-nowrap px-6 py-4">
                        <ActivityCell client={client} />
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-[13px] text-text">
                        {formatNumber(client.total_students)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-[13px] text-text">
                        {client.total_courses}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <PaymentCell payment={client.payment} />
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-[13px] text-text">
                        {client.poc_name || client.contact_person || '—'}
                      </td>
                      <td className="max-w-[220px] px-6 py-4 text-[13px]">
                        <SiteLink client={client} />
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <StatusToggle
                          isActive={client.is_active !== false}
                          onToggle={(s) => handleToggleStatus(client.id, s)}
                          disabled={toggleStatusMutation.isPending}
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
                          {/* Opens the plan, never the delete. Nothing is destroyed until the
                              manifest has been read and the tenant's name typed out. */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-danger-500 hover:bg-danger-500/10 hover:text-danger-500"
                            leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                            onClick={() => handleOpenPurgeModal(client)}
                          >
                            {t('common.delete')}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {/* Gated on the active source's error and pending states, so neither a failed fetch nor a
            fetch still in flight can be read as "this platform has no tenants". */}
        {!sourceError && !(showingPurged && purgedLoading) && shownCount === 0 && (
          <div className="mt-2 flex flex-col items-center justify-center rounded-xl border border-dashed border-themed-2 bg-line/[0.02] py-16 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-themed bg-line/[0.03]">
              {showingPurged ? (
                <Trash2 className="h-6 w-6 text-text-mute" />
              ) : (
                <Users className="h-6 w-6 text-text-mute" />
              )}
            </div>
            <h3 className="text-[16px] font-semibold text-text">
              {showingPurged
                ? t('clients.noPurgedClients', { defaultValue: 'No purged tenants' })
                : t('clients.noClientsAvailable')}
            </h3>
            <p className="mt-2 max-w-md text-[13px] text-text-dim">
              {/* An empty graveyard with no filters applied is a fact about the platform, not a
                  hint to try another search, and it is worth naming what does NOT appear here: a
                  refused or failed purge destroyed nothing, or not everything, and is deliberately
                  absent rather than missing. */}
              {showingPurged && totalCount === 0
                ? t('clients.noPurgedEver', {
                    defaultValue:
                      'No purge has completed. Purges that were refused, that failed part way, or that ran as a dry run are not listed here.',
                  })
                : t('filters.tryAdjusting', {
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

      <ClientPurgeModal
        client={purgeTarget}
        isOpen={isPurgeModalOpen}
        onClose={() => setIsPurgeModalOpen(false)}
        // refetch, not an optimistic splice: the worker finishes long after the 202, and the list
        // has to come from the backend that just stopped serving that tenant.
        onPurged={() => refetch()}
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

/**
 * The pill a destroyed tenant wears, in place of ACTIVE/INACTIVE.
 *
 * Same shape, dot and type as StatusPill above, because it sits in the same slot and is scanned the
 * same way. Deliberately NOT the danger red: red on this page means "switched off", a reversible
 * state somebody can toggle back, and this is neither. Purged is mute (there is nothing left to act
 * on) and partial is gold, the tone this page already uses for "a human still has to do something".
 */
const PurgedPill: React.FC<{ partial: boolean }> = ({ partial }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest2',
      partial
        ? 'border-brand-gold/30 bg-brand-gold/[0.08] text-brand-gold'
        : 'border-themed bg-line/[0.06] text-text-mute'
    )}
    title={
      partial
        ? 'The database rows are gone, but at least one external step did not finish.'
        : 'Destroyed. Every step of the purge finished.'
    }
  >
    {/* No animate-pulse-soft here. That is the live-tenant heartbeat, and a pulsing dot on a tenant
        that no longer exists says the opposite of what this row means. */}
    <span className={cn('h-1.5 w-1.5 rounded-full', partial ? 'bg-brand-gold' : 'bg-text-mute')} />
    {partial ? 'Purged (partial)' : 'Purged'}
  </span>
);

/**
 * When the tenant was destroyed, and an honest fallback when the backend does not know.
 *
 * completed_at is nullable (rows written by older code paths), and printing an empty cell there
 * would read as "purged on no date". The request timestamp is the nearest true thing, so it is
 * shown and labelled as the request rather than passed off as the completion.
 */
const purgedWhen = (purge: PurgedClient): { text: string; title: string } => {
  if (purge.completed_at) {
    return { text: formatDate(purge.completed_at), title: purge.completed_at };
  }
  return {
    text: `${formatDate(purge.created_at)} (requested)`,
    title:
      'No completion time was recorded on this audit row, so this is when the purge was requested.',
  };
};

/** Who ordered it. null is a real state (the operator's own account was deleted later), so it says
 *  that rather than "Unknown", which reads as a purge nobody authorised. */
const purgedBy = (purge: PurgedClient): string =>
  purge.requested_by || 'Account since deleted';

/**
 * One destroyed tenant.
 *
 * Carries no Edit, no View, no Delete and no toggle, and that is the whole point: there is no row
 * behind this card to edit, no /clients/<id> to open, and nothing left to switch on. An action here
 * could only 404 or, worse, act on whatever tenant later inherited that id. What replaces them is
 * the audit trail, which is the only thing anyone opens this list to read.
 */
const PurgedCard: React.FC<{
  purge: PurgedClient;
  index: number;
  t: (key: string, opts?: any) => string;
}> = ({ purge, index, t }) => {
  const partial = !purge.fully_destroyed;
  const when = purgedWhen(purge);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.04, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'group relative flex h-full flex-col overflow-hidden rounded-xl border border-themed surface-card shadow-glass',
        // No hover lift and no cyan glow, unlike ClientCard. Those affordances promise the tile
        // does something when you reach for it, and this one never will.
        'transition-colors duration-300 ease-out'
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-line/20 to-transparent"
      />

      <div className="flex flex-col gap-5 p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            {/* The flat ink tile BrandLogo already uses for an inactive tenant, never the brand
                gradient: the gradient is the mark of a live customer. */}
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-ink-3">
              <Trash2 className="h-6 w-6 text-text-mute" strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-[16px] font-semibold leading-tight text-text-dim">
                {purge.client_name}
              </h3>
              <p className="mt-1 truncate font-mono text-[10px] uppercase tracking-widest2 text-text-mute">
                {purge.slug}
              </p>
            </div>
          </div>
          <PurgedPill partial={partial} />
        </div>

        {/* Same gold panel as the inactive warning on ClientCard, for the same reason: something is
            still true out there that a human has to deal with. Names the steps, because "partial"
            on its own tells nobody where to go looking. */}
        {partial && (
          <div className="flex items-start gap-2 rounded-lg border border-brand-gold/20 bg-brand-gold/[0.05] px-3 py-2 text-[12px] leading-relaxed text-text-dim">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-gold" />
            <span>
              {t('clients.purgedPartialWarning', {
                defaultValue:
                  'The database rows are gone, but these steps did not finish and may have left a live site, files or an access grant behind:',
              })}{' '}
              <span className="font-mono text-text">
                {purge.degraded_steps.length > 0
                  ? purge.degraded_steps.join(', ')
                  : // Partial with an empty list: the backend knows a step failed but could not name
                    // it. Saying so beats printing nothing after a colon.
                    t('clients.purgedPartialUnnamed', {
                      defaultValue: 'not recorded on this audit row',
                    })}
              </span>
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-themed pt-4 text-[12px]">
          <Meta label={t('clients.purgedOn', { defaultValue: 'Purged' })}>
            <span title={when.title}>{when.text}</span>
          </Meta>
          <Meta label={t('clients.requestedBy', { defaultValue: 'Requested by' })}>
            <span
              title={
                purge.requested_by
                  ? undefined
                  : 'The operator who ordered this purge has since been deleted. The purge was still authorised at the time.'
              }
              className={cn(!purge.requested_by && 'text-text-mute')}
            >
              {purgedBy(purge)}
            </span>
          </Meta>
          <Meta label={t('clients.purgeStatus', { defaultValue: 'Purge status' })}>
            {/* The backend's own wording, never re-derived here. */}
            {purge.status_label}
          </Meta>
          <Meta label={t('clients.formerClientId', { defaultValue: 'Former ID' })}>
            <span
              className="font-mono"
              title="The id this tenant used to have, for cross-referencing old logs. Nothing answers at it now."
            >
              {purge.client_id}
            </span>
          </Meta>
        </div>

        {/* Says out loud why the button row an operator expects here is missing. An absence with no
            explanation reads as a page that failed to render its actions. */}
        <div className="mt-auto flex items-start gap-2 border-t border-themed pt-4 text-[12px] leading-relaxed text-text-mute">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
          <span>
            {t('clients.purgedNoActions', {
              defaultValue:
                'No actions. This tenant has no record left in the database, so there is nothing to open, edit or switch back on.',
            })}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

/**
 * The list view of the graveyard.
 *
 * A different table from the tenant one on purpose, not the same table with blanked cells. Students,
 * courses, payments, activity and site all measured something that no longer exists, and a column of
 * dashes across forty rows invites the reading that these tenants had zero of everything.
 */
const PurgedTable: React.FC<{ rows: PurgedClient[] }> = ({ rows }) => (
  <div className="relative overflow-hidden rounded-xl border border-themed surface-card shadow-glass">
    <span
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-cyan/30 to-transparent"
    />
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead>
          <tr className="border-b border-themed bg-ink-1/30">
            {['Tenant', 'Status', 'Purged', 'Requested by', 'Left behind', 'Former ID'].map((h) => (
              <th
                key={h}
                className="whitespace-nowrap px-6 py-3 text-left font-mono text-[10px] font-semibold uppercase tracking-widest2 text-text-mute"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((purge) => {
            const when = purgedWhen(purge);
            return (
              <tr
                key={purge.purge_id}
                className="group border-b border-themed transition-colors last:border-b-0 hover:bg-line/[0.03]"
              >
                <td className="whitespace-nowrap px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ink-3">
                      <Trash2 className="h-5 w-5 text-text-mute" strokeWidth={1.75} />
                    </div>
                    <div>
                      <div className="text-[14px] font-medium text-text-dim">
                        {purge.client_name}
                      </div>
                      <div className="font-mono text-[11px] text-text-mute">{purge.slug}</div>
                    </div>
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <PurgedPill partial={!purge.fully_destroyed} />
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-[13px] text-text-dim">
                  <span title={when.title}>{when.text}</span>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-[13px] text-text-dim">
                  {purgedBy(purge)}
                </td>
                <td className="px-6 py-4 text-[13px]">
                  {/* Blank is a claim in this column, so it is only ever printed for a purge the
                      backend reported as fully destroyed. */}
                  {purge.fully_destroyed ? (
                    <span className="text-text-mute">Nothing</span>
                  ) : (
                    <span className="font-mono text-[12px] text-brand-gold">
                      {purge.degraded_steps.length > 0
                        ? purge.degraded_steps.join(', ')
                        : 'not recorded'}
                    </span>
                  )}
                </td>
                <td className="whitespace-nowrap px-6 py-4 font-mono text-[13px] text-text-mute">
                  {purge.client_id}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
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
  onPurge: () => void;
  onToggle: (s: boolean) => Promise<void>;
  togglePending: boolean;
  t: (key: string, opts?: any) => string;
}

const ClientCard: React.FC<ClientCardProps> = ({
  client,
  index,
  onEdit,
  onPurge,
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
          {/* Same chip as the table column, same caveats. The card is where a tenant gets looked
              at one at a time, which is exactly when "when was anyone last here" gets asked. */}
          <Meta label={t('clients.lastActive')} className="col-span-2">
            <span className="inline-flex items-center gap-2" title={ACTIVITY_CAVEATS}>
              <ActivityCell client={client} />
              {client.last_active_at ? (
                <span className="text-text-mute">{formatDate(client.last_active_at)}</span>
              ) : null}
            </span>
          </Meta>
          {/* The one row an operator actually clicks. It sits in the meta strip rather than beside
              Edit/View/Delete on purpose: those three act on the tenant record in this portal,
              while this one leaves for a third-party site, and mixing the two invites a misclick. */}
          <Meta label={t('clients.siteUrl', { defaultValue: 'Site' })} className="col-span-2">
            <SiteLink client={client} />
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
            disabled={togglePending}
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
            <Button
              variant="ghost"
              size="sm"
              className="text-danger-500 hover:bg-danger-500/10 hover:text-danger-500"
              leftIcon={<Trash2 className="h-3.5 w-3.5" />}
              onClick={onPurge}
              disabled={togglePending}
            >
              {t('common.delete')}
            </Button>
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
