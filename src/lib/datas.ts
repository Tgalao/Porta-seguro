/**
 * Funções para lidar com datas e horas no fuso horário de Lisboa.
 *
 * REGRA DO PROJETO: todas as datas são GUARDADAS em UTC na base de dados
 * (é assim que o MongoDB guarda um `Date`), mas são sempre APRESENTADAS e
 * COMPARADAS no fuso de Lisboa (Europe/Lisbon).
 *
 * Porque é que isto importa? Portugal muda de hora duas vezes por ano
 * (inverno UTC+0, verão UTC+1). Se comparássemos diretamente a hora UTC de um
 * registo com o horário da turma ("as aulas começam às 08:30"), no verão
 * daríamos uma hora de diferença e o sistema marcaria atrasos que não existem.
 * O `Intl.DateTimeFormat` resolve isto por nós porque conhece as regras de
 * mudança de hora de cada país.
 */

/** Fuso horário usado em toda a aplicação. */
export const FUSO_LISBOA = "Europe/Lisbon";

/** Nomes dos dias da semana, pela ordem do JavaScript (0 = domingo). */
export const NOMES_DIAS_SEMANA = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
] as const;

/** Correspondência entre o nome curto em inglês e o número do dia. */
const DIAS_EM_INGLES: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/** Os pedaços de uma data, já convertidos para a hora de Lisboa. */
export interface PartesData {
  ano: number;
  mes: number; // 1 a 12
  dia: number; // 1 a 31
  horas: number; // 0 a 23
  minutos: number; // 0 a 59
  segundos: number; // 0 a 59
  diaSemana: number; // 0 = domingo, 1 = segunda, ... 6 = sábado
}

/**
 * Parte uma data em ano/mês/dia/hora/minuto já convertidos para Lisboa.
 *
 * É a função base: quase todas as outras deste ficheiro usam esta.
 */
export function partesEmLisboa(data: Date): PartesData {
  const formatador = new Intl.DateTimeFormat("en-US", {
    timeZone: FUSO_LISBOA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "short",
    hourCycle: "h23", // garante 00-23 e nunca "24"
  });

  // `formatToParts` devolve uma lista tipo [{type:"year", value:"2026"}, ...].
  // Convertemos essa lista num objeto simples para ser fácil de usar.
  const partes: Record<string, string> = {};
  for (const parte of formatador.formatToParts(data)) {
    partes[parte.type] = parte.value;
  }

  return {
    ano: Number(partes.year),
    mes: Number(partes.month),
    dia: Number(partes.day),
    horas: Number(partes.hour),
    minutos: Number(partes.minute),
    segundos: Number(partes.second),
    diaSemana: DIAS_EM_INGLES[partes.weekday] ?? 0,
  };
}

/**
 * Dia da semana em Lisboa (0 = domingo, 1 = segunda, ... 6 = sábado).
 * É este número que se compara com o campo `diaSemana` da coleção `horarios`.
 */
export function diaDaSemanaEmLisboa(data: Date): number {
  return partesEmLisboa(data).diaSemana;
}

/**
 * Quantos minutos passaram desde a meia-noite, em Lisboa.
 * Exemplo: 08:30 em Lisboa devolve 510 (8 × 60 + 30).
 *
 * Serve para comparar o momento de um registo com o início e o fim de um
 * bloco de horário, usando apenas números inteiros — muito mais simples e
 * fiável do que andar a comparar objetos Date.
 */
export function minutosDoDiaEmLisboa(data: Date): number {
  const p = partesEmLisboa(data);
  return p.horas * 60 + p.minutos;
}

/**
 * Identificador do dia no formato "AAAA-MM-DD", em Lisboa.
 * Usa-se para agrupar registos por dia (por exemplo, "registos de hoje").
 */
export function chaveDoDiaEmLisboa(data: Date): string {
  const p = partesEmLisboa(data);
  const mes = String(p.mes).padStart(2, "0");
  const dia = String(p.dia).padStart(2, "0");
  return `${p.ano}-${mes}-${dia}`;
}

/**
 * Converte uma hora escrita ("08:30") no número de minutos desde a meia-noite.
 * Os horários das turmas são guardados como texto "HH:MM", que é fácil de ler
 * na base de dados e de preencher num formulário.
 */
export function horaParaMinutos(hora: string): number {
  const encaixe = /^(\d{1,2}):(\d{2})$/.exec(hora.trim());

  if (!encaixe) {
    throw new Error(`Hora inválida: "${hora}". Formato esperado: "HH:MM".`);
  }

  const horas = Number(encaixe[1]);
  const minutos = Number(encaixe[2]);

  if (horas > 23 || minutos > 59) {
    throw new Error(`Hora inválida: "${hora}". Tem de estar entre 00:00 e 23:59.`);
  }

  return horas * 60 + minutos;
}

/** Converte minutos desde a meia-noite de volta para texto ("510" → "08:30"). */
export function minutosParaHora(minutos: number): string {
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return `${String(horas).padStart(2, "0")}:${String(resto).padStart(2, "0")}`;
}

/** Data e hora para mostrar ao utilizador. Exemplo: "01/09/2026, 14:30". */
export function formatarDataHora(data: Date): string {
  return new Intl.DateTimeFormat("pt-PT", {
    timeZone: FUSO_LISBOA,
    dateStyle: "short",
    timeStyle: "short",
  }).format(data);
}

/** Só a data. Exemplo: "01/09/2026". */
export function formatarData(data: Date): string {
  return new Intl.DateTimeFormat("pt-PT", {
    timeZone: FUSO_LISBOA,
    dateStyle: "short",
  }).format(data);
}

/** Só a hora. Exemplo: "14:30". */
export function formatarHora(data: Date): string {
  return new Intl.DateTimeFormat("pt-PT", {
    timeZone: FUSO_LISBOA,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(data);
}
