// Dados compartilhados entre as telas, sincronizados ao vivo com o Firestore.
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from './firebase.js';
import { ordenarPorNome } from './ingredientes.js';

export const dados = $state({
  ingredientes: [], // ordenados por nome
  receitas: [], // ordenadas por nome
  carregado: false, // ingredientes
  receitasCarregadas: false,
});

/** Mapa id -> ingrediente (para cobertura das receitas). */
export function mapaDeIngredientes() {
  return new Map(dados.ingredientes.map((i) => [i.id, i]));
}

export function receitaPorId(id) {
  return dados.receitas.find((r) => r.id === id);
}

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
    onSnapshot(
      collection(db, 'receitas'),
      (snap) => {
        dados.receitas = ordenarPorNome(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        dados.receitasCarregadas = true;
      },
      (erro) => console.error('receitas', erro),
    ),
  );
}

export function pararSincronizar() {
  paradas.forEach((parar) => parar());
  paradas = [];
  dados.ingredientes = [];
  dados.receitas = [];
  dados.carregado = false;
  dados.receitasCarregadas = false;
}
