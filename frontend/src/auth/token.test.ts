import { describe, expect, it } from "vitest";
import { makeToken, validPayload } from "../test/jwt";
import { cleanToken, InvalidTokenError, parseToken, tryParseToken } from "./token";

describe("parseToken", () => {
  it("lê usuário, papel e projetos de um token válido", () => {
    const user = parseToken(makeToken(validPayload()));
    expect(user).toEqual({
      user_id: "user-1",
      role: "DEV",
      project_ids: ["proj-123", "proj-456"],
    });
  });

  it("aceita user_id no lugar de sub", () => {
    const user = parseToken(makeToken(validPayload({ sub: undefined, user_id: "u-9" })));
    expect(user.user_id).toBe("u-9");
  });

  it("decodifica base64url (caracteres - e _), que o atob direto não aceita", () => {
    // Uma sequência longa de '>' gera '+' no base64 comum, ou seja '-' no base64url.
    const token = makeToken(validPayload({ sub: ">".repeat(30) }));
    expect(token.split(".")[1]).toMatch(/[-_]/);
    expect(parseToken(token).user_id).toBe(">".repeat(30));
  });

  it("ignora o prefixo 'Bearer ' e espaços ao colar o token", () => {
    const token = makeToken(validPayload());
    expect(cleanToken(`  Bearer ${token}  `)).toBe(token);
    expect(parseToken(`Bearer ${token}`).role).toBe("DEV");
  });

  it("recusa token expirado", () => {
    const expired = makeToken(validPayload({ exp: Math.floor(Date.now() / 1000) - 10 }));
    expect(() => parseToken(expired)).toThrow(/expirado/);
  });

  it("aceita token sem exp (a validade fica por conta do BFF)", () => {
    expect(parseToken(makeToken(validPayload({ exp: undefined }))).user_id).toBe("user-1");
  });

  it("recusa formato que não é JWT", () => {
    expect(() => parseToken("isso-nao-e-um-jwt")).toThrow(InvalidTokenError);
    expect(() => parseToken("a.b")).toThrow(/Formato inválido/);
  });

  it("recusa payload que não é JSON", () => {
    expect(() => parseToken("aaa.bbb.ccc")).toThrow(/ler o conteúdo/);
  });

  it("recusa papel desconhecido", () => {
    expect(() => parseToken(makeToken(validPayload({ role: "ADMIN" })))).toThrow(/Papel inválido/);
  });

  it.each([
    ["SCRUM_MASTER", "PM"],
    ["scrum-master", "PM"],
    ["Scrum Master", "PM"],
    ["SM", "PM"],
    ["product_owner", "PO"],
    ["dev", "DEV"],
    ["Developer", "DEV"],
  ])("normaliza o papel '%s' para %s", (emitido, esperado) => {
    expect(parseToken(makeToken(validPayload({ role: emitido }))).role).toBe(esperado);
  });

  it.each(["", "   ", 42, null])("recusa papel inválido (%s)", (papel) => {
    expect(() => parseToken(makeToken(validPayload({ role: papel })))).toThrow(/Papel inválido/);
  });

  it("recusa token sem sub/user_id", () => {
    expect(() => parseToken(makeToken(validPayload({ sub: undefined })))).toThrow(/'sub'/);
  });

  it("recusa project_ids que não seja lista de textos", () => {
    expect(() => parseToken(makeToken(validPayload({ project_ids: "proj-1" })))).toThrow(
      /project_ids/,
    );
    expect(() => parseToken(makeToken(validPayload({ project_ids: [1, 2] })))).toThrow(
      /project_ids/,
    );
  });

  it("trata project_ids ausente como lista vazia", () => {
    expect(parseToken(makeToken(validPayload({ project_ids: undefined }))).project_ids).toEqual([]);
  });
});

describe("tryParseToken", () => {
  it("devolve null em vez de lançar erro", () => {
    expect(tryParseToken("lixo")).toBeNull();
    expect(tryParseToken(makeToken(validPayload()))?.user_id).toBe("user-1");
  });
});
