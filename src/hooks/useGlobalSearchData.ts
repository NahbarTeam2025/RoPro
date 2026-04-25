import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './useAuth';

export interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  module: 'tasks' | 'notes' | 'links' | 'prompts' | 'contacts' | 'household' | 'calendar';
  path: string;
  date?: Date;
  metadata?: any;
}

export function useGlobalSearchData() {
  const { user } = useAuth();
  const [data, setData] = useState<{
    tasks: any[];
    notes: any[];
    links: any[];
    prompts: any[];
    contacts: any[];
    transactions: any[];
    appointments: any[];
  }>({
    tasks: [],
    notes: [],
    links: [],
    prompts: [],
    contacts: [],
    transactions: [],
    appointments: [],
  });

  useEffect(() => {
    if (!user) return;

    const collections = [
      { name: 'todos', key: 'tasks' },
      { name: 'notes', key: 'notes' },
      { name: 'links', key: 'links' },
      { name: 'prompts', key: 'prompts' },
      { name: 'contacts', key: 'contacts' },
      { name: 'transactions', key: 'transactions' },
      { name: 'appointments', key: 'appointments' },
    ];

    const unsubscribes = collections.map(({ name, key }) => {
      const q = query(collection(db, name), where('userId', '==', user.uid));
      return onSnapshot(q, (snapshot) => {
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setData(prev => ({ ...prev, [key]: docs }));
      });
    });

    return () => unsubscribes.forEach(unsub => unsub());
  }, [user]);

  return data;
}
