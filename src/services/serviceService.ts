import { ref, push, get, update, remove } from 'firebase/database';
import { db } from '../config/firebase';
import type { Service } from '../types';

const SERVICES_PATH = 'services';

export async function createService(
  ownerId: string,
  workerId: string,
  serviceData: Omit<Service, 'id'>
): Promise<string> {
  const servicesRef = ref(db, `${SERVICES_PATH}/${ownerId}/${workerId}`);
  const newServiceRef = push(servicesRef);

  await update(newServiceRef, {
    ...serviceData,
    createdAt: Date.now(),
  });

  return newServiceRef.key!;
}

export async function getWorkerServices(
  ownerId: string,
  workerId: string
): Promise<(Service & { firebaseId: string })[]> {
  const servicesRef = ref(db, `${SERVICES_PATH}/${ownerId}/${workerId}`);
  const snapshot = await get(servicesRef);

  if (!snapshot.exists()) {
    return [];
  }

  const data = snapshot.val();
  return Object.entries(data).map(([firebaseId, service]: [string, any]) => ({
    firebaseId,
    ...service,
  }));
}

export async function getService(
  ownerId: string,
  workerId: string,
  serviceId: string
): Promise<(Service & { firebaseId: string }) | null> {
  const serviceRef = ref(db, `${SERVICES_PATH}/${ownerId}/${workerId}/${serviceId}`);
  const snapshot = await get(serviceRef);

  if (!snapshot.exists()) {
    return null;
  }

  return {
    firebaseId: serviceId,
    ...snapshot.val(),
  };
}

export async function updateService(
  ownerId: string,
  workerId: string,
  serviceId: string,
  serviceData: Partial<Service>
): Promise<void> {
  const serviceRef = ref(db, `${SERVICES_PATH}/${ownerId}/${workerId}/${serviceId}`);

  await update(serviceRef, {
    ...serviceData,
    updatedAt: Date.now(),
  });
}

export async function deleteService(
  ownerId: string,
  workerId: string,
  serviceId: string
): Promise<void> {
  const serviceRef = ref(db, `${SERVICES_PATH}/${ownerId}/${workerId}/${serviceId}`);
  await remove(serviceRef);
}

export async function getAllWorkerServices(
  ownerId: string
): Promise<Map<string, (Service & { firebaseId: string })[]>> {
  const servicesRef = ref(db, `${SERVICES_PATH}/${ownerId}`);
  const snapshot = await get(servicesRef);

  if (!snapshot.exists()) {
    return new Map();
  }

  const data = snapshot.val();
  const allServices = new Map<string, (Service & { firebaseId: string })[]>();

  Object.entries(data).forEach(([workerId, workerServices]: [string, any]) => {
    const services = Object.entries(workerServices).map(([firebaseId, service]: [string, any]) => ({
      firebaseId,
      ...service,
    }));
    allServices.set(workerId, services);
  });

  return allServices;
}
