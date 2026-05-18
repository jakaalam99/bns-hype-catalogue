import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { CatalogueLayout } from './components/layouts/CatalogueLayout.tsx'
import { AdminLayout } from './components/layouts/AdminLayout.tsx'
import { AdminLogin } from './pages/AdminLogin'
import { ProtectedRoute, PublicRoute } from './features/auth/ProtectedRoute'
import { hasDashboardAccess } from './features/auth/roleUtils'
import { Catalogue } from './pages/Catalogue'
import { AdminProducts } from './pages/AdminProducts'
import { AdminPrograms } from './pages/AdminPrograms'
import { CatalogueProduct } from './pages/CatalogueProduct'
import { PartnerCatalogue } from './pages/PartnerCatalogue'
import { ProgramCatalogue } from './pages/ProgramCatalogue'
import { AdminGeneralSettings } from './pages/settings/AdminGeneralSettings'
import { AdminSocialSettings } from './pages/settings/AdminSocialSettings'
import { AdminMarketplaceSettings } from './pages/settings/AdminMarketplaceSettings'
import { AdminOfflineStoreSettings } from './pages/settings/AdminOfflineStoreSettings'
import { AdminWarehouseSettings } from './pages/settings/AdminWarehouseSettings'
import { AdminDestinationSettings } from './pages/settings/AdminDestinationSettings'
import { AdminInventory } from './pages/AdminInventory'
import { AdminShipments } from './pages/AdminShipments'
import { AdminShipmentDetail } from './pages/AdminShipmentDetail'
import { NewDrops } from './pages/NewDrops'
import { NewDropDetail } from './pages/NewDropDetail'
import { AdminStoreConfigs } from './pages/settings/AdminStoreConfigs'
import { AdminOrderManagement } from './pages/AdminOrderManagement'
import { AdminOrderDetail } from './pages/AdminOrderDetail'
import { StoreOrderDetail } from './pages/store/StoreOrderDetail'
import { About } from './pages/About'
import { Basket } from './pages/Basket'
import { BrandGuidance } from './pages/BrandGuidance'
import { AdminBrandGuidance } from './pages/AdminBrandGuidance'
import { StoreSettingsProvider } from './features/catalogue/StoreSettingsContext'
import { BasketProvider } from './features/catalogue/BasketContext'
import { PageTracker } from './features/catalogue/PageTracker'
import { FaviconManager } from './components/FaviconManager'
import { StoreCatalogue } from './pages/store/StoreCatalogue'
import { StoreOrders } from './pages/store/StoreOrders'
import { AdminDashboard } from './pages/AdminDashboard'
import { AdminRequests } from './pages/AdminRequests'
import { AdminRequestDetail } from './pages/AdminRequestDetail'
import { RequestStatusPage } from './pages/RequestStatusPage.tsx'
import { useAuthStore } from './features/auth/useAuthStore'

function App() {
  useEffect(() => {
    useAuthStore.getState().initialize()
  }, [])

  return (
    <StoreSettingsProvider>
      <BasketProvider>
        <FaviconManager />
        <BrowserRouter>
          <PageTracker />
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<CatalogueLayout />}>
              <Route index element={<CatalogueIndex />} />
              <Route path="about" element={<About />} />
              <Route path="brand-guidance" element={<BrandGuidance />} />
              <Route path="basket" element={
                <ProtectedRoute allowRoles={['putus', 'BELI_PUTUS', 'ONLINE', 'CONSIGNMENT', 'STORE', 'EXPO', 'MKT', 'VM']}>
                  <Basket />
                </ProtectedRoute>
              } />
              <Route path="requests" element={
                <ProtectedRoute allowRoles={['putus', 'BELI_PUTUS', 'ONLINE', 'CONSIGNMENT', 'STORE', 'EXPO', 'MKT', 'VM']}>
                  <RequestStatusPage />
                </ProtectedRoute>
              } />
              <Route path="product/:id" element={<CatalogueProduct />} />
              <Route path="program/:id" element={<ProgramCatalogue />} />
               <Route path="partner/workspace" element={
                <ProtectedRoute allowRoles={['partner']}>
                  <PartnerCatalogue />
                </ProtectedRoute>
              } />
              <Route path="store/catalogue" element={
                <ProtectedRoute allowRoles={['STORE']}>
                  <StoreCatalogue />
                </ProtectedRoute>
              } />
              <Route path="store/orders" element={
                <ProtectedRoute allowRoles={['STORE']}>
                  <StoreOrders />
                </ProtectedRoute>
              } />
              <Route path="store/orders/:id" element={
                <ProtectedRoute allowRoles={['STORE']}>
                  <StoreOrderDetail />
                </ProtectedRoute>
              } />
              <Route path="new-drops" element={
                <ProtectedRoute allowRoles={['ADMIN', 'MD', 'SUPER_ADMIN', 'MERCHANDISER', 'STORE']}>
                  <NewDrops />
                </ProtectedRoute>
              } />
              <Route path="new-drops/:id" element={
                <ProtectedRoute allowRoles={['ADMIN', 'MD', 'SUPER_ADMIN', 'MERCHANDISER', 'STORE']}>
                  <NewDropDetail />
                </ProtectedRoute>
              } />
            </Route>

            {/* Admin Routes */}
            <Route element={<PublicRoute />}>
              <Route path="/admin/login" element={<AdminLogin />} />
            </Route>

            <Route element={<ProtectedRoute />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={
                  <ProtectedRoute>
                    <AdminIndexRedirect />
                  </ProtectedRoute>
                } />
                <Route path="dashboard" element={
                  <ProtectedRoute allowRoles={['ADMIN', 'MD', 'SUPER_ADMIN', 'MERCHANDISER']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                } />
                <Route path="requests" element={<AdminRequests />} />
                <Route path="requests/:id" element={<AdminRequestDetail />} />
                <Route path="products" element={<AdminProducts />} />
                <Route path="programs" element={<AdminPrograms />} />
                <Route path="brand-guidance" element={<AdminBrandGuidance />} />
                <Route path="inventory" element={<AdminInventory />} />
                <Route path="shipments" element={<AdminShipments />} />
                <Route path="shipments/:id" element={<AdminShipmentDetail />} />
                <Route path="new-drops" element={
                  <ProtectedRoute allowRoles={['ADMIN', 'MD', 'SUPER_ADMIN', 'MERCHANDISER', 'STORE']}>
                    <NewDrops />
                  </ProtectedRoute>
                } />
                <Route path="new-drops/:id" element={
                  <ProtectedRoute allowRoles={['ADMIN', 'MD', 'SUPER_ADMIN', 'MERCHANDISER', 'STORE']}>
                    <NewDropDetail />
                  </ProtectedRoute>
                } />
                <Route path="settings/general" element={<AdminGeneralSettings />} />
                <Route path="settings/socials" element={<AdminSocialSettings />} />
                <Route path="settings/marketplaces" element={<AdminMarketplaceSettings />} />
                <Route path="settings/offline-stores" element={<AdminOfflineStoreSettings />} />
                <Route path="settings/warehouses" element={<AdminWarehouseSettings />} />
                <Route path="settings/destinations" element={<AdminDestinationSettings />} />
                <Route path="settings/store-configs" element={<AdminStoreConfigs />} />
                <Route path="orders" element={<AdminOrderManagement />} />
                <Route path="orders/:id" element={<AdminOrderDetail />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </BasketProvider>
    </StoreSettingsProvider>
  )
}

function AdminIndexRedirect() {
  const { user } = useAuthStore();
  const role = user?.user_metadata?.role;
  
  if (hasDashboardAccess(role)) {
    return <Navigate to="/admin/dashboard" replace />;
  }
  return <Navigate to="/admin/requests" replace />;
}

function CatalogueIndex() {
  const { user } = useAuthStore();
  const role = (user?.user_metadata?.role || '').toUpperCase();
  
  if (role === 'PARTNER') {
    return <Navigate to="/partner/workspace" replace />;
  }
  if (role === 'STORE') {
    return <Navigate to="/store/catalogue" replace />;
  }
  return <Catalogue />;
}

export default App
