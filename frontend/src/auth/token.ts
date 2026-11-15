import type { Role } from "../lib/types";

export interface SessionUser {
  user_id: string;
  role: Role;
  project_ids: string[];
}

export class InvalidTokenError extends Error {}

const ROLES: readonly Role[] = ["PO", "PM", "DEV"];

// Mesmas variações aceitas pelo BFF (app/core/security.py): o Módulo 1 pode nomear o
// papel de outra forma (ex.: SCRUM_MASTER). Mantenha as duas listas em sincronia.
const ROLE_ALIASES: Record<string, Role> = {
  PO: "PO",
  PRODUCT_OWNER: "PO",
  PM: "PM",
  SM: "PM",
  SCRUM_MASTER: "PM",
  DEV: "DEV",
  DEVELOPER: "DEV",
};

export function normalizeRole(raw: unknown): Role | null {
  if (typeof raw !== "string") return null;
  const key = raw.trim().toUpperCase().replace(/[-\s]+/g, "_");
  return ROLE_ALIASES[key] ?? null;
}

// JWT usa base64url (- e _ no lugar de + e /, sem padding); atob exige base64 comum.
function decodeBase64Url(segment: string): string {
  const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** Remove espaços e o prefixo "Bearer " que costuma vir junto ao copiar um token. */
export function cleanToken(raw: string): string {
  return raw.trim().replace(/^Bearer\s+/i, "");
}

/**
 * Lê as claims do JWT e valida o que o portal precisa (sub/role/project_ids e exp).
 * A assinatura NÃO é verificada aqui: quem valida é o BFF.
 * Lança InvalidTokenError com uma mensagem clara em português.
 */
export function parseToken(raw: string, now: number = Date.now()): SessionUser {
  const token = cleanToken(raw);
  const parts = token.split(".");
  if (parts.length !== 3 || parts.some((p) => p.length === 0)) {
    throw new InvalidTokenError("Formato inválido: um JWT tem 3 partes separadas por ponto.");
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(decodeBase64Url(parts[1]));
  } catch {
    throw new InvalidTokenError("Não foi possível ler o conteúdo do token.");
  }

  if (typeof payload.exp === "number" && payload.exp * 1000 <= now) {
    throw new InvalidTokenError("O token está expirado.");
  }

  const userId = payload.sub ?? payload.user_id;
  if (typeof userId !== "string" || userId.length === 0) {
    throw new InvalidTokenError("O token não tem a claim 'sub' (identificação do usuário).");
  }

  const role = normalizeRole(payload.role);
  if (role === null) {
    throw new InvalidTokenError(`Papel inválido no token. Esperado um de: ${ROLES.join(", ")}.`);
  }

  const projects = payload.project_ids ?? [];
  if (!Array.isArray(projects) || projects.some((p) => typeof p !== "string")) {
    throw new InvalidTokenError("A claim 'project_ids' deve ser uma lista de textos.");
  }

  return {
    user_id: userId,
    role,
    project_ids: projects as string[],
  };
}

/** Versão tolerante, usada para restaurar a sessão salva: devolve null se inválido. */
export function tryParseToken(raw: string): SessionUser | null {
  try {
    return parseToken(raw);
  } catch {
    return null;
  }
}
