import { useRef, useState } from 'react';
import { uploadImage } from '../lib/api';
import { resizeImage } from '../lib/imageUtils';
import { ImageSourceSheet } from '../components/shared/ImageSourceSheet';
import { ImageCropModal } from '../components/shared/ImageCropModal';

// Checagem só pra não jogar um arquivo absurdo no decode <img> do crop modal —
// não é o limite real de upload (esse continua sendo os 5MB do servidor,
// que nunca chegam a ser testados na prática porque o crop já entrega ~280x280).
const MAX_PHOTO_PICK_BYTES = 20 * 1024 * 1024;

/** Traduz o erro de cada etapa do fluxo de foto pra uma mensagem curta e específica. */
function describePhotoError(stage: 'resize' | 'upload', err: unknown): string {
  if (err instanceof TypeError) {
    // fetch() lança TypeError puro pra falha de rede (sem conexão, DNS, CORS) —
    // não tem status HTTP pra inspecionar nesse caso.
    return 'Sem conexão com a internet. Verifique sua rede e tente de novo.';
  }
  if (stage === 'upload' && err instanceof Error) {
    const match = err.message.match(/^Upload failed: ([\s\S]*)$/);
    if (match) {
      try {
        const body = JSON.parse(match[1]) as { error?: string };
        if (body.error === 'File too large') return 'Essa foto é muito grande. Tenta uma imagem menor.';
        if (body.error === 'Unsupported file type') return 'Esse formato de imagem não é aceito.';
        if (body.error) return 'Não foi possível processar essa imagem. Tenta outra foto.';
      } catch {
        // corpo não era JSON — cai no genérico de upload abaixo
      }
    }
  }
  if (stage === 'resize') return 'Não foi possível processar essa imagem. Tenta outra foto.';
  return 'Não foi possível enviar a foto. Tente novamente.';
}

interface UseAvatarPickerOptions {
  accessToken: string | null;
  /** Chamado com a URL já enviada ao servidor — o chamador decide o que fazer com ela
   * (PATCH imediato num perfil/comunidade existente, ou só guardar em estado local
   * quando a entidade ainda está sendo criada). */
  onUploaded: (url: string) => void;
  onError: (message: string) => void;
  /** Lado do quadrado final, em px. Padrão 400 — mesmo valor usado em todo o app. */
  size?: number;
}

/**
 * Fluxo completo de "foto de perfil" (escolher fonte → recortar 1:1 → redimensionar →
 * enviar) — mesma implementação usada pelo perfil da própria mãe (EditProfileScreen) e
 * pelas comunidades (criação e edição), pra não divergir em validação/mensagens de erro
 * entre os três lugares.
 */
export function useAvatarPicker({ accessToken, onUploaded, onError, size = 400 }: UseAvatarPickerOptions) {
  const [showSourceSheet, setShowSourceSheet] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      onError('Esse arquivo não é uma imagem.');
      return;
    }
    if (file.size > MAX_PHOTO_PICK_BYTES) {
      onError('Essa foto é muito grande (máx. 20MB). Tenta outra ou tire uma foto nova.');
      return;
    }
    setCropSrc(URL.createObjectURL(file));
  }

  function handleCropError() {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
    onError('Não foi possível abrir essa imagem. Tenta outra foto.');
  }

  function handleCropCancel() {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  }

  async function handleCropConfirm(blob: Blob) {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
    setIsUploading(true);

    const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });

    let resized: File;
    try {
      resized = await resizeImage(file, size, size, 0.9);
    } catch (err) {
      onError(describePhotoError('resize', err));
      setIsUploading(false);
      return;
    }

    let url: string;
    try {
      url = await uploadImage(resized, accessToken);
    } catch (err) {
      onError(describePhotoError('upload', err));
      setIsUploading(false);
      return;
    }

    setIsUploading(false);
    onUploaded(url);
  }

  const pickerElements = (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        aria-label="Selecionar foto da galeria"
        className="hidden"
        onChange={handleFileChange}
        data-testid="avatar-picker-gallery-input"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        aria-label="Tirar foto"
        className="hidden"
        onChange={handleFileChange}
        data-testid="avatar-picker-camera-input"
      />
      {showSourceSheet && (
        <ImageSourceSheet
          onCamera={() => { setShowSourceSheet(false); cameraInputRef.current?.click(); }}
          onGallery={() => { setShowSourceSheet(false); fileInputRef.current?.click(); }}
          onClose={() => setShowSourceSheet(false)}
        />
      )}
      {cropSrc && (
        <ImageCropModal
          imageSrc={cropSrc}
          aspectRatio={1}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
          onError={handleCropError}
        />
      )}
    </>
  );

  return { openPicker: () => setShowSourceSheet(true), pickerElements, isUploading };
}
