import { useEffect, useRef, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  getDocsFromCache,
  setDoc,
} from 'firebase/firestore';
import { db } from './firebase';

const CACHE_TTL_MS = 5 * 60 * 1000;
const collectionCache = new Map();

export function safeDocId(value, fallback = 'registro') {
  const id = String(value ?? '').trim().replace(/[\\/]/g, '-');
  return id || `${fallback}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function dataOnly(row) {
  const data = { ...row };
  delete data.__docId;
  return data;
}

function stableSignature(row) {
  return JSON.stringify(
    Object.keys(dataOnly(row)).sort().map((key) => [key, dataOnly(row)[key]]),
  );
}

function withStableIds(rows, getId) {
  const used = new Map();
  return rows.map((row, index) => {
    const base = safeDocId(row.__docId || getId(row), `registro-${index + 1}`);
    const count = (used.get(base) || 0) + 1;
    used.set(base, count);
    const id = count === 1 ? base : `${base}-${count}`;
    return row.__docId === id ? row : { ...row, __docId: id };
  });
}

export function clearFirestoreCollectionCache(collectionName) {
  collectionCache.delete(collectionName);
}

export function useFirestoreCollection(collectionName, getId) {
  const [items, setItemsState] = useState([]);
  const hydrated = useRef(false);
  const previousItems = useRef(null);
  const getIdRef = useRef(getId);
  useEffect(() => { getIdRef.current = getId; }, [getId]);

  useEffect(() => {
    let ativo = true;
    const cached = collectionCache.get(collectionName);
    if (cached && Date.now() - cached.updatedAt < CACHE_TTL_MS) {
      const rows = cached.rows.map((row) => ({ ...row }));
      previousItems.current = rows;
      queueMicrotask(() => { if (ativo) setItemsState(rows); });
      hydrated.current = true;
      return () => { ativo = false; };
    }

    (async () => {
      try {
        const ref = collection(db, collectionName);
        const storageKey = `eixo-firestore-sync:${collectionName}`;
        const lastSync = Number(window.localStorage.getItem(storageKey) || 0);
        let snap = null;
        if (Date.now() - lastSync < CACHE_TTL_MS) {
          try {
            snap = await getDocsFromCache(ref);
          } catch {
            // Cache persistente indisponível ou ainda sem dados; consulta o servidor abaixo.
          }
        }
        if (!snap) {
          snap = await getDocs(ref);
          window.localStorage.setItem(storageKey, String(Date.now()));
        }
        if (!ativo) return;
        const rows = snap.docs.map((item) => ({ __docId: item.id, ...item.data() }));
        collectionCache.set(collectionName, { rows, updatedAt: Date.now() });
        previousItems.current = rows;
        queueMicrotask(() => { if (ativo) setItemsState(rows); });
      } catch (error) {
        console.error(`Erro ao carregar ${collectionName}:`, error);
      } finally {
        if (ativo) hydrated.current = true;
      }
    })();
    return () => { ativo = false; };
  }, [collectionName]);

  useEffect(() => {
    if (!hydrated.current) return;
    const normalized = withStableIds(items, getIdRef.current);
    const previous = previousItems.current;
    if (previous === null) {
      previousItems.current = normalized;
      return;
    }

    const previousById = new Map(previous.map((row) => [row.__docId, row]));
    const changed = normalized.filter((row) => {
      const old = previousById.get(row.__docId);
      return !old || stableSignature(old) !== stableSignature(row);
    });

    previousItems.current = normalized;
    collectionCache.set(collectionName, { rows: normalized, updatedAt: Date.now() });
    if (changed.length === 0) return;

    void Promise.all(changed.map((row) =>
      setDoc(doc(db, collectionName, row.__docId), dataOnly(row), { merge: true }),
    )).catch((error) => console.error(`Erro ao salvar ${collectionName}:`, error));
  }, [items, collectionName]);

  const setItems = (updater) => {
    setItemsState((previous) => updater instanceof Function ? updater(previous) : updater);
  };

  const removeItem = async (row) => {
    const id = safeDocId(row.__docId || getIdRef.current(row));
    await deleteDoc(doc(db, collectionName, id));
    const next = (previousItems.current || []).filter((item) => item.__docId !== id);
    previousItems.current = next;
    collectionCache.set(collectionName, { rows: next, updatedAt: Date.now() });
    setItemsState(next);
  };

  return [items, setItems, removeItem];
}
