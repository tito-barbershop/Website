import type { Appointment, Service } from '../types';
import { getWorkers } from './workerService';
import { getAllWorkerServices } from './serviceService';
import { getAllExpenses, getTotalExpenses } from './expenseService';
import { getAllWorkerAttendanceForDate } from './attendanceService';

export interface DashboardStats {
  totalWorkers: number;
  totalCustomers: number;
  totalAppointments: number;
  totalRevenue: number;
  pendingAppointments: number;
  approvedAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  todayRevenue: number;
  todayExpenses: number;
  totalExpenses: number;
  todayWorkingEmployees: number;
}

export interface DailyRevenue {
  date: string;
  revenue: number;
  appointmentCount: number;
}

export interface MonthlyRevenue {
  month: string;
  revenue: number;
  appointmentCount: number;
}

export interface ServicePopularity {
  serviceName: string;
  count: number;
  revenue: number;
}

export interface WorkerPerformance {
  workerName: string;
  appointmentCount: number;
  revenue: number;
  completedAppointments: number;
}

export interface ServiceRevenue {
  serviceName: string;
  revenue: number;
  appointmentCount: number;
}

export async function getDashboardStats(
  ownerId: string,
  appointments: (Appointment & { firebaseId: string })[]
): Promise<DashboardStats> {
  const workers = await getWorkers(ownerId);
  const uniqueCustomers = new Set(appointments.map((apt) => apt.customerId));

  const pendingAppointments = appointments.filter((apt) => apt.status === 'pending').length;
  const approvedAppointments = appointments.filter((apt) => apt.status === 'approved').length;
  const completedAppointments = appointments.filter((apt) => apt.status === 'completed').length;
  const cancelledAppointments = appointments.filter((apt) => apt.status === 'cancelled').length;

  const totalRevenue = appointments
    .filter((apt) => apt.status === 'completed')
    .reduce((sum, apt) => sum + apt.totalPrice, 0);

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];

  // Get today's revenue
  const todayRevenue = appointments
    .filter((apt) => {
      const aptDate = new Date(apt.dateTime).toISOString().split('T')[0];
      return aptDate === today && apt.status === 'completed';
    })
    .reduce((sum, apt) => sum + apt.totalPrice, 0);

  // Get expenses data
  const allExpenses = await getAllExpenses(ownerId);
  const todayExpenses = allExpenses
    .filter((expense) => expense.date === today)
    .reduce((sum, expense) => sum + expense.amount, 0);

  const totalExpenses = await getTotalExpenses(ownerId);

  // Get today's working employees (from attendance)
  // Working = arrived but not left yet
  const todayAttendance = await getAllWorkerAttendanceForDate(ownerId, today);
  const todayWorkingEmployees = Array.from(todayAttendance.values()).filter(
    (attendance) => {
      const hasArrived = attendance.arrivalTime !== null && attendance.arrivalTime !== undefined;
      const hasLeft = attendance.departureTime !== null && attendance.departureTime !== undefined;
      // Working = arrived but NOT left
      return hasArrived && !hasLeft;
    }
  ).length;

  return {
    totalWorkers: workers.length,
    totalCustomers: uniqueCustomers.size,
    totalAppointments: appointments.length,
    totalRevenue,
    pendingAppointments,
    approvedAppointments,
    completedAppointments,
    cancelledAppointments,
    todayRevenue,
    todayExpenses,
    totalExpenses,
    todayWorkingEmployees,
  };
}

export function getDailyRevenue(
  appointments: (Appointment & { firebaseId: string })[]
): DailyRevenue[] {
  const dailyData = new Map<string, { revenue: number; count: number }>();

  appointments.forEach((apt) => {
    if (apt.status === 'completed') {
      const date = new Date(apt.dateTime);
      const day = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

      const existing = dailyData.get(day) || { revenue: 0, count: 0 };
      existing.revenue += apt.totalPrice;
      existing.count += 1;
      dailyData.set(day, existing);
    }
  });

  return Array.from(dailyData.entries())
    .map(([date, data]) => ({
      date,
      revenue: data.revenue,
      appointmentCount: data.count,
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-30);
}

export function getMonthlyRevenue(
  appointments: (Appointment & { firebaseId: string })[]
): MonthlyRevenue[] {
  const monthlyData = new Map<string, { revenue: number; count: number }>();

  appointments.forEach((apt) => {
    if (apt.status === 'completed') {
      const date = new Date(apt.dateTime);
      const month = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });

      const existing = monthlyData.get(month) || { revenue: 0, count: 0 };
      existing.revenue += apt.totalPrice;
      existing.count += 1;
      monthlyData.set(month, existing);
    }
  });

  return Array.from(monthlyData.entries())
    .map(([month, data]) => ({
      month,
      revenue: data.revenue,
      appointmentCount: data.count,
    }))
    .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
    .slice(-12);
}

export async function getServicePopularity(
  ownerId: string,
  appointments: (Appointment & { firebaseId: string })[]
): Promise<ServicePopularity[]> {
  const allServices = await getAllWorkerServices(ownerId);
  const serviceMap = new Map<string, Service & { firebaseId: string }>();

  allServices.forEach((services) => {
    services.forEach((service) => {
      serviceMap.set(service.firebaseId, service);
    });
  });

  const serviceStats = new Map<string, { count: number; revenue: number }>();

  appointments.forEach((apt) => {
    if (apt.status === 'completed') {
      apt.selectedServices.forEach((serviceId) => {
        const service = serviceMap.get(serviceId);
        if (service) {
          const existing = serviceStats.get(serviceId) || { count: 0, revenue: 0 };
          existing.count += 1;
          existing.revenue += service.price;
          serviceStats.set(serviceId, existing);
        }
      });
    }
  });

  return Array.from(serviceStats.entries())
    .map(([serviceId, stats]) => {
      const service = serviceMap.get(serviceId);
      return {
        serviceName: service?.name || 'Unknown',
        count: stats.count,
        revenue: stats.revenue,
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

export async function getWorkerPerformance(
  ownerId: string,
  appointments: (Appointment & { firebaseId: string })[]
): Promise<WorkerPerformance[]> {
  const workers = await getWorkers(ownerId);
  const workerMap = new Map(workers.map((w) => [w.firebaseId, w]));

  const workerStats = new Map<string, { count: number; revenue: number; completed: number }>();

  appointments.forEach((apt) => {
    const existing = workerStats.get(apt.workerId) || { count: 0, revenue: 0, completed: 0 };
    existing.count += 1;
    if (apt.status === 'completed') {
      existing.revenue += apt.totalPrice;
      existing.completed += 1;
    }
    workerStats.set(apt.workerId, existing);
  });

  return Array.from(workerStats.entries())
    .map(([workerId, stats]) => {
      const worker = workerMap.get(workerId);
      return {
        workerName: worker?.name || 'Unknown',
        appointmentCount: stats.count,
        revenue: stats.revenue,
        completedAppointments: stats.completed,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);
}

export async function getServiceRevenue(
  ownerId: string,
  appointments: (Appointment & { firebaseId: string })[]
): Promise<ServiceRevenue[]> {
  const allServices = await getAllWorkerServices(ownerId);
  const serviceMap = new Map<string, Service & { firebaseId: string }>();

  allServices.forEach((services) => {
    services.forEach((service) => {
      serviceMap.set(service.firebaseId, service);
    });
  });

  const serviceStatsByName = new Map<string, { revenue: number; count: number }>();

  appointments.forEach((apt) => {
    if (apt.status === 'completed') {
      apt.selectedServices.forEach((serviceId) => {
        const service = serviceMap.get(serviceId);
        if (service) {
          const existing = serviceStatsByName.get(service.name) || { revenue: 0, count: 0 };
          existing.revenue += service.price;
          existing.count += 1;
          serviceStatsByName.set(service.name, existing);
        }
      });
    }
  });

  return Array.from(serviceStatsByName.entries())
    .map(([serviceName, stats]) => ({
      serviceName,
      revenue: stats.revenue,
      appointmentCount: stats.count,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 15);
}

export function getRecentAppointments(
  appointments: (Appointment & { firebaseId: string })[],
  limit = 5
): (Appointment & { firebaseId: string })[] {
  return appointments.sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);
}
