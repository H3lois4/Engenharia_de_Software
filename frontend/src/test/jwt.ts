// Helpers de teste para montar JWTs (sem assinatura real: o front não a verifica).

function base64Url(text: string): string {
  // Apenas ASCII nos payloads de teste, então btoa direto é suficiente.
  return btoa(text).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function makeToken(payload: Record<string, unknown>): string {
  const header = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64Url(JSON.stringify(payload));
  return `${header}.${body}.assinatura`;
}

/** Payload válido padrão; sobrescreva campos conforme o cenário do teste. */
export function validPayload(overrides: Record<string, unknown> = {}) {
  return {
    sub: "user-1",
    role: "DEV",
    project_ids: ["proj-123", "proj-456"],
    exp: Math.floor(Date.now() / 1000) + 3600,
    ...overrides,
  };
}
