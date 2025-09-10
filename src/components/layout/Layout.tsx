import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import Sidebar from './Sidebar';
import Header from './Header';
import { useUIStore } from '../../store/uiStore';
import { cn } from '../../utils/helpers';

const Layout: React.FC = () => {
  const { sidebarCollapsed, isMobile, setIsMobile } = useUIStore();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [setIsMobile]);

  const sidebarWidth = isMobile ? 0 : sidebarCollapsed ? '5rem' : '16rem';

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50">
      <Sidebar />
      
      <div
        className={cn(
          'transition-all duration-300 ease-in-out',
          !isMobile && 'ml-64',
          !isMobile && sidebarCollapsed && 'ml-20'
        )}
        style={!isMobile ? { marginLeft: sidebarWidth } : {}}
      >
        <Header />
        
        <main className="p-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="max-w-7xl mx-auto"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default Layout;