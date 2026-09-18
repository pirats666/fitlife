import type { FastifyInstance } from 'fastify';
import { getPool, initProject2Db } from './project2-db.js';

function authorized(request: any) {
  const expected = process.env.PROJECT2_ADMIN_TOKEN?.trim();
  return Boolean(expected && request.headers['x-project2-admin-token'] === expected);
}

export async function registerProject2ExerciseLibrary(app: FastifyInstance) {
  app.addHook('onRequest', async (request, reply) => {
    if (request.url.startsWith('/api/project2/exercises/') && !authorized(request)) {
      return reply.code(401).send({ ok: false, error: 'Unauthorized' });
    }
  });

  app.get('/api/project2/exercises/library', async (request) => {
    await initProject2Db();
    const q = String((request.query as any)?.q || '').trim();
    const { rows } = await getPool().query(
      q
        ? 'SELECT * FROM project2_exercise_library WHERE name ILIKE $1 OR category ILIKE $1 OR muscles ILIKE $1 ORDER BY name'
        : 'SELECT * FROM project2_exercise_library ORDER BY name',
      q ? [`%${q}%`] : [],
    );
    return { ok: true, exercises: rows };
  });

  app.post('/api/project2/exercises/library', async (request, reply) => {
    await initProject2Db();
    const b: any = request.body || {};
    const name = String(b.name || '').trim();
    if (!name) return reply.code(400).send({ ok: false, error: 'Название упражнения обязательно' });
    const { rows } = await getPool().query(
      'INSERT INTO project2_exercise_library(name,category,muscles,description,technique,video_url,gif_url) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [name,b.category||null,b.muscles||null,b.description||null,b.technique||null,b.video_url||null,b.gif_url||null],
    );
    return { ok: true, exercise: rows[0] };
  });

  app.patch('/api/project2/exercises/library/:id', async (request, reply) => {
    await initProject2Db();
    const id = String((request.params as any).id);
    const b: any = request.body || {};
    const { rows } = await getPool().query(
      'UPDATE project2_exercise_library SET name=COALESCE($1,name),category=$2,muscles=$3,description=$4,technique=$5,video_url=$6,gif_url=$7,updated_at=NOW() WHERE id=$8 RETURNING *',
      [b.name?String(b.name).trim():null,b.category||null,b.muscles||null,b.description||null,b.technique||null,b.video_url||null,b.gif_url||null,id],
    );
    if (!rows[0]) return reply.code(404).send({ ok:false,error:'Упражнение не найдено' });
    return { ok:true,exercise:rows[0] };
  });

  app.delete('/api/project2/exercises/library/:id', async (request, reply) => {
    await initProject2Db();
    const id = String((request.params as any).id);
    const result = await getPool().query('DELETE FROM project2_exercise_library WHERE id=$1',[id]);
    if (!result.rowCount) return reply.code(404).send({ ok:false,error:'Упражнение не найдено' });
    return { ok:true };
  });
}
