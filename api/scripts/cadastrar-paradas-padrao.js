// Cadastra os motivos de parada padrão (só os que ainda não existem) na empresa do banco.
// Uso:  node scripts/cadastrar-paradas-padrao.js          (banco do .env da raiz)
//       DATABASE_URL=postgresql://... node scripts/cadastrar-paradas-padrao.js   (outro banco, ex.: Neon)
// Não pede senha nem grava nada em arquivo; rodar de novo é seguro (não duplica).
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const PADRAO = [
  ['PAUSA', 'Pausa', 'baixa', true, 'ask_to_resume'],
  ['LIMPEZA', 'Limpeza', 'baixa', false, 'ask_to_resume'],
  ['MANUTENCAO', 'Manutenção', 'media', false, 'ask_to_resume'],
  ['MATERIAL', 'Falta de material', 'alta', false, 'ask_to_resume'],
  ['EQUIPAMENTO', 'Problema no equipamento', 'alta', false, 'ask_to_resume'],
  ['TROCA_PRODUTO', 'Troca de produto', 'media', true, 'end_session'],
  ['FIM_TURNO', 'Fim de turno', 'baixa', true, 'end_session'],
  ['OUTROS', 'Outros', 'media', true, 'ask_to_resume'],
];

const env = {};
const arquivoEnv = path.resolve(__dirname, '../../.env');
if (fs.existsSync(arquivoEnv)) {
  for (const linha of fs.readFileSync(arquivoEnv, 'utf8').split('\n')) {
    if (linha.includes('=') && !linha.startsWith('#')) {
      const i = linha.indexOf('=');
      env[linha.slice(0, i)] = linha.slice(i + 1);
    }
  }
}

(async () => {
  const url = process.env.DATABASE_URL;
  const c = url
    ? new Client({ connectionString: url, ssl: { rejectUnauthorized: true } })
    : new Client({
        host: env.DB_HOST, port: Number(env.DB_PORT), user: env.DB_USERNAME,
        password: env.DB_PASSWORD, database: env.DB_NAME, ssl: env.DB_SSL === 'true' ? { rejectUnauthorized: true } : false,
      });
  await c.connect();
  try {
    const empresas = await c.query('select id, name from companies order by created_at');
    if (!empresas.rows.length) throw new Error('Nenhuma empresa cadastrada');
    if (empresas.rows.length > 1) console.log(`Atenção: ${empresas.rows.length} empresas; usando a primeira (${empresas.rows[0].name}).`);
    const empresaId = empresas.rows[0].id;

    const existentes = new Set((await c.query('select code from stop_reasons where company_id = $1', [empresaId])).rows.map((r) => r.code));
    let criadas = 0;
    for (const [code, label, prioridade, planejada, acao] of PADRAO) {
      if (existentes.has(code)) continue;
      await c.query(
        'insert into stop_reasons (id, company_id, code, label, default_priority, planned, session_action, active) values (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, true)',
        [empresaId, code, label, prioridade, planejada, acao],
      );
      criadas += 1;
    }
    console.log(`${criadas} motivo(s) cadastrado(s); ${PADRAO.length - criadas} já existia(m).`);
  } finally {
    await c.end();
  }
})().catch((e) => { console.error('Erro:', e.message); process.exit(1); });
