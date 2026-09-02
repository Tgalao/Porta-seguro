import { describe, expect, it } from "vitest";
import { limitesDoDiaEmLisboa, diaDaSemanaEmLisboa } from "./datas";

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
