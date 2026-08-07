import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import { ref, set, get, update } from 'firebase/database';
import { auth, db } from '../config/firebase';
import type { UserRole, User } from '../types';

export async function registerUser(
  email: string,
  password: string,
  name: string,
  phone: string,
  role: UserRole
): Promise<User> {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const user = credential.user;

  let userData: User = {
    id: user.uid,
    name,
    email,
    phone,
    role,
  };

  // If registering as a worker or cashier, check if they were pre-added by an owner
  if (role === 'worker' || role === 'cashier') {
    try {
      const workerRecord = await findWorkerByEmailAcrossOwners(email);
      if (workerRecord) {
        // Update the existing worker record with the auth user ID and additional info
        const { ownerId, workerId, existingData } = workerRecord;
        const updatedWorkerData = {
          ...existingData,
          id: user.uid,
          name: name || existingData.name,
          phone: phone || existingData.phone,
          email,
        };
        await set(ref(db, `workers/${ownerId}/${workerId}`), updatedWorkerData);
        }
    } catch (error) {
      console.error('Error checking for existing worker record:', error);
    }
  }

  // Store user data for authentication
  await set(ref(db, `users/${user.uid}`), userData);

  // If registering as owner, store as current shop (both locally and globally)
  if (role === 'owner') {
    localStorage.setItem('currentShopOwnerId', user.uid);
    // Store globally so customers can access it from any device
    try {
      await set(ref(db, 'shopConfig/currentOwnerId'), user.uid);
    } catch (error) {
      console.error('Error storing owner ID globally:', error);
      // Don't fail registration if this fails
    }
  }

  return userData;
}

async function findWorkerByEmailAcrossOwners(
  email: string
): Promise<{ ownerId: string; workerId: string; existingData: any } | null> {
  try {

    // Try to read temporaryCredentials to find the ownerId
    const encodedEmail = encodeEmail(email);
    const tempCredRef = ref(db, `temporaryCredentials/${encodedEmail}`);
    const tempCredSnapshot = await get(tempCredRef);

    if (tempCredSnapshot.exists()) {
      const tempCred = tempCredSnapshot.val();
      const ownerId = tempCred.ownerId;
      const workerId = tempCred.workerId;

      // Now get the actual worker data
      const workerRef = ref(db, `workers/${ownerId}/${workerId}`);
      const workerSnapshot = await get(workerRef);

      if (workerSnapshot.exists()) {
        return {
          ownerId,
          workerId,
          existingData: workerSnapshot.val(),
        };
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}

function encodeEmail(email: string): string {
  return email.replace(/[.@]/g, '_');
}


export async function loginUser(email: string, password: string): Promise<FirebaseUser> {
  try {
    // Try normal login first
    const credential = await signInWithEmailAndPassword(auth, email, password);

    // For existing users, fetch their data and store relevant info
    const userData = await getUserData(credential.user.uid);

    if (userData && userData.role === 'owner') {
      localStorage.setItem('ownerId', credential.user.uid);
      // Store as current shop for customers (both locally and globally)
      localStorage.setItem('currentShopOwnerId', credential.user.uid);
      try {
        await set(ref(db, 'shopConfig/currentOwnerId'), credential.user.uid);
      } catch (error) {
        // Don't fail login if this fails
      }
    } else if (userData && (userData.role === 'worker' || userData.role === 'cashier')) {
      // Worker/Cashier data should be in the user record
      const workerUser = userData as any;
      if (workerUser.workerId && workerUser.ownerId) {
        localStorage.setItem('ownerId', workerUser.ownerId);
        localStorage.setItem('workerData', JSON.stringify({
          workerId: workerUser.workerId,
          ownerId: workerUser.ownerId,
        }));
      } else {
        // Fallback: find worker by email using temporary credentials
        const workerRecord = await findWorkerByEmailAcrossOwners(email);
        if (workerRecord) {
          const dataToStore = {
            workerId: workerRecord.workerId,
            ownerId: workerRecord.ownerId,
          };
          localStorage.setItem('ownerId', workerRecord.ownerId);
          localStorage.setItem('workerData', JSON.stringify(dataToStore));

          // Update user record with worker/cashier info for future logins
          try {
            await set(ref(db, `users/${credential.user.uid}`), {
              id: credential.user.uid,
              email,
              role: userData.role,
              workerId: workerRecord.workerId,
              ownerId: workerRecord.ownerId,
            });
          } catch (e) {
            // Silently fail - worker can still login
          }
        }
      }
    } else {
      // If no role found, check if this email belongs to a worker or cashier
      const workerRecord = await findWorkerByEmailAcrossOwners(email);
      if (workerRecord) {
        localStorage.setItem('ownerId', workerRecord.ownerId);
        localStorage.setItem('workerData', JSON.stringify({
          workerId: workerRecord.workerId,
          ownerId: workerRecord.ownerId,
        }));

        // Create user record - determine role from the temp credentials
        try {
          const encodedEmail = encodeEmail(email);
          const tempCredRef = ref(db, `temporaryCredentials/${encodedEmail}`);
          const tempCredSnapshot = await get(tempCredRef);
          const tempCredData = tempCredSnapshot.exists() ? tempCredSnapshot.val() : {};
          const tempCredRole = tempCredData.role || 'worker';

          await set(ref(db, `users/${credential.user.uid}`), {
            id: credential.user.uid,
            email,
            role: tempCredRole,
            workerId: workerRecord.workerId,
            ownerId: workerRecord.ownerId,
          });
        } catch (e) {
        }
      }
    }

    return credential.user;
  } catch (error: any) {
    if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
      try {
        const tempCredential = await verifyTemporaryCredentials(email, password);

        if (!tempCredential) {
            throw new Error('Invalid email or password');
        }

        if (!tempCredential.valid) {
            throw new Error('Invalid email or password');
        }

        if (!tempCredential.ownerId || !tempCredential.workerId) {
            throw new Error('Invalid email or password');
        }

        const credential = await createUserWithEmailAndPassword(auth, email, password);
        const userId = credential.user.uid;

        localStorage.setItem('ownerId', tempCredential.ownerId);
        localStorage.setItem('workerData', JSON.stringify({
          workerId: tempCredential.workerId,
          ownerId: tempCredential.ownerId,
        }));
        localStorage.setItem('workerFirstLogin', 'true');

        // Store worker/cashier info in the user record for easier lookup later
        const userRole = tempCredential.role || 'worker';
        try {
          await set(ref(db, `users/${userId}`), {
            id: userId,
            email,
            role: userRole,
            workerId: tempCredential.workerId,
            ownerId: tempCredential.ownerId,
          });
        } catch (userRecordError) {
          // User record creation failed, but worker can still login
        }

        // Update worker record with the new user ID
        try {
          await update(ref(db, `workers/${tempCredential.ownerId}/${tempCredential.workerId}`), { id: userId });
        } catch (workerUpdateError) {
          // Worker update failed, but user can still login
        }

        return credential.user;
      } catch (tempVerifyError) {
        throw new Error('Invalid email or password');
      }
    }
    throw error;
  }
}

async function verifyTemporaryCredentials(email: string, password: string): Promise<{ valid: boolean; ownerId?: string; workerId?: string; role?: string } | null> {
  try {
    const encodedEmail = encodeEmail(email);
    const credRef = ref(db, `temporaryCredentials/${encodedEmail}`);
    const snapshot = await get(credRef);

    if (!snapshot.exists()) {
      return null;
    }

    const cred = snapshot.val();

    // Check if credentials are still valid (not expired)
    if (cred.expiresAt && cred.expiresAt < Date.now()) {
      return { valid: false };
    }

    // Verify password matches
    const passwordMatches = cred.tempPassword === password;

    if (passwordMatches) {
      return {
        valid: true,
        ownerId: cred.ownerId,
        workerId: cred.workerId,
        role: cred.role || 'worker', // Default to worker if not specified
      };
    }

    return { valid: false };
  } catch (error) {
    return null;
  }
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

export async function getUserData(userId: string): Promise<User | null> {
  try {
    // Try to get from users collection (for owners, customers, workers, and cashiers)
    const userSnapshot = await get(ref(db, `users/${userId}`));
    if (userSnapshot.exists()) {
      return userSnapshot.val();
    }

    // If not in users collection, this might be a worker/cashier that hasn't logged in yet
    // Return a minimal user object with role 'worker' so they can access their dashboard
    // The actual worker/cashier details will be fetched when needed from the workers collection
    return {
      id: userId,
      name: '',
      email: '',
      phone: '',
      role: 'worker',
    };
  } catch (error) {
    return null;
  }
}

export async function getUserRole(userId: string): Promise<UserRole | null> {
  const user = await getUserData(userId);
  return user?.role || null;
}
