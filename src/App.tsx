import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { MoodProvider } from './contexts/MoodContext'
import { Layout } from './components/Layout'
import { RecipeList } from './pages/RecipeList'
import { RecipeDetail } from './pages/RecipeDetail'
import { RecipeForm } from './pages/RecipeForm'
import { Settings } from './pages/Settings'
import { Roulette } from './pages/Roulette'
import { Pantry } from './pages/Pantry'
import { HistoryPage } from './pages/HistoryPage'
import { LandingPage } from './pages/LandingPage'
import { ErrorBoundary } from './components/ErrorBoundary'
import { NetworkStatus } from './components/NetworkStatus'
import { Loader2 } from 'lucide-react'

// Wrapper per route protette - redirect a LandingPage se non autenticato
function RequireAuth() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="loading-screen min-h-screen flex items-center justify-center bg-[var(--sfondo)]">
        <Loader2 className="spin" size={32} style={{ color: 'var(--accento)' }} />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

// Wrapper per route pubbliche - redirect a home se autenticato
function RequireGuest() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="loading-screen min-h-screen flex items-center justify-center bg-[var(--sfondo)]">
        <Loader2 className="spin" size={32} style={{ color: 'var(--accento)' }} />
      </div>
    )
  }

  if (user) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <MoodProvider>
          <ErrorBoundary>
            <NetworkStatus />
            <Routes>
              {/* Route pubbliche (solo login) */}
              <Route element={<RequireGuest />}>
                <Route path="/login" element={<LandingPage />} />
              </Route>

              {/* Route protette (tutta l'app) */}
              <Route element={<RequireAuth />}>
                <Route path="/" element={<Layout />}>
                  <Route index element={<RecipeList />} />
                  <Route path="recipe/:id" element={<RecipeDetail />} />
                  <Route path="add" element={<RecipeForm />} />
                  <Route path="edit/:id" element={<RecipeForm />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="roulette" element={<Roulette />} />
                  <Route path="pantry" element={<Pantry />} />
                  <Route path="history" element={<HistoryPage />} />
                  {/* FASE C - placeholder */}
                  {/* <Route path="ai" element={<AIAssistant />} /> */}
                </Route>
              </Route>

              {/* Redirect root a login se non autenticato, altrimenti a home */}
              <Route path="/" element={<Navigate to="/login" replace />} />
            </Routes>
          </ErrorBoundary>
        </MoodProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App