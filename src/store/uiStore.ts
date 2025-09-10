import { create } from 'zustand';

interface UIState {
  sidebarCollapsed: boolean;
  isMobile: boolean;
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setIsMobile: (mobile: boolean) => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  isMobile: false,
  sidebarOpen: false,
  
  toggleSidebar: () => set((state) => ({ 
    sidebarCollapsed: !state.sidebarCollapsed 
  })),
  
  setSidebarCollapsed: (collapsed: boolean) => set({ sidebarCollapsed: collapsed }),
  
  setIsMobile: (mobile: boolean) => set({ 
    isMobile: mobile,
    sidebarOpen: mobile ? false : true
  }),
  
  setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),
}));

export default useUIStore;