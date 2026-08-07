import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import { branding } from '../config/branding';
import { Button } from './ui/Button';

interface WorkerLayoutProps {
  children: React.ReactNode;
  currentTab: string;
  onTabChange: (tab: string) => void;
  workerName?: string;
}

export function WorkerLayout({ children, currentTab, onTabChange, workerName = 'Worker' }: WorkerLayoutProps) {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const tabs = [
    { id: 'appointments', label: 'My Appointments', icon: '📅' },
    { id: 'schedule', label: 'My Schedule', icon: '⏰' },
    { id: 'attendance', label: 'Attendance', icon: '✅' },
    { id: 'ratings', label: 'My Rating', icon: '⭐' },
    { id: 'financials', label: 'Financials', icon: '💰' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{branding.logo}</span>
              <h1 className="text-2xl font-bold text-blue-600">{branding.shopName}</h1>
            </div>
            <div className="hidden md:flex items-center space-x-4">
              <span className="text-gray-700 font-medium">Welcome, {workerName}</span>
              <Button variant="secondary" onClick={handleLogout} className="text-red-600">
                Logout
              </Button>
            </div>
            <button
              className="md:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              ☰
            </button>
          </div>
        </div>
      </nav>

      <div className="flex">
        <aside className={`${
          isMenuOpen ? 'block' : 'hidden'
        } md:block w-full md:w-64 bg-white shadow-sm`}>
          <nav className="p-4 space-y-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  onTabChange(tab.id);
                  setIsMenuOpen(false);
                }}
                className={`w-full text-left px-4 py-2 rounded-lg flex items-center space-x-3 transition-colors ${
                  currentTab === tab.id
                    ? 'bg-blue-100 text-blue-700 font-semibold'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 rounded-lg text-red-600 hover:bg-red-50 flex items-center space-x-3 md:hidden mt-4"
            >
              <span>🚪</span>
              <span>Logout</span>
            </button>
          </nav>
        </aside>

        <main className="flex-1 p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
