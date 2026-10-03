// Cria um usuário (supervisor ou administrador) no banco do .env da raiz.
// Uso: node scripts/criar-usuario.js
// A senha é digitada aqui e não aparece na tela nem fica salva em arquivo.
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const bcrypt = require('bcrypt');
const { Client } = require('pg');

const env = {};
for (const linha of fs.readFileSync(path.resolve(__dirname, '../../.env'), 'utf8').split('\n')) {
  if (linha.includes('=') && !linha.startsWith('#')) {
    const i = linha.indexOf('=');
    env[linha.slice(0, i)] = linha.slice(i + 1);
  }
}

function perguntar(texto, oculta = false) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    if (oculta) {
      rl._writeToOutput = (s) => { if (!s.includes(texto)) rl.output.write(s.includes('\n') ? '\n' : ''); };
    }
    rl.question(texto, (resposta) => { rl.close(); if (oculta) process.stdout.write('\n'); resolve(resposta.trim()); });
  });
}

(async () => {
  const nome = await perguntar('Nome completo: ');
  const email = (await perguntar('E-mail (usado no login): ')).toLowerCase();
  const papel = await perguntar('Papel (supervisor ou administrador): ');
  if (!['supervisor', 'administrador'].includes(papel)) throw new Error('Papel inválido');
  const senha = await perguntar('Senha: ', true);
  const confirma = await perguntar('Repita a senha: ', true);
  if (senha.length < 8) throw new Error('A senha precisa de pelo menos 8 caracteres');
  if (senha !== confirma) throw new Error('As senhas não batem');

  const c = new Client({
    host: env.DB_HOST, port: Number(env.DB_PORT), user: env.DB_USERNAME,
    password: env.DB_PASSWORD, database: env.DB_NAME, ssl: env.DB_SSL === 'true' ? { rejectUnauthorized: true } : false,
  });
  await c.connect();
  try {
    const empresa = await c.query('select id from companies order by created_at limit 1');
    if (!empresa.rows[0]) throw new Error('Nenhuma empresa cadastrada');
    const hash = await bcrypt.hash(senha, 10);
    await c.query(
      'insert into users (id, company_id, name, email, password_hash, role, active) values (uuid_generate_v4(), $1, $2, $3, $4, $5, true)',
      [empresa.rows[0].id, nome, email, hash, papel],
    );
    console.log(`Usuário ${email} (${papel}) criado.`);
  } finally {
    await c.end();
  }
})().catch((e) => { console.error('Erro:', e.message); process.exit(1); });
