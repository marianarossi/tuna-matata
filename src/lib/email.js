// Envio da lista de compras pelo EmailJS, direto do navegador (API REST, sem biblioteca).
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { EMAILJS } from '../config.js';
import { itensDaLista, assuntoDaLista, textoDaLista, htmlDaLista } from './compras.js';

/** Erro com mensagem para mostrar na tela. */
export class ErroEmail extends Error {}

export const emailConfigurado = () => Boolean(EMAILJS.servico && EMAILJS.modelo && EMAILJS.chavePublica);

/**
 * Manda a lista da semana para os e-mails dos Ajustes e marca emailEnviadoEm.
 * compras = { ingredienteId: { quantidade } }, como fica gravado na semana.
 * O modelo no EmailJS usa {{para}}, {{assunto}} e {{{mensagem_html}}} (README, passo 8).
 */
export async function enviarLista(db, semanaId, compras, porId, emails) {
  if (!emailConfigurado()) throw new ErroEmail('O e-mail ainda não foi configurado (passo 8 do README).');
  if (!emails?.length) throw new ErroEmail('Coloquem os e-mails em ⚙️ Ajustes.');

  const mensagem = textoDaLista(semanaId, itensDaLista(compras, porId));
  const resposta = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: EMAILJS.servico,
      template_id: EMAILJS.modelo,
      user_id: EMAILJS.chavePublica,
      template_params: {
        para: emails.join(', '),
        assunto: assuntoDaLista(semanaId),
        mensagem,
        mensagem_html: htmlDaLista(mensagem),
      },
    }),
  });
  if (!resposta.ok) {
    console.error('EmailJS', resposta.status, await resposta.text());
    throw new ErroEmail('O e-mail não foi enviado. Tentem de novo pela aba Compras.');
  }
  await updateDoc(doc(db, 'semanas', semanaId), { emailEnviadoEm: serverTimestamp() });
}
