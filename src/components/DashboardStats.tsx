import { Card } from './ui/Card';
import type { DashboardStats as DashboardStatsType } from '../services/analyticsService';

interface DashboardStatsProps {
  stats: DashboardStatsType;
}

export function DashboardStats({ stats }: DashboardStatsProps) {
  const statCards = [
    {
      label: "Today's Revenue",
      value: `${stats.todayRevenue?.toFixed(2) || '0.00'} LE`,
      icon: '📈',
      color: 'text-green-600',
    },
    {
      label: "Today's Expenses",
      value: `${stats.todayExpenses?.toFixed(2) || '0.00'} LE`,
      icon: '💸',
      color: 'text-red-600',
    },
    {
      label: 'Working Now',
      value: stats.todayWorkingEmployees ?? 0,
      icon: '👥',
      color: 'text-blue-600',
    },
    {
      label: 'Cancelled Appointments',
      value: stats.cancelledAppointments,
      icon: '❌',
      color: 'text-red-500',
    },
    {
      label: 'Completed Appointments',
      value: stats.completedAppointments,
      icon: '🏆',
      color: 'text-emerald-600',
    },
    {
      label: 'Total Revenue',
      value: `${stats.totalRevenue.toFixed(2)} LE`,
      icon: '💰',
      color: 'text-yellow-600',
    },
    {
      label: 'Total Expenses',
      value: `${stats.totalExpenses?.toFixed(2) || '0.00'} LE`,
      icon: '📊',
      color: 'text-orange-600',
    },
    {
      label: 'Total Workers',
      value: stats.totalWorkers,
      icon: '✂️',
      color: 'text-purple-600',
    },
    {
      label: 'Total Customers',
      value: stats.totalCustomers,
      icon: '👦🏻',
      color: 'text-pink-600',
    },
    {
      label: 'Total Appointments',
      value: stats.totalAppointments,
      icon: '📅',
      color: 'text-indigo-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
      {statCards.map((stat, index) => (
        <Card key={index} className="p-6 border-0 bg-gradient-to-br from-white to-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{stat.label}</p>
              <p className={`text-2xl font-bold mt-2 ${stat.color}`}>{stat.value ?? 0}</p>
            </div>
            <div className="text-3xl opacity-20">{stat.icon}</div>
          </div>
        </Card>
      ))}
    </div>
  );
}
