import { useEffect, useRef, useState } from 'react';
import { collection, deleteDoc, doc, getDocs, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export function safeDocId(value, fallback = 'registro') {
  const id = String(value ?? '').trim().replace(/[\\/]/g, '-');
  return id || `${fallback}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useFirestoreCollection(collectionName, getId) {
  const [items, setItemsState] = useState([]);
  const hydrated = useRef(false);

  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        const snap = await getDocs(collection(db, collectionName));
        if (!ativo) return;
        const rows = snap.docs.map((d) => ({ __docId: d.id, ...d.data() }));
        setItemsState(rows);
      } catch (error) {
        console.error(`Erro ao carregar ${collectionName}:`, error);
      } finally {
        if (ativo) hydrated.current = true;
      }
    })();
    return () => { ativo = false; };
  }, [collectionName]);

  const setItems = (updater) => {
    setItemsState((previous) => {
      const next = typeof updater === 'function' ? updater(previous) : updater;
      if (hydrated.current) {
        void Promise.all(next.map((row) => {
          const { __docId, ...data } = row;
          const id = safeDocId(__docId || getId(row));
          return setDoc(doc(db, collectionName, id), data, { merge: true });
        })).catch((error) => console.error(`Erro ao salvar ${collectionName}:`, error));
      }
      return next;
    });
  };

  const removeItem = async (row) => {
    const id = safeDocId(row.__docId || getId(row));
    await deleteDoc(doc(db, collectionName, id));
    setItemsState((previous) => previous.filter((item) => (item.__docId || getId(item)) !== (row.__docId || getId(row))));
  };

  return [items, setItems, removeItem];
}
