import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { firebaseConfig } from '../config.js';

export const app = initializeApp(firebaseConfig);

// getAuth guarda a sessão no aparelho: a senha é pedida uma vez só.
export const auth = getAuth(app);

// Cache local: o app abre e mostra os dados mesmo sem sinal (ex.: no mercado).
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});
