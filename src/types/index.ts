export type UserRole = 'owner' | 'admin' | 'cashier' | 'worker' | 'customer';

export type AppointmentStatus = 'pending' | 'approved' | 'cancelled' | 'completed';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  ownerId?: string;
  workerId?: string;
}

export interface WorkerUser extends User {
  workerId: string;
  ownerId: string;
}

export interface Rating {
  id: string;
  customerId: string;
  customerName: string;
  score: number; // 1-5
  review: string;
  createdAt: number;
}

export interface SimpleRating {
  score: number;
  customerId: string;
  customerName: string;
  customerPhone: string;
  appointmentId: string;
  notes?: string;
}

export interface Worker extends User {
  ratings: SimpleRating[];
  workingHours: WorkingHours;
}

export interface WorkingHours {
  monday: TimeSlot;
  tuesday: TimeSlot;
  wednesday: TimeSlot;
  thursday: TimeSlot;
  friday: TimeSlot;
  saturday: TimeSlot;
  sunday: TimeSlot;
}

export interface TimeSlot {
  start: string;
  end: string;
  isOpen: boolean;
}

export interface Service {
  id: string;
  workerId: string;
  name: string;
  description: string;
  duration: number;
  price: number;
}

export interface Customer extends User {
  appointmentsCount: number;
  completedAppointmentsCount: number;
}

export interface Appointment {
  id: string;
  customerId: string;
  workerId: string;
  selectedServices: string[];
  dateTime: number;
  totalPrice: number;
  totalDuration: number;
  status: AppointmentStatus;
  notes: string;
  createdAt: number;
}

export interface AvailableSlot {
  time: string;
  timestamp: number;
}

export interface Attendance {
  id: string;
  workerId: string;
  date: string;
  arrivalTime: number | null;
  departureTime: number | null;
  createdAt: number;
  updatedAt: number;
}

export type AttendanceStatus = 'absent' | 'working' | 'done';

export type TransactionType = 'bonus' | 'deduction' | 'withdrawal';

export interface Transaction {
  id: string;
  employeeId: string;
  type: TransactionType;
  amount: number;
  reason: string;
  date: string;
  createdBy: string;
  createdAt: number;
}

export interface Expense {
  id: string;
  amount: number;
  reason: string;
  date: string;
  createdBy: string;
  createdAt: number;
}
