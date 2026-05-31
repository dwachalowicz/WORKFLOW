import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import Cropper from 'react-easy-crop';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { ModalOverlay, ModalContainer, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/ModalWrapper';
import { getCroppedImg } from '@/lib/imageUtils';

export interface AvatarCropperProps {
  imageSrc: string;
  onCropped: (blob: Blob) => void;
  onCancel: () => void;
  title?: string;
  cropShape?: 'round' | 'rect';
  targetSize?: number;
}

export const AvatarCropper = ({ 
  imageSrc, 
  onCropped, 
  onCancel, 
  title,
  cropShape = 'round',
  targetSize = 100
}: AvatarCropperProps) => {
  const { t } = useTranslation();
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Record<string, number> | null>(null);

  const onCropComplete = useCallback((_: unknown, cap: Record<string, number>) => setCroppedAreaPixels(cap), []);

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;
    const blob = await getCroppedImg(imageSrc, croppedAreaPixels, targetSize);
    onCropped(blob);
  };

  const resolvedTitle = title || t('groups.cropAvatar') || 'Crop Avatar';

  return (
    <ModalOverlay isOpen={true} onClose={onCancel} zIndex="high">
      <ModalContainer size="sm">
        <ModalHeader title={resolvedTitle} onClose={onCancel} />
        <ModalBody>
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
          <div className="flex items-center gap-3 mt-3">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Zoom</span>
            <Slider value={[zoom]} min={1} max={3} step={0.1} onValueChange={(v) => setZoom(v[0])} className="flex-1" />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" size="sm" onClick={onCancel}>{t('common.cancel')}</Button>
          <Button size="sm" onClick={handleConfirm}>{t('common.confirm')}</Button>
        </ModalFooter>
      </ModalContainer>
    </ModalOverlay>
  );
};
