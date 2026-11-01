/**
 * Pagina Cosa ho in casa - Placeholder FASE B
 */

import { Home, Plus, Trash2, CheckCircle, AlertCircle, Search } from 'lucide-react'
import { useState } from 'react'
import { useMood } from '../contexts/MoodContext'
import { MOOD_LABELS } from '../lib/config'
import { DEFAULT_IGNORED_INGREDIENTS } from '../lib/config'
import type { Mood } from '../lib/config'

export function Pantry() {
  const { mood } = useMood()
  const moodLabel = mood !== 'tutti' ? MOOD_LABELS[mood as Mood] : 'Tutti'
  const [ingredients, setIngredients] = useState<string[]>([])
  const [input, setInput] = useState('')
  const [ignoredIngredients] = useState<string[]>([...DEFAULT_IGNORED_INGREDIENTS])

  const handleAdd = () => {
    const trimmed = input.trim().toLowerCase()
    if (trimmed && !ingredients.includes(trimmed)) {
      setIngredients(prev => [...prev, trimmed].sort())
      setInput('')
    }
  }

  const handleRemove = (ing: string) => {
    setIngredients(prev => prev.filter(i => i !== ing))
  }

  return (
    <div className="page-container pantry-page">
      <header className="page-header">
        <h1>Cosa ho in casa</h1>
        <div className="header-meta">
          <span className="mood-badge">{moodLabel}</span>
        </div>
      </header>

      <main className="pantry-content">
        {/* Sezione ingredienti disponibili */}
        <section className="card pantry-section">
          <div className="section-header">
            <h2>Ingredienti disponibili</h2>
          </div>

          <div className="add-ingredient">
            <div className="search-wrapper">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                placeholder="Aggiungi ingrediente (es. pomodori, pasta, uova...)"
                className="form-input"
                autoFocus
              />
            </div>
            <button className="btn-primary" onClick={handleAdd} disabled={!input.trim()}>
              <Plus size={18} /> Aggiungi
            </button>
          </div>

          {ingredients.length > 0 && (
            <ul className="ingredients-chips">
              {ingredients.map(ing => (
                <li key={ing} className="ingredient-chip">
                  <span>{ing}</span>
                  <button
                    type="button"
                    className="chip-remove"
                    onClick={() => handleRemove(ing)}
                    aria-label={`Rimuovi ${ing}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {ingredients.length === 0 && (
            <p className="empty-hint">Nessun ingrediente aggiunto. Inizia a digitare sopra.</p>
          )}
        </section>

        {/* Ingredienti base ignorati */}
        <section className="card pantry-section">
          <h3>Ingredienti base ignorati (modificabili in Impostazioni)</h3>
          <ul className="ignored-list">
            {ignoredIngredients.map(ing => (
              <li key={ing} className="ignored-item">
                <span>{ing}</span>
                <span className="ignored-badge">Base</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Risultati placeholder */}
        <section className="card pantry-section">
          <h2>Ricette trovate</h2>
          <div className="pantry-placeholder">
            <Home size={48} className="pantry-icon" />
            <h3>Presto disponibile</h3>
            <p>Il calcolo match "Cosa ho in casa" sarà implementato nella FASE B.</p>
            <ul className="feature-list">
              <li>Autocomplete ingredienti dal database</li>
              <li>Chip ingredienti selezionati</li>
              <li>Basi ignorabili modificabili in Impostazioni</li>
              <li>Calcolo match per ingredienti unici (per nome)</li>
              <li>Sezione "Pronte ora" (tutto disponibile)</li>
              <li>Sezione "Ti manca poco" (1-2 mancanti elencati)</li>
              <li>Rispetta filtro mood</li>
              <li>Pulsante "Sostituzioni" AI per ingredienti mancanti (FASE C)</li>
            </ul>
          </div>

          {/* Placeholder sezioni */}
          <div className="pantry-sections-placeholder">
            <div className="section-placeholder ready">
              <CheckCircle size={24} />
              <div>
                <h4>Pronte ora</h4>
                <p>Ricette con tutti gli ingredienti disponibili</p>
              </div>
            </div>
            <div className="section-placeholder missing">
              <AlertCircle size={24} />
              <div>
                <h4>Ti manca poco</h4>
                <p>Ricette con 1-2 ingredienti mancanti</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}