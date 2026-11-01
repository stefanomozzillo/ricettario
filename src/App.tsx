import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { MoodProvider } from './contexts/MoodContext'
import { Layout } from './components/Layout'
import { RecipeList } from './pages/RecipeList'
import { RecipeDetail } from './pages/RecipeDetail'
import { RecipeForm } from './pages/RecipeForm'
import { Settings } from './pages/Settings'
import { Roulette } from './pages/Roulette'
import { Pantry } from './pages/Pantry'
import { ErrorBoundary } from './components/ErrorBoundary'
import { NetworkStatus } from './components/NetworkStatus'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <MoodProvider>
          <ErrorBoundary>
            <NetworkStatus />
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<RecipeList />} />
                <Route path="recipe/:id" element={<RecipeDetail />} />
                <Route path="add" element={<RecipeForm />} />
                <Route path="edit/:id" element={<RecipeForm />} />
                <Route path="settings" element={<Settings />} />
                <Route path="roulette" element={<Roulette />} />
                <Route path="pantry" element={<Pantry />} />
                {/* FASE C - placeholder */}
                {/* <Route path="ai" element={<AIAssistant />} /> */}
              </Route>
            </Routes>
          </ErrorBoundary>
        </MoodProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App