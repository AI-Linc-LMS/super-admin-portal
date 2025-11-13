import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  Menu,
  Bot,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { cn } from '../../utils/helpers';
import { ROUTES } from '../../utils/constants';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { logout } = useAuthStore();
  const { sidebarCollapsed, isMobile, sidebarOpen, toggleSidebar, setSidebarOpen } = useUIStore();
  const { t } = useTranslation();

  const navigation = [
    {
      name: t('navigation.dashboard'),
      href: ROUTES.DASHBOARD,
      icon: LayoutDashboard,
    },
    {
      name: t('navigation.clients'),
      href: ROUTES.CLIENTS,
      icon: Users,
    },
    {
      name: t('navigation.courses'),
      href: ROUTES.COURSES,
      icon: BookOpen,
    },
    {
      name: t('navigation.chatbots'),
      href: ROUTES.CHATBOTS,
      icon: Bot,
    },
    {
      name: t('navigation.settings'),
      href: ROUTES.SETTINGS,
      icon: Settings,
    },
  ];

  const handleLogout = () => {
    logout();
  };

  const sidebarVariants = {
    expanded: {
      width: isMobile ? '100%' : '16rem',
      transition: { duration: 0.3, ease: 'easeInOut' },
    },
    collapsed: {
      width: isMobile ? 0 : '5rem',
      transition: { duration: 0.3, ease: 'easeInOut' },
    },
  };

  const contentVariants = {
    expanded: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.2, delay: 0.1 },
    },
    collapsed: {
      opacity: 0,
      x: -20,
      transition: { duration: 0.2 },
    },
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
          className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <motion.aside
        variants={sidebarVariants}
        animate={isExpanded ? 'expanded' : 'collapsed'}
        className={cn(
          'fixed left-0 top-0 h-full z-50 flex flex-col',
          'bg-white/10 backdrop-blur-xl border-r border-white/20 shadow-glass',
          'transition-all duration-300 ease-in-out'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <AnimatePresence mode="wait">
            {isExpanded && (
              <motion.div
                variants={contentVariants}
                initial="collapsed"
                animate="expanded"
                exit="collapsed"
                className="flex items-center space-x-3"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">AI</span>
                </div>
                <div className="text-gray-900 font-bold text-lg">AI-Linc</div>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors duration-200"
          >
            {isMobile ? (
              <Menu className="w-5 h-5 text-gray-700" />
            ) : (
              <ChevronLeft
                className={cn(
                  'w-5 h-5 text-gray-700 transition-transform duration-300',
                  sidebarCollapsed && 'rotate-180'
                )}
              />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={() => isMobile && setSidebarOpen(false)}
                className={cn(
                  'flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 group',
                  'hover:bg-white/10 hover:shadow-glass-inset',
                  isActive && 'bg-primary-500/20 text-primary-700 shadow-glass-inset'
                )}
              >
                <item.icon
                  className={cn(
                    'w-5 h-5 transition-colors duration-200',
                    isActive ? 'text-primary-600' : 'text-gray-600 group-hover:text-gray-900'
                  )}
                />
                <AnimatePresence mode="wait">
                  {isExpanded && (
                    <motion.span
                      variants={contentVariants}
                      initial="collapsed"
                      animate="expanded"
                      exit="collapsed"
                      className={cn(
                        'ml-3 font-medium transition-colors duration-200',
                        isActive ? 'text-primary-700' : 'text-gray-700 group-hover:text-gray-900'
                      )}
                    >
                      {item.name}
                    </motion.span>
                  )}
                </AnimatePresence>
              </NavLink>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className={cn(
              'flex items-center w-full px-3 py-2.5 rounded-lg transition-all duration-200 group',
              'hover:bg-danger-500/10 hover:text-danger-600'
            )}
          >
            <LogOut className="w-5 h-5 text-gray-600 group-hover:text-danger-600 transition-colors duration-200" />
            <AnimatePresence mode="wait">
              {isExpanded && (
                <motion.span
                  variants={contentVariants}
                  initial="collapsed"
                  animate="expanded"
                  exit="collapsed"
                  className="ml-3 font-medium text-gray-700 group-hover:text-danger-600 transition-colors duration-200"
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

export default Sidebar;