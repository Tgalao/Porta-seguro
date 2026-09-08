import { describe, expect, it } from "vitest";
import { Types } from "mongoose";
import { validarTokenQR, type DadosTokenQR } from "./validarTokenQR";

const alunoId = new Types.ObjectId();
const outroAlunoId = new Types.ObjectId();
const criadoEm = new Date("2026-01-05T08:30:00.000Z");
const validoAte = new Date(criadoEm.getTime() + 1 * 60 * 1000); // válido 1 minuto

function tokenBase(): DadosTokenQR {
  return { alunoId, validoAte, usado: false, tipo: "entrada" };
}

describe("validarTokenQR", () => {
  it("é válido dentro da janela de 1 minuto, para o próprio aluno, na direção certa", () => {
    const resultado = validarTokenQR(tokenBase(), alunoId, "entrada", new Date(criadoEm.getTime() + 30 * 1000));
    expect(resultado.valido).toBe(true);
  });

  it("fronteira: expira exatamente ao fim de 1 minuto", () => {
    const resultado = validarTokenQR(tokenBase(), alunoId, "entrada", validoAte);
    expect(resultado).toEqual({ valido: false, motivo: "expirado" });
  });

  it("expira depois da janela de 1 minuto", () => {
    const resultado = validarTokenQR(tokenBase(), alunoId, "entrada", new Date(validoAte.getTime() + 1000));
    expect(resultado).toEqual({ valido: false, motivo: "expirado" });
  });

  it("recusa um token já utilizado, mesmo dentro da janela de validade", () => {
    const token = { ...tokenBase(), usado: true };
    const resultado = validarTokenQR(token, alunoId, "entrada", new Date(criadoEm.getTime() + 30 * 1000));
    expect(resultado).toEqual({ valido: false, motivo: "ja_utilizado" });
  });

  it("recusa um token apresentado por outro aluno", () => {
    const resultado = validarTokenQR(tokenBase(), outroAlunoId, "entrada", new Date(criadoEm.getTime() + 30 * 1000));
    expect(resultado).toEqual({ valido: false, motivo: "aluno_diferente" });
  });

  it("a verificação de identidade tem prioridade sobre expirado/usado", () => {
    const token = { ...tokenBase(), usado: true };
    const resultado = validarTokenQR(token, outroAlunoId, "entrada", new Date(validoAte.getTime() + 1000));
    expect(resultado).toEqual({ valido: false, motivo: "aluno_diferente" });
  });

  // --- Direção do código (gerado para entrar não serve para sair) -------

  it("recusa um código gerado para ENTRAR quando se espera uma SAÍDA", () => {
    const token = { ...tokenBase(), tipo: "entrada" as const };
    const resultado = validarTokenQR(token, alunoId, "saida", new Date(criadoEm.getTime() + 30 * 1000));
    expect(resultado).toEqual({ valido: false, motivo: "tipo_incorreto" });
  });

  it("recusa um código gerado para SAIR quando se espera uma ENTRADA", () => {
    const token = { ...tokenBase(), tipo: "saida" as const };
    const resultado = validarTokenQR(token, alunoId, "entrada", new Date(criadoEm.getTime() + 30 * 1000));
    expect(resultado).toEqual({ valido: false, motivo: "tipo_incorreto" });
  });

  it("aceita um código gerado para SAIR quando se espera mesmo uma SAÍDA", () => {
    const token = { ...tokenBase(), tipo: "saida" as const };
    const resultado = validarTokenQR(token, alunoId, "saida", new Date(criadoEm.getTime() + 30 * 1000));
    expect(resultado.valido).toBe(true);
  });

  it("usado/expirado continuam a ter prioridade sobre a direção errada", () => {
    const token = { ...tokenBase(), tipo: "entrada" as const, usado: true };
    const resultado = validarTokenQR(token, alunoId, "saida", new Date(criadoEm.getTime() + 30 * 1000));
    expect(resultado).toEqual({ valido: false, motivo: "ja_utilizado" });
  });
});
