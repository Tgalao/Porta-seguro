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
 * Envia um email pela API do Resend. Nunca lança — quem chamar isto nunca
 * fica bloqueado por uma falha de email (chave em falta, Resend em baixo,
 * destinatário não verificado); o problema fica só no log do servidor.
 *
 * "onboarding@resend.dev" é o remetente de testes do Resend: funciona sem
 * verificar um domínio próprio, mas só entrega ao(s) email(s) com que a
 * conta Resend foi criada — sem verificar um domínio, enviar para outros
 * endereços falha (fica registado no log, não é um erro visível para quem
 * usa o sistema).
 */
async function enviarEmail(destinatario: string, assunto: string, texto: string): Promise<void> {
  const chave = process.env.RESEND_API_KEY;
  if (!chave) return;

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
    }
  } catch (erro) {
    console.error(`Falha ao enviar email para ${destinatario}:`, erro);
  }
}

/**
 * Perfis cujo login gera alerta por email. Só contas com poder sobre os
 * dados de outras pessoas: um aluno a entrar na sua própria área é o caso
 * normal e enchia a caixa de correio sem acrescentar nada. O porteiro
 * também fica de fora — não consegue alterar nada além dos registos que
 * já faz no dia a dia.
 */
const PERFIS_COM_ALERTA_DE_LOGIN: Perfil[] = ["professor", "dt", "coordenador", "admin"];

/** Alerta ao administrador quando entra uma conta de nível superior
 * (endurecimento de segurança — não fazia parte da análise original). */
export async function notificarLogin(
  nome: string,
  email: string,
  perfil: Perfil,
): Promise<void> {
  if (!PERFIS_COM_ALERTA_DE_LOGIN.includes(perfil)) return;

  const destinatario = process.env.EMAIL_ALERTA_ADMIN;
  if (!destinatario) return;

  await enviarEmail(
    destinatario,
    `PortãoSeguro: login de ${nome}`,
    `${nome} (${email}, perfil "${perfil}") entrou no PortãoSeguro às ` +
      `${formatarDataHora(new Date())}.\n\n` +
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
