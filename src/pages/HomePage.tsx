import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { branding } from '../config/branding';
import { logoutUser } from '../lib/auth';

export function HomePage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate('/login');
      return;
    }

    if (user.role === 'owner') {
      navigate('/admin', { replace: true });
    } else if (user.role === 'cashier') {
      navigate('/cashier', { replace: true });
    } else if (user.role === 'worker') {
      navigate('/worker', { replace: true });
    } else if (user.role === 'customer') {
      navigate('/customer/home', { replace: true });
    }
  }, [user, loading, navigate]);

  const handleLogout = async () => {
    await logoutUser();
    navigate('/login');
  };

  if (!user || loading) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{branding.logo}</span>
            <h1 className="text-xl font-bold text-gray-900">{branding.shopName}</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">{user.name}</span>
            <Button onClick={handleLogout} variant="outline" size="sm">
              Logout
            </Button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {user.role === 'customer' && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome to {branding.shopName}</h2>
              <p className="text-gray-600">{branding.tagline}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/customer/home')}>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Browse Barbers</h3>
                <p className="text-gray-600">View our professional barbers and their services</p>
              </div>

              <div className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/book')}>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Book Appointment</h3>
                <p className="text-gray-600">Schedule your next appointment</p>
              </div>

              <div className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/customer/appointments')}>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">My Appointments</h3>
                <p className="text-gray-600">View your upcoming and past appointments</p>
              </div>
            </div>
          </div>
        )}

        {user.role === 'owner' && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Shop Owner Dashboard</h2>
              <p className="text-gray-600">Manage your barbershop</p>
            </div>
            <Button onClick={() => navigate('/admin')} className="w-full md:w-auto">
              Go to Dashboard
            </Button>
          </div>
        )}

        {user.role === 'cashier' && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Cashier Dashboard</h2>
              <p className="text-gray-600">Manage operations</p>
            </div>
            <Button onClick={() => navigate('/cashier')} className="w-full md:w-auto">
              Go to Dashboard
            </Button>
          </div>
        )}

        {user.role === 'worker' && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Worker Dashboard</h2>
              <p className="text-gray-600">Manage your appointments</p>
            </div>
            <Button onClick={() => navigate('/worker')} className="w-full md:w-auto">
              Go to Dashboard
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
