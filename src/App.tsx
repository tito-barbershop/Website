import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { ToastProvider } from './contexts/ToastContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { CustomerHomePage } from './pages/CustomerHomePage';
import { CustomerAppointmentsPage } from './pages/CustomerAppointmentsPage';
import { BookingPage } from './pages/BookingPage';
import { HomePage } from './pages/HomePage';

const OwnerDashboard = lazy(() => import('./pages/OwnerDashboard'));
const WorkerDashboard = lazy(() => import('./pages/WorkerDashboard'));

const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <p className="text-gray-600">Loading...</p>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/customer/home"
            element={
              <ProtectedRoute allowedRoles={['customer']}>
                <CustomerHomePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/customer/appointments"
            element={
              <ProtectedRoute allowedRoles={['customer']}>
                <CustomerAppointmentsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/book"
            element={
              <ProtectedRoute allowedRoles={['customer']}>
                <BookingPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/*"
            element={
              <ProtectedRoute allowedRoles={['owner']}>
                <Suspense fallback={<LoadingSpinner />}>
                  <OwnerDashboard />
                </Suspense>
              </ProtectedRoute>
            }
          />

          <Route
            path="/cashier/*"
            element={
              <ProtectedRoute allowedRoles={['cashier']}>
                <Suspense fallback={<LoadingSpinner />}>
                  <OwnerDashboard />
                </Suspense>
              </ProtectedRoute>
            }
          />

          <Route
            path="/worker/*"
            element={
              <ProtectedRoute allowedRoles={['worker']}>
                <Suspense fallback={<LoadingSpinner />}>
                  <WorkerDashboard />
                </Suspense>
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
