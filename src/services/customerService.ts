import { ref, get } from 'firebase/database';
import { db } from '../config/firebase';
import type { Customer } from '../types';
import { getCustomerAppointments } from './appointmentService';

const CUSTOMERS_PATH = 'users';

export async function getCustomers(ownerId?: string): Promise<Customer[]> {
  const usersRef = ref(db, CUSTOMERS_PATH);
  const snapshot = await get(usersRef);

  if (!snapshot.exists()) {
    return [];
  }

  const data = snapshot.val();
  const customers: Customer[] = [];

  for (const [userId, userData] of Object.entries(data)) {
    const user = userData as Record<string, any>;
    if (user.role === 'customer') {
      // Get appointment counts for this customer if ownerId is provided
      let appointmentsCount = 0;
      let completedAppointmentsCount = 0;
      if (ownerId) {
        try {
          const appointments = await getCustomerAppointments(ownerId, userId);
          appointmentsCount = appointments.length;
          completedAppointmentsCount = appointments.filter(
            (apt: any) => apt.status === 'completed'
          ).length;
        } catch (error) {
          console.error('Error fetching appointment count:', error);
        }
      }

      customers.push({
        ...user,
        id: userId,
        appointmentsCount,
        completedAppointmentsCount,
      } as Customer);
    }
  }

  return customers;
}

export async function getCustomer(userId: string): Promise<Customer | null> {
  const userRef = ref(db, `${CUSTOMERS_PATH}/${userId}`);
  const snapshot = await get(userRef);

  if (!snapshot.exists()) {
    return null;
  }

  const userData = snapshot.val();
  if (userData.role !== 'customer') {
    return null;
  }

  return {
    ...userData,
    id: userId,
  };
}

export async function getCustomerWithAppointmentCount(
  userId: string,
  ownerId: string
): Promise<Customer | null> {
  const customer = await getCustomer(userId);

  if (!customer) {
    return null;
  }

  const appointments = await getCustomerAppointments(ownerId, userId);
  const completedAppointmentsCount = appointments.filter(
    (apt: any) => apt.status === 'completed'
  ).length;

  return {
    ...customer,
    appointmentsCount: appointments.length,
    completedAppointmentsCount,
  };
}
