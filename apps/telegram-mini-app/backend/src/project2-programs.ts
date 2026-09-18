import type { FastifyInstance } from 'fastify';
import { getPool, initProject2Db } from './project2-db.js';
import { generateProgramDraft } from './program-generator.js';

function auth(request:any){const expected=process.env.PROJECT2_ADMIN_TOKEN?.trim();return Boolean(expected&&request.headers['x-project2-admin-token']===expected);}
export async function registerProject2Programs(app:FastifyInstance){
 app.addHook('onRequest',async(req,reply)=>{if(req.url.startsWith('/api/project2/programs/')&&!auth(req))return reply.code(401).send({ok:false,error:'Unauthorized'});});
 app.post('/api/project2/programs/:clientId/generate',async(req,reply)=>{
  await initProject2Db(); const clientId=String((req.params as any).clientId);
  const {rows}=await getPool().query('SELECT * FROM project2_clients WHERE id=$1',[clientId]); if(!rows[0])return reply.code(404).send({ok:false,error:'Client not found'});
  const c=rows[0]; const draft=generateProgramDraft({first_name:c.first_name||'Клиент',goal:c.goal,training_experience:c.experience,training_location:c.location,training_days_per_week:c.days_per_week,session_duration_minutes:c.duration_minutes,movement_limitations:c.limitations});
  const client=await getPool().connect(); try{await client.query('BEGIN');const p=await client.query('INSERT INTO project2_programs(client_id,name,goal,status,rationale) VALUES($1,$2,$3,\'draft\',$4) RETURNING *',[clientId,draft.name,draft.goal,draft.rationale]);for(const d of draft.days){const dr=await client.query('INSERT INTO project2_workout_days(program_id,day_number,title) VALUES($1,$2,$3) RETURNING *',[p.rows[0].id,d.day_number,d.title]);for(const e of d.exercises)await client.query('INSERT INTO project2_exercises(workout_day_id,exercise_name,sets,reps,rest_seconds,coach_comment) VALUES($1,$2,$3,$4,$5,$6)',[dr.rows[0].id,e.exercise_name,e.sets,e.reps,e.rest_seconds,e.coach_comment]);}await client.query('COMMIT');return{ok:true,program:p.rows[0],draft};}catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
 });
}
