/**
 * Pagina Impostazioni: profilo, logout, export JSON, gestione basi ignore
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, LogOut, Download, Upload, Trash2, AlertCircle, CheckCircle, X, Plus, Settings as SettingsIcon, Database } from 'lucide-react'
import { clsx } from 'clsx'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { DEFAULT_IGNORED_INGREDIENTS } from '../lib/config'

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
        <header className="settings-header">
          <h1>Impostazioni</h1>
        </header>
        <div className="loading-skeleton">
          <div className="skeleton-card">
            <div className="skeleton-line" style={{ width: '40%' }} />
            <div className="skeleton-line" style={{ width: '60%' }} />
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="page-container settings-page">
        <header className="settings-header">
          <h1>Impostazioni</h1>
        </header>
        <div className="card auth-required">
          <AlertCircle size={48} />
          <h2>Accesso richiesto</h2>
          <p>Accedi per gestire le impostazioni</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container settings-page">
      <header className="settings-header">
        <h1>Impostazioni</h1>
      </header>

      {message && (
        <div className={clsx('toast', message.type)}>
          <span>{message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}</span>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} aria-label="Chiudi"><X size={18} /></button>
        </div>
      )}

      {/* Tab navigation */}
      <nav className="settings-tabs" role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === 'profile'}
          className={clsx('tab-btn', activeTab === 'profile' && 'active')}
          onClick={() => setActiveTab('profile')}
        >
          <User size={18} /> Profilo
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'data'}
          className={clsx('tab-btn', activeTab === 'data' && 'active')}
          onClick={() => setActiveTab('data')}
        >
          <Database size={18} /> Dati
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'pantry'}
          className={clsx('tab-btn', activeTab === 'pantry' && 'active')}
          onClick={() => setActiveTab('pantry')}
        >
          <SettingsIcon size={18} /> Cosa ho in casa
        </button>
      </nav>

      {/* Tab: Profilo */}
      {activeTab === 'profile' && (
        <section className="settings-section card">
          <h2>Profilo</h2>
          <div className="profile-info">
            <div className="avatar-placeholder">
              {user.email?.charAt(0).toUpperCase() || '?'}
            </div>
            <div className="profile-details">
              <p className="profile-email">{user.email}</p>
              <p className="profile-role">Ruolo: {user.user_metadata?.ruolo || 'user'}</p>
              <p className="profile-member">Membro dal: {new Date(user.created_at).toLocaleDateString('it-IT')}</p>
            </div>
          </div>

          <div className="settings-actions">
            <button className="btn-danger" onClick={handleLogout}>
              <LogOut size={18} /> Esci
            </button>
          </div>
        </section>
      )}

      {/* Tab: Dati */}
      {activeTab === 'data' && (
        <>
          <section className="settings-section card">
            <h2>Esporta dati</h2>
            <p className="section-desc">Scarica un backup JSON di tutte le ricette. Il file include ingredienti, passaggi, tag e metadati.</p>
            <button
              className="btn-primary"
              onClick={handleExport}
              disabled={exporting}
            >
              {exporting ? <AlertCircle size={18} className="spin" /> : <Download size={18} />}
              {exporting ? 'Esportazione...' : 'Esporta tutto (JSON)'}
            </button>
          </section>

          <section className="settings-section card">
            <h2>Importa dati</h2>
            <p className="section-desc">Importa ricette da un file JSON esportato precedentemente. Le ricette verranno aggiunte (non sovrascritte).</p>
            <div className="import-area">
              <input
                type="file"
                accept=".json"
                onChange={e => setImportFile(e.target.files?.[0] || null)}
                className="file-input"
                id="import-file"
                disabled={importing}
              />
              <label htmlFor="import-file" className="btn-secondary">
                <Upload size={18} /> Scegli file JSON
              </label>
              {importFile && (
                <span className="file-name">{importFile.name}</span>
              )}
            </div>
            <button
              className="btn-primary"
              onClick={handleImport}
              disabled={importing || !importFile}
            >
              {importing ? <AlertCircle size={18} className="spin" /> : <Upload size={18} />}
              {importing ? 'Importazione...' : 'Importa'}
            </button>
          </section>

          <section className="settings-section card warning">
            <h2>Reset dati locali</h2>
            <p className="section-desc">Cancella solo i dati salvati nel browser (lista ingredienti ignorati, preferenze mood). Le ricette su Supabase NON vengono toccate.</p>
            <button
              className="btn-danger"
              onClick={() => {
                if (window.confirm('Cancellare tutti i dati locali del browser?')) {
                  localStorage.clear()
                  showMessage('success', 'Dati locali cancellati. Ricarica la pagina.')
                }
              }}
            >
              <Trash2 size={18} /> Cancella dati locali
            </button>
          </section>
        </>
      )}

      {/* Tab: Cosa ho in casa */}
      {activeTab === 'pantry' && (
        <section className="settings-section card">
          <h2>Ingredienti base da ignorare</h2>
          <p className="section-desc">
            Questi ingredienti non vengono considerati nel calcolo "Cosa ho in casa".
            Modifica la lista secondo le tue abitudini.
          </p>

          <div className="ignored-list">
            {ignoredIngredients.length === 0 ? (
              <p className="empty-hint">Nessun ingrediente ignorato</p>
            ) : (
              <ul>
                {ignoredIngredients.map(ing => (
                  <li key={ing} className="ignored-item">
                    <span>{ing}</span>
                    <button
                      type="button"
                      className="btn-remove-small"
                      onClick={() => handleRemoveIgnored(ing)}
                      aria-label={`Rimuovi ${ing}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="add-ignored">
              <input
                type="text"
                value={newIgnoredInput}
                onChange={e => setNewIgnoredInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddIgnored()}
                placeholder="Aggiungi ingrediente da ignorare (es. burro)"
                className="form-input"
              />
              <button className="btn-secondary" onClick={handleAddIgnored}>
                <Plus size={18} /> Aggiungi
              </button>
            </div>

            <button className="btn-text" onClick={handleResetIgnored}>
              Ripristina predefiniti ({DEFAULT_IGNORED_INGREDIENTS.join(', ')})
            </button>
          </div>
        </section>
      )}

      {/* Info versione */}
      <footer className="settings-footer">
        <p>Ricettario v1.0.0</p>
        <p>Dati su Supabase · Hosting Cloudflare Pages</p>
      </footer>
    </div>
  )
}

// Re-export con nome compatibile
export { SettingsPage as Settings }