import { useState } from 'react';
import type { Service, Worker } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Dialog } from './ui/Dialog';

interface ServiceManagementProps {
  ownerId: string;
  workers: (Worker & { firebaseId: string })[];
  services: Map<string, (Service & { firebaseId: string })[]>;
  onAddService: (workerId: string, data: Omit<Service, 'id'>) => Promise<void>;
  onUpdateService: (workerId: string, serviceId: string, data: Partial<Service>) => Promise<void>;
  onDeleteService: (workerId: string, serviceId: string) => Promise<void>;
}

export function ServiceManagement({
  workers,
  services,
  onAddService,
  onUpdateService,
  onDeleteService,
}: ServiceManagementProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    duration: 30,
    price: 0,
  });

  const handleOpenDialog = (
    workerId: string,
    service?: Service & { firebaseId: string }
  ) => {
    setSelectedWorkerId(workerId);
    if (service) {
      setEditingServiceId(service.firebaseId);
      setFormData({
        name: service.name,
        description: service.description,
        duration: service.duration,
        price: service.price,
      });
    } else {
      setEditingServiceId(null);
      setFormData({ name: '', description: '', duration: 30, price: 0 });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!selectedWorkerId) return;

    setLoading(true);
    try {
      if (editingServiceId) {
        await onUpdateService(selectedWorkerId, editingServiceId, formData);
      } else {
        await onAddService(selectedWorkerId, {
          workerId: selectedWorkerId,
          ...formData,
        } as Omit<Service, 'id'>);
      }
      setIsDialogOpen(false);
      setFormData({ name: '', description: '', duration: 30, price: 0 });
    } catch (error) {
      console.error('Error saving service:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Services Management</h2>

      {workers.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-gray-600">No workers available. Add workers first.</p>
        </Card>
      ) : (
        workers.map((worker) => (
          <div key={worker.firebaseId} className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold text-gray-900">
                {worker.name}'s Services
              </h3>
              <Button
                size="sm"
                onClick={() => handleOpenDialog(worker.firebaseId)}
              >
                + Add Service
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {services.get(worker.firebaseId)?.map((service) => (
                <Card key={service.firebaseId} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2 mb-2">
                        <h4 className="font-bold text-gray-900">{service.name}</h4>
                        <span className="text-sm text-gray-600">
                          • ⏱️ {service.duration} min •
                        </span>
                        <span className="text-sm font-semibold text-green-600">
                          {service.price.toFixed(2)} LE
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {service.description}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleOpenDialog(worker.firebaseId, service)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="text-red-600 hover:bg-red-50"
                        onClick={() =>
                          onDeleteService(worker.firebaseId, service.firebaseId)
                        }
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </Card>
              )) || (
                <Card className="p-4 col-span-full text-center">
                  <p className="text-gray-600">No services added yet.</p>
                </Card>
              )}
            </div>
          </div>
        ))
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <div className="space-y-4">
          <h3 className="text-lg font-bold">
            {editingServiceId ? 'Edit Service' : 'Add New Service'}
          </h3>

          <div className="space-y-3">
            <Input
              label="Service Name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
            <Input
              label="Description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
            />
            <Input
              label="Duration (minutes)"
              type="number"
              value={formData.duration}
              onChange={(e) =>
                setFormData({ ...formData, duration: parseInt(e.target.value) })
              }
            />
            <Input
              label="Price (LE)"
              type="number"
              step="0.01"
              value={formData.price}
              onChange={(e) =>
                setFormData({ ...formData, price: parseFloat(e.target.value) })
              }
            />
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
    </div>
  );
}
