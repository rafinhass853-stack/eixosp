import { initializeApp } from 'firebase/app'
import { getAnalytics } from 'firebase/analytics'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDV14bxX1fbWRJ_fjD4NPX3uhdnM9kgGY0',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'eixospgestaofrotas.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'eixospgestaofrotas',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'eixospgestaofrotas.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '33008725753',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:33008725753:web:aa41d8c933c4daad8bbc28',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-7QKPVS6B0C'
}

export const app = initializeApp(firebaseConfig)
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
export const googleProvider = new GoogleAuthProvider()
export const firebaseConfigured = true
