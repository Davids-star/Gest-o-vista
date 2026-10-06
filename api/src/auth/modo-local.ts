/**
 * Modo local de desenvolvimento: deixa o Totem/dashboard do PC funcionar sem token.
 *
 * Só liga se TODAS as condições forem verdadeiras:
 * - MODO_LOCAL_SEM_TOKEN=true no .env
 * - NODE_ENV diferente de "production"
 * - variável RENDER ausente (ambiente do Render nunca liga o modo)
 *
 * Em qualquer outro ambiente a API exige token, como antes.
 */
export function modoLocalSemToken(env: NodeJS.ProcessEnv = process.env): boolean {
  return (
    env.MODO_LOCAL_SEM_TOKEN === 'true' &&
    env.NODE_ENV !== 'production' &&
    !env.RENDER
  );
}
