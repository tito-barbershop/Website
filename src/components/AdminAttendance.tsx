import { useState, useEffect } from 'react';
import { Card } from './ui/Card';
import { Checkbox } from './ui/Checkbox';
import { Input } from './ui/Input';
import { useToast } from '../contexts/ToastContext';
import { formatDuration, calculateWorkedHours, getAttendanceStatus, formatDate } from '../lib/utils';
import * as attendanceService from '../services/attendanceService';
import * as attendanceIntegration from '../services/attendanceIntegration';
import { useAuth } from '../hooks/useAuth';
import type { Worker, Attendance } from '../types';

interface AdminAttendanceProps {
  workers: (Worker & { firebaseId: string })[];
  ownerId: string;
}

export function AdminAttendance({ workers, ownerId }: AdminAttendanceProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [attendanceMap, setAttendanceMap] = useState<Map<string, Attendance & { firebaseId: string }>>(
    new Map()
  );
  const [loading, setLoading] = useState(false);

  const isCashier = user?.role === 'cashier';

  useEffect(() => {
    loadAttendanceData();
  }, [selectedDate]);

  const loadAttendanceData = async () => {
    try {
      setLoading(true);
      let attendanceMap = await attendanceService.getAllWorkerAttendanceForDate(
        ownerId,
        selectedDate
      );

      // Create attendance records for workers who don't have one for this date
      for (const worker of workers) {
        if (!attendanceMap.has(worker.firebaseId)) {
          const newRecord = await attendanceService.getOrCreateAttendance(
            ownerId,
            worker.firebaseId,
            selectedDate
          );
          attendanceMap.set(worker.firebaseId, newRecord);
        }
      }

      setAttendanceMap(attendanceMap);
    } catch (error) {
      console.error('Error loading attendance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleArrivalToggle = async (workerId: string, isChecked: boolean) => {
    try {
      // Ensure attendance record exists first
      await attendanceService.getOrCreateAttendance(ownerId, workerId, selectedDate);

      const arrivalTime = isChecked ? Date.now() : null;
      await attendanceService.updateAttendanceArrival(ownerId, workerId, selectedDate, arrivalTime);

      // Small delay to ensure Firebase update completes
      await new Promise(resolve => setTimeout(resolve, 500));

      const updated = await attendanceService.getAttendanceForDate(ownerId, workerId, selectedDate);
      if (updated) {
        setAttendanceMap((prev) => {
          const newMap = new Map(prev);
          newMap.set(workerId, updated);
          return newMap;
        });

        // Trigger payment cycle check if work day is complete
        const worker = workers.find(w => w.firebaseId === workerId);
        if (worker) {
          await attendanceIntegration.handleAttendanceUpdate(ownerId, workerId, selectedDate, worker);
        }
      }
    } catch (error) {
      console.error('Error updating arrival:', error);
      showToast('Error updating attendance', 'error');
    }
  };

  const handleDepartureToggle = async (workerId: string, isChecked: boolean) => {
    try {
      // Ensure attendance record exists first
      await attendanceService.getOrCreateAttendance(ownerId, workerId, selectedDate);

      const departureTime = isChecked ? Date.now() : null;
      await attendanceService.updateAttendanceDeparture(ownerId, workerId, selectedDate, departureTime);

      // Small delay to ensure Firebase update completes
      await new Promise(resolve => setTimeout(resolve, 300));

      const updated = await attendanceService.getAttendanceForDate(ownerId, workerId, selectedDate);
      if (updated) {
        setAttendanceMap((prev) => {
          const newMap = new Map(prev);
          newMap.set(workerId, updated);
          return newMap;
        });

        // Trigger payment cycle check if work day is complete
        const worker = workers.find(w => w.firebaseId === workerId);
        if (worker) {
          const paymentResult = await attendanceIntegration.handleAttendanceUpdate(ownerId, workerId, selectedDate, worker);
          if (paymentResult) {
            showToast('Payment cycle completed and processed!', 'success');
          }
        }
      }
    } catch (error) {
      console.error('Error updating departure:', error);
      showToast('Error updating attendance', 'error');
    }
  };

  const getWorkerAttendance = (workerId: string): Attendance & { firebaseId: string } => {
    let attendance = attendanceMap.get(workerId);
    if (!attendance) {
      attendance = {
        id: selectedDate,
        firebaseId: selectedDate,
        workerId,
        date: selectedDate,
        arrivalTime: null,
        departureTime: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
    }
    return attendance;
  };

  if (loading && attendanceMap.size === 0) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-gray-600">Loading attendance data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Attendance Management</h1>
        <p className="text-gray-600 mt-2">Manage worker attendance for the day</p>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-4 mb-6 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-gray-700">Date:</label>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-40"
            />
          </div>
        </div>

        {workers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">No workers found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 text-sm">Worker</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-900 text-sm">Arrived</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-900 text-sm">Left</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 text-sm">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 text-sm">Worked Hours</th>
                </tr>
              </thead>
              <tbody>
                {workers.filter(w => !isCashier || w.role === 'worker').map((worker) => {
                  const attendance = getWorkerAttendance(worker.firebaseId);
                  const status = getAttendanceStatus(attendance.arrivalTime, attendance.departureTime);
                  const { duration, isActive } = calculateWorkedHours(
                    attendance.arrivalTime,
                    attendance.departureTime,
                    Date.now()
                  );
                  const hasArrived = attendance.arrivalTime !== null;
                  const hasDeparted = attendance.departureTime !== null;

                  return (
                    <tr key={worker.firebaseId} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-medium text-gray-900">{worker.name}</p>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <Checkbox
                          checked={hasArrived}
                          onChange={(checked) => handleArrivalToggle(worker.firebaseId, checked)}
                          disabled={false}
                        />
                      </td>
                      <td className="py-4 px-4 text-center">
                        <Checkbox
                          checked={hasDeparted}
                          onChange={(checked) => handleDepartureToggle(worker.firebaseId, checked)}
                          disabled={!hasArrived}
                        />
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                            status === 'absent'
                              ? 'bg-red-100 text-red-800'
                              : status === 'working'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {status === 'absent' && '❌ Absent'}
                          {status === 'working' && '⏱️ Working'}
                          {status === 'done' && '✅ Done'}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        {status === 'absent' ? (
                          <span className="text-gray-600">—</span>
                        ) : (
                          <span className="font-medium text-gray-900">
                            {formatDuration(duration)}
                            {isActive && ' (live)'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
