import React from 'react';
import { Bell, Search, Menu } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { generateInitials } from '../../utils/helpers';
import Button from '../ui/Button';
import LanguageSwitcher from '../ui/LanguageSwitcher';
import ThemeToggle from '../ui/ThemeToggle';

const Header: React.FC = () => {
  const { user } = useAuthStore();
  const { isMobile, setSidebarOpen } = useUIStore();
  const { t } = useTranslation();

  const userInitials = user
    ? generateInitials(user.first_name, user.last_name)
    : 'SA';

  return (
    <header
      className="sticky top-0 z-30 border-b border-themed
        bg-ink-0/70 backdrop-blur-xl"
    >
      {/* gradient hairline */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px
          bg-gradient-to-r from-transparent via-brand-cyan/20 to-transparent"
      />

      <div className="flex items-center justify-between gap-4 px-5 py-3">
        <div className="flex flex-1 items-center gap-3">
          {isMobile && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(true)}
              leftIcon={<Menu className="h-5 w-5" />}
            />
          )}

          <div className="relative w-full max-w-md group">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-[18px] w-[18px] text-text-mute group-focus-within:text-brand-cyan transition-colors" />
            </div>
            <input
              type="text"
              placeholder={t('common.search')}
              className="block h-10 w-full rounded-lg border border-themed-2 bg-ink-1/40
                pl-10 pr-3 text-[14px] text-text placeholder:text-text-mute
                transition-colors duration-200
                focus:outline-none focus:border-brand-cyan/40 focus:bg-ink-1/70
                focus:shadow-[0_0_0_3px_rgba(0,224,255,0.10)]"
            />
            <kbd
              className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 items-center gap-1
                rounded border border-themed-2 bg-ink-2 px-1.5 py-0.5
                font-mono text-[10px] text-text-mute md:inline-flex"
            >
              ⌘ K
            </kbd>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LanguageSwitcher />

          {/* Notifications */}
          <button
            aria-label="Notifications"
            className="relative rounded-lg p-2 text-text-dim transition-colors
              hover:bg-line/[0.06] hover:text-text
              focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40"
          >
            <Bell className="h-[18px] w-[18px]" />
            <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-cyan/60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-cyan" />
            </span>
          </button>

          {/* Profile */}
          <div className="ml-1 flex items-center gap-3 rounded-lg border border-themed bg-ink-1/40 px-2.5 py-1.5">
            <div className="relative">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-grad shadow-glow">
                <span className="text-[12px] font-bold text-white">{userInitials}</span>
              </div>
              <span
                aria-hidden
                className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400
                  ring-2 ring-ink-0"
              />
            </div>
            <div className="hidden text-left sm:block">
              <p className="text-[13px] font-medium leading-tight text-text">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="font-mono text-[10px] uppercase tracking-widest2 text-text-mute">
                {user?.role || 'admin'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
