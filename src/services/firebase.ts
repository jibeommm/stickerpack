import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyAOQ-Pv3vfeqgrWsETk28_FWTO5oL8FxDs',
  authDomain: 'stickerpack-42f25.firebaseapp.com',
  projectId: 'stickerpack-42f25',
  storageBucket: 'stickerpack-42f25.firebasestorage.app',
  messagingSenderId: '624673156831',
  appId: '1:624673156831:web:b3232d2ff3076ddefd036a',
  measurementId: 'G-89KPC28FHH',
};

const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);
export default app;
