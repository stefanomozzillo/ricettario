/**
 * Pagina Roulette - Placeholder FASE B
 */

import { Shuffle, Loader2 } from 'lucide-react'
import { useMood } from '../contexts/MoodContext'
import { MOOD_LABELS } from '../lib/config'
import type { Mood } from '../lib/config'

export function Roulette() {
  const { mood } = useMood()
  const moodLabel = mood !== 'tutti' ? MOOD_LABELS[mood as Mood] : 'Tutti'

  return (
    <div className="page-container roulette-page">
      <header className="page-header">
        <h1>Roulette</h1>
        <div className="header-meta">
          <span className="mood-badge">{moodLabel}</span>
        </div>
      </header>

      <main className="roulette-content">
        <div className="card roulette-card">
          <div className="roulette-placeholder">
            <Shuffle size={64} className="roulette-icon" />
            <h2>Presto disponibile</h2>
            <p>La roulette delle ricette sarà implementata nella FASE B.</p>
            <ul className="feature-list">
              <li>Animazione girata</li>
              <li>Filtri: categoria, tempo max, escludi ultimi 14 giorni</li>
              <li>Pulsante "Rigira"</li>
              <li>Pulsante "La facciamo!" (aggiorna contatori, solo loggati)</li>
              <li>Esclude ricette "da completare"</li>
              <li>Rispetta filtro mood</li>
            </ul>
            <div className="placeholder-actions">
              <button className="btn-primary" disabled>
                <Loader2 size={18} className="spin" /> In sviluppo
              </button>
            </div>
          </div>
        </div>

        {/* Filtri placeholder */}
        <div className="card roulette-filters">
          <h3>Filtri (da implementare)</h3>
          <div className="filter-row">
            <select className="form-select" disabled>
              <option>Categoria: Tutte</option>
            </select>
            <input type="number" placeholder="Tempo max (min)" className="form-input" disabled />
            <label className="checkbox-label">
              <input type="checkbox" disabled /> Escludi ultimi 14 giorni
            </label>
          </div>
        </div>
      </main>
    </div>
  )
}