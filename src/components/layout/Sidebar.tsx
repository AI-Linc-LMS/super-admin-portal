import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Settings,
  LogOut,
  ChevronLeft,
  Menu,
  Bot,
  Inbox,
  Sparkles,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { cn } from '../../utils/helpers';
import { ROUTES } from '../../utils/constants';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { logout } = useAuthStore();
  const { sidebarCollapsed, isMobile, sidebarOpen, toggleSidebar, setSidebarOpen } =
    useUIStore();
  const { t } = useTranslation();

  const navigation = [
    { name: t('navigation.dashboard'), href: ROUTES.DASHBOARD, icon: LayoutDashboard },
    { name: t('navigation.clients'), href: ROUTES.CLIENTS, icon: Users },
    { name: 'Tenant Requests', href: ROUTES.TENANT_REQUESTS, icon: Inbox },
    { name: t('navigation.courses'), href: ROUTES.COURSES, icon: BookOpen },
    { name: 'Adaptive Courses', href: ROUTES.ADAPTIVE_COURSES, icon: Sparkles },
    { name: t('navigation.chatbots'), href: ROUTES.CHATBOTS, icon: Bot },
    { name: t('navigation.settings'), href: ROUTES.SETTINGS, icon: Settings },
  ];

  const sidebarVariants = {
    expanded: {
      width: isMobile ? '100%' : '16rem',
      transition: { duration: 0.32, ease: [0.16, 1, 0.3, 1] },
    },
    collapsed: {
      width: isMobile ? 0 : '5rem',
      transition: { duration: 0.32, ease: [0.16, 1, 0.3, 1] },
    },
  };

  const contentVariants = {
    expanded: { opacity: 1, x: 0, transition: { duration: 0.22, delay: 0.08 } },
    collapsed: { opacity: 0, x: -10, transition: { duration: 0.18 } },
  };

  const isExpanded = isMobile ? sidebarOpen : !sidebarCollapsed;

  if (isMobile && !sidebarOpen) return null;

  return (
    <>
      {/* Mobile backdrop */}
      {isMobile && sidebarOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 bg-ink-0/70 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <motion.aside
        variants={sidebarVariants}
        animate={isExpanded ? 'expanded' : 'collapsed'}
        className={cn(
          'fixed left-0 top-0 z-50 flex h-full flex-col',
          'bg-ink-0/90 backdrop-blur-xl border-r border-themed',
          'overflow-hidden'
        )}
      >
        {/* Top gradient hairline */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px
            bg-gradient-to-r from-transparent via-brand-cyan/40 to-transparent"
        />
        {/* Vertical ambient glow */}
        <span
          aria-hidden
          className="pointer-events-none absolute -left-20 top-1/3 h-80 w-40
            rounded-full bg-brand-blue/20 blur-3xl"
        />

        {/* Brand header */}
        <div className="relative flex items-center justify-between border-b border-themed px-4 py-5">
          <AnimatePresence mode="wait">
            {isExpanded ? (
              <motion.div
                key="brand-full"
                variants={contentVariants}
                initial="collapsed"
                animate="expanded"
                exit="collapsed"
                className="flex items-center gap-3"
              >
                <BrandMark />
                <div className="leading-tight">
                  <div className="font-mono text-[10px] uppercase tracking-widest3 text-text-mute">
                    AI · Linc
                  </div>
                  <div className="text-[15px] font-semibold text-text">SuperAdmin</div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="brand-mini"
                variants={contentVariants}
                initial="collapsed"
                animate="expanded"
                exit="collapsed"
                className="mx-auto"
              >
                <BrandMark />
              </motion.div>
            )}
          </AnimatePresence>

          {isExpanded && (
            <button
              onClick={toggleSidebar}
              aria-label="Collapse sidebar"
              className="rounded-md p-1.5 text-text-mute transition-colors hover:bg-line/[0.06] hover:text-text
                focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40"
            >
              {isMobile ? <Menu className="h-5 w-5" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          )}
        </div>

        {/* Expand handle when collapsed */}
        {!isExpanded && !isMobile && (
          <button
            onClick={toggleSidebar}
            aria-label="Expand sidebar"
            className="mx-auto mt-2 flex h-7 w-7 items-center justify-center rounded-md
              text-text-mute transition-colors hover:bg-line/[0.06] hover:text-text"
          >
            <ChevronLeft className="h-4 w-4 rotate-180" />
          </button>
        )}

        {/* Nav */}
        <nav className="relative flex-1 px-3 py-4">
          <AnimatePresence mode="wait">
            {isExpanded && (
              <motion.p
                variants={contentVariants}
                initial="collapsed"
                animate="expanded"
                exit="collapsed"
                className="mb-2 px-3 font-mono text-[10px] uppercase tracking-widest3 text-text-mute"
              >
                Workspace
              </motion.p>
            )}
          </AnimatePresence>

          <ul className="space-y-1">
            {navigation.map((item) => {
              const isActive =
                location.pathname === item.href ||
                (item.href !== ROUTES.DASHBOARD &&
                  location.pathname.startsWith(item.href));
              return (
                <li key={item.name}>
                  <NavLink
                    to={item.href}
                    onClick={() => isMobile && setSidebarOpen(false)}
                    className={cn(
                      'group relative flex items-center rounded-lg border border-transparent',
                      'px-3 py-2.5 text-[14px] font-medium transition-all duration-200',
                      'hover:bg-line/[0.04] hover:text-text',
                      isActive
                        ? 'nav-active'
                        : 'text-text-dim',
                      !isExpanded && 'justify-center px-0'
                    )}
                  >
                    {/* Active rail */}
                    {isActive && (
                      <span
                        aria-hidden
                        className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full
                          bg-brand-cyan shadow-[0_0_10px_rgba(0,224,255,0.6)]"
                      />
                    )}

                    <item.icon
                      className={cn(
                        'h-[18px] w-[18px] shrink-0 transition-colors duration-200',
                        isActive
                          ? 'text-brand-cyan'
                          : 'text-text-mute group-hover:text-text'
                      )}
                    />

                    <AnimatePresence mode="wait">
                      {isExpanded && (
                        <motion.span
                          variants={contentVariants}
                          initial="collapsed"
                          animate="expanded"
                          exit="collapsed"
                          className="ml-3 truncate"
                        >
                          {item.name}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer / logout */}
        <div className="relative border-t border-themed px-3 py-4">
          <button
            onClick={logout}
            className={cn(
              'group flex w-full items-center rounded-lg border border-transparent',
              'px-3 py-2.5 text-[14px] font-medium text-text-dim',
              'transition-all duration-200',
              'hover:bg-danger-500/10 hover:text-danger-500 hover:border-danger-500/20',
              !isExpanded && 'justify-center px-0'
            )}
          >
            <LogOut className="h-[18px] w-[18px] text-text-mute group-hover:text-danger-500 transition-colors" />
            <AnimatePresence mode="wait">
              {isExpanded && (
                <motion.span
                  variants={contentVariants}
                  initial="collapsed"
                  animate="expanded"
                  exit="collapsed"
                  className="ml-3"
                >
                  {t('navigation.logout')}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </motion.aside>
    </>
  );
};

const BrandMark: React.FC = () => (
  <div className="relative grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-xl bg-brand-grad shadow-[0_8px_24px_-8px_rgba(0,224,255,0.55)]">
    <img
      src="/ai-linc-mark-white.svg"
      alt="AI Linc"
      width={22}
      height={22}
      className="relative h-[22px] w-[22px]"
      style={{ filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.25))' }}
    />
  </div>
);

export default Sidebar;
