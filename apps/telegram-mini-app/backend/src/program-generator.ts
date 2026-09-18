export type ClientProfile = {
  first_name: string; goal?: string | null; goal_details?: string | null;
  training_experience?: string | null; training_location?: string | null;
  equipment?: string[] | null; training_days_per_week?: number | null;
  session_duration_minutes?: number | null; movement_limitations?: string | null;
};
export type TrainingAspect = "hypertrophy" | "strength" | "endurance" | "maintenance" | "general_fitness" | "weight_management";
export type MuscleGroup = "quadriceps" | "glutes" | "hamstrings" | "calves" | "chest" | "lats" | "upper_back" | "shoulders" | "biceps" | "triceps" | "core" | "cardio";
export type MovementPattern = "squat" | "hinge" | "horizontal_push" | "horizontal_pull" | "vertical_push" | "vertical_pull" | "core" | "cardio";
export type ProgressionWeek = { week:number; focus:string; adjustment:string; }; export type ProgramDraft = { name:string; goal:string|null; rationale:string; progression?:ProgressionWeek[]; days:Array<{day_number:number;title:string;notes:string;exercises:Array<{exercise_name:string;sets:number;reps:string;rest_seconds:number;coach_comment:string}>}> };

type TrainingLevel = "beginner" | "intermediate" | "advanced";
function progressionWeeks(aspect:TrainingAspect,level:TrainingLevel):ProgressionWeek[]{const base=level==="beginner"?["освоение техники","закрепление техники","умеренное увеличение объёма","проверка переносимости"]:level==="advanced"?["базовая нагрузка","увеличение нагрузки","увеличение объёма","контрольная неделя"]:["освоение рабочего диапазона","постепенное увеличение нагрузки","закрепление прогрессии","оценка результата"];return base.map((focus,i)=>({week:i+1,focus,adjustment:aspect==="strength"?(i===0?"сохранить запас и технику":"при стабильной технике постепенно увеличить основной параметр нагрузки"):aspect==="endurance"?(i===0?"сохранить комфортный темп":"постепенно увеличить объём или немного сократить отдых"):aspect==="maintenance"?"сохранить регулярность и контролируемый объём":aspect==="weight_management"?"постепенно увеличивать доступный объём активности без резких изменений":"при стабильном выполнении постепенно увеличить нагрузку или усложнить вариант"}));}
type Template={name:string;tags:string[];muscleGroups:MuscleGroup[];focus:string;pattern:MovementPattern;equipment?:string[];blocked?:string[];aspects:TrainingAspect[];levels:TrainingLevel[]};
const templates:Template[]=[
 {name:"Приседание с собственным весом",tags:["home","street","gym"],muscleGroups:["quadriceps","glutes"],focus:"legs",pattern:"squat",blocked:["колен","тазобедрен","голеностоп"],aspects:["hypertrophy","strength","endurance","maintenance","general_fitness","weight_management"],levels:["beginner","intermediate","advanced"]},
 {name:"Отжимания",tags:["home","street","gym"],muscleGroups:["chest","triceps","shoulders"],focus:"chest",pattern:"horizontal_push",blocked:["плеч","запяст","локт"],aspects:["hypertrophy","strength","endurance","maintenance","general_fitness","weight_management"],levels:["beginner","intermediate","advanced"]},
 {name:"Тяга верхнего блока",tags:["gym"],muscleGroups:["lats","upper_back","biceps"],focus:"back",pattern:"vertical_pull",equipment:["блок","кроссовер","тренажер"],blocked:["плеч","локт"],aspects:["hypertrophy","strength","endurance","maintenance","general_fitness"],levels:["beginner","intermediate","advanced"]},
 {name:"Good Morning без веса",tags:["home","street","gym"],muscleGroups:["hamstrings","glutes","upper_back"],focus:"back",pattern:"hinge",blocked:["поясниц","спин"],aspects:["hypertrophy","strength","endurance","maintenance","general_fitness"],levels:["beginner","intermediate","advanced"]},
 {name:"Выпады назад",tags:["home","street","gym"],muscleGroups:["quadriceps","glutes","hamstrings"],focus:"legs",pattern:"squat",blocked:["колен","тазобедрен","голеностоп"],aspects:["hypertrophy","strength","endurance","maintenance","general_fitness","weight_management"],levels:["beginner","intermediate","advanced"]},
 {name:"Жим гантелей лёжа",tags:["gym","home"],muscleGroups:["chest","triceps","shoulders"],focus:"chest",pattern:"horizontal_push",equipment:["гантел"],blocked:["плеч","локт"],aspects:["hypertrophy","strength","maintenance"],levels:["beginner","intermediate","advanced"]},
 {name:"Тяга гантели в наклоне",tags:["gym","home"],muscleGroups:["lats","upper_back","biceps"],focus:"back",pattern:"horizontal_pull",equipment:["гантел"],blocked:["поясниц","спин"],aspects:["hypertrophy","strength","maintenance"],levels:["beginner","intermediate","advanced"]},
 {name:"Жим гантелей вверх",tags:["gym","home"],muscleGroups:["shoulders","triceps"],focus:"shoulders",pattern:"vertical_push",equipment:["гантел"],blocked:["плеч","локт"],aspects:["hypertrophy","strength","maintenance"],levels:["beginner","intermediate","advanced"]},
 {name:"Dead Bug",tags:["home","street","gym"],muscleGroups:["core"],focus:"core",pattern:"core",aspects:["endurance","maintenance","general_fitness"],levels:["beginner","intermediate","advanced"]},
 {name:"Ходьба быстрым темпом",tags:["home","street","gym"],muscleGroups:["cardio"],focus:"cardio",pattern:"cardio",aspects:["endurance","maintenance","general_fitness","weight_management"],levels:["beginner","intermediate","advanced"]}
];

function locationKey(location?:string|null){const v=(location??"").toLowerCase();if(v.includes("зал")||v.includes("gym"))return"gym";if(v.includes("улиц")||v.includes("street")||v.includes("площад"))return"street";if(v.includes("дом")||v.includes("home"))return"home";return"home";}
function matchesEquipment(e:Template,p:ClientProfile){if(!e.equipment?.length)return true;const have=(p.equipment??[]).map(x=>x.toLowerCase());return e.equipment.some(req=>have.some(x=>x.includes(req)));}
function detectLevel(p:ClientProfile):TrainingLevel{const text=(p.training_experience??"").toLowerCase();if(/нович|начина|нет опыта|не трениров/.test(text))return "beginner";if(/продвин|advanced|высок|много лет/.test(text))return "advanced";return "intermediate";}
function allowed(e:Template,p:ClientProfile,level:TrainingLevel){const limits=(p.movement_limitations??"").toLowerCase();return e.levels.includes(level)&&e.tags.includes(locationKey(p.training_location))&&matchesEquipment(e,p)&&!(e.blocked??[]).some(x=>limits.includes(x));}
function detectAspect(p:ClientProfile):TrainingAspect{const text=[p.goal??"",p.goal_details??""].join(" ").toLowerCase();if(/гипертроф|мышечн.*мас|набор.*мас|массу/.test(text))return"hypertrophy";if(/сил[а-я]*|максимальн.*сил/.test(text))return"strength";if(/вынослив|кардио|аэроб/.test(text))return"endurance";if(/поддержан|сохранен|тонус/.test(text))return"maintenance";if(/сниж|похуд|жир|вес/.test(text))return"weight_management";return"general_fitness";}
function volume(p:ClientProfile,aspect:TrainingAspect,level:TrainingLevel){const beginner=level==="beginner";if(aspect==="strength")return{sets:beginner?2:3,reps:beginner?"6-8":"5-8",rest:120};if(aspect==="endurance"||aspect==="weight_management")return{sets:beginner?2:3,reps:beginner?"10-15":"12-20",rest:60};if(aspect==="maintenance")return{sets:2,reps:"8-12",rest:90};return{sets:beginner?2:3,reps:"8-12",rest:90};}
function exerciseLimit(minutes?:number|null,level?:TrainingLevel){if(!minutes)return level==="beginner"?5:6;if(minutes<=30)return 4;if(minutes<=45)return 5;return 6;}
function progressionNote(aspect:TrainingAspect,level:TrainingLevel){const levelNote=level==="beginner"?"Уровень: новичок — приоритет технике, умеренному объёму и простым вариантам.":level==="advanced"?"Уровень: продвинутый — допускается больше объёма и более требовательные варианты при подтверждённой технике.":"Уровень: средний — постепенное усложнение и увеличение объёма.";if(aspect==="hypertrophy")return"Прогрессия: постепенно увеличивать нагрузку или усложнять вариант после стабильного выполнения диапазона повторений.";if(aspect==="strength")return"Прогрессия: постепенно повышать нагрузку при сохранении техники, меняя один основной параметр за раз.";if(aspect==="endurance")return"Прогрессия: постепенно увеличивать объём работы или сокращать отдых при сохранении качества техники.";if(aspect==="maintenance")return"Поддержание: сохранять регулярность и контролируемый объём, корректируя его по фактической переносимости.";if(aspect==="weight_management")return"Прогрессия: приоритет регулярности и постепенному увеличению доступного объёма активности без резкого повышения нагрузки.";return"Прогрессия: постепенно менять один основной параметр нагрузки при сохранении техники.";}
function levelLabel(l:TrainingLevel){return{beginner:"Новичок",intermediate:"Средний",advanced:"Продвинутый"}[l];}
function aspectLabel(a:TrainingAspect){return{hypertrophy:"Гипертрофия",strength:"Сила",endurance:"Выносливость",maintenance:"Поддержание",general_fitness:"Общая физическая подготовка",weight_management:"Снижение массы тела"}[a];}
function muscleLabel(m:MuscleGroup){return{quadriceps:"квадрицепс",glutes:"ягодицы",hamstrings:"задняя поверхность бедра",calves:"икры",chest:"грудь",lats:"широчайшие",upper_back:"верх спины",shoulders:"плечи",biceps:"бицепс",triceps:"трицепс",core:"кор",cardio:"кардио"}[m];}

const patternPriority:Record<TrainingAspect,MovementPattern[]>={hypertrophy:["squat","hinge","horizontal_push","horizontal_pull","vertical_push","core"],strength:["squat","hinge","horizontal_push","vertical_pull","core"],endurance:["squat","hinge","horizontal_push","horizontal_pull","core","cardio"],maintenance:["squat","horizontal_push","horizontal_pull","hinge","core"],general_fitness:["squat","hinge","horizontal_push","horizontal_pull","core","cardio"],weight_management:["squat","hinge","horizontal_push","horizontal_pull","core","cardio"]};

function muscleScore(e:Template,load:Record<MuscleGroup,number>,day:number,aspect:TrainingAspect){const avg=e.muscleGroups.reduce((sum,m)=>sum+load[m],0)/Math.max(1,e.muscleGroups.length);const aspectBonus=aspect==="hypertrophy"&&e.muscleGroups.some(m=>["chest","lats","quadriceps","glutes","hamstrings"].includes(m))?-0.5:0;return avg+aspectBonus+(day%2===0&&e.name.includes("собственного веса")?0.05:0);}
function selectForDay(pool:Template[],aspect:TrainingAspect,day:number,limit:number,load:Record<MuscleGroup,number>,used:Set<string>){const picked:Template[]=[];for(const pattern of patternPriority[aspect]){if(picked.length>=limit)break;const candidates=pool.filter(e=>e.pattern===pattern&&!picked.some(x=>x.name===e.name));if(!candidates.length)continue;candidates.sort((a,b)=>muscleScore(a,load,day,aspect)-muscleScore(b,load,day,aspect));const unused=candidates.find(e=>!used.has(e.name));picked.push(unused??candidates[0]);}for(const e of pool){if(picked.length>=limit)break;if(!picked.some(x=>x.name===e.name))picked.push(e);}return picked;}

export type ProgressionSignal = {
  exercise_name:string;
  start_kg:number|null;
  current_kg:number|null;
  change_kg:number|null;
  trend:"up"|"down"|"stable"|"no_data";
  recommendation:"increase"|"maintain"|"review";
};

export function applyProgressionToDraft(draft:ProgramDraft, signals:ProgressionSignal[]):ProgramDraft {
  const byName=new Map(signals.map(s=>[s.exercise_name.toLowerCase().trim(),s]));
  const days=draft.days.map(day=>({...day,exercises:day.exercises.map(ex=>{
    const signal=byName.get(ex.exercise_name.toLowerCase().trim());
    if(!signal)return ex;
    const recommendation=signal.recommendation==="increase"
      ? "При стабильной технике рассмотреть небольшое увеличение рабочего веса/сложности."
      : signal.recommendation==="review"
      ? "Проверить технику, восстановление и переносимость перед изменением нагрузки."
      : "Сохранить текущую нагрузку и продолжить сбор результатов.";
    const change=signal.change_kg==null ? "нет данных" : (signal.change_kg>0?"+":"")+signal.change_kg+" кг";
    return {...ex,coach_comment:[ex.coach_comment,recommendation,"Фактический прогресс: "+(signal.current_kg??"нет данных")+" кг (изменение "+change+")."].join(" ")};
  })}));
  return {...draft,days,rationale:[draft.rationale,"Прогрессия упражнений учитывается как рекомендация для тренера; программа автоматически не изменяется."].join(" ")};
}

export function generateProgramDraft(profile:ClientProfile):ProgramDraft{
 const daysCount=Math.min(6,Math.max(1,Number(profile.training_days_per_week)||3));const level=detectLevel(profile);const aspect=detectAspect(profile);const v=volume(profile,aspect,level);const limit=exerciseLimit(profile.session_duration_minutes,level);const pool=templates.filter(e=>allowed(e,profile,level)&&e.aspects.includes(aspect));
 const load=Object.fromEntries(Object.keys({quadriceps:0,glutes:0,hamstrings:0,calves:0,chest:0,lats:0,upper_back:0,shoulders:0,biceps:0,triceps:0,core:0,cardio:0}).map(k=>[k,0])) as Record<MuscleGroup,number>;const used=new Set<string>();
 const days=Array.from({length:daysCount},(_,i)=>{const selected=selectForDay(pool,aspect,i+1,limit,load,used);selected.forEach(e=>e.muscleGroups.forEach(m=>{load[m]+=v.sets;}));selected.forEach(e=>used.add(e.name));const groups=[...new Set(selected.flatMap(e=>e.muscleGroups))];return{day_number:i+1,title:`Тренировка ${i+1} — ${aspectLabel(aspect)} — ${levelLabel(level)}`,notes:`Аспект: ${aspectLabel(aspect)}. Группы дня: ${groups.map(muscleLabel).join(", ")||"требуется ручной подбор"}. Недельная нагрузка распределяется с учётом уже выбранных мышечных групп, чтобы уменьшать перекос объёма. ${progressionNote(aspect,level)} Черновик: тренер проверяет ограничения, технику и объём перед назначением.`,exercises:selected.map((e,index)=>({exercise_name:e.name,sets:v.sets,reps:v.reps,rest_seconds:v.rest,coach_comment:`Группы: ${e.muscleGroups.map(muscleLabel).join(", ")}. Паттерн: ${e.pattern}. Аспект: ${aspectLabel(aspect)}. Недельная нагрузка этой группы учитывается при следующем выборе. Проверить технику, оборудование и переносимость.${index===0?" Начинать с контролируемого темпа.":""}` }))};});
 const loadSummary=Object.entries(load).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]).map(([m,v])=>`${muscleLabel(m as MuscleGroup)}: ${v} подходов`).join(", ");
 return{name:`Программа для ${profile.first_name}`,goal:profile.goal??null,progression:progressionWeeks(aspect,level),rationale:[`Аспект: ${aspectLabel(aspect)}.`,`Уровень: ${levelLabel(level)}.`,profile.goal?`Цель: ${profile.goal}.`:"Цель не указана — выбран общий фитнес-профиль.",profile.training_experience?`Опыт: ${profile.training_experience}.`:"",profile.training_location?`Место: ${profile.training_location}.`:"",profile.training_days_per_week?`Частота: ${profile.training_days_per_week} раз/неделю.`:"",profile.session_duration_minutes?`Длительность: около ${profile.session_duration_minutes} минут; лимит — ${limit} упражнений за занятие.`:"",`Распределение: ${daysCount} тренировочных дней с контролем накопленного объёма по мышечным группам.`,loadSummary?`Расчётный объём черновика: ${loadSummary}.`:"",progressionNote(aspect,level)].filter(Boolean).join(" "),days};
}
