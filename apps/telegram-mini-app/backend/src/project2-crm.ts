import type { FastifyInstance } from 'fastify';
import { getPool, initProject2Db } from './project2-db.js';

function authorized(request: any) {
  const expected = process.env.PROJECT2_ADMIN_TOKEN?.trim();
  return Boolean(expected && request.headers['x-project2-admin-token'] === expected);
}

export async function registerProject2Crm(app: FastifyInstance) {
  app.addHook('onRequest', async (request, reply) => {
    if (request.url.startsWith('/api/project2/crm/') && !authorized(request)) {
      return reply.code(401).send({ ok: false, error: 'Unauthorized' });
    }
  });

  app.get('/api/project2/crm/clients', async () => {
    await initProject2Db();
    const { rows } = await getPool().query(`
      SELECT c.*,
        (SELECT COUNT(*) FROM project2_programs p WHERE p.client_id=c.id) AS program_count,
        (SELECT COUNT(*) FROM project2_notes n WHERE n.client_id=c.id) AS note_count
      FROM project2_clients c ORDER BY c.created_at DESC
    `);
    return { ok: true, clients: rows };
  });

  app.get('/api/project2/crm/clients/:id', async (request, reply) => {
    await initProject2Db();
    const id = String((request.params as any).id);
    const { rows } = await getPool().query('SELECT * FROM project2_clients WHERE id=$1', [id]);
    if (!rows[0]) return reply.code(404).send({ ok:false, error:'Client not found' });
    const [programs, measurements, notes, payments] = await Promise.all([
      getPool().query('SELECT * FROM project2_programs WHERE client_id=$1 ORDER BY created_at DESC',[id]),
      getPool().query('SELECT * FROM project2_measurements WHERE client_id=$1 ORDER BY measured_on DESC',[id]),
      getPool().query('SELECT * FROM project2_notes WHERE client_id=$1 ORDER BY created_at DESC',[id]),
      getPool().query('SELECT * FROM project2_payments WHERE client_id=$1 ORDER BY created_at DESC',[id]),
    ]);
    return { ok:true, client:rows[0], programs:programs.rows, measurements:measurements.rows, notes:notes.rows, payments:payments.rows };
  });

  app.post('/api/project2/crm/clients/:id/notes', async (request, reply) => {
    await initProject2Db();
    const id=String((request.params as any).id);
    const note=String((request.body as any)?.note??'').trim();
    if(!note)return reply.code(400).send({ok:false,error:'Note is required'});
    const {rows}=await getPool().query('INSERT INTO project2_notes(client_id,note) VALUES($1,$2) RETURNING *',[id,note]);
    return {ok:true,note:rows[0]};
  });

  app.post('/api/project2/crm/clients/:id/measurements', async (request, reply) => {
    await initProject2Db();
    const id=String((request.params as any).id); const b:any=request.body||{};
    const {rows}=await getPool().query(
      'INSERT INTO project2_measurements(client_id,measured_on,body_weight_kg,body_fat_percent,chest_cm,waist_cm,hips_cm,arm_cm,thigh_cm,notes) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',
      [id,b.measured_on||new Date().toISOString().slice(0,10),b.body_weight_kg||null,b.body_fat_percent||null,b.chest_cm||null,b.waist_cm||null,b.hips_cm||null,b.arm_cm||null,b.thigh_cm||null,b.notes||null]);
    return {ok:true,measurement:rows[0]};
  });

  app.post('/api/project2/crm/clients/:id/payments', async (request) => {
    await initProject2Db();
    const id=String((request.params as any).id); const b:any=request.body||{};
    const {rows}=await getPool().query(
      'INSERT INTO project2_payments(client_id,amount,currency,package_name,sessions_purchased,valid_from,valid_until,comment) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [id,Number(b.amount||0),b.currency||'RUB',b.package_name||null,Number(b.sessions_purchased||0),b.valid_from||null,b.valid_until||null,b.comment||null]);
    return {ok:true,payment:rows[0]};
  });

  app.post('/api/project2/crm/clients/:id/programs', async (request) => {
    await initProject2Db();
    const id=String((request.params as any).id); const b:any=request.body||{};
    const name=String(b.name||'Новая программа').trim();
    const {rows}=await getPool().query(
      'INSERT INTO project2_programs(client_id,name,goal,status,starts_on,ends_on,rationale) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [id,name,b.goal||null,b.status||'draft',b.starts_on||null,b.ends_on||null,b.rationale||null]);
    return {ok:true,program:rows[0]};
  });
}
