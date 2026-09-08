import { describe, expect, it } from "vitest";
import { proximoTipoRegisto } from "./proximoTipo";

describe("proximoTipoRegisto", () => {
  it("sem nenhum registo anterior, o próximo movimento é sempre entrada", () => {
    expect(proximoTipoRegisto(undefined)).toBe("entrada");
  });

  it("depois de uma entrada, o próximo só pode ser saída", () => {
    expect(proximoTipoRegisto("entrada")).toBe("saida");
  });

  it("depois de uma saída, o próximo só pode ser entrada", () => {
    expect(proximoTipoRegisto("saida")).toBe("entrada");
  });
});
