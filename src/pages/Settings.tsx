/**
 * Pagina Impostazioni: profilo, logout, export JSON, gestione basi ignore
 * Usa componenti condivisi: Header, Button, Badge
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, LogOut, Download, Upload, Trash2, AlertCircle, CheckCircle, X, Plus, Settings as SettingsIcon, Database } from 'lucide-react'
import { clsx } from 'clsx'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { DEFAULT_IGNORED_INGREDIENTS } from '../lib/config'
import { Header } from '../components/Header'
import { Button } from '../components/Button'

const STORAGE_KEY_IGNORED = 'ricettario-ignored-ingredients'

export function SettingsPage() {
  const { user, signOut, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [ignoredIngredients, setIgnoredIngredients] = useState<string[]>([])
  const [newIgnoredInput, setNewIgnoredInput] = useState('')
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [activeTab, setActiveTab] = useState<'profile' | 'data' | 'pantry'>('profile')

  // Carica ingredienti ignorati da localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_IGNORED)
      if (stored) {
        setIgnoredIngredients(JSON.parse(stored))
      } else {
        setIgnoredIngredients([...DEFAULT_IGNORED_INGREDIENTS])
      }
    } catch {
      setIgnoredIngredients([...DEFAULT_IGNORED_INGREDIENTS])
    }
  }, [])

  // Salva in localStorage quando cambia
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_IGNORED, JSON.stringify(ignoredIngredients))
    } catch (err) {
      console.error('Errore salvataggio basi:', err)
    }
  }, [ignoredIngredients])

  const showMessage = useCallback((type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 4000)
  }, [])

  const handleLogout = async () => {
    if (!window.confirm('Vuoi uscire?')) return
    try {
      await signOut()
      navigate('/')
    } catch (err) {
      console.error('Errore logout:', err)
      showMessage('error', 'Errore durante il logout')
    }
  }

  const handleExport = async () => {
    if (!user) return
    setExporting(true)
    try {
      const { data: recipes, error } = await supabase
        .from('ricette')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      const exportData = {
        version: 1,
        exported_at: new Date().toISOString(),
        exported_by: user.email,
        recipes: recipes || [],
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ricettario-backup-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      showMessage('success', `Esportate ${recipes?.length || 0} ricette`)
    } catch (err) {
      console.error('Errore export:', err)
      showMessage('error', 'Errore durante l\'esportazione')
    } finally {
      setExporting(false)
    }
  }

  const handleImport = async () => {
    if (!importFile || !user) return
    setImporting(true)
    try {
      const text = await importFile.text()
      const data = JSON.parse(text)

      if (!data.recipes || !Array.isArray(data.recipes)) {
        throw new Error('Formato file non valido')
      }

      let imported = 0
      for (const recipe of data.recipes) {
        const { id, created_at, updated_at, volte_fatta, ultima_volta, ...insertData } = recipe
        const { error } = await supabase.from('ricette').insert(insertData)
        if (!error) imported++
      }

      showMessage('success', `Importate ${imported} ricette su ${data.recipes.length}`)
      setImportFile(null)
    } catch (err) {
      console.error('Errore import:', err)
      showMessage('error', 'Errore durante l\'importazione: file non valido')
    } finally {
      setImporting(false)
    }
  }

  const handleAddIgnored = () => {
    const trimmed = newIgnoredInput.trim().toLowerCase()
    if (!trimmed) return
    if (ignoredIngredients.includes(trimmed)) {
      showMessage('error', 'Già presente nella lista')
      return
    }
    setIgnoredIngredients(prev => [...prev, trimmed].sort())
    setNewIgnoredInput('')
  }

  const handleRemoveIgnored = (ingredient: string) => {
    setIgnoredIngredients(prev => prev.filter(i => i !== ingredient))
  }

  const handleResetIgnored = () => {
    if (window.confirm('Ripristinare la lista predefinita (sale, pepe, olio, acqua, zucchero)?')) {
      setIgnoredIngredients([...DEFAULT_IGNORED_INGREDIENTS])
      showMessage('success', 'Lista ripristinata')
    }
  }

  if (authLoading) {
    return (
      <div className="page-container settings-page">
        <Header title="Impostazioni" />
        <div className="max-w-[720px] mx-auto px-4">
          <div className="loading-skeleton space-y-4">
            <div className="skeleton-card bg-[var(--card)] rounded-2xl border border-[var(--bordo)] p-4 animate-pulse">
              <div className="h-6 w-3/4 bg-[var(--bordo)] rounded mb-2" />
              <div className="h-4 w-1/2 bg-[var(--bordo)] rounded mb-3" />
              <div className="h-4 w-1/3 bg-[var(--bordo)] rounded mb-3" />
              <div className="h-4 w-1/4 bg-[var(--bordo)] rounded" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="page-container settings-page">
        <Header title="Impostazioni" />
        <main className="max-w-[720px] mx-auto px-4 pb-24">
          <div className="card bg-[var(--card)] rounded-2xl border border-[var(--bordo)] p-8 text-center">
            <AlertCircle size={48} className="mx-auto mb-4 text-[var(--accento)]" />
            <h2 className="text-xl font-semibold text-[var(--testo)] mb-2">Accesso richiesto</h2>
            <p className="text-[var(--secondario)]">Accedi per gestire le impostazioni</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="page-container settings-page">
      <Header title="Impostazioni" />

      {message && (
        <div className={clsx('toast fixed top-4 left-4 right-4 max-w-[720px] mx-auto z-50 px-4', message.type === 'success' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300')}>
          <div className="flex items-center gap-3 p-4 rounded-xl border border-current/20 animate-in slide-in-from-top-2 duration-200">
            {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            <span className="flex-1 text-sm">{message.text}</span>
            <Button variant="ghost" size="sm" onClick={() => setMessage(null)} aria-label="Chiudi">
              <X size={18} />
            </Button>
          </div>
        </div>
      )}

      <main className="max-w-[720px] mx-auto px-4 pb-24">
        {/* Tab navigation */}
        <nav className="settings-tabs flex gap-2 mb-6 overflow-x-auto pb-2" role="tablist" aria-label="Sezioni impostazioni">
          <Button
            variant={activeTab === 'profile' ? 'primary' : 'secondary'}
            onClick={() => setActiveTab('profile')}
            className="whitespace-nowrap gap-2"
          >
            <User size={18} /> Profilo
          </Button>
          <Button
            variant={activeTab === 'data' ? 'primary' : 'secondary'}
            onClick={() => setActiveTab('data')}
            className="whitespace-nowrap gap-2"
          >
            <Database size={18} /> Dati
          </Button>
          <Button
            variant={activeTab === 'pantry' ? 'primary' : 'secondary'}
            onClick={() => setActiveTab('pantry')}
            className="whitespace-nowrap gap-2"
          >
            <SettingsIcon size={18} /> Cosa ho in casa
          </Button>
        </nav>

        {/* Tab: Profilo */}
        {activeTab === 'profile' && (
          <section className="card bg-[var(--card)] rounded-2xl border border-[var(--bordo)] p-4 mb-4">
            <h2 className="text-lg font-semibold text-[var(--testo)] mb-4">Profilo</h2>
            <div className="profile-info flex items-center gap-4 p-4 bg-[var(--sfondo)] rounded-xl mb-4">
              <div className="avatar-placeholder w-16 h-16 rounded-2xl bg-[var(--accento)] text-[var(--accento-test)] flex items-center justify-center text-2xl font-bold flex-shrink-0">
                {user.email?.charAt(0).toUpperCase() || '?'}
              </div>
              <div className="profile-details flex-1 min-w-0">
                <p className="profile-email font-medium text-[var(--testo)] truncate">{user.email}</p>
                <p className="profile-role text-sm text-[var(--secondario)]">Ruolo: {user.user_metadata?.ruolo || 'user'}</p>
                <p className="profile-member text-sm text-[var(--secondario)]">Membro dal: {new Date(user.created_at).toLocaleDateString('it-IT')}</p>
              </div>
            </div>

            <div className="settings-actions">
              <Button variant="danger" onClick={handleLogout} className="w-full gap-2">
                <LogOut size={18} /> Esci
              </Button>
            </div>
          </section>
        )}

        {/* Tab: Dati */}
        {activeTab === 'data' && (
          <>
            <section className="card bg-[var(--card)] rounded-2xl border border-[var(--bordo)] p-4 mb-4">
              <h2 className="text-lg font-semibold text-[var(--testo)] mb-2">Esporta dati</h2>
              <p className="section-desc text-sm text-[var(--secondario)] mb-4">Scarica un backup JSON di tutte le ricette. Il file include ingredienti, passaggi, tag e metadati.</p>
              <Button
                variant="primary"
                onClick={handleExport}
                disabled={exporting}
                className="w-full gap-2"
              >
                {exporting ? <AlertCircle size={18} className="animate-spin" /> : <Download size={18} />}
                {exporting ? 'Esportazione...' : 'Esporta tutto (JSON)'}
              </Button>
            </section>

            <section className="card bg-[var(--card)] rounded-2xl border border-[var(--bordo)] p-4 mb-4">
              <h2 className="text-lg font-semibold text-[var(--testo)] mb-2">Importa dati</h2>
              <p className="section-desc text-sm text-[var(--secondario)] mb-4">Importa ricette da un file JSON esportato precedentemente. Le ricette verranno aggiunte (non sovrascritte).</p>
              <div className="import-area space-y-3">
                <input
                  type="file"
                  accept=".json"
                  onChange={e => setImportFile(e.target.files?.[0] || null)}
                  className="file-input w-full px-4 py-3 rounded-xl border border-[var(--bordo)] bg-[var(--sfondo)] text-[var(--testo)] focus:outline-none focus:ring-2 focus:ring-[var(--accento)] focus:border-transparent transition-all duration-150"
                  id="import-file"
                  disabled={importing}
                />
                {importFile && (
                  <p className="file-name text-sm text-[var(--secondario)] flex items-center gap-2">
                    <CheckCircle size={16} className="text-green-500" />
                    {importFile.name}
                  </p>
                )}
                <Button
                  variant="secondary"
                  className="w-full gap-2"
                  onClick={() => document.getElementById('import-file')?.click()}
                  disabled={importing}
                >
                  <Upload size={18} /> Scegli file JSON
                </Button>
                <Button
                  variant="primary"
                  onClick={handleImport}
                  disabled={importing || !importFile}
                  className="w-full gap-2"
                >
                  {importing ? <AlertCircle size={18} className="animate-spin" /> : <Upload size={18} />}
                  {importing ? 'Importazione...' : 'Importa'}
                </Button>
              </div>
            </section>

            <section className="card bg-[var(--card)] rounded-2xl border border-[var(--bordo)] p-4 mb-4 border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10">
              <h2 className="text-lg font-semibold text-[var(--testo)] mb-2 flex items-center gap-2">
                <AlertCircle size={20} className="text-amber-600 dark:text-amber-400" />
                Reset dati locali
              </h2>
              <p className="section-desc text-sm text-[var(--secondario)] mb-4">Cancella solo i dati salvati nel browser (lista ingredienti ignorati, preferenze mood). Le ricette su Supabase NON vengono toccate.</p>
              <Button
                variant="danger"
                onClick={() => {
                  if (window.confirm('Cancellare tutti i dati locali del browser?')) {
                    localStorage.clear()
                    showMessage('success', 'Dati locali cancellati. Ricarica la pagina.')
                  }
                }}
                className="w-full gap-2"
              >
                <Trash2 size={18} /> Cancella dati locali
              </Button>
            </section>
          </>
        )}

        {/* Tab: Cosa ho in casa */}
        {activeTab === 'pantry' && (
          <section className="card bg-[var(--card)] rounded-2xl border border-[var(--bordo)] p-4 mb-4">
            <h2 className="text-lg font-semibold text-[var(--testo)] mb-2">Ingredienti base da ignorare</h2>
            <p className="section-desc text-sm text-[var(--secondario)] mb-4">
              Questi ingredienti non vengono considerati nel calcolo "Cosa ho in casa".
              Modifica la lista secondo le tue abitudini.
            </p>

            <div className="ignored-list">
              {ignoredIngredients.length === 0 ? (
                <p className="empty-hint text-center text-[var(--secondario)] py-8">Nessun ingrediente ignorato</p>
              ) : (
                <ul className="space-y-2">
                  {ignoredIngredients.map(ing => (
                    <li key={ing} className="ignored-item flex items-center justify-between p-3 bg-[var(--sfondo)] rounded-xl">
                      <span className="text-[var(--testo)]">{ing}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveIgnored(ing)}
                        aria-label={`Rimuovi ${ing}`}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="add-ignored flex gap-2 mt-4">
                <input
                  type="text"
                  value={newIgnoredInput}
                  onChange={e => setNewIgnoredInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddIgnored()}
                  placeholder="Aggiungi ingrediente da ignorare (es. burro)"
                  className="form-input flex-1 px-4 py-3 rounded-xl border border-[var(--bordo)] bg-[var(--sfondo)] text-[var(--testo)] placeholder-[var(--secondario)] focus:outline-none focus:ring-2 focus:ring-[var(--accento)] focus:border-transparent transition-all duration-150"
                />
                <Button variant="secondary" onClick={handleAddIgnored} className="gap-2">
                  <Plus size={18} /> Aggiungi
                </Button>
              </div>

              <Button variant="ghost" onClick={handleResetIgnored} className="mt-4 w-full">
                Ripristina predefiniti ({DEFAULT_IGNORED_INGREDIENTS.join(', ')})
              </Button>
            </div>
          </section>
        )}

        {/* Info versione */}
        <footer className="settings-footer text-center text-sm text-[var(--secondario)] py-8">
          <p>Ricettario v1.0.0</p>
          <p>Dati su Supabase · Hosting Cloudflare Pages</p>
        </footer>
      </main>
    </div>
  )
}

// Re-export con nome compatibile
export { SettingsPage as Settings }