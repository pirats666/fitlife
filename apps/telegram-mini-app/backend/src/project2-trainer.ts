import type { FastifyInstance } from 'fastify';
import { getPool, initProject2Db } from './project2-db.js';

function authorized(request: any) {
  const expected = process.env.PROJECT2_ADMIN_TOKEN?.trim();
  return Boolean(expected && request.headers['x-project2-admin-token'] === expected);
}

export async function registerProject2Trainer(app: FastifyInstance) {
  app.addHook('onRequest', async (request, reply) => {
    if (request.url.startsWith('/api/project2/trainer/') && !authorized(request)) {
      return reply.code(401).send({ ok: false, error: 'Unauthorized' });
    }
  });

  app.get('/api/project2/trainer/programs', async () => {
    await initProject2Db();
    const { rows } = await getPool().query(
      'SELECT * FROM project2_trainer_programs ORDER BY updated_at DESC, created_at DESC',
    );
    return { ok: true, programs: rows };
  });

  app.post('/api/project2/trainer/programs', async (request, reply) => {
    await initProject2Db();
    const b: any = request.body || {};
    const name = String(b.name || '').trim();
    if (!name) return reply.code(400).send({ ok: false, error: 'Название программы обязательно' });
    const { rows } = await getPool().query(
      'INSERT INTO project2_trainer_programs(name,goal,description,status) VALUES($1,$2,$3,$4) RETURNING *',
      [name, b.goal || null, b.description || null, b.status || 'draft'],
    );
    return { ok: true, program: rows[0] };
  });

  app.get('/api/project2/trainer/programs/:programId', async (request, reply) => {
    await initProject2Db();
    const id = String((request.params as any).programId);
    const { rows: programs } = await getPool().query(
      'SELECT * FROM project2_trainer_programs WHERE id=$1',
      [id],
    );
    if (!programs[0]) return reply.code(404).send({ ok: false, error: 'Program not found' });
    const { rows: days } = await getPool().query(
      'SELECT * FROM project2_trainer_days WHERE program_id=$1 ORDER BY day_number',
      [id],
    );
    for (const day of days) {
      const r = await getPool().query(
        'SELECT * FROM project2_trainer_exercises WHERE day_id=$1 ORDER BY sort_order,id',
        [day.id],
      );
      day.exercises = r.rows;
    }
    return { ok: true, program: programs[0], days };
  });

  app.patch('/api/project2/trainer/programs/:programId', async (request, reply) => {
    await initProject2Db();
    const id = String((request.params as any).programId);
    const b: any = request.body || {};
    const { rows } = await getPool().query(
      'UPDATE project2_trainer_programs SET name=COALESCE($1,name),goal=$2,description=$3,status=COALESCE($4,status),updated_at=NOW() WHERE id=$5 RETURNING *',
      [b.name ? String(b.name).trim() : null, b.goal || null, b.description || null, b.status || null, id],
    );
    if (!rows[0]) return reply.code(404).send({ ok: false, error: 'Program not found' });
    return { ok: true, program: rows[0] };
  });

  app.delete('/api/project2/trainer/programs/:programId', async (request, reply) => {
    await initProject2Db();
    const id = String((request.params as any).programId);
    const result = await getPool().query('DELETE FROM project2_trainer_programs WHERE id=$1', [id]);
    if (!result.rowCount) return reply.code(404).send({ ok: false, error: 'Program not found' });
    return { ok: true };
  });

  app.post('/api/project2/trainer/programs/:programId/days', async (request, reply) => {
    await initProject2Db();
    const pid = String((request.params as any).programId);
    const b: any = request.body || {};
    const dayNumber = Number(b.day_number);
    if (!Number.isInteger(dayNumber) || dayNumber < 1) {
      return reply.code(400).send({ ok: false, error: 'Номер дня должен быть целым числом от 1' });
    }
    const { rows } = await getPool().query(
      'INSERT INTO project2_trainer_days(program_id,day_number,title) VALUES($1,$2,$3) RETURNING *',
      [pid, dayNumber, String(b.title || 'Тренировка').trim()],
    );
    return { ok: true, day: rows[0] };
  });

  app.patch('/api/project2/trainer/days/:dayId', async (request, reply) => {
    await initProject2Db();
    const id = String((request.params as any).dayId);
    const b: any = request.body || {};
    const { rows } = await getPool().query(
      'UPDATE project2_trainer_days SET day_number=COALESCE($1,day_number),title=COALESCE($2,title) WHERE id=$3 RETURNING *',
      [b.day_number == null ? null : Number(b.day_number), b.title == null ? null : String(b.title).trim(), id],
    );
    if (!rows[0]) return reply.code(404).send({ ok: false, error: 'Day not found' });
    return { ok: true, day: rows[0] };
  });

  app.delete('/api/project2/trainer/days/:dayId', async (request, reply) => {
    await initProject2Db();
    const id = String((request.params as any).dayId);
    const result = await getPool().query('DELETE FROM project2_trainer_days WHERE id=$1', [id]);
    if (!result.rowCount) return reply.code(404).send({ ok: false, error: 'Day not found' });
    return { ok: true };
  });

  app.post('/api/project2/trainer/days/:dayId/exercises', async (request, reply) => {
    await initProject2Db();
    const dayId = String((request.params as any).dayId);
    const b: any = request.body || {};
    const name = String(b.exercise_name || '').trim();
    if (!name) return reply.code(400).send({ ok: false, error: 'Название упражнения обязательно' });
    const { rows } = await getPool().query(
      'INSERT INTO project2_trainer_exercises(day_id,exercise_name,sets,reps,working_weight_kg,rest_seconds,coach_comment,video_url,sort_order) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
      [dayId, name, b.sets == null ? null : Number(b.sets), b.reps ?? null, b.working_weight_kg == null ? null : Number(b.working_weight_kg), b.rest_seconds == null ? null : Number(b.rest_seconds), b.coach_comment || null, b.video_url || null, b.sort_order == null ? 0 : Number(b.sort_order)],
    );
    return { ok: true, exercise: rows[0] };
  });

  app.patch('/api/project2/trainer/exercises/:exerciseId', async (request, reply) => {
    await initProject2Db();
    const id = String((request.params as any).exerciseId);
    const b: any = request.body || {};
    const { rows } = await getPool().query(
      'UPDATE project2_trainer_exercises SET exercise_name=COALESCE($1,exercise_name),sets=$2,reps=$3,working_weight_kg=$4,rest_seconds=$5,coach_comment=$6,video_url=$7,sort_order=COALESCE($8,sort_order) WHERE id=$9 RETURNING *',
      [b.exercise_name ? String(b.exercise_name).trim() : null, b.sets == null ? null : Number(b.sets), b.reps ?? null, b.working_weight_kg == null ? null : Number(b.working_weight_kg), b.rest_seconds == null ? null : Number(b.rest_seconds), b.coach_comment || null, b.video_url || null, b.sort_order == null ? null : Number(b.sort_order), id],
    );
    if (!rows[0]) return reply.code(404).send({ ok: false, error: 'Exercise not found' });
    return { ok: true, exercise: rows[0] };
  });

  app.patch('/api/project2/trainer/days/:dayId/exercises/reorder', async (request, reply) => {
    await initProject2Db();
    const dayId = String((request.params as any).dayId);
    const ids = Array.isArray((request.body as any)?.exercise_ids) ? (request.body as any).exercise_ids.map(String) : [];
    if (!ids.length) return reply.code(400).send({ ok: false, error: 'Список упражнений пуст' });

    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query('SELECT id FROM project2_trainer_exercises WHERE day_id=$1 ORDER BY sort_order,id', [dayId]);
      const existing = new Set(rows.map((r: any) => String(r.id)));
      if (ids.length !== existing.size || ids.some((id: string) => !existing.has(id))) {
        await client.query('ROLLBACK');
        return reply.code(400).send({ ok: false, error: 'Список упражнений не соответствует дню' });
      }
      for (let i = 0; i < ids.length; i++) {
        await client.query('UPDATE project2_trainer_exercises SET sort_order=$1 WHERE id=$2 AND day_id=$3', [100000 + i, ids[i], dayId]);
      }
      for (let i = 0; i < ids.length; i++) {
        await client.query('UPDATE project2_trainer_exercises SET sort_order=$1 WHERE id=$2 AND day_id=$3', [i, ids[i], dayId]);
      }
      await client.query('COMMIT');
      return { ok: true };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  });


  app.delete('/api/project2/trainer/exercises/:exerciseId', async (request, reply) => {
    await initProject2Db();
    const id = String((request.params as any).exerciseId);
    const result = await getPool().query('DELETE FROM project2_trainer_exercises WHERE id=$1', [id]);
    if (!result.rowCount) return reply.code(404).send({ ok: false, error: 'Exercise not found' });
    return { ok: true };
  });
}
