import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  connectFirestoreEmulator,
  memoryLocalCache,
} from 'firebase/firestore';
import { firebaseConfig } from '../config.js';

// VITE_EMULADOR=1 usa os emuladores locais do Firebase (testes no computador).
const emulador = import.meta.env.VITE_EMULADOR === '1';

export const app = initializeApp(firebaseConfig);

// getAuth guarda a sessão no aparelho: a senha é pedida uma vez só.
export const auth = getAuth(app);

// Cache local: o app abre e mostra os dados mesmo sem sinal (ex.: no mercado).
export const db = initializeFirestore(app, {
  localCache: emulador
    ? memoryLocalCache()
    : persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});

if (emulador) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}
