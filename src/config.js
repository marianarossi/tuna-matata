// Configurações do Tuna Matata.
// Nada aqui é segredo: a config web do Firebase é pública por natureza,
// e quem protege os dados são as regras do Firestore (firestore.rules).

export const firebaseConfig = {
  apiKey: 'AIzaSyDm9k14v7xz-yBaqpiGINUD11foVb6KjNs',
  authDomain: 'tuna-matata.firebaseapp.com',
  projectId: 'tuna-matata',
  storageBucket: 'tuna-matata.firebasestorage.app',
  messagingSenderId: '630497575846',
  appId: '1:630497575846:web:cc59b67b0e31b7b6718567',
};

// A conta única do Firebase Auth. O app só pede a senha.
export const EMAIL_DA_CONTA = 'wmarianarossi@gmail.com';

// EmailJS, para mandar a lista de compras por e-mail (passo 8 do README).
// As três chaves são públicas por natureza. Vazias = o app avisa que o e-mail não está configurado.
export const EMAILJS = {
  servico: '', // Service ID, ex.: service_abc1234
  modelo: '', // Template ID, ex.: template_abc1234
  chavePublica: '', // Public Key (Account → General)
};
