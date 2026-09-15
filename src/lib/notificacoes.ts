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
import { EMAIL_CONTA_DE_TESTE_QR } from "@/lib/dispositivo";
import type { Perfil, TipoRegisto } from "@/lib/constantes";

/** Azul do resto do site (Tailwind blue-700), para o email ficar com a
 * mesma identidade visual em vez de parecer um alerta genérico de sistema. */
const AZUL = "#1d4ed8";

/**
 * Escapa texto antes de o meter no HTML do email. A maioria dos valores
 * aqui vem da nossa própria base de dados, mas o endereço IP vem de um
 * cabeçalho do pedido (`x-forwarded-for`) — controlável por quem o envia —
 * e nunca deve ser colado diretamente num HTML sem passar por isto.
 */
function escaparHtml(texto: string): string {
  return texto
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/**
 * Envolve o conteúdo de um email num cartão simples, com o nome do site no
 * topo. Escrito com `<table>` e estilos inline (não uma folha CSS à parte)
 * de propósito — é a única forma de um email ficar igual na Gmail, no
 * Outlook e no resto: a maioria destes clientes ignora `<style>` no
 * cabeçalho e alguns até removem `<div>`s inteiros.
 */
function moldura(tituloTopo: string, corTopo: string, corpoHtml: string): string {
  return `<!doctype html>
<html lang="pt-PT">
<body style="margin:0;padding:24px 12px;background:#f1f5f9;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
        <tr>
          <td style="background:${corTopo};padding:20px 28px;">
            <span style="color:#ffffff;font-size:16px;font-weight:700;letter-spacing:0.02em;">PortãoSeguro</span>
            <div style="color:rgba(255,255,255,0.85);font-size:13px;margin-top:2px;">${tituloTopo}</div>
          </td>
        </tr>
        <tr>
          <td style="padding:28px;">
            ${corpoHtml}
          </td>
        </tr>
        <tr>
          <td style="padding:16px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;">
            <p style="margin:0;color:#94a3b8;font-size:11px;">
              Email automático do PortãoSeguro — sistema de registo de entradas e saídas escolares. Não respondas a este email.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/** Uma linha "rótulo: valor" dentro do cartão — usado nos três emails para
 * mostrar a informação-chave (quem, quando, com quê) de forma consistente. */
function linha(rotulo: string, valor: string): string {
  return `<tr>
    <td style="padding:6px 0;color:#64748b;font-size:13px;white-space:nowrap;vertical-align:top;">${rotulo}</td>
    <td style="padding:6px 0 6px 12px;color:#0f172a;font-size:13px;font-weight:600;">${valor}</td>
  </tr>`;
}

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
 *
 * Vai sempre `text` E `html`: o texto simples é o que um leitor de ecrã ou
 * um cliente de email antigo mostra quando não interpreta HTML — nunca é
 * só decoração, é o mesmo conteúdo em duas formas.
 */
async function enviarEmail(
  destinatario: string,
  assunto: string,
  texto: string,
  html: string,
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
        html,
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

  const texto =
    `Código para entrar no PortãoSeguro como ${nome} (${emailDaConta}):\n\n` +
    `    ${codigo}\n\n` +
    `Serve durante ${validadeMinutos} minutos e só pode ser usado uma vez.\n\n` +
    "Se não foste tu a tentar entrar, alguém sabe a palavra-passe desta " +
    "conta: dirige-te ao informático da escola e pede para a trocar já.";

  const html = moldura(
    "Código de acesso",
    AZUL,
    `<p style="margin:0 0 16px;color:#334155;font-size:14px;">Pedido de entrada para <strong>${escaparHtml(nome)}</strong> (${escaparHtml(emailDaConta)}):</p>
     <div style="text-align:center;margin:0 0 16px;">
       <span style="display:inline-block;background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:14px 24px;font-size:32px;font-weight:700;letter-spacing:0.3em;color:${AZUL};">${escaparHtml(codigo)}</span>
     </div>
     <p style="margin:0 0 20px;color:#64748b;font-size:13px;">Válido por ${validadeMinutos} minutos, e só pode ser usado uma vez.</p>
     <div style="border-left:3px solid #f59e0b;background:#fffbeb;padding:10px 14px;border-radius:6px;">
       <p style="margin:0;color:#78350f;font-size:12px;">Se não foste tu a tentar entrar, alguém sabe a palavra-passe desta conta — dirige-te ao informático da escola e pede para a trocar já.</p>
     </div>`,
  );

  return enviarEmail(destinatario, `PortãoSeguro: código de acesso ${codigo}`, texto, html);
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

  const quando = formatarDataHora(new Date());
  const enderecoIp = ip ?? "desconhecido";

  const texto =
    `${nome} (${email}, perfil "${perfil}") entrou no PortãoSeguro.\n\n` +
    `Quando: ${quando}\n` +
    `Endereço IP: ${enderecoIp}\n\n` +
    // Não há troca de palavra-passe self-service no sistema — só um admin
    // pode mudar a de outra pessoa (src/app/admin/alunos/acoes.ts). Por
    // isso a instrução aponta para o informático da escola, não para um
    // link que não existe.
    "Se não reconheces este acesso, dirige-te ao informático da escola " +
    "e pede para trocar a palavra-passe dessa conta.";

  const html = moldura(
    "Login de nível superior",
    AZUL,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px;">
       ${linha("Nome", escaparHtml(nome))}
       ${linha("Email", escaparHtml(email))}
       ${linha("Perfil", `<span style="background:#eff6ff;color:${AZUL};padding:2px 8px;border-radius:999px;font-size:12px;">${escaparHtml(perfil)}</span>`)}
       ${linha("Quando", escaparHtml(quando))}
       ${linha("Endereço IP", escaparHtml(enderecoIp))}
     </table>
     <div style="border-left:3px solid #f59e0b;background:#fffbeb;padding:10px 14px;border-radius:6px;">
       <p style="margin:0;color:#78350f;font-size:12px;">Se não reconheces este acesso, dirige-te ao informático da escola e pede para trocar a palavra-passe desta conta.</p>
     </div>`,
  );

  await enviarEmail(destinatario, `PortãoSeguro: login de ${nome}`, texto, html);
}

/**
 * Avisa o próprio aluno (por email) sempre que tem uma entrada ou saída
 * registada na portaria — decisão do aluno, para poder acompanhar em tempo
 * real quando entra/sai da escola.
 *
 * Manda-se para o email da CONTA do aluno (não para um admin fixo): cada
 * aluno só recebe avisos sobre si próprio.
 *
 * EXCEÇÃO: a conta de teste (`EMAIL_CONTA_DE_TESTE_QR`) usa um domínio da
 * escola real (eclisboa.net), que o Resend recusa entregar sem um domínio
 * verificado — a mesma limitação do `EMAIL_2FA_DESTINO` (ver
 * `enviarCodigoVerificacao`). Sem este desvio, o email desta conta falhava
 * sempre, em silêncio, e nunca dava para mostrar este aviso a funcionar na
 * defesa oral. Note-se que isto é só um problema da conta de DEMONSTRAÇÃO:
 * as contas reais dos alunos ficam sujeitas à mesma limitação enquanto o
 * Resend não tiver um domínio verificado — não há nada a corrigir no
 * código para isso, é preciso mesmo verificar um domínio.
 */
export async function notificarMovimento(
  nomeAluno: string,
  emailAluno: string,
  tipo: TipoRegisto,
  autorizado: boolean,
  motivo: string,
  momento: Date,
): Promise<void> {
  const destinatario =
    emailAluno === EMAIL_CONTA_DE_TESTE_QR
      ? process.env.EMAIL_2FA_DESTINO || emailAluno
      : emailAluno;

  const tipoTexto = tipo === "entrada" ? "Entrada" : "Saída";
  const estadoTexto = autorizado ? "autorizada" : "NÃO autorizada";
  const quando = formatarDataHora(momento);
  const corEstado = autorizado ? "#16a34a" : "#dc2626";

  const texto =
    `${tipoTexto} ${estadoTexto} para ${nomeAluno}, às ${quando}.\n\n` + `Motivo: ${motivo}`;

  const html = moldura(
    `${tipoTexto} registada`,
    autorizado ? "#16a34a" : "#dc2626",
    `<div style="text-align:center;margin:0 0 18px;">
       <span style="display:inline-block;background:${autorizado ? "#f0fdf4" : "#fef2f2"};color:${corEstado};border:1px solid ${autorizado ? "#bbf7d0" : "#fecaca"};padding:6px 16px;border-radius:999px;font-size:13px;font-weight:700;">${tipoTexto} ${estadoTexto}</span>
     </div>
     <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0;">
       ${linha("Aluno", escaparHtml(nomeAluno))}
       ${linha("Quando", escaparHtml(quando))}
       ${linha("Motivo", escaparHtml(motivo))}
     </table>`,
  );

  await enviarEmail(
    destinatario,
    `PortãoSeguro: ${tipoTexto.toLowerCase()} registada — ${quando}`,
    texto,
    html,
  );
}
