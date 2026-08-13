import React, { useEffect, useState } from 'react';
import { AlertTriangle, Check, Loader2, Save } from 'lucide-react';
import { useB2CConfig, useUpdateB2CConfig } from '../../hooks/useB2C';
import { B2C_FEATURE_LABELS } from '../../types/b2c';
import Button from './Button';

interface Props {
  clientId: number;
}

/**
 * Switches a tenant into self-serve B2C mode and sets its free allowances.
 *
 * Two things this panel deliberately does NOT hide:
 *
 * 1. Razorpay readiness. A B2C tenant that cannot settle money answers 402 on every priced
 *    course with no way for the learner to pay, which looks like a broken storefront rather
 *    than a misconfiguration. The warning shows whenever the tenant cannot sell, whether or
 *    not B2C is currently on.
 * 2. That a FREE course bypasses the meter entirely. "One free course" is a 100%-discount
 *    grant on a priced course; an unpriced course is simply free to everyone, forever.
 */
const B2CModePanel: React.FC<Props> = ({ clientId }) => {
  const { data, isLoading, error } = useB2CConfig(clientId);
  const updateConfig = useUpdateB2CConfig();

  const [isEnabled, setIsEnabled] = useState(false);
  const [allowances, setAllowances] = useState<Record<string, number>>({});
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    if (!data) return;
    setIsEnabled(data.is_enabled);
    setAllowances(
      Object.fromEntries(data.features.map(f => [f.feature_key, f.free_allowance]))
    );
  }, [data]);

  const dirty =
    !!data &&
    (data.is_enabled !== isEnabled ||
      data.features.some(f => (allowances[f.feature_key] ?? 0) !== f.free_allowance));

  const handleSave = async () => {
    if (!data) return;
    await updateConfig.mutateAsync({
      clientId,
      payload: {
        is_enabled: isEnabled,
        features: data.features.map(f => ({
          feature_key: f.feature_key,
          // Turning B2C off leaves the allowances stored but inert, so flipping it back on
          // restores the previous configuration rather than silently resetting it to zero.
          is_enabled: isEnabled,
          free_allowance: allowances[f.feature_key] ?? 0,
        })),
      },
    });
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-text-mute py-4">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading B2C configuration…
      </div>
    );
  }

  if (error || !data) {
    // No mock fallback here on purpose — see api.ts. Showing a fabricated "B2C off" would be
    // acted on as if it were the tenant's real monetization state.
    return (
      <div className="flex items-start gap-2 text-red-400 py-4">
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
        <span>
          Could not load B2C configuration for this client. Nothing has been changed.
          {error instanceof Error ? ` (${error.message})` : ''}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={isEnabled}
          onChange={e => setIsEnabled(e.target.checked)}
          className="mt-1 w-4 h-4 accent-brand-cyan"
        />
        <span>
          <span className="font-semibold">Self-serve B2C mode</span>
          <span className="block text-sm text-text-mute">
            Learners sign themselves up, get a metered free allowance, and pay for the rest.
            Off (the default) means this tenant behaves exactly as a normal institution.
          </span>
        </span>
      </label>

      {!data.can_sell && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-400" />
          <span>
            <span className="font-semibold text-amber-300">This tenant cannot take payments yet.</span>
            <span className="block text-text-mute">
              {data.cannot_sell_reason} Until that is fixed, every priced course will refuse the
              learner with a payment prompt they cannot complete.
            </span>
          </span>
        </div>
      )}

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Free allowance, per email address</h3>
        <p className="text-xs text-text-mute">
          Counted across accounts, so signing up again does not reset it.
        </p>
        {data.features.map(feature => (
          <div key={feature.feature_key} className="flex items-center gap-3">
            <span className="w-40 text-sm">
              {B2C_FEATURE_LABELS[feature.feature_key] ?? feature.feature_key}
            </span>
            <input
              type="number"
              min={0}
              max={100}
              disabled={!isEnabled}
              value={allowances[feature.feature_key] ?? 0}
              onChange={e =>
                setAllowances(prev => ({
                  ...prev,
                  [feature.feature_key]: Math.max(0, Number(e.target.value) || 0),
                }))
              }
              className="w-20 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-sm disabled:opacity-40"
            />
            <span className="text-xs text-text-mute">free, then paid</span>
          </div>
        ))}
      </div>

      {isEnabled && (
        <p className="text-xs text-text-mute border-l-2 border-brand-cyan/40 pl-3">
          Storefront courses must be published, self-enrollable and <strong>priced</strong>. A
          course left free bypasses the allowance entirely and stays free to everyone.
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={!dirty || updateConfig.isPending}>
          {updateConfig.isPending ? (
            <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving…</>
          ) : justSaved ? (
            <><Check className="w-4 h-4 mr-2" />Saved</>
          ) : (
            <><Save className="w-4 h-4 mr-2" />Save B2C settings</>
          )}
        </Button>
        {updateConfig.isError && (
          <span className="text-sm text-red-400">
            Save failed — nothing was changed.
          </span>
        )}
      </div>
    </div>
  );
};

export default B2CModePanel;
