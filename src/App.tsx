import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { CatalogueLayout } from './components/layouts/CatalogueLayout.tsx'
import { AdminLayout } from './components/layouts/AdminLayout.tsx'
import { AdminLogin } from './pages/AdminLogin'
import { ProtectedRoute, PublicRoute } from './features/auth/ProtectedRoute'
import { Catalogue } from './pages/Catalogue'
import { AdminProducts } from './pages/AdminProducts'
import { AdminPrograms } from './pages/AdminPrograms'
import { CatalogueProduct } from './pages/CatalogueProduct'
import { ProgramCatalogue } from './pages/ProgramCatalogue'
import { AdminSettings } from './pages/AdminSettings'
import { About } from './pages/About'
import { StoreSettingsProvider } from './features/catalogue/StoreSettingsContext'
import { PageTracker } from './features/catalogue/PageTracker'

import { AdminDashboard } from './pages/AdminDashboard'

function App() {
  return (
    <StoreSettingsProvider>
      <BrowserRouter>
        <PageTracker />
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<CatalogueLayout />}>
            <Route index element={<Catalogue />} />
            <Route path="about" element={<About />} />
            <Route path="product/:id" element={<CatalogueProduct />} />
            <Route path="program/:id" element={<ProgramCatalogue />} />
          </Route>

          {/* Admin Routes */}
          <Route element={<PublicRoute />}>
            <Route path="/admin/login" element={<AdminLogin />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="products" element={<AdminProducts />} />
              <Route path="programs" element={<AdminPrograms />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </StoreSettingsProvider>
  )
}

export default App
