// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFunctions } from 'firebase/functions';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBHHj0PaLHEfRxxzYuOrHDd4SvuyAcpenk',
  authDomain: 'eixospmultas.firebaseapp.com',
  projectId: 'eixospmultas',
  storageBucket: 'eixospmultas.firebasestorage.app',
  messagingSenderId: '204319159651',
  appId: '1:204319159651:web:4bc8789d4f3b58314ecf56',
  measurementId: 'G-BRE3GJ7B94',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const functions = getFunctions(app, 'southamerica-east1');

let db;
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  });
} catch (error) {
  console.warn('Cache persistente indisponível; usando cache padrão.', error);
  db = getFirestore(app);
}

export { auth, db, functions };
export default app;
