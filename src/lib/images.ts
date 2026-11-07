/**
 * Logica condivisa per le immagini delle ricette (bucket Supabase `recipe-images`).
 * Usata da RecipeForm e dalla Galleria: non duplicare altrove.
 */

import { supabase, getRecipeById, updateRecipe } from './supabase'

export const RECIPE_IMAGES_BUCKET = 'recipe-images'
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']

/**
 * Valida un file immagine. Ritorna un messaggio d'errore oppure null se valido.
 */
export function validateImageFile(file: File): string | null {
  if (file.size > MAX_IMAGE_SIZE) return "L'immagine deve essere più piccola di 5MB"
  if (!ALLOWED_TYPES.includes(file.type)) return 'Formato non supportato. Usa JPG, PNG, WebP o HEIC'
  return null
}

/**
 * Carica un'immagine nel bucket `recipe-images` e ritorna l'URL pubblico.
 */
export async function uploadRecipeImage(file: File, userId: string, recipeId?: string): Promise<string> {
  const validationError = validateImageFile(file)
  if (validationError) throw new Error(validationError)

  // Nome file univoco: userId/recipeId_timestamp_random.ext
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  const fileName = `${userId}/${recipeId ?? 'new'}_${timestamp}_${random}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(RECIPE_IMAGES_BUCKET)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (uploadError) {
    console.error('Upload error:', uploadError)
    throw new Error(`Errore durante l'upload: ${uploadError.message}`)
  }

  const { data } = supabase.storage.from(RECIPE_IMAGES_BUCKET).getPublicUrl(fileName)
  return data.publicUrl
}

/**
 * Aggiunge un URL immagine all'array `immagini` di una ricetta.
 * Rilegge prima l'array corrente dal database, così non si perdono
 * foto aggiunte nel frattempo da un altro dispositivo/sessione.
 * Ritorna il nuovo array immagini.
 */
export async function addImageToRecipe(recipeId: string, imageUrl: string): Promise<string[]> {
  const recipe = await getRecipeById(recipeId)
  const current = ((recipe as { immagini?: string[] | null }).immagini ?? []) as string[]
  const next = [...current, imageUrl]
  await updateRecipe(recipeId, { immagini: next } as never)
  return next
}
