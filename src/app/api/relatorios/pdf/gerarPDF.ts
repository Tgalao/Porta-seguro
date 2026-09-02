/**
 * Desenha o relatório de assiduidade em PDF (RF11), com `pdf-lib` — a
 * biblioteca não tem noção de "tabela": desenha-se texto a coordenadas
 * exatas, por isso as funções `escrever`/`novaLinha` abaixo fazem as vezes
 * de um cursor de escrita simples, de cima para baixo, com paginação
 * automática quando o espaço acaba.
 */

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { ResultadoConsulta } from "@/app/consultas/logica";

const ROTULOS_SITUACAO: Record<string, string> = {
  presenca: "Presença",
  presenca_atraso: "Presença (atraso)",
  falta: "Falta",
};

const LARGURA_A4 = 595;
const ALTURA_A4 = 842;
const MARGEM_ESQUERDA = 50;
const MARGEM_INFERIOR = 60;

export async function gerarPDFRelatorio(
  resultado: Extract<ResultadoConsulta, { ok: true }>,
  mes: string,
): Promise<Uint8Array> {
  const documento = await PDFDocument.create();
  const fonteNormal = await documento.embedFont(StandardFonts.Helvetica);
  const fonteNegrito = await documento.embedFont(StandardFonts.HelveticaBold);

  let pagina = documento.addPage([LARGURA_A4, ALTURA_A4]);
  let y = 792;

  function escrever(
    texto: string,
    { x = MARGEM_ESQUERDA, tamanho = 11, negrito = false }: { x?: number; tamanho?: number; negrito?: boolean } = {},
  ) {
    pagina.drawText(texto, { x, y, size: tamanho, font: negrito ? fonteNegrito : fonteNormal, color: rgb(0, 0, 0) });
  }

  function novaLinha(altura = 18) {
    y -= altura;
    if (y < MARGEM_INFERIOR) {
      pagina = documento.addPage([LARGURA_A4, ALTURA_A4]);
      y = 792;
    }
  }

  escrever("PortãoSeguro — Relatório de Assiduidade", { negrito: true, tamanho: 16 });
  novaLinha(24);
  escrever(`${resultado.alvoNome} — ${mes}`, { tamanho: 12 });
  novaLinha(30);

  escrever("Resumo", { negrito: true, tamanho: 13 });
  novaLinha(20);
  escrever(`Dias letivos: ${resultado.resumo.diasLetivos}`);
  novaLinha();
  escrever(`Presenças: ${resultado.resumo.presencas}`);
  novaLinha();
  escrever(`Atrasos: ${resultado.resumo.atrasos}`);
  novaLinha();
  escrever(`Faltas: ${resultado.resumo.faltas}`);
  novaLinha();
  escrever(`Taxa de presença: ${(resultado.resumo.taxaPresenca * 100).toFixed(1)}%`);
  novaLinha(30);

  if (resultado.ambito === "aluno") {
    escrever("Dias do período", { negrito: true, tamanho: 13 });
    novaLinha(20);
    for (const dia of resultado.dias) {
      escrever(dia.dataFormatada, { x: MARGEM_ESQUERDA, tamanho: 10 });
      escrever(ROTULOS_SITUACAO[dia.situacao], { x: MARGEM_ESQUERDA + 110, tamanho: 10 });
      novaLinha(16);
    }
  } else {
    escrever("Por aluno", { negrito: true, tamanho: 13 });
    novaLinha(20);
    desenharCabecalhoTabela();
    novaLinha(16);
    for (const linha of resultado.alunos) {
      escrever(linha.nome, { x: MARGEM_ESQUERDA, tamanho: 10 });
      escrever(linha.turma ?? "—", { x: MARGEM_ESQUERDA + 180, tamanho: 10 });
      escrever(String(linha.resumo.presencas), { x: MARGEM_ESQUERDA + 260, tamanho: 10 });
      escrever(String(linha.resumo.atrasos), { x: MARGEM_ESQUERDA + 330, tamanho: 10 });
      escrever(String(linha.resumo.faltas), { x: MARGEM_ESQUERDA + 390, tamanho: 10 });
      escrever(`${(linha.resumo.taxaPresenca * 100).toFixed(0)}%`, { x: MARGEM_ESQUERDA + 450, tamanho: 10 });
      novaLinha(16);
    }
  }

  function desenharCabecalhoTabela() {
    escrever("Nome", { x: MARGEM_ESQUERDA, negrito: true, tamanho: 10 });
    escrever("Turma", { x: MARGEM_ESQUERDA + 180, negrito: true, tamanho: 10 });
    escrever("Presenças", { x: MARGEM_ESQUERDA + 260, negrito: true, tamanho: 10 });
    escrever("Atrasos", { x: MARGEM_ESQUERDA + 330, negrito: true, tamanho: 10 });
    escrever("Faltas", { x: MARGEM_ESQUERDA + 390, negrito: true, tamanho: 10 });
    escrever("Taxa", { x: MARGEM_ESQUERDA + 450, negrito: true, tamanho: 10 });
  }

  return documento.save();
}
