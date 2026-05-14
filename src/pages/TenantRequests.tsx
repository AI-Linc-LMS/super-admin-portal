import React, { useMemo, useState } from 'react';
import { Search, Filter, Inbox, RefreshCw } from 'lucide-react';
import { useTenantRequests } from '../hooks/useTenantRequests';
import TenantRequestDetailsModal from '../components/modals/TenantRequestDetailsModal';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import {
  ORG_TYPE_LABELS,
  LEARNER_BAND_LABELS,
  STATUS_LABELS,
  STATUS_TONE,
  TenantRequestStatus,
} from '../types/tenantRequest';

type Filter = TenantRequestStatus | 'all';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'pending_review', label: 'Pending' },
  { value: 'approved_setup', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'archived', label: 'Archived' },
  { value: 'all', label: 'All' },
];

const TenantRequests: React.FC = () => {
  const [filter, setFilter] = useState<Filter>('pending_review');
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<number | null>(null);

  const { data, isLoading, refetch, isFetching } = useTenantRequests({
    status: filter,
    search: search.trim() || undefined,
  });

  const counts = useMemo(() => {
    const all = data || [];
    return {
      total: all.length,
      pending: all.filter((r) => r.status === 'pending_review').length,
    };
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Tenant Requests</h1>
          <p className="text-sm text-gray-500 mt-1">
            Review and approve self-serve LMS provisioning requests from
            prospects on ailinc.com.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => refetch()}
          isLoading={isFetching}
          leftIcon={<RefreshCw className="h-4 w-4" />}
        >
          Refresh
        </Button>
      </div>

      <Card padding="md">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[240px]">
            <Input
              leftIcon={<Search className="h-4 w-4 text-gray-400" />}
              placeholder="Search by org name, contact, or reference…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-1.5 bg-gray-100 rounded-lg p-1">
            <Filter className="h-4 w-4 text-gray-500 ml-1" />
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  filter === f.value
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <Card padding="none">
        {isLoading ? (
          <div className="py-16 text-center text-gray-500">Loading…</div>
        ) : !data || data.length === 0 ? (
          <div className="py-16 text-center">
            <Inbox className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-base font-medium text-gray-900">
              No requests yet
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              When prospects submit the "Create my LMS" form, requests will
              appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reference
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Organisation
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Learners
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submitted
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => setOpenId(r.id)}
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-primary-700">
                      {r.reference_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {r.organisation_name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {ORG_TYPE_LABELS[r.organisation_type] ||
                          r.organisation_type}{' '}
                        · {r.country}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {r.contact_name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {r.contact_email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {LEARNER_BAND_LABELS[r.expected_learner_band] ||
                        r.expected_learner_band}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_TONE[r.status]}`}
                      >
                        {STATUS_LABELS[r.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {data && data.length > 0 ? (
        <p className="text-xs text-gray-500 text-right">
          Showing {counts.total} request{counts.total === 1 ? '' : 's'}
          {filter === 'pending_review' ? '' : ` in ${STATUS_LABELS[filter as TenantRequestStatus] || 'all'}`}
        </p>
      ) : null}

      <TenantRequestDetailsModal
        requestId={openId}
        isOpen={openId !== null}
        onClose={() => setOpenId(null)}
      />
    </div>
  );
};

export default TenantRequests;
