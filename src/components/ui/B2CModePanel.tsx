import React, { useEffect, useState } from 'react';
import { AlertTriangle, Check, Loader2, Save } from 'lucide-react';
import { useB2CConfig, useUpdateB2CConfig } from '../../hooks/useB2C';
import { B2C_FEATURE_LABELS, type B2CFeaturePricing } from '../../types/b2c';
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
  /** Only the fields the operator actually touched, per feature. Sending back values nobody
   *  edited is how a stale number gets written over a fresh one — the server accepts partial
   *  rows precisely so this panel does not have to restate them. */
  const [drafts, setDrafts] = useState<Record<string, Partial<B2CFeaturePricing>>>({});
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    if (!data) return;
    setIsEnabled(data.is_enabled);
    setDrafts({});
  }, [data]);

  const dirty =
    !!data &&
    (data.is_enabled !== isEnabled ||
      Object.values(drafts).some(d => Object.keys(d).length > 0));

  const handleSave = async () => {
    if (!data) return;
    const edited = Object.entries(drafts)
      .filter(([, patch]) => Object.keys(patch).length > 0)
      .map(([feature_key, patch]) => ({ feature_key, ...patch }));

    await updateConfig.mutateAsync({
      clientId,
      payload: {
        is_enabled: isEnabled,
        // Turning B2C off leaves the stored numbers untouched, so flipping it back on restores
        // the previous configuration rather than silently resetting everything to zero.
        features: edited.length ? edited : undefined,
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

      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold">What this tenant meters</h3>
          <p className="text-xs text-text-mute">
            Free tiers count per <strong>email address, across accounts</strong> — signing up again
            does not reset them. Each row explains what its own numbers mean, because they are not
            the same shape from one feature to the next.
          </p>
        </div>

        {data.features.map(feature => {
          const meta = feature.meta ?? {};
          const label = meta.label ?? B2C_FEATURE_LABELS[feature.feature_key] ?? feature.feature_key;
          const draft = drafts[feature.feature_key] ?? {};
          const set = (patch: Partial<B2CFeaturePricing>) =>
            setDrafts(prev => ({
              ...prev,
              [feature.feature_key]: { ...prev[feature.feature_key], ...patch },
            }));

          return (
            <div
              key={feature.feature_key}
              className="rounded-lg border border-white/10 bg-white/[0.02] p-3 space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold">{label}</span>
                <code className="text-[0.65rem] text-text-mute">{feature.feature_key}</code>
              </div>

              {/* Free allowance — hidden for features that are not counted at all (roadmaps). */}
              {meta.free_unit !== null && (
                <div className="flex items-center gap-2">
                  <input
                    type="number" min={0} max={100} disabled={!isEnabled}
                    value={draft.free_allowance ?? feature.free_allowance}
                    onChange={e => set({ free_allowance: Math.max(0, Number(e.target.value) || 0) })}
                    className="w-20 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-sm disabled:opacity-40"
                  />
                  <span className="text-xs text-text-mute">
                    free {meta.free_unit ?? 'uses'} per email
                  </span>
                </div>
              )}

              {/* Price — only where the feature has no product row carrying its own price. */}
              {meta.uses_unit_price && (
                <div className="flex items-center gap-2">
                  <input
                    type="number" min={0} step="1" disabled={!isEnabled}
                    placeholder="not on sale"
                    value={draft.unit_price ?? feature.unit_price ?? ''}
                    onChange={e => set({ unit_price: e.target.value === '' ? null : e.target.value })}
                    className="w-24 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-sm disabled:opacity-40"
                  />
                  <span className="text-xs text-text-mute">
                    {feature.currency} for one more
                  </span>
                </div>
              )}

              {/* Preview — roadmaps only. */}
              {meta.uses_preview && (
                <div className="flex items-center gap-2">
                  <input
                    type="number" min={0} max={100} disabled={!isEnabled}
                    value={draft.preview_percent ?? feature.preview_percent}
                    onChange={e =>
                      set({
                        preview_percent: Math.min(100, Math.max(0, Number(e.target.value) || 0)),
                      })
                    }
                    className="w-20 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-sm disabled:opacity-40"
                  />
                  <span className="text-xs text-text-mute">% of a paid path opened as a taste</span>
                </div>
              )}

              <p className="text-[0.7rem] leading-relaxed text-text-mute">
                {meta.free_help}
                {meta.uses_unit_price && meta.price_help ? ` ${meta.price_help}` : ''}
                {meta.uses_preview && meta.preview_help ? ` ${meta.preview_help}` : ''}
                {!meta.uses_unit_price && meta.price_help ? ` ${meta.price_help}` : ''}
              </p>
            </div>
          );
        })}
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
