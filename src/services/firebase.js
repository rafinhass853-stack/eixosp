import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: 'AIzaSyDV14bxX1fbWRJ_fjD4NPX3uhdnM9kgGY0',
  authDomain: 'eixospgestaofrotas.firebaseapp.com',
  projectId: 'eixospgestaofrotas',
  storageBucket: 'eixospgestaofrotas.firebasestorage.app',
  messagingSenderId: '33008725753',
  appId: '1:33008725753:web:aa41d8c933c4daad8bbc28',
  measurementId: 'G-7QKPVS6B0C'
};
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const storage = getStorage(app);
export let analytics = null;
if (typeof window !== 'undefined') isSupported().then(ok => { if (ok) analytics = getAnalytics(app); }).catch(() => {});
export default app;