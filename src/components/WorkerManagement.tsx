import { useState, useEffect } from 'react';
import type { Worker, WorkingHours, Service, Appointment } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Dialog } from './ui/Dialog';
import { WorkerRatingBadge } from './WorkerRatingBadge';
import * as attendanceService from '../services/attendanceService';
import { useAuth } from '../hooks/useAuth';

interface WorkerManagementProps {
  workers: (Worker & { firebaseId: string })[];
  services?: Map<string, (Service & { firebaseId: string })[]>;
  appointments?: (Appointment & { firebaseId: string })[];
  ownerId?: string;
  onAddWorker: (data: Omit<Worker, 'id'>, tempPassword: string) => Promise<void>;
  onUpdateWorker: (workerId: string, data: Partial<Worker>) => Promise<void>;
  onDeleteWorker: (workerId: string) => Promise<void>;
}

const DEFAULT_HOURS: WorkingHours = {
  monday: { start: '00:00', end: '00:00', isOpen: false },
  tuesday: { start: '11:00', end: '21:00', isOpen: true },
  wednesday: { start: '11:00', end: '21:00', isOpen: true },
  thursday: { start: '11:00', end: '21:00', isOpen: true },
  friday: { start: '11:00', end: '21:00', isOpen: true },
  saturday: { start: '11:00', end: '21:00', isOpen: true },
  sunday: { start: '11:00', end: '21:00', isOpen: true },
};

export function WorkerManagement({
  workers,
  services,
  appointments,
  ownerId = '',
  onAddWorker,
  onUpdateWorker,
  onDeleteWorker,
}: WorkerManagementProps) {
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'worker' | 'cashier'>('worker');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [showCredentials, setShowCredentials] = useState(false);
  const [workerCredentials, setWorkerCredentials] = useState<{
    email: string;
    tempPassword: string;
  } | null>(null);
  const [attendanceStats, setAttendanceStats] = useState<
    Map<string, { workDays: number; absentDays: number }>
  >(new Map());

  const isOwner = user?.role === 'owner';

  useEffect(() => {
    if (!ownerId) return;
    loadAttendanceStats();
  }, [ownerId, workers]);

  const loadAttendanceStats = async () => {
    const today = new Date().toISOString().split('T')[0];
    const stats = new Map<string, { workDays: number; absentDays: number }>();

    for (const worker of workers) {
      try {
        const workerStats = await attendanceService.getWorkerAttendanceStats(
          ownerId,
          worker.firebaseId,
          '2020-01-01',
          today
        );
        stats.set(worker.firebaseId, workerStats);
      } catch (error) {
        console.error(`Error loading attendance stats for ${worker.firebaseId}:`, error);
      }
    }

    setAttendanceStats(stats);
  };

  const handleOpenDialog = (worker?: Worker & { firebaseId: string }) => {
    if (worker) {
      setEditingId(worker.firebaseId);
      setFormData({
        name: worker.name,
        email: worker.email,
        phone: worker.phone,
      });
      setSelectedRole((worker.role as 'worker' | 'cashier') || 'worker');
    } else {
      setEditingId(null);
      setFormData({ name: '', email: '', phone: '' });
      setSelectedRole('worker');
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      if (editingId) {
        await onUpdateWorker(editingId, { ...formData, role: selectedRole });
        setIsDialogOpen(false);
        setFormData({ name: '', email: '', phone: '' });
      } else {
        // Generate temporary password for new worker/cashier
        const tempPassword = Math.random().toString(36).substring(2, 10) +
                            Math.random().toString(36).substring(2, 10);

        await onAddWorker(
          {
            ...formData,
            role: selectedRole,
            workingHours: DEFAULT_HOURS,
          } as Omit<Worker, 'id'>,
          tempPassword
        );

        // Show credentials dialog with temp password
        setWorkerCredentials({
          email: formData.email,
          tempPassword,
        });
        setShowCredentials(true);

        // Close the add worker dialog
        setIsDialogOpen(false);
        setFormData({ name: '', email: '', phone: '' });
      }
    } catch (error) {
      console.error('Error saving worker:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Workers & Cashiers Management</h2>
        {isOwner && <Button onClick={() => handleOpenDialog()}>+ Add User</Button>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {workers.map((worker) => {
          const workerAllAppointments = appointments?.filter(
            (apt) => apt.workerId === worker.firebaseId && apt.status !== 'cancelled'
          ) || [];
          const workerCompletedAppointments = workerAllAppointments.filter(
            (apt) => apt.status === 'completed'
          );
          const workerServices = services?.get(worker.firebaseId) || [];

          return (
            <Card key={worker.firebaseId} className="p-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-lg text-gray-900">{worker.name}</h3>
                  {worker.ratings && worker.ratings.length > 0 && (
                    <div className="mt-2 mb-2">
                      <WorkerRatingBadge ratings={worker.ratings} />
                    </div>
                  )}
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <a
                      href={`tel:${worker.phone}`}
                      className="text-sm text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                    >
                      {worker.phone}
                    </a>
                    <span className="text-gray-400">•</span>
                    <a
                      href={`mailto:${worker.email}`}
                      className="text-sm text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                    >
                      {worker.email}
                    </a>
                  </div>
                </div>

                {worker.role === 'worker' && (
                  <div className="grid grid-cols-2 gap-3 py-3 border-y border-gray-200">
                    <div className="text-center">
                      <p className="text-xs text-gray-600">All Appointments</p>
                      <p className="text-2xl font-bold text-blue-600">{workerAllAppointments.length}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-600">Completed Appointments</p>
                      <p className="text-2xl font-bold text-green-600">{workerCompletedAppointments.length}</p>
                    </div>
                  </div>
                )}

                {ownerId && (
                  <div className="grid grid-cols-2 gap-3 py-3 border-b border-gray-200">
                    <div className="text-center">
                      <p className="text-xs text-gray-600">Work Days</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {attendanceStats.get(worker.firebaseId)?.workDays || 0}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-600">Absent Days</p>
                      <p className="text-2xl font-bold text-red-600">
                        {attendanceStats.get(worker.firebaseId)?.absentDays || 0}
                      </p>
                    </div>
                  </div>
                )}

                {workerServices.length > 0 && (
                  <div className="bg-gray-50 rounded p-3">
                    <p className="text-xs font-semibold text-gray-700 mb-2">{workerServices.length} Service{workerServices.length > 1 ? 's' : ''}:</p>
                    <div className="flex flex-wrap gap-1">
                      {workerServices.slice(0, 3).map((service, index) => (
                        <div key={service.firebaseId} className="flex items-center gap-1">
                          <span className="text-xs text-gray-600">{service.name}</span>
                          {index < Math.min(2, workerServices.length - 1) && (
                            <span className="text-gray-400">•</span>
                          )}
                        </div>
                      ))}
                      {workerServices.length > 3 && (
                        <span className="text-xs text-gray-500 font-medium">
                          +{workerServices.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex space-x-2">
                {isOwner && (
                  <>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={async () => {
                        try {
                          const { getTemporaryCredentials } = await import('../services/workerService');
                          const creds = await getTemporaryCredentials(worker.email);
                          if (creds) {
                            setWorkerCredentials({
                              email: worker.email,
                              tempPassword: creds.tempPassword,
                            });
                          } else {
                            setWorkerCredentials({
                              email: worker.email,
                              tempPassword: '(No temporary password stored)',
                            });
                          }
                        } catch (error) {
                          console.error('Error fetching credentials:', error);
                          setWorkerCredentials({
                            email: worker.email,
                            tempPassword: '(Error retrieving password)',
                          });
                        }
                        setShowCredentials(true);
                      }}
                    >
                      Credentials
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleOpenDialog(worker)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="text-red-600 hover:bg-red-50"
                      onClick={() => onDeleteWorker(worker.firebaseId)}
                    >
                      Delete
                    </Button>
                  </>
                )}
              </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <div className="space-y-4">
          <h3 className="text-lg font-bold">
            {editingId ? 'Edit User' : 'Add New User'}
          </h3>

          <div className="space-y-3">
            <Input
              label="Name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />
            <Input
              label="Phone"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
            />
            {!editingId && (
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">Role</label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="role"
                      value="worker"
                      checked={selectedRole === 'worker'}
                      onChange={(e) => setSelectedRole(e.target.value as 'worker' | 'cashier')}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-700">Worker</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="role"
                      value="cashier"
                      checked={selectedRole === 'cashier'}
                      onChange={(e) => setSelectedRole(e.target.value as 'worker' | 'cashier')}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-700">Cashier</span>
                  </label>
                </div>
              </div>
            )}
            {editingId && (
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">Role</label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="role"
                      value="worker"
                      checked={selectedRole === 'worker'}
                      onChange={(e) => setSelectedRole(e.target.value as 'worker' | 'cashier')}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-700">Worker</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="role"
                      value="cashier"
                      checked={selectedRole === 'cashier'}
                      onChange={(e) => setSelectedRole(e.target.value as 'worker' | 'cashier')}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-700">Cashier</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              variant="secondary"
              onClick={() => setIsDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </Dialog>

      {showCredentials && workerCredentials && (
        <Dialog open={showCredentials} onOpenChange={setShowCredentials}>
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-green-600">✅ User Added Successfully!</h3>

            <p className="text-gray-700 font-medium">
              Share these login credentials with the user:
            </p>

            <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 space-y-4">
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">📧 Email:</p>
                <div className="flex items-center justify-between bg-white p-3 rounded border border-gray-300">
                  <p className="font-mono text-sm font-bold text-blue-600">{workerCredentials.email}</p>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      navigator.clipboard.writeText(workerCredentials.email);
                    }}
                  >
                    Copy
                  </Button>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">🔐 Temporary Password:</p>
                <div className="flex items-center justify-between bg-white p-3 rounded border border-gray-300">
                  <p className="font-mono text-sm font-bold text-red-600">{workerCredentials.tempPassword}</p>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      navigator.clipboard.writeText(workerCredentials.tempPassword);
                    }}
                  >
                    Copy
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-gray-700">
                📋 Login Instructions:
              </p>
              <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
                <li>Go to login page at <a href="https://barber-shop8.vercel.app/login" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline">https://barber-shop8.vercel.app/login</a></li>
                <li>Enter the email address and the temporary password above</li>
                <li>Click "Sign In"</li>
                <li>Change password on first login</li>
              </ol>
            </div>

            <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3 space-y-2">
              <p className="text-xs font-semibold text-yellow-900">⚠️ Important:</p>
              <ul className="text-xs text-yellow-800 space-y-1 list-disc list-inside">
                <li>These credentials expire in 7 days</li>
                <li>Worker should change password after first login</li>
              </ul>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setShowCredentials(false)}>
                Done
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
