import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from '../hooks/useAuth';

export interface Category {
  id: string;
  name: string;
  type: 'note' | 'task' | 'link' | 'prompt' | 'household';
  userId: string;
  createdAt: any;
}

export function useCategories(type: 'note' | 'task' | 'link' | 'prompt' | 'household') {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'categories'),
      where('userId', '==', user.uid),
      where('type', '==', type)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
      docs.sort((a, b) => a.name.localeCompare(b.name));
      setCategories(docs);
    });

    return () => unsubscribe();
  }, [user, type]);

  const addCategory = async (name: string) => {
    if (!user || !name.trim()) return null;
    try {
      const docRef = await addDoc(collection(db, 'categories'), {
        name: name.trim(),
        type,
        userId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error("Error adding category:", error);
      return null;
    }
  };

  const updateCategory = async (id: string, name: string) => {
    if (!user || !name.trim()) return;
    try {
      await updateDoc(doc(db, 'categories', id), {
        name: name.trim(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error updating category:", error);
    }
  };

  const deleteCategory = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'categories', id));
    } catch (error) {
      console.error("Error deleting category:", error);
    }
  };

  return { categories, addCategory, updateCategory, deleteCategory };
}
