import { useMemo, useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card } from './ui/Card';
import type { Appointment } from '../types';
import { getDailyRevenue, getMonthlyRevenue, getWorkerPerformance, getServiceRevenue } from '../services/analyticsService';
import type { WorkerPerformance, ServiceRevenue } from '../services/analyticsService';

interface AnalyticsChartsProps {
  appointments: (Appointment & { firebaseId: string })[];
  ownerId: string;
}

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];

interface WorkerTooltipProps {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number | string; name: string; payload: { workerName: string; completedAppointments: number; revenue: number } }>;
  label?: string;
}

function WorkerPerformanceTooltip({ active, payload }: WorkerTooltipProps) {
  if (active && payload && payload.length) {
    const data = payload[0].payload as { workerName: string; completedAppointments: number; revenue: number };
    return (
      <div className="bg-white p-3 border border-gray-300 rounded shadow">
        <p className="font-semibold text-gray-900">{data.workerName}</p>
        <p className="text-sm" style={{ color: '#3b82f6' }}>Appointments: {data.completedAppointments}</p>
        <p className="text-sm" style={{ color: '#10b981' }}>Revenue: {data.revenue.toFixed(2)} LE</p>
      </div>
    );
  }
  return null;
}

export function AnalyticsCharts({ appointments, ownerId }: AnalyticsChartsProps) {
  const [workerPerformanceData, setWorkerPerformanceData] = useState<WorkerPerformance[]>([]);
  const [serviceRevenueData, setServiceRevenueData] = useState<ServiceRevenue[]>([]);
  const [loadingWorkers, setLoadingWorkers] = useState(false);
  const [loadingServices, setLoadingServices] = useState(false);

  const dailyRevenue = useMemo(() => getDailyRevenue(appointments), [appointments]);

  const monthlyRevenue = useMemo(() => getMonthlyRevenue(appointments), [appointments]);

  const appointmentsByStatus = useMemo(() => {
    const stats = {
      pending: 0,
      approved: 0,
      completed: 0,
      cancelled: 0,
    };
    appointments.forEach((apt) => {
      stats[apt.status]++;
    });
    return [
      { name: 'Pending', value: stats.pending, color: COLORS[3] },
      { name: 'Approved', value: stats.approved, color: COLORS[4] },
      { name: 'Completed', value: stats.completed, color: COLORS[0] },
      { name: 'Cancelled', value: stats.cancelled, color: COLORS[2] },
    ];
  }, [appointments]);

  useEffect(() => {
    const loadWorkerData = async () => {
      try {
        setLoadingWorkers(true);
        const data = await getWorkerPerformance(ownerId, appointments);
        setWorkerPerformanceData(data);
      } catch (error) {
        console.error('Error loading worker performance:', error);
      } finally {
        setLoadingWorkers(false);
      }
    };
    loadWorkerData();
  }, [ownerId, appointments]);

  useEffect(() => {
    const loadServiceData = async () => {
      try {
        setLoadingServices(true);
        const data = await getServiceRevenue(ownerId, appointments);
        setServiceRevenueData(data);
      } catch (error) {
        console.error('Error loading service revenue:', error);
      } finally {
        setLoadingServices(false);
      }
    };
    loadServiceData();
  }, [ownerId, appointments]);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Daily Revenue Trend (Last 30 Days)</h3>
          {dailyRevenue.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyRevenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip
                  formatter={(value) => [
                    `${typeof value === 'number' ? value.toFixed(2) : value} LE`,
                    'Revenue',
                  ]}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={{ fill: '#8b5cf6' }}
                  name="Revenue (LE)"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px]">
              <p className="text-gray-500">No revenue data available</p>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Monthly Revenue Trend</h3>
          {monthlyRevenue.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip
                  formatter={(value) => [
                    `${typeof value === 'number' ? value.toFixed(2) : value} LE`,
                    'Revenue',
                  ]}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6' }}
                  name="Revenue (LE)"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px]">
              <p className="text-gray-500">No revenue data available</p>
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Appointment Status Distribution</h3>
          {appointmentsByStatus.some((s) => s.value > 0) ? (
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={appointmentsByStatus}
                  cx="50%"
                  cy="45%"
                  labelLine={true}
                  label={({ name, value }) => value > 0 ? `${name}: ${value}` : null}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {appointmentsByStatus.map((item, index) => (
                    <Cell key={`cell-${index}`} fill={item.color || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value} appointments`} />
                <Legend
                  wrapperStyle={{ paddingTop: '20px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px]">
              <p className="text-gray-500">No appointment data available</p>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Monthly Appointment Count</h3>
          {monthlyRevenue.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip
                  formatter={(value) => [value, 'Completed Appointments']}
                />
                <Legend />
                <Bar
                  dataKey="appointmentCount"
                  fill="#8b5cf6"
                  name="Completed Appointments"
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px]">
              <p className="text-gray-500">No appointment data available</p>
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Worker Performance</h3>
          {loadingWorkers ? (
            <div className="flex items-center justify-center h-[300px]">
              <p className="text-gray-500">Loading...</p>
            </div>
          ) : workerPerformanceData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={workerPerformanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="workerName" />
                <YAxis yAxisId="left" label={{ value: 'Completed Appointments', angle: -90, position: 'center', dx: -20 }} />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  label={{ value: 'Revenue (LE)', angle: 90, position: 'center', dx: 20 }}
                />
                <Tooltip content={<WorkerPerformanceTooltip />} />
                <Legend />
                <Bar yAxisId="left" dataKey="completedAppointments" fill="#3b82f6" name="Completed Appointments" />
                <Bar yAxisId="right" dataKey="revenue" fill="#10b981" name="Revenue (LE)" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px]">
              <p className="text-gray-500">No worker data available</p>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Service Revenue Breakdown</h3>
          {loadingServices ? (
            <div className="flex items-center justify-center h-[300px]">
              <p className="text-gray-500">Loading...</p>
            </div>
          ) : serviceRevenueData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={serviceRevenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="serviceName" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip
                  formatter={(value) => `${typeof value === 'number' ? value.toFixed(2) : value} LE`}
                />
                <Legend />
                <Bar dataKey="revenue" fill="#ec4899" name="Revenue (LE)" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px]">
              <p className="text-gray-500">No service data available</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
