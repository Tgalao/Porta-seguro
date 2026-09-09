import QRCode from "qrcode";
import { headers } from "next/headers";
import { exigirPerfil } from "@/lib/permissoes";
import { ligarBaseDados } from "@/lib/mongoose";
import { ehUserAgentDeTelemovel, EMAIL_CONTA_DE_TESTE_QR } from "@/lib/dispositivo";
import { TokenQR, Utilizador, Horario, Registo, Turma } from "@/models";
import {
  limitesDoMesEmLisboa,
  partesEmLisboa,
  diaDaSemanaEmLisboa,
  formatarData,
  formatarHora,
} from "@/lib/datas";
import {
  calcularAssiduidade,
  type RegistoParaAssiduidade,
} from "@/lib/relatorios/calcularAssiduidade";
import { GeradorQR } from "./gerador-qr";
import { AssiduidadeMensal, type LinhaDiaAssinalar } from "./assiduidade-mensal";
import { AbasAreaPessoal } from "./abas-area-pessoal";
import { CabecalhoSecao } from "@/components/cabecalho-secao";
import { HorarioSemanal, type BlocoHorario } from "@/components/horario-semanal";
import type { TokenGerado } from "./acoes";

/**
 * Área pessoal do aluno: o código QR para a portaria (RF15), o horário da
 * sua turma e a sua própria assiduidade do mês.
 *
 * O aluno vê sempre e só os SEUS dados — o id vem da sessão, nunca de um
 * parâmetro do endereço, por isso não há forma de pedir os de outra pessoa.
 */
export default async function PaginaAreaPessoal() {
  const sessao = await exigirPerfil(["aluno"]);
  await ligarBaseDados();

  const agora = new Date();
  const userAgent = (await headers()).get("user-agent");
  const ehContaDeTeste = sessao.user.email === EMAIL_CONTA_DE_TESTE_QR;
  const podeGerarQR = ehUserAgentDeTelemovel(userAgent) || ehContaDeTeste;

  const aluno = await Utilizador.findById(sessao.user.id).select("turmaId").lean();

  // Se já houver um código válido (ex.: a pessoa atualizou a página), mostra
  // logo esse, em vez de obrigar a gerar outro sem necessidade.
  const tokenExistente = await TokenQR.findOne({
    alunoId: sessao.user.id,
    usado: false,
    validoAte: { $gt: agora },
  }).lean();

  let tokenInicial: TokenGerado | null = null;
  if (tokenExistente) {
    tokenInicial = {
      id: tokenExistente._id.toString(),
      validoAteISO: tokenExistente.validoAte.toISOString(),
      imagemDataUrl: await QRCode.toDataURL(tokenExistente.token, { margin: 1, width: 240 }),
      tipo: tokenExistente.tipo,
    };
  }

  const { ano, mes } = partesEmLisboa(agora);
  const periodo = limitesDoMesEmLisboa(ano, mes);

  const [turma, horarios, registos] = await Promise.all([
    aluno?.turmaId ? Turma.findById(aluno.turmaId).select("nome").lean() : null,
    aluno?.turmaId
      ? Horario.find({ turmaId: aluno.turmaId }).sort({ diaSemana: 1, horaInicio: 1 }).lean()
      : [],
    // `metodo: "simulacao"` fica de fora: são registos de demonstração da
    // ferramenta do admin, não movimentos reais — nunca podem aparecer como
    // presença/falta real do aluno.
    Registo.find({
      alunoId: sessao.user.id,
      dataHora: { $gte: periodo.inicio, $lt: periodo.fim },
      metodo: { $ne: "simulacao" },
    })
      .select("tipo estado dataHora horarioId")
      .lean(),
  ]);

  const assiduidade = calcularAssiduidade(
    horarios,
    registos as RegistoParaAssiduidade[],
    periodo,
  );

  // Nome do professor de cada bloco — o aluno vê quem dá cada aula, mas só
  // isso: nenhuma outra informação sobre o professor, nem em que outras
  // turmas dá aulas.
  const idsProfessores = [
    ...new Set(
      horarios.map((h) => h.professorId?.toString()).filter((id): id is string => Boolean(id)),
    ),
  ];
  const professores = await Utilizador.find({ _id: { $in: idsProfessores } })
    .select("nomeCompleto")
    .lean();
  const nomeProfessorPorId = new Map(professores.map((p) => [p._id.toString(), p.nomeCompleto]));

  const blocos: BlocoHorario[] = horarios.map((h) => ({
    diaSemana: h.diaSemana,
    horaInicio: h.horaInicio,
    horaFim: h.horaFim,
    disciplina: h.disciplina,
    sala: h.sala,
    professor: h.professorId ? nomeProfessorPorId.get(h.professorId.toString()) : undefined,
  }));

  const diasAssinalar: LinhaDiaAssinalar[] = assiduidade.dias
    .filter((dia): dia is typeof dia & { situacao: "presenca_atraso" | "falta" } =>
      dia.situacao !== "presenca",
    )
    .map((dia) => ({
      dataFormatada: formatarData(dia.data),
      situacao: dia.situacao,
      horaEntradaFormatada: dia.horaEntrada ? formatarHora(dia.horaEntrada) : undefined,
    }));

  return (
    <div className="flex min-h-full flex-col bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <CabecalhoSecao
        titulo="A minha área"
        subtitulo={turma?.nome}
        voltarHref="/painel"
        voltarLabel="Painel"
      />

      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-8 lg:max-w-5xl">
        <AbasAreaPessoal
          qr={
            <section className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="font-semibold">O meu código QR</h2>
              <p className="max-w-sm text-center text-sm text-slate-500 dark:text-slate-400">
                Mostra este código na portaria. É válido durante 1 minuto, só
                pode ser usado uma vez, e só serve para o movimento — entrada
                ou saída — indicado abaixo dele.
              </p>
              <GeradorQR
                tokenInicial={tokenInicial}
                podeGerar={podeGerarQR}
                podeEscolherHora={ehContaDeTeste}
              />
            </section>
          }
          horario={
            <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 lg:p-8">
              <h2 className="mb-4 text-lg font-semibold lg:text-xl">O meu horário</h2>
              {aluno?.turmaId ? (
                <HorarioSemanal
                  blocos={blocos}
                  diaEmDestaque={diaDaSemanaEmLisboa(agora)}
                  mostrarProfessor
                  tamanhoGrande
                />
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Ainda não tens turma atribuída.
                </p>
              )}
            </section>
          }
          assiduidade={
            <AssiduidadeMensal
              mes={mes}
              ano={ano}
              diasLetivos={assiduidade.diasLetivos}
              presencas={assiduidade.presencas}
              atrasos={assiduidade.atrasos}
              faltas={assiduidade.faltas}
              taxaPresenca={assiduidade.taxaPresenca}
              diasAssinalar={diasAssinalar}
            />
          }
        />
      </main>
    </div>
  );
}
