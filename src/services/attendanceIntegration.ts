import * as attendanceService from './attendanceService';
import * as paymentCycleService from './paymentCycleService';
import type { Worker } from '../types';

// This function should be called whenever attendance is marked (arrival or departure)
// It checks if the employee has completed a work day and if so, triggers payment cycle check
export async function handleAttendanceUpdate(
  ownerId: string,
  workerId: string,
  selectedDate: string,
  worker: Worker & { firebaseId: string }
): Promise<boolean> {
  try {
    // Get the attendance record for the date
    const attendance = await attendanceService.getAttendanceForDate(ownerId, workerId, selectedDate);

    if (!attendance) {
      return false;
    }

    // Check if it's a complete work day (has both arrival and departure)
    const hasArrival = attendance.arrivalTime !== null && attendance.arrivalTime !== undefined;
    const hasDeparture = attendance.departureTime !== null && attendance.departureTime !== undefined;
    const isCompleteWorkDay = hasArrival && hasDeparture;

    if (isCompleteWorkDay) {
      // Increment work days in payment cycle tracking
      await paymentCycleService.updatePaymentCycleWorkDays(ownerId, workerId, 1);

      // Check if payment cycle should be triggered
      const paymentCycle = await paymentCycleService.checkAndProcessPaymentCycle(
        ownerId,
        workerId,
        worker.name,
        worker.email,
        worker.role as 'worker' | 'cashier'
      );

      return paymentCycle !== null;
    }
    return false;
  } catch (error) {
    console.error('Error in handleAttendanceUpdate:', error);
    // Don't throw - allow attendance update to succeed even if payment cycle check fails
    return false;
  }
}

// Check if a worker is absent for a day (no arrival time at all)
export async function handleWorkerAbsence(
  ownerId: string,
  workerId: string,
  selectedDate: string
): Promise<void> {
  try {
    const attendance = await attendanceService.getAttendanceForDate(ownerId, workerId, selectedDate);

    if (!attendance) {
      return;
    }

    const hasArrival = attendance.arrivalTime !== null && attendance.arrivalTime !== undefined;

    // If there's no arrival time, mark as absent
    if (!hasArrival) {
      await paymentCycleService.updatePaymentCycleAbsentDays(ownerId, workerId, 1);
    }
  } catch (error) {
    console.error('Error in handleWorkerAbsence:', error);
  }
}
