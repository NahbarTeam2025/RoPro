import { collection, getDocs, query, where, addDoc, writeBatch, serverTimestamp, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';

let migrationRan = false;

export async function migrateShoppingLists(userId: string) {
  if (migrationRan) return;
  migrationRan = true;
  
  try {
    console.log('Fetching old lists');
    const oldQ = query(collection(db, 'shoppinglist'), where('userId', '==', userId));
    const oldSnap = await getDocs(oldQ);
    console.log('Fetched old lists, count:', oldSnap.size);
    
    if (oldSnap.empty) return;

    // Check if new list already exists to avoid dupes
    console.log('Fetching new lists');
    const newListsQ = query(collection(db, 'shoppinglists'), where('userId', '==', userId));
    const newListsSnap = await getDocs(newListsQ);
    console.log('Fetched new lists, count:', newListsSnap.size);
    
    let defaultListId = '';
    
    if (newListsSnap.empty) {
      console.log('Creating new list');
      const newListRef = await addDoc(collection(db, 'shoppinglists'), {
        name: 'Einkaufsliste',
        userId,
        createdAt: serverTimestamp()
      });
      defaultListId = newListRef.id;
    } else {
      defaultListId = newListsSnap.docs[0].id; // Fallback to first existing
    }

    console.log('Starting migration write batch');
    let itemsToMigrate = 0;
    
    for (const d of oldSnap.docs) {
      const data = d.data();
      try {
        await addDoc(collection(db, `shoppinglists/${defaultListId}/items`), { 
          name: typeof data.name === 'string' ? data.name : '',
          completed: !!data.completed,
          order: typeof data.order === 'number' ? data.order : 0,
          userId: userId,
          createdAt: serverTimestamp() 
        });
        await deleteDoc(d.ref);
        itemsToMigrate++;
      } catch (e) {
         console.error('Failed on item', data, e);
         throw e;
      }
    }
    
    if (itemsToMigrate > 0) {
      console.log('Migrated old shopping lists successfully');
    }
  } catch (err) {
    console.error('Migration failed', err);
  }
}
