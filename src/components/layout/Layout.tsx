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
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [setIsMobile]);

  const sidebarWidth = isMobile ? 0 : sidebarCollapsed ? '5rem' : '16rem';

  return (
    <div className="relative min-h-screen bg-ink-0 text-text overflow-hidden">
      {/* Ambient page background — twin radial glows */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            'radial-gradient(50% 40% at 85% 0%, rgba(0,224,255,0.08) 0%, transparent 60%),' +
            'radial-gradient(45% 35% at 0% 100%, rgba(35,86,214,0.12) 0%, transparent 60%)',
        }}
      />
      <div aria-hidden className="grain" />

      <Sidebar />

      <div
        className={cn('relative z-10 transition-[margin] duration-300 ease-out')}
        style={!isMobile ? { marginLeft: sidebarWidth } : {}}
      >
        <Header />

        <main className="px-5 py-6 md:px-8 md:py-8">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto max-w-[1400px]"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
