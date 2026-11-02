/**
 * Pagina Roulette - Placeholder FASE B
 * NOTA: Header e Mood Bar ora sono nel Layout component
 */

import { Shuffle, Loader2 } from 'lucide-react'

export function Roulette() {
  return (
    <div className="page-container roulette-page">
      <main className="roulette-content max-w-[720px] mx-auto px-4 pb-24 pt-4">
        <div className="card bg-[var(--card)] rounded-2xl border border-[var(--bordo)] p-8 shadow-[var(--elevazione-1)]">
          <div className="roulette-placeholder text-center">
            <Shuffle size={64} className="roulette-icon mx-auto mb-4 text-[var(--accento)]" />
            <h2 className="text-2xl font-semibold text-[var(--testo)] mb-2">Presto disponibile</h2>
            <p className="text-[var(--secondario)] mb-6">La roulette delle ricette sarà implementata nella FASE B.</p>
            <ul className="feature-list text-left max-w-xs mx-auto space-y-2 text-[var(--secondario)]">
              <li className="flex items-center gap-2">✓ Animazione girata</li>
              <li className="flex items-center gap-2">✓ Filtri: categoria, tempo max, escludi ultimi 14 giorni</li>
              <li className="flex items-center gap-2">✓ Pulsante "Rigira"</li>
              <li className="flex items-center gap-2">✓ Pulsante "La facciamo!" (aggiorna contatori, solo loggati)</li>
              <li className="flex items-center gap-2">✓ Esclude ricette "da completare"</li>
              <li className="flex items-center gap-2">✓ Rispetta filtro mood</li>
            </ul>
            <div className="placeholder-actions mt-8">
              <button className="btn-primary px-6 py-3 rounded-xl" disabled>
                <Loader2 size={18} className="spin mr-2" /> In sviluppo
              </button>
            </div>
          </div>
        </div>

        {/* Filtri placeholder */}
        <div className="card bg-[var(--card)] rounded-2xl border border-[var(--bordo)] p-4 mt-4 shadow-[var(--elevazione-1)]">
          <h3 className="text-lg font-semibold text-[var(--testo)] mb-4">Filtri (da implementare)</h3>
          <div className="filter-row flex flex-col sm:flex-row gap-4">
            <select className="form-select flex-1 px-4 py-3 rounded-xl border border-[var(--bordo)] bg-[var(--sfondo)] text-[var(--testo)] focus:outline-none focus:ring-2 focus:ring-[var(--accento)] focus:border-transparent" disabled>
              <option>Categoria: Tutte</option>
            </select>
            <input type="number" placeholder="Tempo max (min)" className="form-input flex-1 px-4 py-3 rounded-xl border border-[var(--bordo)] bg-[var(--sfondo)] text-[var(--testo)] placeholder-[var(--secondario)] focus:outline-none focus:ring-2 focus:ring-[var(--accento)] focus:border-transparent" disabled />
            <label className="checkbox-label flex items-center gap-2 cursor-pointer text-[var(--secondario)]">
              <input type="checkbox" disabled className="w-4 h-4 text-[var(--accento)] border-[var(--bordo)] rounded focus:ring-2 focus:ring-[var(--accento)]" />
              Escludi ultimi 14 giorni
            </label>
          </div>
        </div>
      </main>
    </div>
  )
}