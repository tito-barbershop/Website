import { useState } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import type { WorkingHours } from '../types';

interface WorkerScheduleDialogProps {
  isOpen: boolean;
  workingHours: WorkingHours | undefined;
  onSave: (workingHours: WorkingHours) => Promise<void>;
  onClose: () => void;
  isLoading?: boolean;
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

export function WorkerScheduleDialog({
  isOpen,
  workingHours,
  onSave,
  onClose,
  isLoading = false,
}: WorkerScheduleDialogProps) {
  const [schedule, setSchedule] = useState<WorkingHours>(
    workingHours || {
      monday: { start: '09:00', end: '18:00', isOpen: true },
      tuesday: { start: '09:00', end: '18:00', isOpen: true },
      wednesday: { start: '09:00', end: '18:00', isOpen: true },
      thursday: { start: '09:00', end: '18:00', isOpen: true },
      friday: { start: '09:00', end: '18:00', isOpen: true },
      saturday: { start: '09:00', end: '14:00', isOpen: true },
      sunday: { start: '00:00', end: '00:00', isOpen: false },
    }
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleDayToggle = (day: typeof DAYS[number]) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        isOpen: !prev[day].isOpen,
      },
    }));
  };

  const handleTimeChange = (day: typeof DAYS[number], field: 'start' | 'end', value: string) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(schedule);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-2xl max-h-screen overflow-y-auto">
        <Card className="m-auto">
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Update Your Schedule</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {DAYS.map((day) => {
                const daySchedule = schedule[day];
                const dayLabel = day.charAt(0).toUpperCase() + day.slice(1);

                return (
                  <div
                    key={day}
                    className={`border rounded-lg p-3 transition-colors ${
                      daySchedule.isOpen
                        ? 'border-blue-200 bg-blue-50'
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <label className="font-semibold text-gray-900 text-sm">{dayLabel}</label>
                      <label className="flex items-center space-x-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={daySchedule.isOpen}
                          onChange={() => handleDayToggle(day)}
                          className="w-4 h-4 text-blue-600 rounded"
                          disabled={isLoading || isSaving}
                        />
                        <span className="text-xs text-gray-600">
                          {daySchedule.isOpen ? 'Open' : 'Closed'}
                        </span>
                      </label>
                    </div>

                    {daySchedule.isOpen && (
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Start
                          </label>
                          <Input
                            type="time"
                            value={daySchedule.start}
                            onChange={(e) => handleTimeChange(day, 'start', e.target.value)}
                            disabled={isLoading || isSaving}
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            End
                          </label>
                          <Input
                            type="time"
                            value={daySchedule.end}
                            onChange={(e) => handleTimeChange(day, 'end', e.target.value)}
                            disabled={isLoading || isSaving}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
                })}
            </div>

            <div className="flex gap-2 pt-6 mt-6 border-t">
              <Button
                variant="secondary"
                onClick={onClose}
                disabled={isLoading || isSaving}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                isLoading={isSaving}
                disabled={isLoading || isSaving}
                className="flex-1"
              >
                Save Schedule
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
