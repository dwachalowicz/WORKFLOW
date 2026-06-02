import { useTranslation } from 'react-i18next';
import React, { useState, useRef, useCallback } from 'react';
import { Camera, Loader2, Image as ImageIcon, Box } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { ModalOverlay, ModalContainer, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/ModalWrapper';
import Cropper from 'react-easy-crop';
import { Slider } from '@/components/ui/slider';
import { pb } from '@/lib/pocketbase';
import { Button } from '@/components/ui/button';
import { tryCatchToast } from '@/lib/errorHandler';
import { cn } from '@/lib/utils';
import { getCroppedImg } from '@/lib/imageUtils';

import { ICON_MAP } from '@/lib/iconMap';

interface AvatarCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** PocketBase collection name, e.g. 'WORKFLOW_processes' */
  collectionName: string;
  /** Record ID to update */
  recordId: string;
  /** Current avatar URL (for preview) */
  currentAvatarUrl?: string;
  /** Current icon name */
  currentIcon?: string;
  /** Called after successful save with the updated record */
  onSaved: (updatedRecord: Record<string, unknown>) => void;
  /** Shape: 'round' | 'rect' */
  cropShape?: 'round' | 'rect';
  /** Title */
  title?: string;
  /** Target size in pixels for the cropped output (default: 200) */
  targetSize?: number;
}

const ALL_ICONS = Object.keys(ICON_MAP).sort();

export const AvatarCropModal = ({ 
  isOpen, 
  onClose, 
  collectionName, 
  recordId, 
  currentAvatarUrl, 
  currentIcon,
  onSaved,
  cropShape = 'round',
  title,
  targetSize = 200
}: AvatarCropModalProps) => {
  const { t } = useTranslation();
  const resolvedTitle = title || t('avatar.title');
  const [activeTab, setActiveTab] = useState<'avatar' | 'icon'>(currentIcon && !currentAvatarUrl ? 'icon' : 'avatar');
  
  // Avatar states
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Record<string, number> | null>(null);
  
  // Icon states
  const [selectedIcon, setSelectedIcon] = useState<string | null>(currentIcon || null);
  const [iconSearch, setIconSearch] = useState('');

  const filteredIcons = React.useMemo(() => {
    if (!iconSearch) return ALL_ICONS.slice(0, 150);
    const lower = iconSearch.toLowerCase();
    return ALL_ICONS.filter(name => name.toLowerCase().includes(lower)).slice(0, 150);
  }, [iconSearch]);

  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImageSrc(reader.result?.toString() || null);
      });
      reader.readAsDataURL(file);
    }
  };

  const onCropComplete = useCallback((_: unknown, croppedPixels: Record<string, number>) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleSaveAvatar = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setIsLoading(true);
    const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels, targetSize);
    const formData = new FormData();
    formData.append('avatar', croppedBlob, 'avatar.webp');
    // Clear icon if we set an avatar
    formData.append('icon', '');
    
    const updated = await tryCatchToast(
      () => pb.collection(collectionName).update(recordId, formData),
      { errorKey: t('avatar.saveFail') }
    );
    if (updated) {
      onSaved(updated);
      handleClose();
    }
    setIsLoading(false);
  };

  const handleSaveIcon = async () => {
    if (!selectedIcon) return;
    setIsLoading(true);
    // Setting an icon clears the avatar
    const updated = await tryCatchToast(
      () => pb.collection(collectionName).update(recordId, { icon: selectedIcon, avatar: null }),
      { errorKey: t('avatar.saveFail') }
    );
    if (updated) {
      onSaved(updated);
      handleClose();
    }
    setIsLoading(false);
  };

  const handleRemoveAvatar = async () => {
    setIsLoading(true);
    const updated = await tryCatchToast(
      () => pb.collection(collectionName).update(recordId, { avatar: null })
    );
    if (updated) {
      onSaved(updated);
      handleClose();
    }
    setIsLoading(false);
  };

  const handleRemoveIcon = async () => {
    setIsLoading(true);
    const updated = await tryCatchToast(
      () => pb.collection(collectionName).update(recordId, { icon: "" })
    );
    if (updated) {
      onSaved(updated);
      handleClose();
    }
    setIsLoading(false);
  };

  const handleClose = () => {
    setImageSrc(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setSelectedIcon(currentIcon || null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <ModalOverlay isOpen={isOpen} onClose={handleClose}>
      <ModalContainer size="md">
        <ModalHeader title={resolvedTitle} onClose={handleClose} />

        {/* TABS */}
        <div className="flex border-b border-border/50">
          <button
            onClick={() => setActiveTab('avatar')}
            className={cn(
              "flex-1 py-3 text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-2",
              activeTab === 'avatar' ? "border-brand-gold text-brand-gold" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <ImageIcon size={16} />
            {t('avatar.avatarTab')}
          </button>
          <button
            onClick={() => setActiveTab('icon')}
            className={cn(
              "flex-1 py-3 text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-2",
              activeTab === 'icon' ? "border-brand-gold text-brand-gold" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Box size={16} />
            {t('avatar.iconTab')}
          </button>
        </div>

        <ModalBody className="space-y-4 pt-6">
          {activeTab === 'avatar' && (
            <>
              {imageSrc ? (
                <div className="w-full space-y-3">
                  <div className="relative w-full h-64 bg-black rounded-xl overflow-hidden border border-border">
                    <Cropper
                      image={imageSrc}
                      crop={crop}
                      zoom={zoom}
                      aspect={1}
                      cropShape={cropShape}
                      showGrid={false}
                      onCropChange={setCrop}
                      onCropComplete={onCropComplete}
                      onZoomChange={setZoom}
                    />
                  </div>
                  <div className="flex items-center gap-3 px-2">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Zoom</span>
                    <Slider
                      value={[zoom]}
                      min={1}
                      max={3}
                      step={0.1}
                      onValueChange={(val) => setZoom(val[0])}
                      className="flex-1"
                    />
                  </div>
                  <Button 
                    variant="link"
                    className="h-auto p-0 text-xs text-muted-foreground"
                    onClick={() => setImageSrc(null)}
                  >
                    {t('avatar.cancelChange')}
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-4">
                  <div 
                    className="relative group cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className={cn("w-24 h-24 bg-secondary flex items-center justify-center border border-border overflow-hidden", cropShape === 'round' ? 'rounded-full' : 'rounded-xl')}>
                      {currentAvatarUrl ? (
                        <img loading="lazy" 
                          src={currentAvatarUrl} 
                          alt="Avatar" 
                          className="w-full h-full object-cover group-hover:opacity-50 transition-opacity"
                        />
                      ) : (
                        <Camera className="w-8 h-8 text-muted-foreground" />
                      )}
                    </div>
                    <div className={cn("absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity", cropShape === 'round' ? 'rounded-full' : 'rounded-xl')}>
                      <Camera className="w-6 h-6 text-foreground" />
                    </div>
                  </div>
                  <Button 
                    variant="link"
                    className="h-auto p-0 text-xs text-brand-gold hover:text-brand-gold/80"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {currentAvatarUrl ? t('avatar.changePhoto') : t('avatar.selectPhoto')}
                  </Button>
                  {currentAvatarUrl && (
                    <Button 
                      variant="link"
                      className="h-auto p-0 text-xs text-muted-foreground hover:text-destructive"
                      onClick={handleRemoveAvatar}
                    >
                      {t('avatar.removeAvatar')}
                    </Button>
                  )}
                </div>
              )}
              
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*"
                onChange={handleFileChange}
              />
            </>
          )}

          {activeTab === 'icon' && (
            <div className="flex flex-col space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {t('avatar.selectIcon')}
                </p>
                <input
                  type="text"
                  className="w-48 bg-secondary border border-border rounded-lg px-3 py-1.5 text-sm text-foreground focus:border-brand-gold outline-none"
                  placeholder={t('avatar.searchIcon', 'Szukaj ikony...')}
                  value={iconSearch}
                  onChange={(e) => setIconSearch(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-6 gap-3 max-h-64 overflow-y-auto p-1 custom-scrollbar">
                {filteredIcons.map((iconName) => {
                  const IconCmp = (LucideIcons as Record<string, React.ElementType>)[iconName];
                  if (!IconCmp) return null;
                  const isSelected = selectedIcon === iconName;
                  return (
                    <button
                      key={iconName}
                      onClick={() => setSelectedIcon(iconName)}
                      className={cn(
                        "w-12 h-12 flex items-center justify-center rounded-xl border transition-all cursor-pointer hover:bg-secondary/80",
                        isSelected 
                          ? "border-brand-gold bg-brand-gold/10 text-brand-gold" 
                          : "border-border/50 bg-secondary/30 text-muted-foreground"
                      )}
                    >
                      <IconCmp size={20} />
                    </button>
                  );
                })}
              </div>
              {currentIcon && selectedIcon === currentIcon && (
                <div className="flex justify-center pt-2">
                  <Button 
                    variant="link"
                    className="h-auto p-0 text-xs text-muted-foreground hover:text-destructive"
                    onClick={handleRemoveIcon}
                  >
                    {t('avatar.removeIcon')}
                  </Button>
                </div>
              )}
            </div>
          )}
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" onClick={handleClose}>
            {t('common.cancel')}
          </Button>
          {activeTab === 'avatar' && imageSrc && (
            <Button onClick={handleSaveAvatar} disabled={isLoading} className="flex items-center gap-2">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {t('common.save')}
            </Button>
          )}
          {activeTab === 'icon' && selectedIcon && selectedIcon !== currentIcon && (
            <Button onClick={handleSaveIcon} disabled={isLoading} className="flex items-center gap-2">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {t('common.save')}
            </Button>
          )}
        </ModalFooter>
      </ModalContainer>
    </ModalOverlay>
  );
};
