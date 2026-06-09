 
import { Search, Sparkles, StickyNote, Wand2, BookOpen, LayoutGrid, BarChart3, History, Play, Square, CheckSquare, UserCircle, MoreHorizontal, ChevronDown, Lock } from 'lucide-react';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { getAvatarUrl } from '@/lib/pocketbase';
import { ThemeToggleButton } from '@/components/ui/ThemeToggleButton';
import { SimpleTooltip } from '@/components/ui/tooltip';
import { SearchPanel } from '@/components/panels/SearchPanel';
import { StatsPanel } from '@/components/panels/StatsPanel';
import { AiAssistantPanel } from '@/components/panels/AiAssistantPanel';
import { ChecklistPanel } from '@/components/panels/ChecklistPanel';
import { PanelErrorBoundary } from '@/components/ui/PanelErrorBoundary';
import { useTranslation } from 'react-i18next';
import { getTierLimits } from '@/lib/tierLimits';
import { UserAvatarButton } from '@/components/ui/UserAvatarButton';
import { useClickOutside } from '@/hooks/useClickOutside';
import { useCanvasStore } from "@/store/canvasStore";
import { useUiStore } from "@/store/uiStore";
import { useSimulationStore } from "@/store/simulationStore";
import { navBtnClass, NAV_BTN_STATIC, NavDivider } from './navHelpers';
import { UserMenuPopover } from '@/components/ui/UserMenuPopover';

export const FloatingNavBar = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const limits = getTierLimits(user?.tier);
  const setProfileModalOpen = useAuthStore((state) => state.setProfileModalOpen);
  const autoLayout = useCanvasStore((state) => state.autoLayout);
  const isSearchPanelOpen = useUiStore((state) => state.isSearchPanelOpen);
  const setSearchPanelOpen = useUiStore((state) => state.setSearchPanelOpen);
  const isStatsPanelOpen = useUiStore((state) => state.isStatsPanelOpen);
  const setStatsPanelOpen = useUiStore((state) => state.setStatsPanelOpen);
  const isTutorialActive = useUiStore((state) => state.isTutorialActive);
  const setTutorialActive = useUiStore((state) => state.setTutorialActive);
  const isViewMode = useCanvasStore((state) => state.isViewMode);
  const isVersionModalOpen = useCanvasStore((state) => state.isVersionModalOpen);
  const setVersionModalOpen = useCanvasStore((state) => state.setVersionModalOpen);
  const isSimulating = useSimulationStore((state) => state.isSimulating);
  const toggleSimulation = useSimulationStore((state) => state.toggleSimulation);
  const isAiPanelOpen = useUiStore((state) => state.isAiPanelOpen);
  const setAiPanelOpen = useUiStore((state) => state.setAiPanelOpen);
  const isChecklistPanelOpen = useUiStore((state) => state.isChecklistPanelOpen);
  const setChecklistPanelOpen = useUiStore((state) => state.setChecklistPanelOpen);
  const noteButtonRef = useRef<HTMLButtonElement>(null);
  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const langMenuRef = useRef<HTMLDivElement>(null);

  useClickOutside(userMenuRef, () => {
    if (isUserMenuOpen) setIsUserMenuOpen(false);
  });

  useClickOutside(langMenuRef, () => {
    if (isLangMenuOpen) setIsLangMenuOpen(false);
  });

  const panelMap = {
    ai:        { get: () => isAiPanelOpen,        set: setAiPanelOpen },
    search:    { get: () => isSearchPanelOpen,     set: setSearchPanelOpen },
    stats:     { get: () => isStatsPanelOpen,      set: setStatsPanelOpen },
    version:   { get: () => isVersionModalOpen,    set: setVersionModalOpen },
    checklist: { get: () => isChecklistPanelOpen,  set: setChecklistPanelOpen },
  } as const;

  const handleToggle = (panel: keyof typeof panelMap) => {
    const isCurrentlyOpen = panelMap[panel].get();
    // Close all panels
    for (const key of Object.keys(panelMap) as (keyof typeof panelMap)[]) {
      panelMap[key].set(key === panel ? !isCurrentlyOpen : false);
    }
  };

  return (
    <>
    <div className="absolute top-6 left-6 z-[120] tour-nav-bar hidden md:block">
      <div className="flex flex-col items-center bg-surface-nav rounded-[2rem] p-2 pb-2 shadow-xl gap-4 border border-transparent dark:border-white/5 max-h-[calc(100vh-48px)]">
        {/* Logo Section — always clickable, links to dashboard */}
        <SimpleTooltip content={<span className="text-brand-gold font-extrabold tracking-wider">flow.gryf.ai</span>} side="right">
          <a 
            href="/dashboard" 
            className="flex items-center justify-center w-full mt-2 hover:opacity-80 transition-opacity cursor-pointer"
          >
            <div className="w-8 h-8 shrink-0 gryf-logo-mask" />
          </a>
        </SimpleTooltip>

        <div className="flex flex-col items-center w-full gap-3 overflow-y-auto slim-scrollbar pb-1">
          <NavDivider />
          {/* AI Assistant Avatar — hide in view mode */}
          {!isViewMode && (
            <SimpleTooltip content={t('ai.title')} side="right">
              <div 
                id="tool-ai"
                className="flex items-center justify-center cursor-pointer group shrink-0"
                onClick={() => handleToggle('ai')}
              >
                <div className="relative w-10 h-10 shrink-0 rounded-full bg-surface-elevated group-hover:bg-secondary transition-colors overflow-hidden">
                  <div className="absolute inset-0 w-full h-full animate-pulse-scale">
                    <img 
                      src="/a1.webp" 
                      alt={t('aiExt.title')} 
                      className="absolute inset-0 w-full h-full object-cover animate-avatar-swap"
                    />
                    <div className="absolute inset-0 w-full h-full flex items-center justify-center text-brand-gold animate-sparkles-swap bg-surface-elevated group-hover:bg-secondary transition-colors">
                      <Sparkles size={20} className="fill-current stroke-none" />
                    </div>
                  </div>
                  {/* Overlay for ring to avoid clipping in overflow container */}
                  <div className={`absolute inset-0 rounded-full pointer-events-none transition-all ${isAiPanelOpen ? 'ring-2 ring-inset ring-brand-gold' : ''}`} />
                </div>
              </div>
            </SimpleTooltip>
          )}

          {!isViewMode && <NavDivider />}

          <SimpleTooltip content={t('nav.search')} side="right">
            <button 
              id="tool-search"
              onClick={() => handleToggle('search')}
              className={navBtnClass(isSearchPanelOpen)}
              aria-label={t('nav.search')}
            >
              <Search size={18} />
            </button>
          </SimpleTooltip>

          {/* Checklist — available in view mode too */}
          <SimpleTooltip content={t('nav.checklist')} side="right">
            <button 
              id="tool-checklist"
              onClick={() => handleToggle('checklist')}
              className={navBtnClass(isChecklistPanelOpen)}
              aria-label={t('nav.checklist')}
            >
              <CheckSquare size={18} />
            </button>
          </SimpleTooltip>

          {/* Stats — available in view mode too */}
          <SimpleTooltip content={limits.canUseAdvancedStats ? t('nav.stats') : t('tierLimits.statsLocked')} side="right">
            <button 
              id="tool-stats"
              onClick={() => limits.canUseAdvancedStats && handleToggle('stats')}
              className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center transition-colors border relative ${
                !limits.canUseAdvancedStats
                  ? 'bg-surface-elevated text-muted-foreground/40 border-transparent cursor-not-allowed'
                  : isStatsPanelOpen ? 'bg-surface-elevated text-brand-gold border-transparent' : 'bg-surface-elevated text-muted-foreground hover:text-foreground hover:bg-secondary border-transparent hover:border-border-hover'
              }`}
            >
              <BarChart3 size={18} />
              {!limits.canUseAdvancedStats && <Lock size={12} className="absolute -bottom-0.5 right-0 text-muted-foreground" />}
            </button>
          </SimpleTooltip>

          {!isViewMode && (
            <>

              <SimpleTooltip content={t('nav.versionHistory')} side="right">
                <button 
                  id="tool-version"
                  onClick={() => handleToggle('version')}
                  className={navBtnClass(isVersionModalOpen)}
                  aria-label={t('nav.versionHistory')}
                >
                  <History size={18} />
                </button>
              </SimpleTooltip>

              <NavDivider strong />

              {/* Canvas actions */}
              <SimpleTooltip content={!limits.canPresent ? t('tierLimits.simulationLocked') : isSimulating ? t('nav.stopSimulation') : t('nav.simulation')} side="right">
                <button 
                  id="tool-simulation"
                  onClick={() => {
                    if (!limits.canPresent) return;
                    if (isSimulating) {
                      toggleSimulation(null);
                    } else {
                      const nodes = useCanvasStore.getState().nodes;
                      const startNode = nodes.find(n => n.type === 'startstop' && n.data?.type === 'start');
                      toggleSimulation(startNode ? startNode.id : null);
                    }
                  }}
                  className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center transition-colors border relative ${
                    !limits.canPresent
                      ? 'bg-surface-elevated text-muted-foreground/40 border-transparent cursor-not-allowed'
                      : isSimulating ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-surface-elevated text-muted-foreground hover:text-foreground hover:bg-secondary border-transparent hover:border-border-hover'
                  }`}
                >
                  {isSimulating ? <Square size={16} fill="currentColor" /> : <Play size={18} className="ml-0.5" />}
                  {!limits.canPresent && <Lock size={12} className="absolute -bottom-0.5 right-0 text-muted-foreground" />}
                </button>
              </SimpleTooltip>

              <SimpleTooltip content={t('nav.autoLayout')} side="right">
                <button 
                  id="tool-autolayout"
                  onClick={autoLayout}
                  className={NAV_BTN_STATIC}
                  aria-label={t('nav.autoLayout')}
                >
                  <Wand2 size={18} />
                </button>
              </SimpleTooltip>

              <SimpleTooltip content={t('nav.addNote')} side="right">
                <button 
                  id="tool-note"
                  ref={noteButtonRef}
                  onClick={() => {
                    // Dispatch event with button rect — GryfCanvas handles flow coordinate conversion
                    const rect = noteButtonRef.current?.getBoundingClientRect();
                    window.dispatchEvent(new CustomEvent('addNoteFromNav', {
                      detail: {
                        screenX: rect ? rect.right + 24 : 200,
                        screenY: rect ? rect.top + rect.height / 2 : 200
                      }
                    }));
                  }}
                  className={NAV_BTN_STATIC}
                >
                  <StickyNote size={18} />
                </button>
              </SimpleTooltip>

              <NavDivider strong />

              {/* Utility */}
              <SimpleTooltip content={t('nav.tutorial')} side="right">
                <button 
                  id="tool-tutorial"
                  onClick={() => {
                    if (isTutorialActive) {
                      setTutorialActive(false);
                      localStorage.setItem('gryf-tutorial-completed', 'true');
                    } else {
                      localStorage.removeItem('gryf-tutorial-completed');
                      setTutorialActive(true);
                    }
                  }}
                  className={navBtnClass(isTutorialActive)}
                >
                  <BookOpen size={18} />
                </button>
              </SimpleTooltip>

              <SimpleTooltip content={t('canvas.backToDashboard')} side="right">
                <button 
                  id="tool-dashboard"
                  onClick={() => navigate('/dashboard')}
                  className={NAV_BTN_STATIC}
                >
                  <LayoutGrid size={18} />
                </button>
              </SimpleTooltip>
            </>
          )}

          {/* Theme toggle — available in view mode too */}
          <ThemeToggleButton />
        </div>

        {/* User Profile - Fixed at bottom, outside scrollable area */}
        {!isViewMode && (
          <div className="flex flex-col items-center w-full pt-1 gap-3">
            {/* Language Selector Popover */}
            <div className="relative flex justify-center items-center h-10 w-10 shrink-0" ref={langMenuRef}>
              <button 
                onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                className="cursor-pointer flex items-center gap-1 text-muted-foreground hover:text-brand-gold transition-colors text-xs font-bold uppercase"
              >
                <span>{i18n.language === 'en' ? 'EN' : 'PL'}</span>
                <ChevronDown size={14} className={`transition-transform duration-200 ${isLangMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Language Menu Popover */}
              {isLangMenuOpen && (
                <div className="absolute left-[calc(100%+12px)] bottom-0 bg-card border border-border rounded-xl shadow-2xl py-1.5 min-w-[120px] z-[150] animate-in fade-in slide-in-from-left-2 duration-150">
                  <button
                    onClick={() => {
                      localStorage.setItem('gryf-lang', 'pl');
                      i18n.changeLanguage('pl');
                      setIsLangMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${i18n.language !== 'en' ? 'text-brand-gold' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}
                  >
                    PL (Polski)
                  </button>
                  <button
                    onClick={() => {
                      localStorage.setItem('gryf-lang', 'en');
                      i18n.changeLanguage('en');
                      setIsLangMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${i18n.language === 'en' ? 'text-brand-gold' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}
                  >
                    EN (English)
                  </button>
                </div>
              )}
            </div>

            <NavDivider />

            <div className="relative shrink-0" ref={userMenuRef}>
              <SimpleTooltip content={t('common.user')} side="right">
                <UserAvatarButton 
                  user={user}
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                />
              </SimpleTooltip>

              {/* User Menu Popover */}
              {isUserMenuOpen && <UserMenuPopover onClose={() => setIsUserMenuOpen(false)} />}
            </div>
          </div>
        )}
      </div>
    </div>

    {/* Floating Panels — rendered outside hidden md:block container so they work on mobile */}
    <SearchPanel />
    <PanelErrorBoundary panelName="Stats">
      <StatsPanel />
    </PanelErrorBoundary>
    <PanelErrorBoundary panelName="AI Assistant">
      <AiAssistantPanel />
    </PanelErrorBoundary>
    <PanelErrorBoundary panelName="Checklist">
      <ChecklistPanel />
    </PanelErrorBoundary>

    {/* Mobile Bottom Navigation — visible only below md breakpoint */}
    <div className="fixed bottom-0 left-0 right-0 z-[120] md:hidden bg-surface-nav border-t border-border shadow-2xl">
      <div className="flex items-center justify-around px-2 py-2">
        <button
          onClick={() => navigate('/dashboard')}
          aria-label={t('canvas.backToDashboard')}
          className="flex items-center justify-center p-2 rounded-xl transition-colors text-muted-foreground hover:bg-secondary"
        >
          <LayoutGrid size={22} />
        </button>

        <button
          onClick={() => handleToggle('search')}
          aria-label={t('nav.search')}
          className={`flex items-center justify-center p-2 rounded-xl transition-colors ${isSearchPanelOpen ? 'text-brand-gold bg-brand-gold/10' : 'text-muted-foreground hover:bg-secondary'}`}
        >
          <Search size={22} />
        </button>

        {!isViewMode && (
          <button
            onClick={() => handleToggle('ai')}
            aria-label={t('ai.title')}
            className={`flex items-center justify-center p-2 rounded-xl transition-colors ${isAiPanelOpen ? 'text-brand-gold bg-brand-gold/10' : 'text-muted-foreground hover:bg-secondary'}`}
          >
            <Sparkles size={22} />
          </button>
        )}

        {!isViewMode && (
          <button
            onClick={autoLayout}
            aria-label={t('nav.autoLayout')}
            className="flex items-center justify-center p-2 rounded-xl transition-colors text-muted-foreground hover:bg-secondary"
          >
            <Wand2 size={22} />
          </button>
        )}

        {/* More menu — secondary actions */}
        <div className="relative">
          <button
            onClick={() => setIsMobileMoreOpen(!isMobileMoreOpen)}
            className={`flex items-center justify-center p-2 rounded-xl transition-colors ${isMobileMoreOpen ? 'text-brand-gold bg-brand-gold/10' : 'text-muted-foreground hover:bg-secondary'}`}
          >
            <MoreHorizontal size={22} />
          </button>

          {/* More menu popover */}
          {isMobileMoreOpen && (
            <>
              {/* Backdrop */}
              <div className="fixed inset-0 z-[90]" onClick={() => setIsMobileMoreOpen(false)} />
              <div className="absolute bottom-full right-0 mb-2 bg-card border border-border rounded-2xl shadow-2xl py-2 min-w-[200px] z-modal animate-in fade-in slide-in-from-bottom-2 duration-150">
                <button
                  onClick={() => { handleToggle('checklist'); setIsMobileMoreOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${isChecklistPanelOpen ? 'text-brand-gold' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}
                >
                  <CheckSquare size={16} />
                  {t('nav.checklist')}
                </button>

                  <button
                    onClick={() => { if (limits.canUseAdvancedStats) { handleToggle('stats'); setIsMobileMoreOpen(false); } }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors relative ${
                      !limits.canUseAdvancedStats 
                        ? 'text-muted-foreground/40 cursor-not-allowed' 
                        : isStatsPanelOpen ? 'text-brand-gold' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                    }`}
                  >
                    <div className="relative">
                      <BarChart3 size={16} />
                      {!limits.canUseAdvancedStats && <Lock size={12} className="absolute -bottom-0.5 right-0 text-muted-foreground" />}
                    </div>
                    {t('nav.stats')}
                  </button>

                {!isViewMode && (
                  <button
                    onClick={() => { handleToggle('version'); setIsMobileMoreOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${isVersionModalOpen ? 'text-brand-gold' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}
                  >
                    <History size={16} />
                    {t('nav.versionHistory')}
                  </button>
                )}

                <div className="mx-3 h-px bg-border my-1" />

                <button
                  onClick={() => {
                    const newLang = i18n.language === 'en' ? 'pl' : 'en';
                    localStorage.setItem('gryf-lang', newLang);
                    i18n.changeLanguage(newLang);
                  }}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  <span className="flex items-center gap-3">
                    <span className="font-bold text-xs">EN/PL</span>
                    {t('settings.language')}
                  </span>
                  <span className="text-brand-gold font-bold uppercase">{i18n.language === 'en' ? 'EN' : 'PL'}</span>
                </button>

                <div className="mx-3 h-px bg-border my-1" />

                <button
                  onClick={() => { setProfileModalOpen(true); setIsMobileMoreOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  {user?.avatar ? (
                    <img src={getAvatarUrl(user, 28)} alt="" className="w-5 h-5 rounded-full object-cover" />
                  ) : (
                    <UserCircle size={16} />
                  )}
                  {t('profile.editProfile')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
    </>
  );
};
