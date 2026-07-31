import React from 'react';
import toast from 'react-hot-toast';
import { Check, Pencil, X } from 'lucide-react';
import { usePriceAdaptiveCourseMapping } from '../../hooks/useAdaptiveCourses';
import type { TenantMapping } from '../../types/adaptiveCourse';

/**
 * What one institution charges for a SHARED catalog course.
 *
 * Shared mode gives the tenant no course row of its own, so this mapping is the only per-tenant
 * object there is — and it has to be per-tenant: two institutions sharing one course will not
 * charge the same, and the money settles into whichever tenant's Razorpay account the buyer
 * belongs to.
 *
 * Clone mode never renders this. A clone is a real course carrying its own price, and a second
 * editor would be a way for the two to disagree about what a learner owes.
 */

/** Ten codes, matching payment_gateway.money.PLATFORM_ALLOWED — the server rejects anything else. */
const CURRENCIES = ['INR', 'SAR', 'AED', 'USD', 'GBP', 'EUR', 'QAR', 'KWD', 'BHD', 'OMR'];

function formatPrice(price: string | null, currency: string): string {
  const n = Number(price ?? 0);
  if (!Number.isFinite(n) || n <= 0) return '';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'INR',
      maximumFractionDigits: n >= 1000 ? 0 : 2,
    }).format(n);
  } catch {
    return `${n.toLocaleString('en-US')} ${currency}`;
  }
}

export const MappingPrice: React.FC<{ courseId: number; mapping: TenantMapping }> = ({
  courseId,
  mapping,
}) => {
  const [editing, setEditing] = React.useState(false);
  const [price, setPrice] = React.useState(mapping.price ?? '');
  const [currency, setCurrency] = React.useState(mapping.currency || 'INR');
  const priceMutation = usePriceAdaptiveCourseMapping();

  const save = async (isPaid: boolean) => {
    try {
      await priceMutation.mutateAsync({
        courseId,
        mappingId: mapping.id,
        isPaid,
        price: isPaid ? price : undefined,
        currency: isPaid ? currency : undefined,
      });
      toast.success(isPaid ? 'Price saved.' : 'This course is now free for that institution.');
      setEditing(false);
    } catch (e) {
      // The server explains itself — no Razorpay account, an unsupported currency, a frozen
      // currency after real payments. Surfacing its sentence is more use than "Save failed".
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(detail || 'Could not save the price.');
    }
  };

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        {mapping.is_paid && mapping.price ? (
          <span className="text-text">{formatPrice(mapping.price, mapping.currency)}</span>
        ) : (
          <span className="text-[12px] text-text-mute">Free</span>
        )}
        <button
          onClick={() => setEditing(true)}
          className="text-text-mute hover:text-brand-cyan"
          aria-label="Edit price"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        type="number"
        min={1}
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        placeholder="0"
        className="w-20 rounded border border-themed bg-line/[0.03] px-2 py-1 text-[13px] text-text focus:border-brand-cyan/50 focus:outline-none"
      />
      <select
        value={currency}
        onChange={(e) => setCurrency(e.target.value)}
        className="rounded border border-themed bg-line/[0.03] px-1.5 py-1 text-[12px] text-text focus:border-brand-cyan/50 focus:outline-none"
      >
        {CURRENCIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <button
        onClick={() => void save(true)}
        disabled={priceMutation.isPending}
        className="text-emerald-400 hover:text-emerald-300 disabled:opacity-40"
        aria-label="Save price"
      >
        <Check className="h-4 w-4" />
      </button>
      {mapping.is_paid && (
        <button
          onClick={() => void save(false)}
          disabled={priceMutation.isPending}
          className="text-[11px] text-text-mute hover:text-danger-500 disabled:opacity-40"
        >
          Make free
        </button>
      )}
      <button
        onClick={() => {
          setPrice(mapping.price ?? '');
          setCurrency(mapping.currency || 'INR');
          setEditing(false);
        }}
        className="text-text-mute hover:text-text"
        aria-label="Cancel"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

export default MappingPrice;
