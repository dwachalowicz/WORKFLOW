import { useTranslation } from 'react-i18next';
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { pb, getAvatarUrl } from '@/lib/pocketbase';
import { exportGlobalBackup, importGlobalBackup } from '@/lib/backupService';
import { Upload, Loader2, Camera, ChevronDown, Trash2, Crown, Download, UploadCloud, Sparkles } from 'lucide-react';
import Cropper from 'react-easy-crop';
import { getAiUserConfig, fetchAiModels, type AiModelOption } from '@/lib/aiService';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getTierLabel, getTierColor, getTierBgColor, getTierLimits, formatLimit } from '@/lib/tierLimits';
import { ModalOverlay, ModalContainer, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/ModalWrapper';
import { SimpleTooltip } from '@/components/ui/tooltip';
import { TierComparisonModal } from '@/components/modals/TierComparisonModal';
import { DeleteAccountModal } from '@/components/modals/DeleteAccountModal';
import { useToastStore } from '@/store/toastStore';
import { useConfirmStore } from '@/store/confirmStore';

import { getCroppedImg } from '@/lib/imageUtils';
import { useClickOutside } from '@/hooks/useClickOutside';

export const ProfileModal = () => {
  const { t } = useTranslation();
  const { user, isProfileModalOpen, setProfileModalOpen, checkAuth } = useAuthStore();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingDeleteAvatar, setPendingDeleteAvatar] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);

  // Cropper state
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  // AI state
  const [aiProvider, setAiProvider] = useState<'openai' | 'openrouter'>('openai');
  const [aiKey, setAiKey] = useState('');
  const [aiModel, setAiModel] = useState('gpt-4o-mini');
  const [aiTemperature, setAiTemperature] = useState(0.7);
  const [aiMemoryLength, setAiMemoryLength] = useState<number | null>(null);
  const [hasOwnKey, setHasOwnKey] = useState(false);
  const [isRemovingKey, setIsRemovingKey] = useState(false);

  // Model catalog
  const [modelOptions, setModelOptions] = useState<AiModelOption[]>([]);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [customModel, setCustomModel] = useState('');
  const modelDropdownRef = useRef<HTMLDivElement>(null);
  const [showComparison, setShowComparison] = useState(false);

  const tier = user?.tier || 'FREE';
  const tierLimits = getTierLimits(tier);
  const isFree = tierLimits.aiAccess === 'none';

  const loadAiConfig = useCallback(async () => {
    if (!user) return;
    const config = await getAiUserConfig(user.id);
    if (config) {
      setAiProvider(config.provider);
      setAiModel(config.model || 'gpt-4o-mini');
      setAiTemperature(config.temperature ?? 0.7);
      setAiMemoryLength(config.memoryLength ?? null);
      setHasOwnKey(config.hasKey);
      setAiKey('');
    }
  }, [user]);

  useEffect(() => {
    if (isProfileModalOpen && user) {
      const timer = setTimeout(() => {
        loadAiConfig();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isProfileModalOpen, user, loadAiConfig]);

  // Load model catalog when provider changes
  useEffect(() => {
    fetchAiModels(aiProvider).then(setModelOptions);
  }, [aiProvider]);

  useClickOutside(modelDropdownRef, () => {
    if (isModelDropdownOpen) setIsModelDropdownOpen(false);
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImageSrc(reader.result?.toString() || null);
      });
      reader.readAsDataURL(file);
    }
  };

  const onCropComplete = useCallback((_: unknown, croppedAreaPixels: Record<string, number>) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', name);

      if (pendingDeleteAvatar) {
        formData.append('avatar', '');
      } else if (imageSrc && croppedAreaPixels) {
        const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels, 100);
        formData.append('avatar', croppedImageBlob, 'avatar.webp');
      }

      // Save AI config via server-side endpoint (hidden fields can't be written from client)
      try {
        await pb.send('/api/ai/save-config', {
          method: 'POST',
          body: {
            ai_provider: aiProvider,
            ai_model: aiModel,
            ai_temperature: aiTemperature,
            ai_custom_memory: aiMemoryLength,
            ...(aiKey && aiKey.trim() ? { ai_api_secret: aiKey.trim() } : {}),
          },
        });
      } catch (aiErr) {
        console.warn('Could not save AI config (endpoint may not be deployed yet):', aiErr);
      }

      await pb.collection('WORKFLOW_users').update(user.id, formData);

      await checkAuth(); // Refresh user state
      useToastStore.getState().showToast(t('profile.saved'), 'success');
      setPendingDeleteAvatar(false);
      setProfileModalOpen(false);
    } catch (err) {
      console.error('Error saving profile:', err);
      useToastStore.getState().showToast(t('errors.profileSaveFail'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveKey = async () => {
    if (!user) return;
    const confirmed = await useConfirmStore.getState().confirm({
      title: t('settingsTab.removeKeyConfirm'),
      confirmLabel: t('common.confirm'),
      cancelLabel: t('common.cancel'),
    });
    if (!confirmed) return;
    setIsRemovingKey(true);
    try {
      await pb.send('/api/ai/save-config', {
        method: 'POST',
        body: { ai_api_secret: '' },
      });
      setHasOwnKey(false);
      setAiKey('');
    } catch (err) {
      console.error('Error removing API key:', err);
    } finally {
      setIsRemovingKey(false);
    }
  };

  const handleExportBackup = async () => {
    if (!user) return;
    setIsExporting(true);
    try {
      await exportGlobalBackup(user.id);
      useToastStore.getState().showToast(t('settingsTab.exportSuccess'), 'success');
    } catch (err) {
      console.error('Export error:', err);
      useToastStore.getState().showToast(t('common.error'), 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    
    const confirmed = await useConfirmStore.getState().confirm({
      title: t('settingsTab.importConfirmTitle'),
      message: t('settingsTab.importConfirmDesc'),
      confirmLabel: t('settingsTab.importZip'),
      cancelLabel: t('common.cancel'),
    });

    if (!confirmed) {
      if (backupInputRef.current) backupInputRef.current.value = '';
      return;
    }

    setIsImporting(true);
    try {
      await importGlobalBackup(file, user.id);
      useToastStore.getState().showToast(t('settingsTab.importSuccess'), 'success');
      // Refresh to load all workspaces correctly after a short delay so the toast is visible
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      console.error('Import error:', err);
      useToastStore.getState().showToast(t('settingsTab.importError'), 'error');
    } finally {
      setIsImporting(false);
      if (backupInputRef.current) backupInputRef.current.value = '';
    }
  };

  const handleEmailChange = async () => {
    if (!email || email === user?.email) return;
    setIsChangingEmail(true);
    try {
      await pb.collection('WORKFLOW_users').requestEmailChange(email);
      useToastStore.getState().showToast(t('profile.emailChangeSent'), 'success');
    } catch (e) {
      useToastStore.getState().showToast((e as Error).message || t('common.error'), 'error');
    } finally {
      setIsChangingEmail(false);
    }
  };

  const handleClose = () => {
    setProfileModalOpen(false);
    setImageSrc(null);
    setEmail(user?.email || '');
  };

  if (!isProfileModalOpen || !user) return null;

  // Find the label for the currently selected model
  const currentModelLabel = modelOptions.find(m => m.modelId === aiModel)?.label;
  const filteredModels = customModel
    ? modelOptions.filter(m => m.label.toLowerCase().includes(customModel.toLowerCase()) || m.modelId.toLowerCase().includes(customModel.toLowerCase()))
    : modelOptions;

  return (
    <ModalOverlay isOpen={isProfileModalOpen} onClose={handleClose}>
      <ModalContainer size="xl">
        <ModalHeader
          title={t('ui.editProfile')}
          onClose={handleClose}
        />

        <ModalBody className="px-6 py-4">
          {/* Avatar Section */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-8">
            <div className="relative group shrink-0">
              {imageSrc ? (
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-card shadow-lg ring-2 ring-brand-gold/50">
                  <div className="w-full h-full relative">
                    <Cropper
                      image={imageSrc}
                      crop={crop}
                      zoom={zoom}
                      aspect={1}
                      cropShape="round"
                      onCropChange={setCrop}
                      onZoomChange={setZoom}
                      onCropComplete={onCropComplete}
                    />
                  </div>
                </div>
              ) : (
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-card shadow-lg ring-2 ring-brand-gold/30 bg-secondary">
                  {user.avatar ? (
                    <img loading="lazy" src={getAvatarUrl(user)} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl text-brand-gold font-bold">
                      {user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-brand-gold text-background flex items-center justify-center shadow-md hover:scale-110 transition-transform"
                title={t('profile.changeAvatar')}
              >
                <Camera size={16} />
              </button>
            </div>

            <div className="flex-1 w-full space-y-5">
              <div className="grid gap-1.5">
                <label className="text-sm font-semibold text-foreground">{t('profile.displayName')}</label>
                <Input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder={t('profile.namePlaceholder')}
                  className="max-w-md bg-secondary/30"
                />
              </div>
              
              <div className="grid gap-1.5">
                <label className="text-sm font-semibold text-foreground">{t('profile.email')}</label>
                <div className="flex flex-wrap sm:flex-nowrap gap-2 max-w-md">
                  <Input
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="twój@email.com"
                    className="bg-secondary/30"
                  />
                  <Button 
                    onClick={handleEmailChange} 
                    disabled={email === user.email || isChangingEmail}
                    variant="secondary"
                    className="shrink-0"
                  >
                    {isChangingEmail ? <Loader2 size={14} className="animate-spin" /> : t('profile.changeEmail')}
                  </Button>
                </div>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handleFileChange}
            />
          </div>

          {/* Avatar actions */}
          {imageSrc && (
            <div className="flex items-center gap-3 mt-4 bg-secondary/20 p-3 rounded-xl max-w-md">
              <label className="text-xs font-semibold text-muted-foreground">{t('profile.zoom')}</label>
              <Slider
                value={[zoom]}
                onValueChange={([v]) => setZoom(v)}
                min={1}
                max={3}
                step={0.1}
                className="flex-1"
              />
              <button
                onClick={() => setImageSrc(null)}
                className="text-xs font-semibold text-destructive hover:text-destructive/80 transition-colors ml-2"
              >
                {t('common.cancel')}
              </button>
            </div>
          )}

          {user.avatar && !imageSrc && (
            <div className="mt-3 flex">
              <button
                type="button"
                onClick={() => setPendingDeleteAvatar(!pendingDeleteAvatar)}
                className={`flex items-center gap-2 text-xs transition-colors px-3 py-1.5 rounded-lg ${
                  pendingDeleteAvatar
                    ? 'bg-destructive/10 text-destructive font-bold'
                    : 'text-muted-foreground hover:bg-secondary hover:text-destructive'
                }`}
              >
                <Trash2 size={14} />
                {t('profile.removeAvatar')}
                {pendingDeleteAvatar && (
                  <span className="text-[10px] bg-destructive text-white px-1.5 py-0.5 rounded-full ml-1">
                    {t('common.pendingSave')}
                  </span>
                )}
              </button>
            </div>
          )}

          <div className="w-full h-px bg-border/40 my-8" />

          {/* Tier info */}
          {(() => {
            const limits = getTierLimits(tier);
            return (
              <>
                <div className={`flex flex-col gap-3 p-5 sm:p-6 rounded-2xl border border-border/30 shadow-sm ${getTierBgColor(tier)}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t('ui.yourPlan', 'Twój Plan')}</span>
                      <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${getTierColor(tier)} ${getTierBgColor(tier)} ring-1 ring-inset ring-brand-gold/20 flex items-center`}>
                        {getTierLabel(tier)}
                      </span>
                      <span className="text-xs font-bold text-white/90 bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-sm flex items-center">
                        {user.tierExpiresAt 
                          ? t('profile.validUntil', { date: new Date(user.tierExpiresAt).toLocaleDateString() })
                          : t('profile.validLifetime')}
                      </span>
                    </div>
                    <button
                      onClick={() => setShowComparison(true)}
                      className="flex items-center gap-1.5 text-xs font-bold text-brand-gold hover:text-brand-gold/80 transition-colors bg-brand-gold/10 px-3 py-1.5 rounded-full hover:bg-brand-gold/20"
                    >
                      <Crown size={14} />
                      {t('tierCompare.comparePlans', 'Porównaj plany')}
                    </button>
                  </div>
                  <div className="h-px w-full bg-border/30 my-1" />
                  <p className="text-xs text-muted-foreground/90 leading-relaxed font-medium">
                    {limits.maxWorkspaces} workspace · {formatLimit(limits.maxProcesses)} {t('profile.processes')} · {formatLimit(limits.maxNodesPerProcess)} {t('profile.nodesPerProcess')} · {limits.maxMembersPerWorkspace} {t('profile.membersPerWs')} · {limits.maxVersionsPerProcess} {t('profile.versionsPerProcess')} · AI: {isFree ? t('profile.aiNone') : 'BYOK'}
                  </p>
                </div>

                <TierComparisonModal
                  isOpen={showComparison}
                  onClose={() => setShowComparison(false)}
                  currentTier={tier}
                />
              </>
            );
          })()}

          {/* AI Assistant Section */}
          <div className={`p-5 sm:p-6 rounded-2xl border border-border/50 shadow-sm mt-8 ${isFree ? 'bg-secondary/20 opacity-70' : 'bg-card/50'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-brand-gold/10 rounded-lg text-brand-gold">
                   <Sparkles size={18} />
                </div>
                <h2 className="text-lg font-bold text-foreground">{t('settingsTab.aiAssistantTitle')}</h2>
                {!isFree && hasOwnKey && <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full ring-1 ring-inset ring-emerald-500/20">{t('settingsTab.active')}</span>}
              </div>
            </div>
            
            {isFree ? (
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                {t('profile.aiNone')} — {t('profile.aiNoneUpgrade')}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground mb-8 leading-relaxed max-w-2xl">
                {t('profile.aiConfigDesc')}
              </p>
            )}

            <div className={`flex flex-col gap-6 ${isFree ? 'pointer-events-none opacity-50' : ''}`}>
              {/* Provider */}
              <div className="flex flex-col">
                <label className="block text-sm font-semibold text-foreground mb-2">{t('settingsTab.aiProvider')}</label>
                <div className="bg-secondary/30 p-1 border border-border/50 rounded-2xl flex-1 flex">
                  <div className="relative flex w-full h-full">
                    <div 
                      className="absolute top-0 bottom-0 bg-brand-gold rounded-xl shadow-md transition-transform duration-300 ease-out"
                      style={{
                        width: '50%',
                        transform: `translateX(${aiProvider === 'openrouter' ? '100%' : '0%'})`
                      }}
                    />
                    {(['openai', 'openrouter'] as const).map(p => (
                      <button
                        key={p}
                        onClick={() => {
                          setAiProvider(p);
                          fetchAiModels(p).then(models => {
                            if (models.length > 0) setAiModel(models[0].modelId);
                          });
                        }}
                        className={`relative z-10 flex-1 flex items-center justify-center text-sm font-bold py-2.5 px-2 transition-colors duration-300 rounded-xl whitespace-nowrap ${
                          aiProvider === p
                            ? 'text-white'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {p === 'openai' ? 'OpenAI' : 'OpenRouter'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Model */}
              <div className="flex flex-col">
                <div ref={modelDropdownRef} className="relative flex-1 flex flex-col">
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    {t('profile.aiModel')} <span className="font-normal text-xs text-muted-foreground ml-1">{t('profile.aiModelHint')}</span>
                  </label>
                  <button
                    onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                    className="w-full flex-1 flex items-center justify-between gap-2 px-3 py-2.5 bg-secondary/30 border border-border/50 rounded-2xl text-sm text-foreground hover:border-brand-gold/50 transition-colors"
                  >
                    <span className="truncate">{currentModelLabel || aiModel}</span>
                    <ChevronDown size={16} className={`text-muted-foreground shrink-0 transition-transform ${isModelDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isModelDropdownOpen && (
                    <div className="absolute top-[100%] z-50 left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-xl overflow-hidden">
                      <div className="p-2 border-b border-border/50">
                        <Input
                          type="text"
                          value={customModel}
                          onChange={e => setCustomModel(e.target.value)}
                          placeholder={t('profile.aiModelCustomPlaceholder')}
                          className="text-xs bg-secondary/30"
                          autoFocus
                          onKeyDown={e => {
                            if (e.key === 'Enter' && customModel.trim()) {
                              setAiModel(customModel.trim());
                              setCustomModel('');
                              setIsModelDropdownOpen(false);
                            }
                          }}
                        />
                      </div>

                      {customModel.trim() && (
                        <button
                          onClick={() => {
                            setAiModel(customModel.trim());
                            setCustomModel('');
                            setIsModelDropdownOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 text-xs font-bold text-brand-gold hover:bg-brand-gold/10 transition-colors border-b border-border/30"
                        >
                          {t('profile.aiModelUseCustom')}: {customModel.trim()}
                        </button>
                      )}

                      <div className="max-h-[200px] overflow-y-auto">
                        {filteredModels.map(m => (
                          <button
                            key={m.id}
                            onClick={() => {
                              setAiModel(m.modelId);
                              setCustomModel('');
                              setIsModelDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-xs hover:bg-secondary/50 transition-colors flex items-center justify-between ${
                              aiModel === m.modelId ? 'bg-brand-gold/10 text-brand-gold font-bold' : 'text-foreground'
                            }`}
                          >
                            <span>{m.label}</span>
                            <span className="text-[10px] text-muted-foreground/60 font-mono">{m.modelId}</span>
                          </button>
                        ))}
                        {filteredModels.length === 0 && (
                          <div className="px-3 py-3 text-xs text-muted-foreground text-center">
                            {t('profile.aiModelNoResults')}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* API Key */}
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-foreground">{t('settingsTab.aiApiKey')}</label>
                  <a href="/faq" target="_blank" rel="noopener noreferrer" className="text-xs text-brand-gold hover:underline font-medium">
                    {t('settingsTab.aiApiKeyHowTo')}
                  </a>
                </div>
                <div className="relative flex-1">
                  <Input
                    type="password"
                    value={aiKey}
                    onChange={e => setAiKey(e.target.value)}
                    placeholder={hasOwnKey ? `••••••••••••••••  (${t('settingsTab.keySaved')})` : aiProvider === 'openrouter' ? 'sk-or-...' : 'sk-...'}
                    autoComplete="new-password"
                    spellCheck={false}
                    className="bg-secondary/30 pr-10 h-full min-h-[44px] rounded-2xl border-border/50"
                  />
                  {hasOwnKey && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                      <SimpleTooltip content={t('settingsTab.removeKey')}>
                        <button
                          type="button"
                          onClick={handleRemoveKey}
                          disabled={isRemovingKey}
                          className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                        >
                          {isRemovingKey ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                        </button>
                      </SimpleTooltip>
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground/80 leading-tight mt-2.5">
                  {t('settingsTab.keySecure')}
                </p>
              </div>

              {/* Temperature */}
              <div className="flex flex-col">
                <label className="block text-sm font-semibold text-foreground mb-2">{t('settingsTab.creativity')}</label>
                <div className="flex flex-col justify-center gap-3 bg-secondary/30 p-3 rounded-2xl border border-border/50 flex-1 min-h-[44px]">
                  <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground px-1">
                    <span>{t('settingsTab.precise')}</span>
                    <span className="text-foreground font-bold text-xs">{aiTemperature}</span>
                    <span>{t('settingsTab.creative')}</span>
                  </div>
                  <Slider
                    value={[aiTemperature]}
                    onValueChange={([v]) => setAiTemperature(v)}
                    min={0}
                    max={2}
                    step={0.1}
                    className="cursor-pointer mb-1"
                  />
                </div>
              </div>

              {/* Memory Length */}
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-foreground">{t('settingsTab.aiMemory')}</label>
                </div>
                <div className="flex flex-col justify-center gap-3 bg-secondary/30 p-3 rounded-2xl border border-border/50 flex-1 min-h-[44px]">
                  <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground px-1">
                    <span>{t('settingsTab.memoryShort', 'Krótka')} (1)</span>
                    <span className={`font-bold text-xs ${aiMemoryLength && aiMemoryLength > tierLimits.aiMemoryLength ? 'text-destructive' : 'text-foreground'}`}>
                      {aiMemoryLength ?? tierLimits.aiMemoryLength}
                    </span>
                    <span>{t('settingsTab.memoryLong')} ({tierLimits.aiMemoryLength})</span>
                  </div>
                  <Slider
                    value={[Math.min(aiMemoryLength ?? tierLimits.aiMemoryLength, tierLimits.aiMemoryLength)]}
                    onValueChange={([v]) => setAiMemoryLength(v)}
                    min={1}
                    max={tierLimits.aiMemoryLength}
                    step={1}
                    className="cursor-pointer mb-1"
                  />
                  {(aiMemoryLength && aiMemoryLength > tierLimits.aiMemoryLength) ? (
                    <p className="text-[11px] text-destructive mt-1 font-semibold leading-tight">
                      {t('settingsTab.memoryDowngraded', { previous: aiMemoryLength, max: tierLimits.aiMemoryLength })}
                    </p>
                  ) : null}
                  <p className="text-[11px] text-muted-foreground/80 leading-tight mt-1 text-center">
                    {t('settingsTab.memoryWarning')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Global Backup Section */}
          <div className="p-5 sm:p-6 rounded-2xl border border-border/50 shadow-sm bg-card/50 mt-8">
            <div className="space-y-5">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Download size={18} className="text-muted-foreground" />
                {t('settingsTab.backupTitle')}
              </h2>
              <p className="text-sm text-muted-foreground mt-1 max-w-3xl leading-relaxed">
                {t('settingsTab.backupDesc')}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button 
                variant="secondary" 
                onClick={handleExportBackup} 
                disabled={isExporting || isImporting}
                className="flex items-center gap-2 hover:bg-brand-gold hover:text-white transition-colors"
              >
                {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                {t('settingsTab.exportZip')}
              </Button>
              
              <input 
                type="file" 
                ref={backupInputRef} 
                onChange={handleImportBackup} 
                accept=".zip" 
                className="hidden" 
              />
              <Button 
                variant="outline" 
                onClick={() => backupInputRef.current?.click()} 
                disabled={isExporting || isImporting}
                className="flex items-center gap-2"
              >
                {isImporting ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
                {t('settingsTab.importZip')}
              </Button>
            </div>
          </div>
          </div>

          {/* Danger Zone */}
          <div className="p-5 sm:p-6 rounded-2xl border border-destructive/30 shadow-sm bg-destructive/5 mt-8 mb-2">
            <div className="space-y-5">
            <div>
              <h2 className="text-base font-bold text-destructive flex items-center gap-2">
                <Trash2 size={18} />
                {t('settingsTab.dangerZoneTitle')}
              </h2>
              <p className="text-sm text-muted-foreground mt-1 max-w-3xl leading-relaxed">
                {t('auth.deleteAccountWarning')}
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={() => setIsDeleteModalOpen(true)}
              className="flex items-center gap-2 w-fit"
            >
              <Trash2 size={16} />
              {t('auth.deleteAccount')}
            </Button>
          </div>
        </div>
      </ModalBody>

        <ModalFooter>
          <Button
            variant="ghost"
            onClick={handleClose}
          >
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {t('profile.saveChanges')}
          </Button>
        </ModalFooter>

      </ModalContainer>

      <DeleteAccountModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
      />
    </ModalOverlay>
  );
};
