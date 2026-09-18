export type ClientProfile = {
  first_name: string; goal?: string | null; goal_details?: string | null;
  training_experience?: string | null; training_location?: string | null;
  equipment?: string[] | null; training_days_per_week?: number | null;
  session_duration_minutes?: number | null; movement_limitations?: string | null;
};
export type ProgramDraft = {
  name: string; goal: string | null; rationale: string;
  days: Array<{ day_number:number; title:string; notes:string; exercises:Array<{
    exercise_name:string; sets:number; reps:string; rest_seconds:number; coach_comment:string;
  }> }>;
};

type Template = { name:string; tags:string[]; focus:string; equipment?:string[]; blocked?:string[] };
const templates: Template[] = [
 {name:"Приседание с собственным весом",tags:["home","street","gym"],focus:"legs",blocked:["колен","тазобедрен","голеностоп"]},
 {name:"Отжимания",tags:["home","street","gym"],focus:"chest",blocked:["плеч","запяст","локт"]},
 {name:"Тяга верхнего блока",tags:["gym"],focus:"back",equipment:["блок","кроссовер","тренажер"],blocked:["плеч","локт"]},
 {name:"Good Morning без веса",tags:["home","street","gym"],focus:"back",blocked:["поясниц","спин"]},
 {name:"Выпады назад",tags:["home","street","gym"],focus:"legs",blocked:["колен","тазобедрен","голеностоп"]},
 {name:"Жим гантелей лёжа",tags:["gym","home"],focus:"chest",equipment:["гантел"],blocked:["плеч","локт"]},
 {name:"Тяга гантели в наклоне",tags:["gym","home"],focus:"back",equipment:["гантел"],blocked:["поясниц","спин"]},
 {name:"Жим гантелей вверх",tags:["gym","home"],focus:"shoulders",equipment:["гантел"],blocked:["плеч","локт"]},
 {name:"Dead Bug",tags:["home","street","gym"],focus:"core"},
 {name:"Ходьба быстрым темпом",tags:["home","street","gym"],focus:"cardio"}
];

function locationKey(location?:string|null) {
 const v=(location??"").toLowerCase();
 if(v.includes("зал")||v.includes("gym")) return "gym";
 if(v.includes("улиц")||v.includes("street")||v.includes("площад")) return "street";
 if(v.includes("дом")||v.includes("home")) return "home";
 return "home";
}
function matchesEquipment(e:Template,p:ClientProfile) {
 if(!e.equipment?.length) return true;
 const have=(p.equipment??[]).map(x=>x.toLowerCase());
 return e.equipment.some(req=>have.some(x=>x.includes(req)));
}
function allowed(e:Template,p:ClientProfile) {
 const limits=(p.movement_limitations??"").toLowerCase();
 return e.tags.includes(locationKey(p.training_location)) && matchesEquipment(e,p)
   && !(e.blocked??[]).some(x=>limits.includes(x));
}
function exercisesFor(p:ClientProfile) {
 const pool=templates.filter(e=>allowed(e,p));
 const goal=(p.goal??"").toLowerCase();
 const preferred = goal.includes("сил") ? ["legs","back","chest","shoulders","core"] : ["legs","chest","back","shoulders","core"];
 const picked:string[]=[];
 for(const focus of preferred) {
   const e=pool.find(x=>x.focus===focus && !picked.includes(x.name));
   if(e) picked.push(e.name);
 }
 return picked;
}
function volume(p:ClientProfile) {
 const beginner=(p.training_experience??"").toLowerCase().includes("нович");
 return {sets:beginner?2:3,reps:beginner?"8-12":"8-15",rest:90};
}
export function generateProgramDraft(profile:ClientProfile):ProgramDraft {
 const daysCount=Math.min(6,Math.max(1,Number(profile.training_days_per_week)||3));
 const v=volume(profile); const base=exercisesFor(profile);
 const days=Array.from({length:daysCount},(_,i)=>({
  day_number:i+1,title:`Тренировка ${i+1} — Full Body`,
  notes:"Черновик: тренер проверяет ограничения, технику и объём перед назначением.",
  exercises:base.map(name=>({exercise_name:name,sets:v.sets,reps:v.reps,rest_seconds:v.rest,
   coach_comment:"Проверить технику, доступное оборудование и переносимость."}))
 }));
 return {name:`Программа для ${profile.first_name}`,goal:profile.goal??null,
  rationale:[
   profile.goal?`Цель: ${profile.goal}.`:"Цель не указана.",
   profile.training_experience?`Опыт: ${profile.training_experience}.`:"",
   profile.training_location?`Место: ${profile.training_location}.`:"",
   profile.training_days_per_week?`Частота: ${profile.training_days_per_week} раз/неделю.`:"",
   profile.session_duration_minutes?`Длительность: около ${profile.session_duration_minutes} минут.`:"",
   base.length? `Подбор: ${base.length} упражнений с учётом профиля.`:"Подходящих упражнений не найдено — требуется ручной подбор."
  ].filter(Boolean).join(" "),days};
}
