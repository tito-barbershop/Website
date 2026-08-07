import { ref, get, set } from 'firebase/database';
import { db } from '../config/firebase';
import type { Attendance } from '../types';

const ATTENDANCE_PATH = 'attendance';

export async function getOrCreateAttendance(
  ownerId: string,
  workerId: string,
  date: string
): Promise<Attendance & { firebaseId: string }> {
  const attendanceRef = ref(db, `${ATTENDANCE_PATH}/${ownerId}/${workerId}/${date}`);
  const snapshot = await get(attendanceRef);

  if (snapshot.exists()) {
    return {
      firebaseId: date,
      ...snapshot.val(),
    };
  }

  const newAttendance = {
    workerId,
    date,
    arrivalTime: null,
    departureTime: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await set(attendanceRef, newAttendance);

  return {
    firebaseId: date,
    id: date,
    ...newAttendance,
  };
}

export async function getAttendanceForDate(
  ownerId: string,
  workerId: string,
  date: string
): Promise<(Attendance & { firebaseId: string }) | null> {
  const attendanceRef = ref(db, `${ATTENDANCE_PATH}/${ownerId}/${workerId}/${date}`);
  const snapshot = await get(attendanceRef);

  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.val();

  const result = {
    firebaseId: date,
    id: date,
    workerId: data.workerId || workerId,
    date: data.date || date,
    arrivalTime: data.arrivalTime || null,
    departureTime: data.departureTime || null,
    createdAt: data.createdAt || Date.now(),
    updatedAt: data.updatedAt || Date.now(),
  };
  return result;
}

export async function getAllWorkerAttendanceForDate(
  ownerId: string,
  date: string
): Promise<Map<string, Attendance & { firebaseId: string }>> {
  const attendanceRef = ref(db, `${ATTENDANCE_PATH}/${ownerId}`);
  const snapshot = await get(attendanceRef);

  const result = new Map<string, Attendance & { firebaseId: string }>();

  if (!snapshot.exists()) {
    return result;
  }

  const data = snapshot.val();
  for (const workerId in data) {
    const workerAttendance = data[workerId][date];
    if (workerAttendance) {
      result.set(workerId, {
        firebaseId: date,
        id: date,
        workerId: workerAttendance.workerId || workerId,
        date: workerAttendance.date || date,
        arrivalTime: workerAttendance.arrivalTime || null,
        departureTime: workerAttendance.departureTime || null,
        createdAt: workerAttendance.createdAt || Date.now(),
        updatedAt: workerAttendance.updatedAt || Date.now(),
      });
    }
  }

  return result;
}

export async function updateAttendanceArrival(
  ownerId: string,
  workerId: string,
  date: string,
  arrivalTime: number | null
): Promise<void> {
  const attendanceRef = ref(db, `${ATTENDANCE_PATH}/${ownerId}/${workerId}/${date}`);

  // Get current record to preserve other fields
  const snapshot = await get(attendanceRef);
  const currentData = snapshot.exists() ? snapshot.val() : {};

  // If clearing arrival, also clear departure
  const updateData = {
    ...currentData,
    workerId,
    date,
    arrivalTime,
    updatedAt: Date.now(),
  };

  // Ensure createdAt is preserved
  if (!updateData.createdAt) {
    updateData.createdAt = Date.now();
  }

  if (arrivalTime === null) {
    updateData.departureTime = null;
  }

  await set(attendanceRef, updateData);
}

export async function updateAttendanceDeparture(
  ownerId: string,
  workerId: string,
  date: string,
  departureTime: number | null
): Promise<void> {
  const attendanceRef = ref(db, `${ATTENDANCE_PATH}/${ownerId}/${workerId}/${date}`);

  // Get current record to preserve other fields
  const snapshot = await get(attendanceRef);
  const currentData = snapshot.exists() ? snapshot.val() : {};

  await set(attendanceRef, {
    ...currentData,
    departureTime,
    updatedAt: Date.now(),
  });
}

export async function getWorkerAttendanceStats(
  ownerId: string,
  workerId: string,
  startDate: string,
  endDate: string
): Promise<{ workDays: number; absentDays: number }> {
  const attendanceRef = ref(db, `${ATTENDANCE_PATH}/${ownerId}/${workerId}`);
  const snapshot = await get(attendanceRef);

  let workDays = 0;
  let absentDays = 0;

  if (snapshot.exists()) {
    const data = snapshot.val();
    for (const date in data) {
      if (date >= startDate && date <= endDate) {
        const attendance = data[date];
        const hasArrival = attendance.arrivalTime !== null && attendance.arrivalTime !== undefined;
        const hasDeparture = attendance.departureTime !== null && attendance.departureTime !== undefined;

        // Work day only if both arrived AND left
        if (hasArrival && hasDeparture) {
          workDays++;
        } else if (!hasArrival) {
          // Absent only if NO arrival time at all
          absentDays++;
        }
        // If arrived but not left yet, don't count as work day or absent
      }
    }
  }

  return { workDays, absentDays };
}

export async function getWorkerAttendanceHistory(
  ownerId: string,
  workerId: string,
  limit: number = 30
): Promise<(Attendance & { firebaseId: string })[]> {
  const attendanceRef = ref(db, `${ATTENDANCE_PATH}/${ownerId}/${workerId}`);
  const snapshot = await get(attendanceRef);

  if (!snapshot.exists()) {
    return [];
  }

  const data = snapshot.val();
  const records = Object.entries(data)
    .map(([date, attendance]: [string, any]) => ({
      firebaseId: date,
      id: date,
      ...attendance,
    }))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit);

  return records;
}
