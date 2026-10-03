/**
 * Cache do catálogo (estações, sessões, produtos, motivos de parada) no aparelho.
 * Gravado sempre que a API responde; lido quando a API não responde, para o
 * Totem continuar funcionando sem internet. Falhas aqui nunca quebram a tela.
 */
import { getLocalDatabase } from '../database/localDatabase.js';

export async function saveCatalog(name, data) {
  try {
    const db = await getLocalDatabase();
    await db.setCache(name, data);
  } catch {
    /* sem armazenamento local: segue só com a API */
  }
}

export async function loadCatalog(name) {
  try {
    const db = await getLocalDatabase();
    return await db.getCache(name);
  } catch {
    return null;
  }
}
