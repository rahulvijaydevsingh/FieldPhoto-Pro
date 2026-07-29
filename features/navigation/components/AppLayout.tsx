import React, { useMemo, useState } from 'react';
import { 
  LayoutDashboard, 
  Camera, 
  Image as ImageIcon, 
  Users, 
  LogOut, 
  HardHat, 
  ChevronRight, 
  CalendarCheck, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  User as UserIcon,
  Navigation,
  BarChart3,
  ShieldAlert,
  Gauge,
  Shield,
  Menu,
  X
} from 'lucide-react';
import { useAppStore } from '../../../stores/useAppStore';
import { View } from '../../../types';

import AlertCircleIcon from '../../../components/icons/AlertCircleIcon';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const currentUser = useAppStore(s => s.currentUser);
  const currentView = useAppStore(s => s.currentView);
  const navigateTo = useAppStore(s => s.navigateTo);
  const cycleTheme = useAppStore(s => s.cycleTheme);
  const isOnline = useAppStore(s => s.isOnline);
  const isSyncing = useAppStore(s => s.isSyncing);
  const setOnline = useAppStore(s => s.setOnline);
  const photos = useAppStore(s => s.photos);
  const handleLogout = useAppStore(s => s.handleLogout);

  const pendingCount = useMemo(() => 
    photos.filter(p => p.status === 'new' && (currentUser?.role === 'admin' || p.uploaderId === currentUser?.id)).length, 
  [photos, currentUser]);

  const pendingSyncCount = useMemo(() => 
    photos.filter(p => p.syncStatus === 'pending').length,
  [photos]);

  if (!currentUser) return null;

  const NavItem = ({ view, icon: Icon, label, badge }: { view: View; icon: any; label: string; badge?: number }) => (
    <button
      onClick={() => {
        navigateTo(view);
        setIsMobileDrawerOpen(false);
      }}
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors mb-1 ${
        currentView === view 
          ? 'bg-field-gold/10 text-field-gold border-r-2 border-field-gold' 
          : 'text-field-textMuted hover:bg-white/5 hover:text-white'
      }`}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
      {badge ? (
        <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
          {badge}
        </span>
      ) : null}
    </button>
  );

  return (
    <div className="min-h-screen bg-field-bg text-field-text flex flex-col md:flex-row">
      
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col fixed inset-y-0 left-0 z-20 w-64 bg-field-card border-r border-[#3A2E2E]">
        <div className="p-6 border-b border-[#3A2E2E]">
          <h1 className="text-xl font-bold text-field-gold flex items-center gap-2">
            <HardHat className="w-6 h-6 text-field-gold" />
            FieldTrack
          </h1>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          <div 
            onClick={() => navigateTo('profile')}
            className="flex items-center space-x-3 mb-6 p-3 bg-[#1A1515] hover:bg-[#251e1e] rounded-xl border border-[#3A2E2E] hover:border-field-gold/40 cursor-pointer transition-all group"
            title="Click to view and edit profile"
          >
            <img src={currentUser.avatar} alt="User" className="w-10 h-10 rounded-full border-2 border-field-gold object-cover group-hover:scale-105 transition-transform" />
            <div className="overflow-hidden flex-1">
              <p className="text-sm font-semibold truncate text-white group-hover:text-field-gold transition-colors">
                {currentUser.role === 'admin' ? `${currentUser.name} (Admin)` : currentUser.name}
              </p>
              <p className="text-xs text-field-gold uppercase tracking-wider text-[10px]">
                {currentUser.role === 'admin' ? 'Admin Level' : 'Staff Member'}
              </p>
            </div>
            <ChevronRight size={16} className="text-gray-500 group-hover:text-field-gold transition-colors" />
          </div>
          
          {/* Connectivity Status */}
          <div className="mb-6 px-1">
             <button 
               onClick={() => setOnline(!isOnline)}
               className={`w-full flex items-center justify-between p-2 rounded-lg border text-xs font-bold transition-all ${isOnline ? 'bg-green-500/10 border-green-500/30 text-green-500' : 'bg-red-500/10 border-red-500/30 text-red-500'}`}
             >
                <div className="flex items-center gap-2">
                   {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
                   {isOnline ? 'Online' : 'Offline Mode'}
                </div>
                {isSyncing && <RefreshCw size={14} className="animate-spin text-field-gold"/>}
             </button>
             {pendingSyncCount > 0 && (
                <div className="mt-2 text-[10px] text-gray-500 flex justify-between">
                   <span>Pending Sync:</span>
                   <span className="text-field-gold font-bold">{pendingSyncCount} items</span>
                </div>
             )}
          </div>

          {/* Theme Mode Quick Switcher */}
          <div className="mb-4 px-1">
             <button 
               onClick={cycleTheme}
               className="w-full flex items-center justify-between p-2 rounded-lg border border-[#3A2E2E] bg-[#1A1515] hover:border-field-gold/40 text-xs font-bold transition-all text-gray-300"
               title="Click to toggle theme mode anytime"
             >
                <span className="text-[10px] uppercase text-gray-500 tracking-wider">Display Theme:</span>
                <span className="text-field-gold font-bold flex items-center gap-1.5">
                  {currentUser.themePreference === 'light' ? '☀️ Light Mode' : currentUser.themePreference === 'high-contrast' ? '🔆 Outdoor Sun' : '🌙 Dark Mode'}
                </span>
             </button>
          </div>

          <nav className="space-y-1">
            <NavItem view="dashboard" icon={LayoutDashboard} label="Dashboard" />
            <NavItem view="upload" icon={Camera} label="Capture Upload" />
            <NavItem view="gallery" icon={ImageIcon} label="Photo Gallery" />
            <NavItem view="followups" icon={CalendarCheck} label="Follow-ups" />
            <NavItem view="pending" icon={AlertCircleIcon} label="Pending Review" badge={pendingCount > 0 ? pendingCount : undefined} />
            <NavItem view="odometer" icon={Gauge} label="Odometer & Mileage" />
            {currentUser.role === 'admin' && (
              <>
                <NavItem view="route_tracker" icon={Navigation} label="Live Route Tracker" />
                <NavItem view="admin" icon={Shield} label="Admin Panel" />
              </>
            )}
          </nav>
        </div>

        <div className="p-4 border-t border-[#3A2E2E]">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="md:hidden sticky top-0 z-30 bg-[#1A1515] border-b border-[#3A2E2E] px-4 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsMobileDrawerOpen(!isMobileDrawerOpen)}
            className="p-1.5 rounded-lg bg-[#2D2424] border border-[#3A2E2E] text-white hover:text-field-gold transition-colors"
            aria-label="Toggle menu"
          >
            {isMobileDrawerOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => navigateTo('dashboard')}>
            <HardHat size={20} className="text-field-gold" />
            <span className="font-bold text-white text-base tracking-wide">FieldTrack</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => { navigateTo('odometer'); setIsMobileDrawerOpen(false); }}
            className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1 transition-all ${
              currentView === 'odometer' 
                ? 'bg-field-gold text-black border-field-gold shadow' 
                : 'border-[#3A2E2E] bg-[#2D2424] text-field-gold hover:bg-[#3A2E2E]'
            }`}
          >
            <Gauge size={14} />
            <span>Odometer</span>
          </button>

          <button 
            onClick={cycleTheme}
            className="p-1.5 rounded-lg border border-[#3A2E2E] bg-[#2D2424] text-[11px] font-bold text-field-gold flex items-center gap-1"
            title="Switch Theme"
          >
            {currentUser.themePreference === 'light' ? '☀️' : currentUser.themePreference === 'high-contrast' ? '🔆' : '🌙'}
          </button>
          <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-red-500'}`} title={isOnline ? 'Online' : 'Offline'}></div>
        </div>
      </header>

      {/* Mobile Drawer Overlay */}
      {isMobileDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setIsMobileDrawerOpen(false)}
          />
          <div className="relative w-72 max-w-[80vw] bg-[#1A1515] border-r border-[#3A2E2E] h-full flex flex-col p-4 shadow-2xl z-10 overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#3A2E2E] mb-3">
              <div className="flex items-center gap-2">
                <HardHat className="w-5 h-5 text-field-gold" />
                <span className="font-bold text-white text-base">FieldTrack Menu</span>
              </div>
              <button 
                onClick={() => setIsMobileDrawerOpen(false)}
                className="p-1 text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div 
              onClick={() => { navigateTo('profile'); setIsMobileDrawerOpen(false); }}
              className="flex items-center space-x-3 mb-4 p-3 bg-[#2D2424] rounded-xl border border-[#3A2E2E] cursor-pointer"
            >
              <img src={currentUser.avatar} alt="User" className="w-9 h-9 rounded-full border-2 border-field-gold object-cover" />
              <div className="overflow-hidden flex-1">
                <p className="text-xs font-semibold truncate text-white">{currentUser.name}</p>
                <p className="text-[10px] text-field-gold uppercase font-mono">{currentUser.role === 'admin' ? 'Admin' : 'Field Staff'}</p>
              </div>
              <ChevronRight size={14} className="text-gray-400" />
            </div>

            <nav className="space-y-1 flex-1">
              <NavItem view="dashboard" icon={LayoutDashboard} label="Dashboard" />
              <NavItem view="odometer" icon={Gauge} label="Odometer & Mileage" />
              <NavItem view="upload" icon={Camera} label="Capture Upload" />
              <NavItem view="gallery" icon={ImageIcon} label="Photo Gallery" />
              <NavItem view="followups" icon={CalendarCheck} label="Follow-ups" />
              <NavItem view="pending" icon={AlertCircleIcon} label="Pending Review" badge={pendingCount > 0 ? pendingCount : undefined} />
              <NavItem view="escalations" icon={ShieldAlert} label="Lead Escalations" />
              {currentUser.role === 'admin' && (
                <>
                  <NavItem view="route_tracker" icon={Navigation} label="Live Route Tracker" />
                  <NavItem view="admin" icon={Shield} label="Admin Panel" />
                </>
              )}
            </nav>

            <div className="pt-3 border-t border-[#3A2E2E] mt-4">
              <button 
                onClick={handleLogout}
                className="w-full flex items-center space-x-3 px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors text-xs font-medium"
              >
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 md:ml-64 overflow-y-auto h-[calc(100vh-80px)] md:h-screen p-0 md:p-8 pb-24 md:pb-8">
        <div className="max-w-5xl mx-auto">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#1A1515] border-t border-[#3A2E2E] px-4 py-2 pb-5 flex justify-between items-center z-30">
        <button 
          onClick={() => navigateTo('dashboard')}
          className={`flex flex-col items-center gap-1 ${currentView === 'dashboard' ? 'text-field-gold' : 'text-gray-500'}`}
        >
          <div className={`p-1.5 rounded-xl ${currentView === 'dashboard' ? 'bg-[#2D2424]' : ''}`}>
            <LayoutDashboard size={22} />
          </div>
          <span className="text-[10px] font-medium">Home</span>
        </button>

        <button 
          onClick={() => navigateTo('odometer')}
          className={`flex flex-col items-center gap-1 ${currentView === 'odometer' ? 'text-field-gold' : 'text-gray-500'}`}
        >
          <div className={`p-1.5 rounded-xl ${currentView === 'odometer' ? 'bg-[#2D2424]' : ''}`}>
            <Gauge size={22} />
          </div>
          <span className="text-[10px] font-medium">Odometer</span>
        </button>

        {/* Floating Action Button for Upload */}
        <button 
           onClick={() => navigateTo('upload')}
           className="relative -top-4"
        >
           <div className="w-14 h-14 rounded-full bg-field-gold text-[#1A1515] flex flex-col items-center justify-center shadow-[0_0_20px_rgba(217,144,38,0.4)] border-4 border-[#1A1515]">
              <Camera size={24} />
              <span className="text-[9px] font-bold mt-0.5">Upload</span>
           </div>
        </button>

        <button 
          onClick={() => navigateTo('gallery')}
          className={`flex flex-col items-center gap-1 ${currentView === 'gallery' ? 'text-field-gold' : 'text-gray-500'}`}
        >
          <div className={`p-1.5 rounded-xl ${currentView === 'gallery' ? 'bg-[#2D2424]' : ''}`}>
             <ImageIcon size={22} />
          </div>
          <span className="text-[10px] font-medium">Gallery</span>
        </button>

        <button 
          onClick={() => setIsMobileDrawerOpen(true)}
          className={`flex flex-col items-center gap-1 ${isMobileDrawerOpen ? 'text-field-gold' : 'text-gray-500'}`}
        >
           <div className="p-1.5 rounded-xl">
             <Menu size={22} />
          </div>
          <span className="text-[10px] font-medium">Menu</span>
        </button>
      </div>

    </div>
  );
}
