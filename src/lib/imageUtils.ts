/** Resizes an image File to fit within maxWidth×maxHeight, returning a compressed JPEG File.
 *  If the image is already within the bounds, returns the original File unchanged. */
export function resizeImage(file: File, maxWidth: number, maxHeight: number, quality = 0.85): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      const { width, height } = img
      if (width <= maxWidth && height <= maxHeight) {
        resolve(file)
        return
      }
      const ratio = Math.min(maxWidth / width, maxHeight / height)
      const tw = Math.round(width * ratio)
      const th = Math.round(height * ratio)
      const canvas = document.createElement('canvas')
      canvas.width = tw
      canvas.height = th
      const ctx = canvas.getContext('2d')
      if (!ctx) { resolve(file); return }
      ctx.drawImage(img, 0, 0, tw, th)
      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return }
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }))
        },
        'image/jpeg',
        quality,
      )
    }
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Image load failed')) }
    img.src = objectUrl
  })
}
