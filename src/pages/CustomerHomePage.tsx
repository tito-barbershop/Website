import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, get } from 'firebase/database';
import { db } from '../config/firebase';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../contexts/ToastContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { WorkerRatingBadge } from '../components/WorkerRatingBadge';
import { branding } from '../config/branding';
import { logoutUser } from '../lib/auth';
import * as workerService from '../services/workerService';
import * as serviceService from '../services/serviceService';
import type { Worker, Service } from '../types';

export function CustomerHomePage() {
  const navigate = useNavigate();
  useAuth();
  const { showToast } = useToast();

  const [workers, setWorkers] = useState<(Worker & { firebaseId: string })[]>([]);
  const [allServices, setAllServices] = useState<Map<string, (Service & { firebaseId: string })[]>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [ownerId, setOwnerId] = useState<string>('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);

        // Try to get owner ID from multiple sources:
        // 1. localStorage (from owner login on this device)
        // 2. Firebase (global shop configuration - accessible from any device)

        let ownerIdToUse: string | null = localStorage.getItem('currentShopOwnerId');

        // If not in localStorage, fetch from Firebase (for customers on new devices)
        if (!ownerIdToUse) {
          try {
            const shopConfigSnapshot = await get(ref(db, 'shopConfig/currentOwnerId'));
            if (shopConfigSnapshot.exists()) {
              ownerIdToUse = shopConfigSnapshot.val();
              // Cache it locally for future use
              if (ownerIdToUse) {
                localStorage.setItem('currentShopOwnerId', ownerIdToUse);
              }
            }
          } catch (error) {
            console.error('Error fetching owner ID from Firebase:', error);
          }
        }

        if (ownerIdToUse) {
          try {
            const workersData = await workerService.getWorkers(ownerIdToUse);
            const workersWithRatings = workersData.map((w) => ({
              ...w,
              ratings: w.ratings || [],
            }));
            setWorkers(workersWithRatings);
            setOwnerId(ownerIdToUse);

            const servicesData = await serviceService.getAllWorkerServices(ownerIdToUse);
            setAllServices(servicesData);
          } catch (loadError) {
            console.error('Error loading workers or services:', loadError);
            showToast('Failed to load barbers or services', 'error');
          }
        } else {
          showToast('Shop not configured. Please have the owner configure the shop first.', 'error');
        }
      } catch (error) {
        console.error('Error loading barbers:', error);
        showToast('Failed to load barbers', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [showToast]);

  const handleLogout = async () => {
    await logoutUser();
    localStorage.removeItem('currentShopOwnerId');
    navigate('/login');
  };

  const filteredWorkers = workers.filter(
    (worker) =>
      worker.role === 'worker' &&
      worker.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/customer/home')}>
            <img src={branding.logo} alt="logo" className="w-15 h-8" />
            <h1 className="text-xl font-bold text-gray-900">{branding.shopName}</h1>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <button
              onClick={() => navigate('/customer/appointments')}
              className="text-gray-600 hover:text-gray-900 font-medium"
            >
              My Appointments
            </button>
            <Button onClick={handleLogout} variant="outline" size="sm">
              Logout
            </Button>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden text-gray-600 text-2xl p-2 hover:text-gray-900"
          >
            ☰
          </button>
        </div>
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white border-t px-4 py-3 space-y-2">
            <button
              onClick={() => {
                navigate('/customer/appointments');
                setIsMobileMenuOpen(false);
              }}
              className="block w-full text-left text-gray-600 hover:text-gray-900 font-medium py-2"
            >
              My Appointments
            </button>
            <button
              onClick={() => {
                handleLogout();
                setIsMobileMenuOpen(false);
              }}
              className="block w-full text-left text-gray-600 hover:text-gray-900 font-medium py-2"
            >
              Logout
            </button>
          </div>
        )}
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Our Barbers</h2>
          <p className="text-gray-600 mb-6">
            Select a barber to view their services and book an appointment
          </p>

          <Input
            placeholder="Search barbers by name or specialty..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </div>

        {isLoading ? (
          <div className="text-center text-gray-500 py-12">Loading barbers...</div>
        ) : filteredWorkers.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            {searchTerm ? 'No barbers match your search' : 'No barbers available yet'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredWorkers.map((worker) => (
              <Card
                key={worker.firebaseId}
                className="hover:shadow-md transition-shadow flex flex-col p-5"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {worker.name}
                  {worker.phone && (
                    <>
                      {' • '}
                      <a
                        href={`tel:${worker.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-blue-600 hover:underline font-medium"
                      >
                        {worker.phone}
                      </a>
                    </>
                  )}
                </h3>
                <div className="mb-3">
                  <WorkerRatingBadge ratings={worker.ratings || []} />
                </div>

                {allServices.get(worker.firebaseId) && allServices.get(worker.firebaseId)!.length > 0 && (
                  <div className="mb-4 pb-3 border-b">
                    <div className="space-y-1">
                      {allServices.get(worker.firebaseId)!.slice(0, 2).map((service) => (
                        <p key={service.firebaseId} className="text-sm text-gray-600 flex justify-between">
                          <span>{service.name}</span>
                          <span className="text-blue-600 font-medium">{service.price.toFixed(2)} LE</span>
                        </p>
                      ))}
                      {allServices.get(worker.firebaseId)!.length > 2 && (
                        <p className="text-xs text-gray-500">+{allServices.get(worker.firebaseId)!.length - 2} more</p>
                      )}
                    </div>
                  </div>
                )}

                <Button
                  onClick={() => navigate('/book', { state: { selectedWorkerId: worker.firebaseId, ownerId } })}
                  className="w-full mt-auto"
                >
                  Book Now
                </Button>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
