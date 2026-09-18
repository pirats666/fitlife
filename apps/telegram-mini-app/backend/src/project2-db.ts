import { Pool } from 'pg';
let pool: Pool|undefined; let initialized=false;
function getPool(){const url=process.env.DATABASE_URL?.trim();if(!url)throw new Error('DATABASE_URL is required for Project 2');pool??=new Pool({connectionString:url,ssl:{rejectUnauthorized:false},max:5});return pool;}
export async function initProject2Db(){if(initialized)return;await getPool().query(`
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS project2_trainer_programs(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),name TEXT NOT NULL,goal TEXT,description TEXT,status TEXT NOT NULL DEFAULT 'draft',created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS project2_trainer_days(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),program_id UUID NOT NULL REFERENCES project2_trainer_programs(id) ON DELETE CASCADE,day_number INTEGER NOT NULL,title TEXT NOT NULL,UNIQUE(program_id,day_number));
CREATE TABLE IF NOT EXISTS project2_trainer_exercises(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),day_id UUID NOT NULL REFERENCES project2_trainer_days(id) ON DELETE CASCADE,exercise_name TEXT NOT NULL,sets INTEGER,reps TEXT,working_weight_kg NUMERIC,rest_seconds INTEGER,coach_comment TEXT,video_url TEXT,sort_order INTEGER NOT NULL DEFAULT 0);
`);initialized=true;} export{getPool};
