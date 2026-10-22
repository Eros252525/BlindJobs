// Profile photos are shrunk in the browser to a small square JPEG and kept on the
// profile as a data URL (about 30 KB), so no separate file storage is needed.

const SIZE = 320
const QUALITY = 0.85
// A phone camera photo is a few MB; anything far bigger is probably not a photo
const MAX_BYTES = 15 * 1024 * 1024

/** Turns a chosen image file into a centred square JPEG data URL, or throws with a message to show. */
export async function photoToDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('That file is not a picture. Choose a JPG, PNG or other image file.')
  if (file.size > MAX_BYTES) throw new Error('That picture is larger than 15 MB. Choose a smaller one.')

  let image: ImageBitmap
  try { image = await createImageBitmap(file) }
  catch { throw new Error('That picture could not be opened. Try a JPG or PNG file.') }

  // Crop the middle square, so a tall or wide photo still fills the circle
  const side = Math.min(image.width, image.height)
  const canvas = document.createElement('canvas')
  canvas.width = SIZE; canvas.height = SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('This browser could not prepare the picture.')
  ctx.drawImage(image, (image.width - side) / 2, (image.height - side) / 2, side, side, 0, 0, SIZE, SIZE)
  image.close()
  return canvas.toDataURL('image/jpeg', QUALITY)
}
