import { describe, expect, it } from "vitest";
import { limitesDoDiaEmLisboa, diaDaSemanaEmLisboa, limitesDoMesEmLisboa } from "./datas";

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
