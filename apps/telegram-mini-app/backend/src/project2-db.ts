import { Pool } from 'pg';
let pool: Pool|undefined; let initialized=false;
function getPool(){const url=process.env.DATABASE_URL?.trim();if(!url)throw new Error('DATABASE_URL is required for Project 2');pool??=new Pool({connectionString:url,ssl:{rejectUnauthorized:false},max:5});return pool;}
export async function initProject2Db(){if(initialized)return;await getPool().query(`
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS project2_trainer_programs(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),name TEXT NOT NULL,goal TEXT,description TEXT,status TEXT NOT NULL DEFAULT 'draft',created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS project2_trainer_days(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),program_id UUID NOT NULL REFERENCES project2_trainer_programs(id) ON DELETE CASCADE,day_number INTEGER NOT NULL,title TEXT NOT NULL,UNIQUE(program_id,day_number));
CREATE TABLE IF NOT EXISTS project2_trainer_exercises(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),day_id UUID NOT NULL REFERENCES project2_trainer_days(id) ON DELETE CASCADE,exercise_name TEXT NOT NULL,sets INTEGER,reps TEXT,working_weight_kg NUMERIC,rest_seconds INTEGER,coach_comment TEXT,video_url TEXT,sort_order INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS project2_exercise_library(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),name TEXT NOT NULL,category TEXT,muscles TEXT,description TEXT,technique TEXT,video_url TEXT,gif_url TEXT,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE INDEX IF NOT EXISTS idx_project2_exercise_library_name ON project2_exercise_library(name);
CREATE TABLE IF NOT EXISTS project2_training_sessions(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),program_id UUID REFERENCES project2_trainer_programs(id) ON DELETE SET NULL,day_id UUID REFERENCES project2_trainer_days(id) ON DELETE SET NULL,performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),duration_minutes INTEGER,overall_rpe NUMERIC,coach_comment TEXT);
CREATE TABLE IF NOT EXISTS project2_training_exercise_logs(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),session_id UUID NOT NULL REFERENCES project2_training_sessions(id) ON DELETE CASCADE,exercise_id UUID REFERENCES project2_trainer_exercises(id) ON DELETE SET NULL,exercise_name TEXT NOT NULL,sets_completed INTEGER,reps_completed TEXT,working_weight_kg NUMERIC,rpe NUMERIC,coach_comment TEXT,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE INDEX IF NOT EXISTS idx_project2_training_sessions_date ON project2_training_sessions(performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_project2_training_logs_exercise ON project2_training_exercise_logs(exercise_id,created_at DESC);
CREATE TABLE IF NOT EXISTS project2_calendar_events(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),title TEXT NOT NULL,event_date DATE NOT NULL,event_type TEXT NOT NULL DEFAULT 'training',program_id UUID REFERENCES project2_trainer_programs(id) ON DELETE SET NULL,day_id UUID REFERENCES project2_trainer_days(id) ON DELETE SET NULL,notes TEXT);
CREATE INDEX IF NOT EXISTS idx_project2_calendar_date ON project2_calendar_events(event_date);
CREATE TABLE IF NOT EXISTS project2_nutrition_plans(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),name TEXT NOT NULL,goal TEXT,calories INTEGER,protein_g NUMERIC,fat_g NUMERIC,carbs_g NUMERIC,notes TEXT,status TEXT NOT NULL DEFAULT 'draft',created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS project2_nutrition_days(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),plan_id UUID NOT NULL REFERENCES project2_nutrition_plans(id) ON DELETE CASCADE,day_number INTEGER NOT NULL,title TEXT NOT NULL,meals TEXT);
CREATE INDEX IF NOT EXISTS idx_project2_nutrition_plans_status ON project2_nutrition_plans(status);
`);initialized=true;} export{getPool};
