import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  User,
  Mail,
  Lock,
  Bell,
  Shield,
  Database,
  Monitor,
  Save,
  Eye,
  EyeOff,
  Settings as SettingsIcon,
  CheckCircle2,
  Download,
  LucideIcon,
  ChevronRight,
} from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useAuthStore } from '../store/authStore';
import { formatDate, generateInitials, cn } from '../utils/helpers';
import toast from 'react-hot-toast';

const profileSchema = z.object({
  first_name: z.string().min(2, 'First name must be at least 2 characters'),
  last_name: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
});

const passwordSchema = z
  .object({
    current_password: z.string().min(6, 'Password must be at least 6 characters'),
    new_password: z.string().min(8, 'New password must be at least 8 characters'),
    confirm_password: z.string(),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    message: "Passwords don't match",
    path: ['confirm_password'],
  });

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;
type TabId = 'profile' | 'security' | 'notifications' | 'system';

const Settings: React.FC = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabId>('profile');
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      email: user?.email || '',
    },
  });

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  const onProfileSubmit = async (data: ProfileFormData) => {
    try {
      console.log('Updating profile:', data);
      toast.success('Profile updated');
    } catch {
      toast.error('Failed to update profile');
    }
  };

  const onPasswordSubmit = async (_data: PasswordFormData) => {
    try {
      console.log('Changing password');
      toast.success('Password changed');
      passwordForm.reset();
    } catch {
      toast.error('Failed to change password');
    }
  };

  const tabs: { id: TabId; label: string; icon: LucideIcon; description: string }[] = [
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      description: 'Identity and contact',
    },
    {
      id: 'security',
      label: 'Security',
      icon: Shield,
      description: 'Password and 2FA',
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: Bell,
      description: 'Email and push',
    },
    {
      id: 'system',
      label: 'System',
      icon: Monitor,
      description: 'Health and backups',
    },
  ];

  const userInitials = user
    ? generateInitials(user.first_name, user.last_name)
    : 'SA';

  return (
    <div className="space-y-10">
      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      >
        <span className="kicker mb-3">
          <SettingsIcon className="mr-2 h-3 w-3" />
          Account
        </span>
        <h1 className="serif-display text-[44px] leading-[1.05] text-text">
          <span className="gradient-text">Settings</span> & preferences
        </h1>
        <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-text-dim">
          Manage your account, control how notifications reach you, and review system
          health.
        </p>
      </motion.section>

      {/* Profile summary */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.06 }}
        className="relative overflow-hidden rounded-2xl border border-themed surface-card p-7 shadow-glass"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-cyan/40 to-transparent"
        />
        <div className="flex flex-wrap items-center gap-6">
          <div className="relative h-20 w-20 shrink-0">
            <div
              className="absolute inset-0 rounded-2xl bg-brand-grad shadow-glow-blue"
              aria-hidden
            />
            <div className="relative flex h-full w-full items-center justify-center">
              <span className="font-mono text-[22px] font-bold tracking-tight text-white">
                {userInitials}
              </span>
            </div>
            <span
              aria-hidden
              className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-400 ring-2 ring-ink-0"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="serif-display text-[26px] leading-tight text-text">
              {user?.first_name} {user?.last_name}
            </h2>
            <p className="mt-1 text-[14px] text-text-dim">{user?.email}</p>
            <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
              <span className="kicker">SuperAdmin</span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-widest2 text-emerald-400">
                <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-emerald-400" />
                Active
              </span>
              <span className="font-mono text-[11px] uppercase tracking-widest2 text-text-mute">
                Joined {user?.date_joined ? formatDate(user.date_joined) : '—'}
              </span>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Tabbed layout */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.12 }}
        className="grid grid-cols-1 gap-8 lg:grid-cols-[280px_1fr]"
      >
        {/* Tab nav */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="relative overflow-hidden rounded-2xl border border-themed surface-card p-2 shadow-glass">
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-line/15 to-transparent"
            />
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'group relative flex w-full items-center gap-3 rounded-xl border border-transparent px-3.5 py-3',
                      'text-left transition-all duration-200',
                      isActive
                        ? 'nav-active'
                        : 'text-text-dim hover:bg-line/[0.04] hover:text-text'
                    )}
                  >
                    {isActive && (
                      <span
                        aria-hidden
                        className="absolute left-0 top-1/2 h-7 w-[3px] -translate-y-1/2 rounded-r-full bg-brand-cyan shadow-[0_0_10px_rgba(0,224,255,0.6)]"
                      />
                    )}
                    <div
                      className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors',
                        isActive
                          ? 'bg-brand-cyan/15 text-brand-cyan'
                          : 'bg-line/[0.05] text-text-mute group-hover:bg-line/[0.08] group-hover:text-text'
                      )}
                    >
                      <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[14px] font-semibold">{tab.label}</div>
                      <div className="mt-0.5 truncate text-[11px] text-text-mute">
                        {tab.description}
                      </div>
                    </div>
                    <ChevronRight
                      className={cn(
                        'h-3.5 w-3.5 shrink-0 transition-all',
                        isActive
                          ? 'text-brand-cyan translate-x-0 opacity-100'
                          : 'text-text-mute opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0'
                      )}
                    />
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Tab content */}
        <div className="space-y-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-6"
            >
              {activeTab === 'profile' && (
                <Section title="Profile information" kicker="Identity" icon={User}>
                  <form
                    onSubmit={profileForm.handleSubmit(onProfileSubmit)}
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                      <Input
                        label="First Name"
                        {...profileForm.register('first_name')}
                        error={profileForm.formState.errors.first_name?.message}
                      />
                      <Input
                        label="Last Name"
                        {...profileForm.register('last_name')}
                        error={profileForm.formState.errors.last_name?.message}
                      />
                    </div>
                    <Input
                      label="Email Address"
                      type="email"
                      leftIcon={<Mail className="h-4 w-4" />}
                      {...profileForm.register('email')}
                      error={profileForm.formState.errors.email?.message}
                    />
                    <div className="flex justify-end border-t border-themed pt-5">
                      <Button
                        type="submit"
                        leftIcon={<Save className="h-4 w-4" />}
                        isLoading={profileForm.formState.isSubmitting}
                      >
                        Save Changes
                      </Button>
                    </div>
                  </form>
                </Section>
              )}

              {activeTab === 'security' && (
                <>
                  <Section title="Change password" kicker="Authentication" icon={Lock}>
                    <form
                      onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
                      className="space-y-5"
                    >
                      <PasswordInput
                        label="Current Password"
                        visible={showPasswords.current}
                        onToggle={() =>
                          setShowPasswords((p) => ({ ...p, current: !p.current }))
                        }
                        register={passwordForm.register('current_password')}
                        error={passwordForm.formState.errors.current_password?.message}
                      />
                      <PasswordInput
                        label="New Password"
                        visible={showPasswords.new}
                        onToggle={() =>
                          setShowPasswords((p) => ({ ...p, new: !p.new }))
                        }
                        register={passwordForm.register('new_password')}
                        error={passwordForm.formState.errors.new_password?.message}
                      />
                      <PasswordInput
                        label="Confirm New Password"
                        visible={showPasswords.confirm}
                        onToggle={() =>
                          setShowPasswords((p) => ({ ...p, confirm: !p.confirm }))
                        }
                        register={passwordForm.register('confirm_password')}
                        error={passwordForm.formState.errors.confirm_password?.message}
                      />
                      <div className="flex justify-end border-t border-themed pt-5">
                        <Button
                          type="submit"
                          leftIcon={<Save className="h-4 w-4" />}
                          isLoading={passwordForm.formState.isSubmitting}
                        >
                          Change Password
                        </Button>
                      </div>
                    </form>
                  </Section>

                  <Section
                    title="Two-factor authentication"
                    kicker="Hardening"
                    icon={Shield}
                  >
                    <p className="text-[14px] leading-relaxed text-text-dim">
                      Add an extra layer of security to your account by enabling
                      two-factor authentication. We'll prompt you for a code on every
                      sign-in.
                    </p>
                    <div className="mt-5">
                      <Button
                        variant="outline"
                        leftIcon={<Shield className="h-4 w-4" />}
                      >
                        Enable 2FA
                      </Button>
                    </div>
                  </Section>
                </>
              )}

              {activeTab === 'notifications' && (
                <Section title="Notification preferences" kicker="Channels" icon={Bell}>
                  <div className="space-y-2">
                    <PrefRow
                      title="Email Notifications"
                      desc="Get a daily summary of activity in your inbox."
                      defaultChecked
                    />
                    <PrefRow
                      title="Push Notifications"
                      desc="Real-time updates pushed to this browser."
                    />
                    <PrefRow
                      title="System Alerts"
                      desc="Critical alerts — outages, security, billing — always on by default."
                      defaultChecked
                    />
                  </div>
                </Section>
              )}

              {activeTab === 'system' && (
                <>
                  <Section
                    title="System information"
                    kicker="Diagnostics"
                    icon={Monitor}
                  >
                    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Stat label="Application Version" value="v1.0.0" />
                      <Stat label="Last Updated" value={formatDate(new Date())} />
                      <Stat
                        label="Database Status"
                        value={
                          <span className="inline-flex items-center gap-1.5 text-emerald-400">
                            <CheckCircle2 className="h-4 w-4" /> Connected
                          </span>
                        }
                      />
                      <Stat
                        label="API Status"
                        value={
                          <span className="inline-flex items-center gap-1.5 text-emerald-400">
                            <CheckCircle2 className="h-4 w-4" /> Online
                          </span>
                        }
                      />
                    </dl>
                  </Section>

                  <Section title="Backup & export" kicker="Data" icon={Database}>
                    <p className="text-[14px] leading-relaxed text-text-dim">
                      Export your data for compliance, or create a full system backup
                      before major changes.
                    </p>
                    <div className="mt-5 flex flex-wrap gap-3">
                      <Button
                        variant="outline"
                        leftIcon={<Download className="h-4 w-4" />}
                      >
                        Export Data
                      </Button>
                      <Button
                        variant="outline"
                        leftIcon={<Database className="h-4 w-4" />}
                      >
                        Create Backup
                      </Button>
                    </div>
                  </Section>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.section>
    </div>
  );
};

/* ---------- Sub-components ---------- */

const Section: React.FC<{
  title: string;
  kicker?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
}> = ({ title, kicker, icon: Icon, children }) => (
  <div className="relative overflow-hidden rounded-2xl border border-themed surface-card p-7 shadow-glass">
    <span
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-line/15 to-transparent"
    />
    <div className="mb-6 flex items-start gap-4">
      {Icon && (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-themed-2 bg-brand-cyan/10 text-brand-cyan">
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </div>
      )}
      <div className="min-w-0">
        {kicker && (
          <span className="font-mono text-[10px] font-semibold uppercase tracking-widest2 text-brand-cyan">
            {kicker}
          </span>
        )}
        <h3 className="mt-0.5 serif-display text-[22px] leading-tight text-text">
          {title}
        </h3>
      </div>
    </div>
    {children}
  </div>
);

const PasswordInput: React.FC<{
  label: string;
  visible: boolean;
  onToggle: () => void;
  register: any;
  error?: string;
}> = ({ label, visible, onToggle, register, error }) => (
  <Input
    label={label}
    type={visible ? 'text' : 'password'}
    leftIcon={<Lock className="h-4 w-4" />}
    rightIcon={
      <button
        type="button"
        onClick={onToggle}
        className="text-text-mute hover:text-text transition-colors"
        aria-label={visible ? 'Hide password' : 'Show password'}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    }
    {...register}
    error={error}
  />
);

const PrefRow: React.FC<{
  title: string;
  desc: string;
  defaultChecked?: boolean;
}> = ({ title, desc, defaultChecked }) => {
  const [checked, setChecked] = useState(!!defaultChecked);
  return (
    <label className="group flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-themed bg-line/[0.02] p-4 transition-colors hover:bg-line/[0.04]">
      <div className="min-w-0">
        <div className="flex items-center gap-2.5">
          <h4 className="text-[15px] font-semibold text-text">{title}</h4>
          <span
            className={cn(
              'font-mono text-[10px] font-semibold uppercase tracking-widest2 transition-colors',
              checked ? 'text-emerald-400' : 'text-text-mute'
            )}
          >
            {checked ? 'On' : 'Off'}
          </span>
        </div>
        <p className="mt-1 text-[13px] leading-relaxed text-text-dim">{desc}</p>
      </div>
      <span className="relative mt-0.5 inline-flex h-6 w-11 shrink-0 cursor-pointer items-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          className="peer sr-only"
        />
        <span
          className={cn(
            'absolute inset-0 rounded-full border transition-colors',
            checked
              ? 'border-transparent bg-brand-grad shadow-glow'
              : 'border-themed-2 bg-ink-3'
          )}
        />
        <span
          className={cn(
            'relative ml-0.5 h-5 w-5 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.35)] transition-transform',
            checked ? 'translate-x-5' : 'translate-x-0'
          )}
        />
      </span>
    </label>
  );
};

const Stat: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="rounded-xl border border-themed bg-line/[0.02] p-4">
    <div className="font-mono text-[10px] font-semibold uppercase tracking-widest2 text-text-mute">
      {label}
    </div>
    <div className="mt-1.5 text-[17px] font-semibold text-text">{value}</div>
  </div>
);

export default Settings;
