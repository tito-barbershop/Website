import { ref, push, get, update, remove, set } from 'firebase/database';
import { db } from '../config/firebase';
import type { Worker, WorkingHours, SimpleRating } from '../types';

const WORKERS_PATH = 'workers';
const TEMP_CREDENTIALS_PATH = 'temporaryCredentials';

// Encode email to use as database key (Firebase doesn't allow special chars in keys)
function encodeEmail(email: string): string {
  return email.replace(/[.@]/g, '_');
}

export async function getTemporaryCredentials(
  email: string
): Promise<{ tempPassword: string } | null> {
  try {
    const encodedEmail = encodeEmail(email);
    const credRef = ref(db, `temporaryCredentials/${encodedEmail}`);
    const snapshot = await get(credRef);

    if (!snapshot.exists()) {
      return null;
    }

    return {
      tempPassword: snapshot.val().tempPassword,
    };
  } catch (error) {
    console.error('Error fetching temporary credentials:', error);
    return null;
  }
}

export async function createWorker(
  ownerId: string,
  workerData: Omit<Worker, 'id'>,
  tempPassword: string
): Promise<{ workerId: string; tempPassword: string }> {
  const workersRef = ref(db, `${WORKERS_PATH}/${ownerId}`);
  const newWorkerRef = push(workersRef);
  const workerId = newWorkerRef.key!;

  // Store worker data in workers collection only
  await set(newWorkerRef, {
    ...workerData,
    ratings: [],
    createdAt: Date.now(),
  });

  // Store temporary credentials for first login (encode email for database key)
  const encodedEmail = encodeEmail(workerData.email);

  const credRef = ref(db, `${TEMP_CREDENTIALS_PATH}/${encodedEmail}`);
  await set(credRef, {
    email: workerData.email, // Store original email
    tempPassword,
    ownerId,
    workerId,
    role: workerData.role, // Store the role for later retrieval
    createdAt: Date.now(),
    expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000), // Expires in 7 days
  });

  return { workerId, tempPassword };
}

export async function getWorkers(ownerId: string): Promise<(Worker & { firebaseId: string })[]> {
  const workersRef = ref(db, `${WORKERS_PATH}/${ownerId}`);
  const snapshot = await get(workersRef);

  if (!snapshot.exists()) {
    return [];
  }

  const data = snapshot.val();
  return Object.entries(data).map(([firebaseId, worker]: [string, any]) => {
    // Convert ratings object to array
    let ratings: any[] = [];
    if (worker.ratings && typeof worker.ratings === 'object' && !Array.isArray(worker.ratings)) {
      ratings = Object.values(worker.ratings);
    } else if (Array.isArray(worker.ratings)) {
      ratings = worker.ratings;
    }

    return {
      firebaseId,
      ...worker,
      ratings,
    };
  });
}

export async function getWorker(
  ownerId: string,
  workerId: string
): Promise<(Worker & { firebaseId: string }) | null> {
  const workerRef = ref(db, `${WORKERS_PATH}/${ownerId}/${workerId}`);
  const snapshot = await get(workerRef);

  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.val();

  // Convert ratings object to array
  let ratings: any[] = [];
  if (data.ratings && typeof data.ratings === 'object') {
    ratings = Object.values(data.ratings);
  }

  return {
    firebaseId: workerId,
    ...data,
    ratings,
  };
}

export async function updateWorker(
  ownerId: string,
  workerId: string,
  workerData: Partial<Worker>
): Promise<void> {
  const workerRef = ref(db, `${WORKERS_PATH}/${ownerId}/${workerId}`);

  await update(workerRef, {
    ...workerData,
    updatedAt: Date.now(),
  });
}

export async function deleteWorker(ownerId: string, workerId: string): Promise<void> {
  const workerRef = ref(db, `${WORKERS_PATH}/${ownerId}/${workerId}`);
  await remove(workerRef);
}

export async function updateWorkerWorkingHours(
  ownerId: string,
  workerId: string,
  workingHours: WorkingHours
): Promise<void> {
  const workerRef = ref(db, `${WORKERS_PATH}/${ownerId}/${workerId}`);

  await update(workerRef, {
    workingHours,
    updatedAt: Date.now(),
  });
}

export async function addRating(
  ownerId: string,
  workerId: string,
  score: number,
  customerId: string,
  customerName: string,
  customerPhone: string,
  appointmentId: string,
  notes?: string
): Promise<string> {
  const ratingRef = ref(db, `${WORKERS_PATH}/${ownerId}/${workerId}/ratings`);
  const newRatingRef = push(ratingRef);
  const ratingId = newRatingRef.key!;

  const ratingData: any = {
    score,
    customerId,
    customerName,
    customerPhone,
    appointmentId,
  };

  if (notes) {
    ratingData.notes = notes;
  }

  await set(newRatingRef, ratingData);

  return ratingId;
}

export async function getRatings(
  ownerId: string,
  workerId: string
): Promise<SimpleRating[]> {
  const ratingRef = ref(db, `${WORKERS_PATH}/${ownerId}/${workerId}/ratings`);
  const snapshot = await get(ratingRef);

  if (!snapshot.exists()) {
    return [];
  }

  const data = snapshot.val();
  return Object.values(data);
}

