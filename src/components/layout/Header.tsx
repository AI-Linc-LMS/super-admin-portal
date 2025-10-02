import React from 'react';
import { Bell, Search, User, Menu } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { generateInitials } from '../../utils/helpers';
import Button from '../ui/Button';
import LanguageSwitcher from '../ui/LanguageSwitcher';

const Header: React.FC = () => {
  const { user } = useAuthStore();
  const { isMobile, setSidebarOpen } = useUIStore();
  const { t } = useTranslation();

  const userInitials = user 
    ? generateInitials(user.first_name, user.last_name)
    : 'SA';

  return (
    <header className="bg-white/10 backdrop-blur-md border-b border-white/20 shadow-glass sticky top-0 z-30">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center space-x-4">
          {isMobile && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(true)}
              leftIcon={<Menu className="w-5 h-5" />}
            />
          )}
          
          <div className="relative max-w-md w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder={t('common.search')}
              className="block w-full pl-10 pr-3 py-2 border border-white/20 rounded-lg bg-white/10 backdrop-blur-sm placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Language Switcher */}
          <LanguageSwitcher />

          {/* Notifications */}
          <button className="relative p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-white/10 transition-colors duration-200">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-danger-500 rounded-full"></span>
          </button>

          {/* User Profile */}
          <div className="flex items-center space-x-3">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-gray-900">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
            </div>
            <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-white">{userInitials}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;