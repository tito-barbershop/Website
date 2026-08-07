import { useEffect, useState } from 'react';
import { ref, onValue, DataSnapshot } from 'firebase/database';
import { db } from '../config/firebase';

export function useFirebaseData<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dataRef = ref(db, path);

    const unsubscribe = onValue(
      dataRef,
      (snapshot: DataSnapshot) => {
        try {
          setLoading(false);
          setData(snapshot.val());
          setError(null);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Error fetching data');
          setData(null);
        }
      },
      (err) => {
        setError(err.message);
        setLoading(false);
        setData(null);
      }
    );

    return unsubscribe;
  }, [path]);

  return { data, loading, error };
}
