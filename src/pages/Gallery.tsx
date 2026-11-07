/**
 * Pagina Galleria: griglia di tutte le foto delle ricette con modale per aggiungere foto.
 * Usa la logica condivisa in src/lib/images.ts e le query in src/lib/supabase.ts.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Image, Search, X, Loader2 } from 'lucide-react'
import { clsx } from 'clsx'
import { toast } from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import { getRecipesWithImages, getRecipeOptions } from '../lib/supabase'
import { uploadRecipeImage, addImageToRecipe } from '../lib/images'
import { Button } from '../components/Button'
import { EmptyState, ErrorState } from '../components/Loading'

interface PhotoItem {
  recipeId: string
  titolo: string
  url: string
  index: number
}

interface RecipeOption {
  id: string
  titolo: string
}

export function Gallery() {
  const { user } = useAuth()

  const [photos, setPhotos] = useState<PhotoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modale "Aggiungi foto"
  const [showModal, setShowModal] = useState(false)
  const [recipes, setRecipes] = useState<RecipeOption[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeOption | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)

  const modalRef = useRef<HTMLDivElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Carica foto dalla griglia
  const loadPhotos = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const recipesWithImages = await getRecipesWithImages()
      const allPhotos: PhotoItem[] = []
      recipesWithImages.forEach(recipe => {
        (recipe.immagini as string[]).forEach((url, idx) => {
          allPhotos.push({ recipeId: recipe.id, titolo: recipe.titolo, url, index: idx })
        })
      })
      setPhotos(allPhotos)
    } catch (err) {
      console.error('Errore caricamento galleria:', err)
      setError('Impossibile caricare le foto')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadPhotos() }, [loadPhotos])

  // Carica elenco ricette per selettore
  useEffect(() => {
    getRecipeOptions().then(setRecipes).catch(console.error)
  }, [])

  const filteredRecipes = recipes.filter(r =>
    r.titolo.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Apertura modale
  const openModal = () => {
    previouslyFocused.current = document.activeElement as HTMLElement
    setSearchQuery('')
    setSelectedRecipe(null)
    setFile(null)
    setPreviewUrl(null)
    setModalError(null)
    setShowModal(true)
    document.body.style.overflow = 'hidden'
    // Focus primo elemento (input ricerca) dopo render
    setTimeout(() => {
      const input = modalRef.current?.querySelector<HTMLInputElement>('input[type="search"]')
      input?.focus()
    }, 100)
  }

  // Chiusura modale
  const closeModal = () => {
    if (saving) return // blocca chiusura durante salvataggio
    setShowModal(false)
    document.body.style.overflow = ''
    previouslyFocused.current?.focus()
  }

  // Gestione tastiera modale (Esc, Tab trap base)
  useEffect(() => {
    if (!showModal) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeModal()
        return
      }
      // Trap Tab base: se Shift+Tab su primo elemento → ultimo; Tab su ultimo → primo
      if (e.key === 'Tab' && modalRef.current) {
        const focusables = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (focusables.length === 0) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showModal, saving])

  // Selezione ricetta
  const handleRecipeSelect = (recipe: RecipeOption) => {
    setSelectedRecipe(recipe)
    setSearchQuery(recipe.titolo)
  }

  // Selezione file
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    // Validazione inline per feedback immediato
    const err = validateImageFileLocal(f)
    if (err) {
      setModalError(err)
      setFile(null)
      setPreviewUrl(null)
      return
    }
    setFile(f)
    setModalError(null)
    const url = URL.createObjectURL(f)
    setPreviewUrl(url)
  }

  // Validazione locale (copia di lib/images per feedback immediato)
  const validateImageFileLocal = (f: File): string | null => {
    if (f.size > 5 * 1024 * 1024) return "L'immagine deve essere più piccola di 5MB"
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'].includes(f.type))
      return 'Formato non supportato. Usa JPG, PNG, WebP o HEIC'
    return null
  }

  // Salvataggio
  const handleSave = async () => {
    if (!user || !selectedRecipe || !file) return
    setSaving(true)
    setModalError(null)
    try {
      // Upload nel bucket
      const url = await uploadRecipeImage(file, user.id, selectedRecipe.id)
      // Aggiunge alla ricetta (rileggendo l'array corrente)
      await addImageToRecipe(selectedRecipe.id, url)
      // Aggiorna griglia localmente senza ricaricare
      setPhotos(prev => [...prev, { recipeId: selectedRecipe.id, titolo: selectedRecipe.titolo, url, index: 0 }])
      toast.success('Foto aggiunta alla ricetta!')
      closeModal()
    } catch (err: any) {
      console.error('Errore salvataggio foto:', err)
      setModalError(err?.message ?? 'Errore durante il salvataggio. Riprova.')
      toast.error('Errore nel salvataggio della foto. Riprova.')
    } finally {
      setSaving(false)
    }
  }

  // Skeleton cella
  const SkeletonCell = () => (
    <div className="aspect-square bg-[var(--card)] rounded-xl border border-[var(--bordo)] overflow-hidden animate-pulse">
      <div className="w-full h-full bg-[var(--bordo)]" />
    </div>
  )

  if (loading) {
    return (
      <div className="page-container gallery-page">
        <main className="gallery-content max-w-[720px] mx-auto px-4 pt-4 pb-[calc(5rem+env(safe-area-inset-bottom))]">
          <header className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold text-[var(--testo)]">Galleria</h1>
            <Button variant="ghost" size="sm" disabled className="opacity-50">
              <Plus size={16} /> Aggiungi foto
            </Button>
          </header>
          <div className="grid grid-cols-2 min-[480px]:grid-cols-3 gap-2">
            {[...Array(6)].map((_, i) => <SkeletonCell key={i} />)}
          </div>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page-container gallery-page">
        <main className="gallery-content max-w-[720px] mx-auto px-4 pt-4 pb-[calc(5rem+env(safe-area-inset-bottom))]">
          <header className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold text-[var(--testo)]">Galleria</h1>
            <Button variant="primary" onClick={loadPhotos}>
              <Loader2 size={16} className="animate-spin" /> Riprova
            </Button>
          </header>
          <ErrorState message={error} onRetry={loadPhotos} retryLabel="Riprova" />
        </main>
      </div>
    )
  }

  return (
    <div className="page-container gallery-page">
      <main className="gallery-content max-w-[720px] mx-auto px-4 pt-4 pb-[calc(5rem+env(safe-area-inset-bottom))]">
        <header className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold text-[var(--testo)]">Galleria</h1>
          <Button variant="primary" size="md" onClick={openModal} className="gap-2" aria-label="Aggiungi foto a una ricetta">
            <Plus size={18} /> Aggiungi foto a una ricetta
          </Button>
        </header>

        {photos.length === 0 ? (
          <EmptyState
            icon={<Image size={48} className="text-[var(--secondario)]" />}
            title="Nessuna foto ancora"
            description="Aggiungi la prima foto a una ricetta per iniziare la galleria."
            action={{ label: 'Aggiungi foto', onClick: openModal }}
            className="py-12"
          />
        ) : (
          <div className="grid grid-cols-2 min-[480px]:grid-cols-3 gap-2" role="list" aria-label="Foto delle ricette">
            {photos.map((photo, _idx) => (
              <Link
                key={`${photo.recipeId}-${photo.index}`}
                to={`/recipe/${photo.recipeId}`}
                className="photo-cell aspect-square relative group block rounded-xl overflow-hidden bg-[var(--card)] border border-[var(--card-bordo)] focus-visible:outline-2 focus-visible:outline-[var(--accento)] focus-visible:outline-offset-2"
                aria-label={`Vedi ricetta: ${photo.titolo}`}
              >
                <img
                  src={photo.url}
                  alt={`Foto ${photo.index + 1} di ${photo.titolo}`}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/70 via-black/30 to-transparent">
                  <p className="text-white text-sm font-medium truncate">{photo.titolo}</p>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Modale "Aggiungi foto a una ricetta" */}
        {showModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={e => { if (e.target === e.currentTarget) closeModal() }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            ref={modalRef}
          >
            <div className="w-full max-w-md bg-[var(--card)] rounded-2xl border border-[var(--card-bordo)] shadow-[var(--elevazione-overlay)] animate-in zoom-in-95 fade-in duration-200">
              <div className="flex items-center justify-between p-4 border-b border-[var(--card-bordo)]">
                <h2 id="modal-title" className="text-lg font-semibold text-[var(--testo)]">Aggiungi foto a una ricetta</h2>
                <button
                  type="button"
                  onClick={closeModal}
                  className="p-1 rounded-lg text-[var(--secondario)] hover:text-[var(--testo)] hover:bg-[var(--card-bordo)] transition-colors touch-manipulation focus-visible:outline-2 focus-visible:outline-[var(--accento)]"
                  aria-label="Chiudi modale"
                  disabled={saving}
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-4 space-y-4">
                {modalError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-600 dark:text-red-400" role="alert">
                    {modalError}
                  </div>
                )}

                {/* Selettore ricetta con ricerca */}
                <div className="space-y-2">
                  <label htmlFor="recipe-search" className="block text-sm font-medium text-[var(--testo)]">Scegli la ricetta</label>
                  <div className="relative">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--secondario)]" aria-hidden="true" />
                    <input
                      id="recipe-search"
                      type="search"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Cerca per titolo..."
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-[var(--bordo)] bg-[var(--sfondo)] text-[var(--testo)] placeholder-[var(--secondario)] focus:outline-none focus:ring-2 focus:ring-[var(--accento)] focus:border-transparent transition-all duration-150"
                      autoComplete="off"
                      autoFocus
                    />
                  </div>
                  <ul className="max-h-48 overflow-y-auto space-y-1 border border-[var(--bordo)] rounded-xl bg-[var(--sfondo)]" role="listbox" aria-label="Ricette trovate">
                    {filteredRecipes.length === 0 ? (
                      <li className="px-4 py-6 text-center text-[var(--secondario)] text-sm">Nessuna ricetta trovata</li>
                    ) : (
                      filteredRecipes.map(recipe => (
                        <li key={recipe.id}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={selectedRecipe?.id === recipe.id}
                            onClick={() => handleRecipeSelect(recipe)}
                            className={clsx(
                              'w-full px-4 py-3 text-left text-sm text-[var(--testo)] hover:bg-[var(--card-bordo)] transition-colors',
                              selectedRecipe?.id === recipe.id && 'bg-[var(--accento)]/10 text-[var(--accento)]'
                            )}
                          >
                            {recipe.titolo}
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                  {selectedRecipe && (
                    <p className="text-xs text-[var(--accento)] font-medium">Selezionata: {selectedRecipe.titolo}</p>
                  )}
                </div>

                {/* Upload file con anteprima */}
                <div className="space-y-2">
                  <label htmlFor="gallery-file" className="block text-sm font-medium text-[var(--testo)]">Foto</label>
                  <div className="relative">
                    <input
                      ref={fileInputRef}
                      id="gallery-file"
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="sr-only"
                      disabled={saving}
                    />
                    <label
                      htmlFor="gallery-file"
                      className={clsx(
                        'file-drop-zone flex flex-col items-center justify-center gap-3 p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-150',
                        file ? 'border-transparent bg-[var(--sfondo)]' : 'border-[var(--bordo)] hover:border-[var(--accento)] hover:bg-[var(--accento)]/5',
                        saving && 'opacity-50 cursor-wait'
                      )}
                    >
                      {file && previewUrl ? (
                        <>
                          <img src={previewUrl} alt="Anteprima" className="w-24 h-24 object-cover rounded-xl border border-[var(--bordo)]" />
                          <div className="flex gap-2">
                            <Button type="button" variant="secondary" size="sm" onClick={() => { setFile(null); setPreviewUrl(null); if (fileInputRef.current) fileInputRef.current.value = '' }} className="gap-1">
                              <X size={14} /> Cambia
                            </Button>
                            <Button type="button" variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-1">
                              <Image size={14} /> Nuova
                            </Button>
                          </div>
                        </>
                      ) : (
                        <>
                          <Image size={32} className="text-[var(--secondario)]" aria-hidden="true" />
                          <div className="text-center">
                            <p className="text-[var(--testo)] font-medium">Clicca o trascina per caricare una foto</p>
                            <p className="text-xs text-[var(--secondario)] mt-1">JPG, PNG, WebP, HEIC — max 5MB</p>
                          </div>
                          {saving && <Loader2 size={24} className="animate-spin text-[var(--accento)]" />}
                        </>
                      )}
                    </label>
                  </div>
                </div>

                {/* Pulsanti azione */}
                <div className="flex gap-2 pt-2">
                  <Button variant="secondary" onClick={closeModal} disabled={saving} className="flex-1">
                    Annulla
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleSave}
                    disabled={saving || !selectedRecipe || !file}
                    isLoading={saving}
                    className="flex-1 gap-2"
                  >
                    {saving ? 'Salvataggio...' : 'Salva e aggiungi'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}