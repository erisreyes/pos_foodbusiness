/**
 * Root application shell.
 *
 * Provider order matters:
 * 1. AuthProvider — restores Supabase session and user role
 * 2. ConnectivityProvider — probes network health and runs offline sync
 *
 * Staff (cashiers) may only use `/`; other routes are wrapped in StaffRestrictedRoute.
 * See docs/ARCHITECTURE.md for the full route and auth map.
 */
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ConnectivityProvider } from './context/ConnectivityContext';
import { StaffRestrictedRoute } from './components/StaffRestrictedRoute';
import PosPage from './pages/PosPage';
import InventoryPage from './pages/InventoryPage';
import ReportDashboard from './pages/ReportDashboard';
import UsersPage from './pages/UsersPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ConnectivityProvider>
        <Routes>
          <Route path="/" element={<PosPage />} />
          <Route
            path="/inventory"
            element={
              <StaffRestrictedRoute>
                <InventoryPage />
              </StaffRestrictedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <StaffRestrictedRoute>
                <ReportDashboard />
              </StaffRestrictedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <StaffRestrictedRoute>
                <UsersPage />
              </StaffRestrictedRoute>
            }
          />
        </Routes>
        </ConnectivityProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
