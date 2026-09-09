/**
 * Alerta por email sempre que alguém faz login (endurecimento de segurança,
 * não fazia parte da análise original — decisão do aluno).
 *
 * Usa a API do Resend diretamente com `fetch`, em vez do SDK oficial: é um
 * único pedido POST, e evitar mais uma dependência mantém o código mais
 * fácil de explicar — não há nada "escondido" dentro de uma biblioteca.
 *
 * Nunca deixa uma falha aqui impedir o login: se as variáveis de ambiente
 * não estiverem definidas, ou o Resend responder com erro, o login segue
 * normalmente e o problema fica só registado no log do servidor.
 */

import { formatarDataHora } from "@/lib/datas";
import type { Perfil, TipoRegisto } from "@/lib/constantes";

/**
 * Envia um email pela API do Resend. Nunca lança — mas DEVOLVE se conseguiu
 * ou não: os avisos (login, movimento) ignoram esse valor e seguem em
 * frente, enquanto o código do segundo fator precisa mesmo de saber se o
 * email saiu, senão pedia à pessoa um código que nunca lhe chegou.
 *
 * "onboarding@resend.dev" é o remetente de testes do Resend: funciona sem
 * verificar um domínio próprio, mas só entrega ao(s) email(s) com que a
 * conta Resend foi criada — sem verificar um domínio, enviar para outros
 * endereços falha (fica registado no log, não é um erro visível para quem
 * usa o sistema).
 */
async function enviarEmail(
  destinatario: string,
  assunto: string,
  texto: string,
): Promise<boolean> {
  const chave = process.env.RESEND_API_KEY;
  if (!chave) return false;

  try {
    const resposta = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${chave}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "PortãoSeguro <onboarding@resend.dev>",
        to: destinatario,
        subject: assunto,
        text: texto,
      }),
    });

    if (!resposta.ok) {
      console.error(`Resend recusou o email para ${destinatario}:`, await resposta.text());
      return false;
    }
    return true;
  } catch (erro) {
    console.error(`Falha ao enviar email para ${destinatario}:`, erro);
    return false;
  }
}

/** O segundo fator está ligado se houver forma de enviar o email. */
export function emailConfigurado(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

/**
 * Envia o código de 6 dígitos do segundo fator. Devolve `false` se o email
 * não saiu — nesse caso quem chamou recusa o login, em vez de ficar à
 * espera de um código que ninguém recebeu.
 *
 * `EMAIL_2FA_DESTINO` existe por causa da limitação do remetente de testes
 * do Resend explicada acima: sem um domínio verificado, o código nunca
 * chegaria a "admin@portaoseguro.pt". Com essa variável preenchida, os
 * códigos vão todos para a caixa de correio indicada (o email de segurança
 * de quem administra o sistema), que é o único endereço a que o Resend
 * entrega nessas condições.
 */
export async function enviarCodigoVerificacao(
  nome: string,
  emailDaConta: string,
  codigo: string,
  validadeMinutos: number,
): Promise<boolean> {
  const destinatario = process.env.EMAIL_2FA_DESTINO || emailDaConta;

  return enviarEmail(
    destinatario,
    `PortãoSeguro: código de acesso ${codigo}`,
    `Código para entrar no PortãoSeguro como ${nome} (${emailDaConta}):\n\n` +
      `    ${codigo}\n\n` +
      `Serve durante ${validadeMinutos} minutos e só pode ser usado uma vez.\n\n` +
      "Se não foste tu a tentar entrar, alguém sabe a palavra-passe desta " +
      "conta: dirige-te ao informático da escola e pede para a trocar já.",
  );
}

/**
 * Perfis cujo login gera alerta por email. Só contas com poder sobre os
 * dados de outras pessoas: um aluno a entrar na sua própria área é o caso
 * normal e enchia a caixa de correio sem acrescentar nada. O porteiro
 * também fica de fora — não consegue alterar nada além dos registos que
 * já faz no dia a dia.
 */
const PERFIS_COM_ALERTA_DE_LOGIN: Perfil[] = [
  "professor",
  "dt",
  "coordenador",
  "gestor",
  "admin",
];

/** Alerta ao administrador quando entra uma conta de nível superior
 * (endurecimento de segurança — não fazia parte da análise original).
 *
 * O endereço IP vai no aviso para dar pelo menos uma pista de ONDE partiu o
 * acesso ("foi da escola ou de fora?"). Não serve para provar quem foi: numa
 * escola toda a gente sai pelo mesmo endereço, e num telemóvel ele muda
 * sozinho. É uma pista para investigar, nunca uma prova. */
export async function notificarLogin(
  nome: string,
  email: string,
  perfil: Perfil,
  ip?: string,
): Promise<void> {
  if (!PERFIS_COM_ALERTA_DE_LOGIN.includes(perfil)) return;

  const destinatario = process.env.EMAIL_ALERTA_ADMIN;
  if (!destinatario) return;

  await enviarEmail(
    destinatario,
    `PortãoSeguro: login de ${nome}`,
    `${nome} (${email}, perfil "${perfil}") entrou no PortãoSeguro.\n\n` +
      `Quando: ${formatarDataHora(new Date())}\n` +
      `Endereço IP: ${ip ?? "desconhecido"}\n\n` +
      // Não há troca de palavra-passe self-service no sistema — só um admin
      // pode mudar a de outra pessoa (src/app/admin/alunos/acoes.ts). Por
      // isso a instrução aponta para o informático da escola, não para um
      // link que não existe.
      "Se não reconheces este acesso, dirige-te ao informático da escola " +
      "e pede para trocar a palavra-passe dessa conta.",
  );
}

/**
 * Avisa o próprio aluno (por email) sempre que tem uma entrada ou saída
 * registada na portaria — decisão do aluno, para poder acompanhar em tempo
 * real quando entra/sai da escola.
 *
 * Manda-se para o email da CONTA do aluno (não para um admin fixo): cada
 * aluno só recebe avisos sobre si próprio.
 */
export async function notificarMovimento(
  nomeAluno: string,
  emailAluno: string,
  tipo: TipoRegisto,
  autorizado: boolean,
  motivo: string,
  momento: Date,
): Promise<void> {
  const tipoTexto = tipo === "entrada" ? "Entrada" : "Saída";
  const estadoTexto = autorizado ? "autorizada" : "NÃO autorizada";

  await enviarEmail(
    emailAluno,
    `PortãoSeguro: ${tipoTexto.toLowerCase()} registada — ${formatarDataHora(momento)}`,
    `${tipoTexto} ${estadoTexto} para ${nomeAluno}, às ${formatarDataHora(momento)}.\n\n` +
      `Motivo: ${motivo}`,
  );
}
