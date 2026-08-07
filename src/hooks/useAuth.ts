import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '../config/firebase';
import type { User, UserRole } from '../types';
import { getUserData } from '../lib/auth';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      try {
        setLoading(true);
        if (fbUser) {
          setFirebaseUser(fbUser);
          const userData = await getUserData(fbUser.uid);
          setUser(userData);
        } else {
          setUser(null);
          setFirebaseUser(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Authentication error');
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  return { user, firebaseUser, loading, error };
}

export function useRequireRole(roles: UserRole[]) {
  const { user, loading } = useAuth();

  return {
    hasAccess: !loading && user && roles.includes(user.role),
    user,
    loading,
  };
}
