import { describe, expect, it } from "vitest";
import { Types } from "mongoose";
import { validarTokenQR, type DadosTokenQR } from "./validarTokenQR";

const alunoId = new Types.ObjectId();
const outroAlunoId = new Types.ObjectId();
const criadoEm = new Date("2026-01-05T08:30:00.000Z");
const validoAte = new Date(criadoEm.getTime() + 2 * 60 * 1000); // válido 2 minutos

function tokenBase(): DadosTokenQR {
  return { alunoId, validoAte, usado: false };
}

describe("validarTokenQR", () => {
  it("é válido dentro da janela de 2 minutos, para o próprio aluno", () => {
    const resultado = validarTokenQR(tokenBase(), alunoId, new Date(criadoEm.getTime() + 60 * 1000));
    expect(resultado.valido).toBe(true);
  });

  it("fronteira: expira exatamente ao fim dos 2 minutos", () => {
    const resultado = validarTokenQR(tokenBase(), alunoId, validoAte);
    expect(resultado).toEqual({ valido: false, motivo: "expirado" });
  });

  it("expira depois da janela de 2 minutos", () => {
    const resultado = validarTokenQR(tokenBase(), alunoId, new Date(validoAte.getTime() + 1000));
    expect(resultado).toEqual({ valido: false, motivo: "expirado" });
  });

  it("recusa um token já utilizado, mesmo dentro da janela de validade", () => {
    const token = { ...tokenBase(), usado: true };
    const resultado = validarTokenQR(token, alunoId, new Date(criadoEm.getTime() + 60 * 1000));
    expect(resultado).toEqual({ valido: false, motivo: "ja_utilizado" });
  });

  it("recusa um token apresentado por outro aluno", () => {
    const resultado = validarTokenQR(tokenBase(), outroAlunoId, new Date(criadoEm.getTime() + 60 * 1000));
    expect(resultado).toEqual({ valido: false, motivo: "aluno_diferente" });
  });

  it("a verificação de identidade tem prioridade sobre expirado/usado", () => {
    const token = { ...tokenBase(), usado: true };
    const resultado = validarTokenQR(token, outroAlunoId, new Date(validoAte.getTime() + 1000));
    expect(resultado).toEqual({ valido: false, motivo: "aluno_diferente" });
  });
});
