import type { FastifyInstance } from 'fastify';
import { getPool, initProject2Db } from './project2-db.js';
function auth(r:any){const t=process.env.PROJECT2_ADMIN_TOKEN?.trim();return Boolean(t&&r.headers['x-project2-admin-token']===t);}
export async function registerProject2Tools(app:FastifyInstance){
 app.addHook('onRequest',async(req,reply)=>{if(req.url.startsWith('/api/project2/trainer/tools')&&!auth(req))return reply.code(401).send({ok:false,error:'Unauthorized'});});
 app.get('/api/project2/trainer/tools/progression/:exerciseId',async(req)=>{
  await initProject2Db();const id=String((req.params as any).exerciseId);
  const {rows}=await getPool().query('SELECT working_weight_kg,reps_completed,rpe,created_at FROM project2_training_exercise_logs WHERE exercise_id=$1 ORDER BY created_at DESC LIMIT 8',[id]);
  if(rows.length<2)return {ok:true,recommendation:'collect_more_data',reason:'Нужно минимум 2 записи',data:rows};
  const rpes=rows.slice(0,4).map((x:any)=>Number(x.rpe)).filter(Number.isFinite);const avg=rpes.length?rpes.reduce((a:number,b:number)=>a+b,0)/rpes.length:null;
  let recommendation='maintain',reason='Нагрузка выглядит стабильной';
  if(avg!==null&&avg>=9) {recommendation='decrease';reason='Средний RPE последних тренировок высокий';}
  else if(avg!==null&&avg<=6){recommendation='increase';reason='Средний RPE последних тренировок низкий';}
  return {ok:true,recommendation,reason,average_rpe:avg,data:rows};
 });
 app.get('/api/project2/trainer/tools/analytics',async()=>{
  await initProject2Db();
  const [s,e,p]=await Promise.all([
   getPool().query('SELECT COUNT(*)::int count,COALESCE(AVG(overall_rpe),0) avg_rpe FROM project2_training_sessions'),
   getPool().query('SELECT COUNT(*)::int count,COALESCE(AVG(rpe),0) avg_rpe FROM project2_training_exercise_logs'),
   getPool().query('SELECT COUNT(*)::int count FROM project2_trainer_programs'),
  ]);
  return {ok:true,training_sessions:s.rows[0],exercise_logs:e.rows[0],programs:p.rows[0]};
 });
 app.get('/api/project2/trainer/tools/calendar',async(req)=>{
  await initProject2Db();const from=String((req.query as any)?.from||'2000-01-01'),to=String((req.query as any)?.to||'2100-01-01');
  const {rows}=await getPool().query('SELECT * FROM project2_calendar_events WHERE event_date BETWEEN $1 AND $2 ORDER BY event_date',[from,to]);return {ok:true,events:rows};
 });
 app.post('/api/project2/trainer/tools/calendar',async(req)=>{
  await initProject2Db();const b:any=req.body||{};const {rows}=await getPool().query('INSERT INTO project2_calendar_events(title,event_date,event_type,program_id,day_id,notes) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',[b.title,b.event_date,b.event_type||'training',b.program_id||null,b.day_id||null,b.notes||null]);return {ok:true,event:rows[0]};
 });
 app.get('/api/project2/trainer/tools/nutrition',async()=>{await initProject2Db();const {rows}=await getPool().query('SELECT * FROM project2_nutrition_plans ORDER BY created_at DESC');return {ok:true,plans:rows};});
 app.post('/api/project2/trainer/tools/nutrition',async(req)=>{await initProject2Db();const b:any=req.body||{};const {rows}=await getPool().query('INSERT INTO project2_nutrition_plans(name,goal,calories,protein_g,fat_g,carbs_g,notes,status) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',[b.name,b.goal||null,b.calories??null,b.protein_g??null,b.fat_g??null,b.carbs_g??null,b.notes||null,b.status||'draft']);return {ok:true,plan:rows[0]};});
}