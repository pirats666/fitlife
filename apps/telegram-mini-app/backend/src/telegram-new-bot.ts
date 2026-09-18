import 'dotenv/config';
type User = { id:number; username?:string; first_name?:string; last_name?:string };
type Update = { message?: { chat:{id:number}; from?:User; text?:string }; callback_query?: { id:string; from:User; message?:{chat:{id:number}}; data?:string } };
type Session = { step:'goal'|'experience'|'location'|'days'|'duration'|'limitations'; goal?:string; experience?:string; location?:string; days?:number; duration?:number; limitations?:string };
const sessions=new Map<number,Session>();
const token=()=>process.env.NEW_TELEGRAM_BOT_TOKEN??'';
const api=()=>`https://api.telegram.org/bot${token()}`;
async function tg(method:string,body:Record<string,unknown>){const r=await fetch(`${api()}/${method}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const j=await r.json() as any;if(!r.ok||!j.ok)throw new Error(j.description??'Telegram API error');return j.result;}
async function send(chatId:number,text:string,keyboard?:unknown){return tg('sendMessage',{chat_id:chatId,text,reply_markup:keyboard});}
async function answer(id:string){return tg('answerCallbackQuery',{callback_query_id:id});}
const kb=(rows:Array<Array<{text:string;callback_data:string}>>) => ({inline_keyboard:rows});
const start=kb([[{text:'🚀 Начать',callback_data:'new:start'}]]);
const goals=kb([[{text:'🔥 Похудеть',callback_data:'new:goal:weight_loss'},{text:'💪 Набрать мышц',callback_data:'new:goal:muscle_gain'}],[{text:'🏋️ Стать сильнее',callback_data:'new:goal:strength'},{text:'❤️ Улучшить форму',callback_data:'new:goal:fitness'}]]);
const experience=kb([[{text:'🟢 Новичок',callback_data:'new:experience:beginner'},{text:'🟡 Есть опыт',callback_data:'new:experience:intermediate'}],[{text:'🔴 Тренируюсь давно',callback_data:'new:experience:advanced'}]]);
const locations=kb([[{text:'🏠 Дома',callback_data:'new:location:home'},{text:'🏋️ В зале',callback_data:'new:location:gym'}],[{text:'🌳 На улице',callback_data:'new:location:outdoor'},{text:'🔄 Комбинирую',callback_data:'new:location:mixed'}]]);
const days=kb([[{text:'1 раз',callback_data:'new:days:1'},{text:'2 раза',callback_data:'new:days:2'},{text:'3 раза',callback_data:'new:days:3'}],[{text:'4 раза',callback_data:'new:days:4'},{text:'5+ раз',callback_data:'new:days:5'}]]);
const durations=kb([[{text:'30 минут',callback_data:'new:duration:30'},{text:'45 минут',callback_data:'new:duration:45'}],[{text:'60 минут',callback_data:'new:duration:60'},{text:'90 минут',callback_data:'new:duration:90'}]]);
const savedProfiles=new Map<number, { id:string; user:User; profile:Session }>();
function saveProfile(id:number,user:User,s:Session){
 const profileId=`tg-${id}`;
 savedProfiles.set(id,{id:profileId,user,profile:{...s}});
 return profileId;
}
function summary(s:Session){return `🎯 Цель: ${s.goal}\n📈 Опыт: ${s.experience}\n📍 Место: ${s.location}\n📅 Тренировок: ${s.days}/нед.\n⏱ Время: ${s.duration} мин\n⚠️ Ограничения: ${s.limitations||'не указаны'}`;}
export async function handleNewTelegramUpdate(update:Update){
 if(!token())throw new Error('NEW_TELEGRAM_BOT_TOKEN is required');
 const message=update.message;
 if(message?.text?.startsWith('/start')){const id=message.chat.id;sessions.set(id, {step:'goal'});await send(id,'Привет! 👋\n\nЯ помогу определить твою стартовую точку и собрать данные для персональной программы.\n\nЭто займёт несколько минут. Никаких сложных анкет.\n\nГотов начать?',start);return;}
 const cb=update.callback_query;if(cb?.data&&cb.message){const id=cb.from.id;await answer(cb.id);let s=sessions.get(id);
  if(cb.data==='new:start'){s={step:'goal'};sessions.set(id,s);await send(id,'Шаг 1 из 6\n\nКакая у тебя главная цель?',goals);return;}
  if(!s){s={step:'goal'};sessions.set(id,s);await send(cb.message.chat.id,'Давай начнём заново 👇',start);return;}
  const parts=cb.data.split(':');const type=parts[1];const value=parts[2];
  if(type==='goal'){s.goal=value;s.step='experience';await send(cb.message.chat.id,'Шаг 2 из 6\n\nКакой у тебя опыт тренировок?',experience);return;}
  if(type==='experience'){s.experience=value;s.step='location';await send(cb.message.chat.id,'Шаг 3 из 6\n\nГде ты планируешь тренироваться?',locations);return;}
  if(type==='location'){s.location=value;s.step='days';await send(cb.message.chat.id,'Шаг 4 из 6\n\nСколько тренировок в неделю реально готов выполнять?',days);return;}
  if(type==='days'){s.days=Number(value);s.step='duration';await send(cb.message.chat.id,'Шаг 5 из 6\n\nСколько времени можешь выделить на одну тренировку?',durations);return;}
  if(type==='duration'){s.duration=Number(value);s.step='limitations';await send(cb.message.chat.id,'Шаг 6 из 6\n\nЕсть ли ограничения по движениям, травмы или упражнения, которые тебе нельзя/неприятно выполнять?\n\nНапиши коротко сообщением. Если ограничений нет — напиши «нет».');return;}
 }
 if(message?.text){const id=message.chat.id;const s=sessions.get(id);if(!s||s.step!=='limitations')return;s.limitations=message.text.trim();try{const clientId=saveProfile(id,message.from??{id},s);sessions.delete(id);await send(id,`Готово ✅\n\nЯ собрал твою стартовую анкету:\n\n${summary(s)}\n\nАнкета сохранена. Следующим шагом я подберу структуру программы под эти данные.\n\nID профиля: ${clientId}`);}catch(error){console.error('New bot profile save error:',error);await send(id,'Не удалось обработать анкету. Попробуй ещё раз чуть позже.');}}
}