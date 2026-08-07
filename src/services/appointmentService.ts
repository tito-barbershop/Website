import { ref, push, get, update, remove, set } from 'firebase/database';
import { db } from '../config/firebase';
import type { Appointment, AppointmentStatus } from '../types';

const APPOINTMENTS_PATH = 'appointments';

export async function createAppointment(
  ownerId: string,
  appointmentData: Omit<Appointment, 'id'>
): Promise<string> {
  const appointmentsRef = ref(db, `${APPOINTMENTS_PATH}/${ownerId}`);
  const newAppointmentRef = push(appointmentsRef);

  await set(newAppointmentRef, {
    ...appointmentData,
    createdAt: Date.now(),
  });

  return newAppointmentRef.key!;
}

export async function getAppointments(ownerId: string): Promise<(Appointment & { firebaseId: string })[]> {
  const appointmentsRef = ref(db, `${APPOINTMENTS_PATH}/${ownerId}`);
  const snapshot = await get(appointmentsRef);

  if (!snapshot.exists()) {
    return [];
  }

  const data = snapshot.val();
  return Object.entries(data)
    .map(([firebaseId, appointment]: [string, any]) => ({
      firebaseId,
      ...appointment,
    }))
    .sort((a, b) => b.dateTime - a.dateTime);
}

export async function getAppointment(
  ownerId: string,
  appointmentId: string
): Promise<(Appointment & { firebaseId: string }) | null> {
  const appointmentRef = ref(db, `${APPOINTMENTS_PATH}/${ownerId}/${appointmentId}`);
  const snapshot = await get(appointmentRef);

  if (!snapshot.exists()) {
    return null;
  }

  return {
    firebaseId: appointmentId,
    ...snapshot.val(),
  };
}

export async function updateAppointment(
  ownerId: string,
  appointmentId: string,
  appointmentData: Partial<Appointment>
): Promise<void> {
  const appointmentRef = ref(db, `${APPOINTMENTS_PATH}/${ownerId}/${appointmentId}`);

  await update(appointmentRef, {
    ...appointmentData,
    updatedAt: Date.now(),
  });
}

export async function updateAppointmentStatus(
  ownerId: string,
  appointmentId: string,
  status: AppointmentStatus
): Promise<void> {
  const appointmentRef = ref(db, `${APPOINTMENTS_PATH}/${ownerId}/${appointmentId}`);

  await update(appointmentRef, {
    status,
    updatedAt: Date.now(),
  });
}

export async function deleteAppointment(ownerId: string, appointmentId: string): Promise<void> {
  const appointmentRef = ref(db, `${APPOINTMENTS_PATH}/${ownerId}/${appointmentId}`);
  await remove(appointmentRef);
}

export async function getWorkerAppointments(
  ownerId: string,
  workerId: string
): Promise<(Appointment & { firebaseId: string })[]> {
  const appointments = await getAppointments(ownerId);
  return appointments.filter((apt) => apt.workerId === workerId);
}

export async function getCustomerAppointments(
  ownerId: string,
  customerId: string
): Promise<(Appointment & { firebaseId: string })[]> {
  const appointments = await getAppointments(ownerId);
  return appointments.filter((apt) => apt.customerId === customerId);
}

export async function getUpcomingAppointments(ownerId: string, days = 7): Promise<(Appointment & { firebaseId: string })[]> {
  const appointments = await getAppointments(ownerId);
  const now = Date.now();
  const futureDate = now + days * 24 * 60 * 60 * 1000;

  return appointments.filter((apt) => apt.dateTime >= now && apt.dateTime <= futureDate);
}

export async function getAppointmentsByStatus(
  ownerId: string,
  status: AppointmentStatus
): Promise<(Appointment & { firebaseId: string })[]> {
  const appointments = await getAppointments(ownerId);
  return appointments.filter((apt) => apt.status === status);
}
