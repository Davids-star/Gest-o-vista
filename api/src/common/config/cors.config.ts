/**
 * Origens permitidas pelo CORS (HTTP e WebSocket), lidas de CORS_ORIGINS no
 * .env da raiz, separadas por vírgula. Sem a variável, NENHUMA origem é
 * liberada (só chamadas de servidor a servidor / mesma origem).
 */
export function corsOrigins(): string[] {
  const raw = process.env.CORS_ORIGINS?.trim();
  if (!raw) return [];
  return raw.split(',').map((o) => o.trim()).filter(Boolean);
}
