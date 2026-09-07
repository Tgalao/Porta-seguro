import QRCode from "qrcode";
import { exigirPerfil } from "@/lib/permissoes";
import { ligarBaseDados } from "@/lib/mongoose";
import { TokenQR, Utilizador, Horario, Registo, Turma } from "@/models";
import {
  limitesDoMesEmLisboa,
  partesEmLisboa,
  diaDaSemanaEmLisboa,
  formatarData,
} from "@/lib/datas";
import {
  calcularAssiduidade,
  type RegistoParaAssiduidade,
} from "@/lib/relatorios/calcularAssiduidade";
import { GeradorQR } from "./gerador-qr";
import { LinkVoltarPainel } from "@/components/link-voltar-painel";
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
      validoAteISO: tokenExistente.validoAte.toISOString(),
      imagemDataUrl: await QRCode.toDataURL(tokenExistente.token, { margin: 1, width: 240 }),
    };
  }

  const { ano, mes } = partesEmLisboa(agora);
  const periodo = limitesDoMesEmLisboa(ano, mes);

  const [turma, horarios, registos] = await Promise.all([
    aluno?.turmaId ? Turma.findById(aluno.turmaId).select("nome").lean() : null,
    aluno?.turmaId
      ? Horario.find({ turmaId: aluno.turmaId }).sort({ diaSemana: 1, horaInicio: 1 }).lean()
      : [],
    Registo.find({
      alunoId: sessao.user.id,
      dataHora: { $gte: periodo.inicio, $lt: periodo.fim },
    })
      .select("tipo estado dataHora horarioId")
      .lean(),
  ]);

  const assiduidade = calcularAssiduidade(
    horarios,
    registos as RegistoParaAssiduidade[],
    periodo,
  );

  const blocos: BlocoHorario[] = horarios.map((h) => ({
    diaSemana: h.diaSemana,
    horaInicio: h.horaInicio,
    horaFim: h.horaFim,
    disciplina: h.disciplina,
    sala: h.sala,
  }));

  const faltasEAtrasos = assiduidade.dias.filter((dia) => dia.situacao !== "presenca");

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 p-6">
      <LinkVoltarPainel />

      <section className="flex flex-col items-center gap-4">
        <h1 className="text-2xl font-bold">O meu código QR</h1>
        <p className="max-w-sm text-center text-sm opacity-70">
          Mostra este código na portaria para entrar ou sair. É válido durante 2
          minutos e só pode ser usado uma vez.
        </p>
        <GeradorQR tokenInicial={tokenInicial} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-bold">
          O meu horário{turma && <span className="ml-2 text-sm font-normal opacity-60">{turma.nome}</span>}
        </h2>
        {aluno?.turmaId ? (
          <HorarioSemanal blocos={blocos} diaEmDestaque={diaDaSemanaEmLisboa(agora)} />
        ) : (
          <p className="text-sm opacity-70">Ainda não tens turma atribuída.</p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-bold">
          A minha assiduidade
          <span className="ml-2 text-sm font-normal opacity-60">
            {String(mes).padStart(2, "0")}/{ano}
          </span>
        </h2>

        {assiduidade.diasLetivos === 0 ? (
          <p className="text-sm opacity-70">
            Ainda não há dias letivos registados neste mês.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Numero titulo="Dias letivos" valor={assiduidade.diasLetivos} />
              <Numero titulo="Presenças" valor={assiduidade.presencas} />
              <Numero titulo="Atrasos" valor={assiduidade.atrasos} />
              <Numero titulo="Faltas" valor={assiduidade.faltas} />
            </div>

            <p className="text-sm opacity-70">
              Taxa de presença: {(assiduidade.taxaPresenca * 100).toFixed(0)}%
            </p>

            {faltasEAtrasos.length > 0 && (
              <div>
                <h3 className="mb-1 text-sm font-semibold">Dias a assinalar</h3>
                <ul className="flex flex-col gap-0.5 text-sm">
                  {faltasEAtrasos.map((dia) => (
                    <li key={dia.data.toISOString()} className="flex gap-3">
                      <span className="font-mono tabular-nums opacity-70">
                        {formatarData(dia.data)}
                      </span>
                      <span
                        className={
                          dia.situacao === "falta"
                            ? "text-red-600 dark:text-red-400"
                            : "text-yellow-700 dark:text-yellow-500"
                        }
                      >
                        {dia.situacao === "falta" ? "Falta" : "Presença com atraso"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}

function Numero({ titulo, valor }: { titulo: string; valor: number }) {
  return (
    <div className="rounded border p-3">
      <p className="text-2xl font-bold tabular-nums">{valor}</p>
      <p className="text-xs opacity-70">{titulo}</p>
    </div>
  );
}
