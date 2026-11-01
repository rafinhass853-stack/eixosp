// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

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

export const db = getFirestore(app);
export default app;