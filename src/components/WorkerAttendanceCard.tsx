import { useEffect, useState } from 'react';
import { Card, CardTitle } from './ui/Card';
import { formatDuration, getAttendanceStatus, calculateWorkedHours } from '../lib/utils';
import * as attendanceService from '../services/attendanceService';

interface WorkerAttendanceCardProps {
  ownerId: string;
  workerId: string;
}

export function WorkerAttendanceCard({ ownerId, workerId }: WorkerAttendanceCardProps) {
  const [stats, setStats] = useState<{ workDays: number; absentDays: number } | null>(null);
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 30 * 60 * 1000); // 30 minutes

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    loadData();
  }, [ownerId, workerId]);

  const loadData = async () => {
    try {
      setLoading(true);

      const today = new Date().toISOString().split('T')[0];

      const [statsData, todayData] = await Promise.all([
        attendanceService.getWorkerAttendanceStats(
          ownerId,
          workerId,
          '2020-01-01',
          today
        ),
        attendanceService.getAttendanceForDate(ownerId, workerId, today),
      ]);

      setStats(statsData);
      setTodayAttendance(todayData);
    } catch (error) {
      console.error('Error loading attendance data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <p className="text-gray-600">Loading attendance data...</p>
      </Card>
    );
  }

  const status = todayAttendance && todayAttendance.arrivalTime !== null && todayAttendance.arrivalTime !== undefined
    ? getAttendanceStatus(
        todayAttendance.arrivalTime,
        todayAttendance.departureTime === undefined ? null : todayAttendance.departureTime
      )
    : 'absent';

  const workedHours = todayAttendance && todayAttendance.arrivalTime !== null
    ? calculateWorkedHours(
        todayAttendance.arrivalTime,
        todayAttendance.departureTime,
        currentTime
      )
    : { duration: 0, isActive: false };

  const { duration } = workedHours;

  return (
    <Card className="p-6">
      <CardTitle className="mb-6">Attendance Overview</CardTitle>

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
            <p className="text-sm font-medium text-blue-600 mb-1">Work Days</p>
            <p className="text-3xl font-bold text-blue-900">{stats?.workDays || 0}</p>
          </div>

          <div className="p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-lg border border-red-200">
            <p className="text-sm font-medium text-red-600 mb-1">Absent Days</p>
            <p className="text-3xl font-bold text-red-900">{stats?.absentDays || 0}</p>
          </div>

          <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
            <p className="text-sm font-medium text-purple-600 mb-1">Today's Status</p>
            <p className="text-2xl font-bold text-purple-900">
              {status === 'absent' && '❌'}
              {status === 'working' && '⏱️'}
              {status === 'done' && '✅'}
            </p>
          </div>
        </div>

        {todayAttendance && status !== 'absent' && (
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-600">
              {status === 'working' ? 'Time Worked (Today)' : 'Total Hours Worked (Today)'}
            </p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{formatDuration(duration)}</p>
          </div>
        )}
      </div>
    </Card>
  );
}
