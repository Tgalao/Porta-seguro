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
import type { Perfil } from "@/lib/constantes";

export async function notificarLogin(
  nome: string,
  email: string,
  perfil: Perfil,
): Promise<void> {
  const chave = process.env.RESEND_API_KEY;
  const destinatario = process.env.EMAIL_ALERTA_ADMIN;

  // Sem configuração, não faz nada — não é um requisito do sistema, só um
  // alerta extra para quem o quiser ativar.
  if (!chave || !destinatario) return;

  try {
    const resposta = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${chave}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // "onboarding@resend.dev" é o remetente de testes do Resend: funciona
        // sem verificar um domínio próprio, mas só entrega ao email com que a
        // conta Resend foi criada — daí `EMAIL_ALERTA_ADMIN` ter de ser esse
        // mesmo email.
        from: "PortãoSeguro <onboarding@resend.dev>",
        to: destinatario,
        subject: `PortãoSeguro: login de ${nome}`,
        text:
          `${nome} (${email}, perfil "${perfil}") entrou no PortãoSeguro às ` +
          `${formatarDataHora(new Date())}.\n\n` +
          "Se não reconheces este acesso, muda a palavra-passe dessa conta.",
      }),
    });

    if (!resposta.ok) {
      console.error("Resend recusou o email de alerta de login:", await resposta.text());
    }
  } catch (erro) {
    console.error("Falha ao enviar o email de alerta de login:", erro);
  }
}
