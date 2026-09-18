import type { FastifyInstance } from 'fastify';
import { getPool, initProject2Db } from './project2-db.js';

function auth(request:any){const expected=process.env.PROJECT2_ADMIN_TOKEN?.trim();return Boolean(expected&&request.headers['x-project2-admin-token']===expected);}
export async function registerProject2Journal(app:FastifyInstance){
  app.addHook('onRequest',async(req,reply)=>{if(req.url.startsWith('/api/project2/trainer/journal')&&!auth(req))return reply.code(401).send({ok:false,error:'Unauthorized'});});
  app.get('/api/project2/trainer/journal',async(req)=>{
    await initProject2Db();
    const limit=Math.min(100,Math.max(1,Number((req.query as any)?.limit||30)));
    const {rows}=await getPool().query('SELECT * FROM project2_training_sessions ORDER BY performed_at DESC LIMIT $1',[limit]);
    return {ok:true,sessions:rows};
  });
  app.post('/api/project2/trainer/journal',async(req,reply)=>{
    await initProject2Db(); const b:any=req.body||{};
    const c=await getPool().connect();
    try{
      await c.query('BEGIN');
      const s=await c.query('INSERT INTO project2_training_sessions(program_id,day_id,performed_at,duration_minutes,overall_rpe,coach_comment) VALUES($1,$2,COALESCE($3,NOW()),$4,$5,$6) RETURNING *',[b.program_id||null,b.day_id||null,b.performed_at||null,b.duration_minutes??null,b.overall_rpe??null,b.coach_comment||null]);
      for(const x of (Array.isArray(b.exercises)?b.exercises:[])){
        await c.query('INSERT INTO project2_training_exercise_logs(session_id,exercise_id,exercise_name,sets_completed,reps_completed,working_weight_kg,rpe,coach_comment) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[s.rows[0].id,x.exercise_id||null,String(x.exercise_name||'Упражнение'),x.sets_completed??null,x.reps_completed??null,x.working_weight_kg??null,x.rpe??null,x.coach_comment||null]);
      }
      await c.query('COMMIT'); return {ok:true,session:s.rows[0]};
    }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
  });
  app.get('/api/project2/trainer/journal/exercise/:exerciseId',async(req)=>{
    await initProject2Db(); const id=String((req.params as any).exerciseId);
    const {rows}=await getPool().query('SELECT * FROM project2_training_exercise_logs WHERE exercise_id=$1 ORDER BY created_at DESC LIMIT 20',[id]);
    return {ok:true,logs:rows};
  });
}