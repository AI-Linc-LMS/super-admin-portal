import React, { useEffect, useState } from 'react';
import { AlertTriangle, Check, Loader2, Mic, Save, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAiTutorConfig, useUpdateAiTutorConfig } from '../../hooks/useAiTutorConfig';
import type { ClientTutorConfigUpdate, TutorModelOption } from '../../types/aiTutor';
import Button from './Button';
import StatusToggle from './StatusToggle';

interface Props {
  clientId: number;
}

/**
 * Which realtime model this tenant's AI Tutor runs on, plus its entitlement and spend guards.
 *
 * The model picker is the point of this panel. Voice is the dominant cost in the product by a
 * wide margin: a cost RCA measured audio at 78% of the bill, so the choice made here moves
 * spend roughly 3.7x, far more than any other knob on the page. That is why each option shows
 * its MEASURED cost per minute and per session rather than only a name, and why the numbers
 * come from the API instead of being written into this file where they would quietly go stale.
 *
 * Two states are deliberately distinguished:
 *
 * 1. "Not configured" is not an error. A tenant with no config row has the tutor OFF, and that
 *    absence is the real gate, so the panel shows it as a state to act on rather than a 404.
 * 2. "Platform default" is a real, selectable choice, not just the empty value. A tenant left
 *    on the default follows the platform when it changes; a tenant pinned to a model does not.
 *    Those are different operational intents and the picker keeps them distinct.
 */
const AiTutorSettingsPanel: React.FC<Props> = ({ clientId }) => {
  const { data, isLoading, error } = useAiTutorConfig(clientId);
  const updateConfig = useUpdateAiTutorConfig(clientId);

  const [draft, setDraft] = useState<ClientTutorConfigUpdate>({});
  const [justSaved, setJustSaved] = useState(false);

  /**
   * The draft is cleared only by a successful save of the draft itself, never by the server
   * view changing.
   *
   * Clearing on every `data` change looks tidier and is wrong: the enable toggle writes
   * immediately and seeds the query cache from its response, so an operator who typed a new
   * minute allowance and then flipped the tutor on would watch their edit vanish with no
   * error and no indication anything was lost.
   */
  useEffect(() => {
    // Only when the panel is pointed at a different tenant. Switching clients must not carry
    // one tenant's unsaved numbers onto another's form.
    setDraft({});
    setJustSaved(false);
  }, [clientId]);

  const config = data?.config;
  const models = data?.models ?? [];

  const value = <K extends keyof ClientTutorConfigUpdate>(
    field: K
  ): ClientTutorConfigUpdate[K] =>
    (draft[field] !== undefined
      ? draft[field]
      : (config?.[field as keyof typeof config] as ClientTutorConfigUpdate[K]));

  const set = <K extends keyof ClientTutorConfigUpdate>(
    field: K,
    next: ClientTutorConfigUpdate[K]
  ) => setDraft(prev => ({ ...prev, [field]: next }));

  const dirty = Object.keys(draft).length > 0;

  const handleSave = async () => {
    if (!dirty) return;
    try {
      await updateConfig.mutateAsync(draft);
      setDraft({});
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2500);
      toast.success('AI Tutor settings saved.');
    } catch {
      // useUpdateAiTutorConfig surfaces the backend's own message, which names the models
      // it will accept. Nothing useful to add here.
    }
  };

  /**
   * Both switches save immediately.
   *
   * They are visually identical controls sitting in one panel, so they must not behave
   * differently: an earlier version had the enable switch persist on flip while the coding
   * switch only edited the draft, which meant flipping coding and navigating away lost it
   * with no warning and no visible difference to explain why.
   */
  const saveNow = async (patch: ClientTutorConfigUpdate, message: string) => {
    try {
      await updateConfig.mutateAsync(patch);
      toast.success(message);
    } catch {
      /* the axios interceptor surfaces the reason */
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 text-sm text-gray-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading AI Tutor settings...
      </div>
    );
  }

  if (error || !config) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" />
        <p className="text-sm text-amber-200">
          Could not load AI Tutor settings for this client. The tutor&apos;s current
          configuration is unknown, so avoid changing it from here until this loads.
        </p>
      </div>
    );
  }

  const selectedModel = value('realtime_model') ?? '';
  const defaultModel = models.find(m => m.id === data?.platform_default);

  return (
    <div className="space-y-6">
      {!data?.exists && (
        <div className="flex items-start gap-3 rounded-lg border border-themed bg-ink-1/40 p-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
          <p className="text-sm text-gray-400">
            This client has never been configured, so the AI Tutor is off. Saving here creates
            its configuration. It stays off until you enable it.
          </p>
        </div>
      )}

      {/* Enable ------------------------------------------------------------------ */}
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="font-semibold">AI Tutor enabled</p>
          <p className="text-sm text-gray-400">
            Turns the tutor on for this client. Learners also need the{' '}
            <span className="font-mono text-gray-300">ai_voice_tutor</span> feature granted in
            Client Features above. Both are required, and this switch does not set that one.
          </p>
        </div>
        <StatusToggle
          isActive={config.is_enabled}
          onToggle={next =>
            saveNow(
              { is_enabled: next },
              next ? 'AI Tutor enabled for this client.' : 'AI Tutor disabled.'
            )
          }
          disabled={updateConfig.isLoading}
          size="lg"
          ariaLabel="AI Tutor enabled for this client"
        />
      </div>

      {/* Model picker ------------------------------------------------------------ */}
      <div>
        <div className="mb-1 flex items-center gap-2">
          <Mic className="h-4 w-4 text-brand-cyan" />
          <p className="font-semibold">Realtime model</p>
        </div>
        <p className="mb-3 text-sm text-gray-400">
          Voice is roughly 78% of what a session costs, so this is the setting that moves the
          bill. Costs below are measured on real traffic ({data?.measurement_basis}).
        </p>

        <div className="space-y-2">
          <ModelChoice
            selected={selectedModel === ''}
            onSelect={() => set('realtime_model', '')}
            title="Platform default"
            blurb={
              `Follow whatever the platform default is, currently ` +
              `${labelFor(models, data?.platform_default)}. Changes with the platform.`
            }
            // Priced from the model it currently resolves to. Both production tenants sit
            // on this option, so leaving it as the one row without a cost would hide the
            // figure from exactly the people it is there to inform.
            cost={defaultModel?.usd_per_minute
              ? `$${defaultModel.usd_per_minute}/min \u00b7 $${defaultModel.usd_per_15_min_session} per 15-min session`
              : undefined}
            share={defaultModel?.percent_of_baseline}
            disabled={updateConfig.isLoading}
          />
          {models.map(model => (
            <ModelChoice
              key={model.id}
              selected={selectedModel === model.id}
              onSelect={() => set('realtime_model', model.id)}
              title={model.label}
              blurb={model.blurb}
              recommended={model.recommended}
              cost={
                model.usd_per_minute
                  ? `$${model.usd_per_minute}/min · $${model.usd_per_15_min_session} per 15-min session`
                  : undefined
              }
              share={model.percent_of_baseline}
              disabled={updateConfig.isLoading}
            />
          ))}
        </div>

        <p className="mt-2 text-xs text-gray-500">
          Currently running:{' '}
          <span className="font-mono text-gray-300">{config.effective_model}</span>
          {config.realtime_model === '' && ' (via platform default)'}
        </p>
      </div>

      {/* Entitlement and guards --------------------------------------------------- */}
      <div className="grid gap-4 sm:grid-cols-3">
        <NumberField
          label="Minutes per student / month"
          hint="0 blocks the tutor for everyone in this tenant."
          value={Number(value('monthly_minutes_per_student') ?? 0)}
          min={0}
          onChange={n => set('monthly_minutes_per_student', n)}
          disabled={updateConfig.isLoading}
        />
        <NumberField
          label="Max minutes per session"
          hint="The provider caps a session at 60."
          value={Number(value('max_session_minutes') ?? 0)}
          min={1}
          max={60}
          onChange={n => set('max_session_minutes', n)}
          disabled={updateConfig.isLoading}
        />
        <NumberField
          label="Daily spend ceiling (USD)"
          hint="New sessions are refused once today's spend passes this."
          value={Number(value('daily_cost_ceiling_usd') ?? 0)}
          min={0}
          step="0.01"
          onChange={n => set('daily_cost_ceiling_usd', String(n))}
          disabled={updateConfig.isLoading}
        />
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="font-semibold">Coding editor</p>
          <p className="text-sm text-gray-400">
            Lets the tutor open the IDE and run code. Off means it teaches code on the canvas
            instead.
          </p>
        </div>
        <StatusToggle
          isActive={Boolean(config.coding_enabled)}
          onToggle={next =>
            saveNow(
              { coding_enabled: next },
              next ? 'Coding editor enabled.' : 'Coding editor disabled.'
            )
          }
          disabled={updateConfig.isLoading}
          size="lg"
          ariaLabel="Coding editor available to the tutor"
        />
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-themed pt-4">
        {justSaved && !dirty && (
          <span className="flex items-center gap-1.5 text-sm text-emerald-400">
            <Check className="h-4 w-4" /> Saved
          </span>
        )}
        <Button onClick={handleSave} disabled={!dirty || updateConfig.isLoading}>
          {updateConfig.isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save changes
        </Button>
      </div>
    </div>
  );
};

function labelFor(models: TutorModelOption[], id?: string): string {
  return models.find(m => m.id === id)?.label ?? id ?? 'unknown';
}

const ModelChoice: React.FC<{
  selected: boolean;
  onSelect: () => void;
  title: string;
  blurb: string;
  cost?: string;
  share?: number;
  recommended?: boolean;
  disabled?: boolean;
}> = ({ selected, onSelect, title, blurb, cost, share, recommended, disabled }) => (
  <button
    type="button"
    onClick={onSelect}
    disabled={disabled}
    aria-pressed={selected}
    className={
      'w-full rounded-lg border p-3 text-left transition-colors disabled:opacity-60 ' +
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan ' +
      (selected
        ? 'border-brand-cyan bg-brand-cyan/10'
        : 'border-themed bg-ink-1/30 hover:border-gray-500')
    }
  >
    <div className="flex items-start gap-3">
      <span
        className={
          'mt-1 h-3.5 w-3.5 flex-shrink-0 rounded-full border-2 ' +
          (selected ? 'border-brand-cyan bg-brand-cyan' : 'border-gray-500')
        }
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">{title}</span>
          {recommended && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-400">
              <Sparkles className="h-3 w-3" /> Recommended
            </span>
          )}
          {typeof share === 'number' && (
            <span className="rounded-full bg-ink-1/60 px-2 py-0.5 text-xs font-medium text-gray-300">
              {share}% of the dearest option
            </span>
          )}
        </div>
        <p className="mt-0.5 text-sm text-gray-400">{blurb}</p>
        {cost && <p className="mt-1 font-mono text-xs text-gray-300">{cost}</p>}
      </div>
    </div>
  </button>
);

/**
 * A number input that lets the field be EMPTY while it is being retyped.
 *
 * The obvious implementation coerces `e.target.value` with `Number()` and guards with
 * `Number.isFinite`. That guard does nothing: `<input type="number">` reports `""` for an
 * emptied or unparseable field and `Number("") === 0`, so backspacing through a value
 * silently committed 0. On "Minutes per student / month" 0 is not a harmless intermediate
 * state, it is the value that blocks the tutor for every learner in the tenant.
 *
 * So the raw string is held locally while the field is being edited, and only a parseable
 * number is pushed upward. Emptying the box leaves the saved value untouched.
 */
const NumberField: React.FC<{
  label: string;
  hint?: string;
  value: number;
  min?: number;
  max?: number;
  step?: string;
  onChange: (next: number) => void;
  disabled?: boolean;
}> = ({ label, hint, value, min, max, step, onChange, disabled }) => {
  const [raw, setRaw] = useState<string | null>(null);
  const shown = raw ?? (Number.isFinite(value) ? String(value) : '');

  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      <input
        type="number"
        value={shown}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={e => {
          const text = e.target.value;
          setRaw(text);
          if (text.trim() === '') return; // mid-edit, not a value
          const next = Number(text);
          if (Number.isFinite(next)) onChange(next);
        }}
        // Drop back to the committed value once the operator leaves an empty box, so the
        // field never sits blank showing something different from what will be saved.
        onBlur={() => setRaw(null)}
        className="w-full rounded-lg border border-themed bg-ink-1/40 px-3 py-2 text-sm focus:border-brand-cyan focus:outline-none disabled:opacity-60"
      />
      {hint && <span className="mt-1 block text-xs text-gray-500">{hint}</span>}
    </label>
  );
};

export default AiTutorSettingsPanel;
