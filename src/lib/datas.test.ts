import { describe, expect, it } from "vitest";
import {
  limitesDoDiaEmLisboa,
  diaDaSemanaEmLisboa,
  limitesDoMesEmLisboa,
  horaLisboaParaUtc,
} from "./datas";

describe("limitesDoDiaEmLisboa", () => {
  it("em janeiro (UTC+0), meia-noite de Lisboa coincide com meia-noite UTC", () => {
    const { inicio, fim } = limitesDoDiaEmLisboa(new Date("2026-01-05T10:00:00.000Z"));
    expect(inicio.toISOString()).toBe("2026-01-05T00:00:00.000Z");
    expect(fim.toISOString()).toBe("2026-01-06T00:00:00.000Z");
  });

  it("em julho (UTC+1, hora de verão), meia-noite de Lisboa é às 23:00 UTC do dia anterior", () => {
    const { inicio, fim } = limitesDoDiaEmLisboa(new Date("2026-07-15T10:00:00.000Z"));
    expect(inicio.toISOString()).toBe("2026-07-14T23:00:00.000Z");
    expect(fim.toISOString()).toBe("2026-07-15T23:00:00.000Z");
  });

  it("um momento perto da meia-noite continua a cair dentro do intervalo do seu próprio dia", () => {
    const momento = new Date("2026-01-05T23:59:00.000Z"); // 23:59 em Lisboa (janeiro = UTC+0)
    const { inicio, fim } = limitesDoDiaEmLisboa(momento);
    expect(momento.getTime()).toBeGreaterThanOrEqual(inicio.getTime());
    expect(momento.getTime()).toBeLessThan(fim.getTime());
    expect(diaDaSemanaEmLisboa(inicio)).toBe(diaDaSemanaEmLisboa(momento));
  });
});

describe("limitesDoMesEmLisboa", () => {
  it("janeiro (UTC+0): vai da meia-noite do dia 1 à meia-noite de 1 de fevereiro", () => {
    const { inicio, fim } = limitesDoMesEmLisboa(2026, 1);
    expect(inicio.toISOString()).toBe("2026-01-01T00:00:00.000Z");
    expect(fim.toISOString()).toBe("2026-02-01T00:00:00.000Z");
  });

  it("julho (UTC+1): a fronteira cai às 23:00 UTC do último dia de junho", () => {
    const { inicio, fim } = limitesDoMesEmLisboa(2026, 7);
    expect(inicio.toISOString()).toBe("2026-06-30T23:00:00.000Z");
    expect(fim.toISOString()).toBe("2026-07-31T23:00:00.000Z");
  });

  it("dezembro: o fim é o início de janeiro do ano seguinte", () => {
    const { fim } = limitesDoMesEmLisboa(2026, 12);
    expect(fim.toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });
});

describe("horaLisboaParaUtc", () => {
  it("em janeiro (UTC+0), a hora de Lisboa coincide com a hora UTC", () => {
    const data = horaLisboaParaUtc(2026, 1, 5, 8, 30);
    expect(data.toISOString()).toBe("2026-01-05T08:30:00.000Z");
  });

  it("em julho (UTC+1, hora de verão), a hora de Lisboa fica uma hora à frente de UTC", () => {
    const data = horaLisboaParaUtc(2026, 7, 15, 8, 30);
    expect(data.toISOString()).toBe("2026-07-15T07:30:00.000Z");
  });

  it("perto da meia-noite, com deslocamento de fuso, o dia civil UTC muda mas continua a mostrar a hora pedida em Lisboa", () => {
    // 00:15 de Lisboa em julho (UTC+1) cai ainda no dia 14 em UTC (23:15).
    const data = horaLisboaParaUtc(2026, 7, 15, 0, 15);
    expect(data.toISOString()).toBe("2026-07-14T23:15:00.000Z");
    expect(diaDaSemanaEmLisboa(data)).toBe(3); // 15 de julho de 2026 é quarta-feira
  });

  it("é o inverso de partesEmLisboa: reconstruir a partir das partes devolve o mesmo instante", () => {
    // 10 de março de 2026 ainda é hora de inverno em Lisboa (a mudança só
    // acontece no último domingo de março), por isso UTC+0 aqui.
    const original = new Date("2026-03-10T14:45:00.000Z");
    const reconstruida = horaLisboaParaUtc(2026, 3, 10, 14, 45);
    expect(reconstruida.getTime()).toBe(original.getTime());
  });
});
