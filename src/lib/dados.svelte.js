// Dados compartilhados entre as telas, sincronizados ao vivo com o Firestore.
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from './firebase.js';
import { ordenarPorNome } from './ingredientes.js';

export const dados = $state({
  ingredientes: [], // ordenados por nome
  carregado: false,
});

/** Mapa id -> ingrediente, para achar rápido. */
export function ingredientePorId(id) {
  return dados.ingredientes.find((i) => i.id === id);
}

let paradas = [];

export function comecarSincronizar() {
  if (paradas.length) return;
  paradas.push(
    onSnapshot(
      collection(db, 'ingredientes'),
      (snap) => {
        dados.ingredientes = ordenarPorNome(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        dados.carregado = true;
      },
      (erro) => console.error('ingredientes', erro),
    ),
  );
}

export function pararSincronizar() {
  paradas.forEach((parar) => parar());
  paradas = [];
  dados.ingredientes = [];
  dados.carregado = false;
}
