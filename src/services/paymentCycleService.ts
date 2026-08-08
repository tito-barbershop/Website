import { ref, get, set, update } from 'firebase/database';
import { db } from '../config/firebase';
import * as transactionService from './transactionService';
import * as appointmentService from './appointmentService';
import * as brevoService from './brevoService';

export interface PaymentCycle {
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  role: 'worker' | 'cashier';
  appointmentsRevenue: number;
  totalBonuses: number;
  totalDeductions: number;
  totalWithdrawals: number;
  totalAmount: number;
  workDaysCount: number;
  cycleStartDate: string;
  cycleEndDate: string;
  processedAt: number;
  cycleId: string;
}

export interface PaymentCycleTracking {
  currentWorkDays: number;
  currentAbsentDays: number;
  cycleStartDate: string;
  lastProcessedCycleId?: string;
  processedTransactionIds: string[];
  processedAppointmentIds: string[];
}

const PAYMENT_CYCLES_PATH = 'paymentCycles';
const PAYMENT_TRACKING_PATH = 'paymentCycleTracking';

// Check and process payment cycle if employee reaches 30 work days
export async function checkAndProcessPaymentCycle(
  ownerId: string,
  employeeId: string,
  employeeName: string,
  employeeEmail: string,
  role: 'worker' | 'cashier'
): Promise<PaymentCycle | null> {
  try {
    const trackingRef = ref(db, `${PAYMENT_TRACKING_PATH}/${ownerId}/${employeeId}`);
    const trackingSnapshot = await get(trackingRef);

    const tracking = trackingSnapshot.exists() ? trackingSnapshot.val() : null;
    const currentWorkDays = tracking?.currentWorkDays || 0;

    // Check if employee has reached 30 work days
    if (currentWorkDays < 30) {
      return null;
    }

    // Process payment cycle
    const paymentCycle = await processPaymentCycle(
      ownerId,
      employeeId,
      employeeName,
      employeeEmail,
      role,
      currentWorkDays,
      tracking?.cycleStartDate
    );

    // Clear employee data after successful payment
    await clearEmployeePaymentData(ownerId, employeeId);

    // Send email to admin - get owner email from users collection
    const ownerRef = ref(db, `users/${ownerId}`);
    const ownerSnapshot = await get(ownerRef);
    const ownerEmail = ownerSnapshot.exists() ? ownerSnapshot.val().email : 'admin@titobarbershop.com';

    await sendPaymentNotificationEmail(
      ownerEmail,
      paymentCycle
    );

    return paymentCycle;
  } catch (error) {
    console.error('Error processing payment cycle:', error);
    throw error;
  }
}

// Process the actual payment cycle calculation
async function processPaymentCycle(
  ownerId: string,
  employeeId: string,
  employeeName: string,
  employeeEmail: string,
  role: 'worker' | 'cashier',
  workDaysCount: number,
  cycleStartDate?: string
): Promise<PaymentCycle> {
  const cycleId = `cycle_${ownerId}_${employeeId}_${Date.now()}`;
  const now = new Date();
  const cycleEndDate = now.toISOString().split('T')[0];
  const startDate = cycleStartDate || '2000-01-01';

  // Get transactions for this cycle
  const transactions = await transactionService.getEmployeeTransactions(ownerId, employeeId);
  const cycleTransactions = transactions.filter(
    t => t.date >= startDate && t.date <= cycleEndDate
  );

  // Calculate bonuses, deductions, withdrawals
  let totalBonuses = 0;
  let totalDeductions = 0;
  let totalWithdrawals = 0;

  for (const t of cycleTransactions) {
    if (t.type === 'bonus') totalBonuses += t.amount;
    else if (t.type === 'deduction') totalDeductions += t.amount;
    else if (t.type === 'withdrawal') totalWithdrawals += t.amount;
  }

  // Calculate appointments revenue (workers only)
  let appointmentsRevenue = 0;
  if (role === 'worker') {
    const appointments = await appointmentService.getWorkerAppointments(ownerId, employeeId);
    const cycleAppointments = appointments.filter(
      apt => apt.status === 'completed' &&
              new Date(apt.dateTime).toISOString().split('T')[0] >= startDate &&
              new Date(apt.dateTime).toISOString().split('T')[0] <= cycleEndDate
    );

    for (const apt of cycleAppointments) {
      appointmentsRevenue += apt.totalPrice;
    }
  }

  // Calculate total
  const totalAmount =
    appointmentsRevenue + totalBonuses - totalDeductions - totalWithdrawals;

  const paymentCycle: PaymentCycle = {
    employeeId,
    employeeName,
    employeeEmail,
    role,
    appointmentsRevenue,
    totalBonuses,
    totalDeductions,
    totalWithdrawals,
    totalAmount,
    workDaysCount,
    cycleStartDate: startDate,
    cycleEndDate,
    processedAt: Date.now(),
    cycleId,
  };

  // Save payment cycle record
  const cycleRef = ref(db, `${PAYMENT_CYCLES_PATH}/${ownerId}/${cycleId}`);
  await set(cycleRef, paymentCycle);

  return paymentCycle;
}

// Clear employee payment data after processing
async function clearEmployeePaymentData(ownerId: string, employeeId: string): Promise<void> {
  try {
    // Get all transactions and appointments for this cycle to mark them as processed
    const transactions = await transactionService.getEmployeeTransactions(ownerId, employeeId);
    const appointments = await appointmentService.getWorkerAppointments(ownerId, employeeId);

    // Collect IDs of transactions and appointments to process
    const transactionIds = transactions.map(t => (t as any).firebaseId);
    const appointmentIds = appointments.map(a => a.firebaseId);

    // Clear tracking data and reset cycle
    const trackingRef = ref(db, `${PAYMENT_TRACKING_PATH}/${ownerId}/${employeeId}`);
    const newTracking: PaymentCycleTracking = {
      currentWorkDays: 0,
      currentAbsentDays: 0,
      cycleStartDate: new Date().toISOString().split('T')[0],
      processedTransactionIds: transactionIds,
      processedAppointmentIds: appointmentIds,
    };

    await set(trackingRef, newTracking);
  } catch (error) {
    console.error('Error clearing payment data:', error);
    throw error;
  }
}

// Update work days count (called when attendance is marked)
export async function updatePaymentCycleWorkDays(
  ownerId: string,
  employeeId: string,
  incrementBy: number = 1
): Promise<void> {
  try {
    const trackingRef = ref(db, `${PAYMENT_TRACKING_PATH}/${ownerId}/${employeeId}`);
    const trackingSnapshot = await get(trackingRef);

    const tracking = trackingSnapshot.exists() ? trackingSnapshot.val() : {
      currentWorkDays: 0,
      currentAbsentDays: 0,
      cycleStartDate: new Date().toISOString().split('T')[0],
      processedTransactionIds: [],
      processedAppointmentIds: [],
    };

    const newWorkDays = (tracking.currentWorkDays || 0) + incrementBy;

    await update(trackingRef, {
      currentWorkDays: newWorkDays,
    });
  } catch (error) {
    console.error('Error updating payment cycle work days:', error);
    throw error;
  }
}

// Update absent days count
export async function updatePaymentCycleAbsentDays(
  ownerId: string,
  employeeId: string,
  incrementBy: number = 1
): Promise<void> {
  try {
    const trackingRef = ref(db, `${PAYMENT_TRACKING_PATH}/${ownerId}/${employeeId}`);
    const trackingSnapshot = await get(trackingRef);

    const tracking = trackingSnapshot.exists() ? trackingSnapshot.val() : {
      currentWorkDays: 0,
      currentAbsentDays: 0,
      cycleStartDate: new Date().toISOString().split('T')[0],
      processedTransactionIds: [],
      processedAppointmentIds: [],
    };

    const newAbsentDays = (tracking.currentAbsentDays || 0) + incrementBy;

    await update(trackingRef, {
      currentAbsentDays: newAbsentDays,
    });
  } catch (error) {
    console.error('Error updating payment cycle absent days:', error);
    throw error;
  }
}

// Get payment cycle tracking for an employee
export async function getPaymentCycleTracking(
  ownerId: string,
  employeeId: string
): Promise<PaymentCycleTracking | null> {
  try {
    const trackingRef = ref(db, `${PAYMENT_TRACKING_PATH}/${ownerId}/${employeeId}`);
    const trackingSnapshot = await get(trackingRef);

    if (!trackingSnapshot.exists()) {
      return null;
    }

    return trackingSnapshot.val() as PaymentCycleTracking;
  } catch (error) {
    console.error('Error getting payment cycle tracking:', error);
    return null;
  }
}

// Get all payment cycles for an owner
export async function getPaymentCycles(ownerId: string): Promise<PaymentCycle[]> {
  try {
    const cyclesRef = ref(db, `${PAYMENT_CYCLES_PATH}/${ownerId}`);
    const snapshot = await get(cyclesRef);

    if (!snapshot.exists()) {
      return [];
    }

    const data = snapshot.val();
    return Object.values(data) as PaymentCycle[];
  } catch (error) {
    console.error('Error getting payment cycles:', error);
    return [];
  }
}

// Send payment notification email to admin
async function sendPaymentNotificationEmail(
  adminEmail: string,
  paymentCycle: PaymentCycle
): Promise<void> {
  try {
    const htmlContent = generatePaymentNotificationEmail(paymentCycle);

    await brevoService.sendEmail({
      to: [{ email: adminEmail, name: 'Admin' }],
      subject: `Payment Processed - ${paymentCycle.employeeName}`,
      htmlContent,
    });
  } catch (error) {
    console.error('Error sending payment notification email:', error);
    throw error;
  }
}

// Generate payment notification email HTML
function generatePaymentNotificationEmail(paymentCycle: PaymentCycle): string {
  const appointmentsRow = paymentCycle.role === 'worker'
    ? `<tr>
         <td style="padding: 12px; text-align: left;">Appointments Revenue</td>
         <td style="padding: 12px; text-align: right;">${paymentCycle.appointmentsRevenue.toFixed(2)} LE</td>
       </tr>`
    : '';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #1f2937; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { padding: 20px; border: 1px solid #ddd; border-top: none; }
          .summary-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .summary-table td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
          .summary-table .label { font-weight: 600; color: #555; }
          .summary-table .amount { text-align: right; font-weight: 600; }
          .total-row { background-color: #f0fdf4; }
          .total-row td { border-top: 2px solid #22c55e; border-bottom: 2px solid #22c55e; font-size: 16px; color: #16a34a; }
          .details { background-color: #f9fafb; padding: 15px; margin: 15px 0; border-radius: 4px; }
          .details p { margin: 8px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Payment Cycle Completed</h1>
          </div>
          <div class="content">
            <p>A 30-work-day payment cycle has been completed and processed.</p>

            <div class="details">
              <p><strong>Employee Name:</strong> ${paymentCycle.employeeName}</p>
              <p><strong>Role:</strong> ${paymentCycle.role === 'worker' ? 'Worker' : 'Cashier'}</p>
              <p><strong>Work Days Completed:</strong> ${paymentCycle.workDaysCount}</p>
              <p><strong>Cycle Period:</strong> ${paymentCycle.cycleStartDate} to ${paymentCycle.cycleEndDate}</p>
            </div>

            <h3 style="margin-top: 25px; color: #1f2937;">Payment Summary</h3>
            <table class="summary-table">
              ${appointmentsRow}
              <tr>
                <td class="label">Total Bonuses</td>
                <td class="amount">+${paymentCycle.totalBonuses.toFixed(2)} LE</td>
              </tr>
              <tr>
                <td class="label">Total Deductions</td>
                <td class="amount">-${paymentCycle.totalDeductions.toFixed(2)} LE</td>
              </tr>
              <tr>
                <td class="label">Total Withdrawals</td>
                <td class="amount">-${paymentCycle.totalWithdrawals.toFixed(2)} LE</td>
              </tr>
              <tr class="total-row">
                <td class="label">Total Amount to Pay</td>
                <td class="amount">${paymentCycle.totalAmount.toFixed(2)} LE</td>
              </tr>
            </table>

            <p style="margin-top: 20px; color: #666; font-size: 14px;">
              The employee's attendance, bonuses, deductions, and withdrawals have been cleared.
              A new 30-work-day cycle has started.
            </p>
          </div>
          <div class="footer">
            <p>&copy; 2026 Tito Barbershop. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}
