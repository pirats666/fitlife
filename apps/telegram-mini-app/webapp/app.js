const tg = window.Telegram?.WebApp;
const API_BASE = window.FITLIFE_API_BASE || '';
if (tg) { tg.ready(); tg.expand(); tg.setHeaderColor?.('#0b0d0f'); tg.setBackgroundColor?.('#0b0d0f'); }
const telegramUser = tg?.initDataUnsafe?.user;
const content = document.getElementById('screenContent'); const title = document.getElementById('screenTitle'); const subtitle = document.getElementById('screenSubtitle');
let fitLifeUser=null, workoutCatalog=[], activeWorkout=null, activeExerciseIndex=0, timer=null, remaining=0, weeklySchedule=[], clientSchedule=[], trainerClients=[], selectedClient=null, selectedClientSchedule=[], selectedClientHistory=[];
let selectedCrmClient=null, selectedCrmPrograms=[], selectedCrmProgression=[], selectedCrmAdjustment=null, selectedCrmProgress=null, selectedCrmMeasurements=[], selectedCrmNutrition=[], selectedCrmPayments=[], selectedCrmNotes=[], selectedCrmTab='overview';
async function api(path, options={}) { const headers={'Content-Type':'application/json',...(tg?.initData?{'x-telegram-init-data':tg.initData}:{}),...(options.headers||{})}; const response=await fetch(`${API_BASE}${path}`,{...options,headers}); const data=await response.json(); if(!response.ok||!data.ok) throw new Error(data.error||'Ошибка запроса'); return data; }
async function authenticate(){if(!tg?.initData)return null;return(await api('/api/auth/telegram',{method:'POST',body:JSON.stringify({initData:tg.initData})})).user;}
async function loadWorkouts(){workoutCatalog=(await api('/api/workouts')).workouts;}
async function loadSchedule(){weeklySchedule=(await api('/api/schedule')).schedule;}
async function loadClientSchedule(){if(fitLifeUser)clientSchedule=(await api(`/api/users/${fitLifeUser.id}/schedule`)).schedule;}
async function loadTrainerClients(){if(fitLifeUser?.role==='trainer')trainerClients=(await api('/api/trainer/crm/clients')).clients;}
function escapeHtml(value=''){return String(value).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function goalLabel(goal){return({health:'Здоровье и активность',strength:'Сила',fitness:'Общая физическая форма'}[goal]||'Не выбрана');}
function todayWorkout(){const day=new Date().getDay()||7;const source=fitLifeUser?.role==='client'?clientSchedule:weeklySchedule;return workoutCatalog.find(w=>w.id===source.find(i=>i.day===day)?.workoutId)||null;}
function renderClientHome(){const w=todayWorkout();return `<section class="hero-card"><span>СЕГОДНЯ</span><h2>${w?w.title:'День восстановления'}</h2><p>${w?'Твоя тренировка уже в расписании.':'Сегодня можно восстановиться и подготовиться к следующей тренировке.'}</p>${w?`<button class="primary" data-workout="${w.id}">Начать тренировку</button>`:''}</section><section class="section"><div class="section-title"><h2>Разделы</h2></div><div class="grid"><button class="tile" data-screen="workouts"><strong>💪</strong><span>Тренировки</span></button><button class="tile" data-screen="schedule"><strong>📅</strong><span>Расписание</span></button><button class="tile" data-screen="progress"><strong>📈</strong><span>Прогресс</span></button><button class="tile" data-screen="profile"><strong>👤</strong><span>Профиль</span></button><button class="tile" data-screen="trainer"><strong>🏋️</strong><span>Мой тренер</span></button></div></section>`;}
function renderTrainerDashboard(){const cs=trainerClients||[];const active=cs.filter(c=>c.status==='active').length;const leads=cs.filter(c=>c.status==='lead').length;const remaining=cs.reduce((n,c)=>n+Number(c.sessions_remaining||0),0);const programs=cs.reduce((n,c)=>n+Number(c.active_program_count||0),0);return `<section class="hero-card dashboard-hero"><span>FITLIFE CRM</span><h2>Панель тренера</h2><p>Все ключевые показатели в одном месте.</p><button class="primary" data-screen="clients">Открыть клиентов</button></section><section class="stats dashboard-stats"><div><b>${active}</b><span>активных клиентов</span></div><div><b>${leads}</b><span>лидов</span></div><div><b>${programs}</b><span>активных программ</span></div><div><b>${remaining}</b><span>тренировок осталось</span></div></section><section class="section"><div class="section-title"><h2>Быстрые действия</h2></div><div class="grid"><button class="tile" data-screen="clients"><strong>👥</strong><span>Клиенты</span></button><button class="tile" data-screen="clients"><strong>⚡</strong><span>Новая программа</span></button><button class="tile" data-screen="clients"><strong>📈</strong><span>Прогресс</span></button><button class="tile" data-screen="clients"><strong>💳</strong><span>Оплаты</span></button></div></section><section class="section"><div class="section-title"><h2>Последние клиенты</h2></div>${cs.slice(0,5).map(c=>`<article class="list-card"><div><b>${escapeHtml(c.first_name)}${c.last_name?' '+escapeHtml(c.last_name):''}</b><span>${escapeHtml(goalLabel(c.goal))} • ${c.sessions_remaining||0} тренировок</span></div><button class="small-primary" data-client="${c.id}">Открыть</button></article>`).join('')||'<article class="list-card"><div><b>Клиентов пока нет</b><span>Добавь первого клиента.</span></div></article>'}</section>`;}
const screens={
 home:{title:()=>`Привет, ${fitLifeUser?.first_name||telegramUser?.first_name||''} 👋`,subtitle:()=>fitLifeUser?.role==='trainer'?'Кабинет тренера FitLife':'Твой путь к системному результату',html:()=>fitLifeUser?.role==='trainer'?renderTrainerDashboard():renderClientHome()},
 workouts:{title:()=> 'Тренировки',subtitle:()=> 'Программы с собственным весом',html:()=>`<section class="section"><div class="section-title"><h2>Доступно сейчас</h2></div>${workoutCatalog.map(w=>`<article class="list-card"><div><b>${escapeHtml(w.title)}</b><span>${w.durationMinutes} мин • ${w.exercises.length} упражнений</span><small>${escapeHtml(w.description)}</small></div><button class="small-primary" data-workout="${w.id}">Открыть</button></article>`).join('')}</section>`},
 schedule:{title:()=> 'Расписание',subtitle:()=> 'Твой план тренировок',html:()=>`<section class="section"><div class="section-title"><h2>Эта неделя</h2></div>${(fitLifeUser?.role==='client'?clientSchedule:weeklySchedule).map(day=>{const w=workoutCatalog.find(x=>x.id===day.workoutId);return `<article class="list-card"><div><b>${day.label}</b><span>${w?escapeHtml(w.title):'День восстановления'}</span></div>${w?`<button class="small-primary" data-workout="${w.id}">Открыть</button>`:'<span class="status">Отдых</span>'}</article>`}).join('')}</section>`},
 progress:{title:()=> 'Прогресс',subtitle:()=> 'История твоих тренировок',html:()=>`<section class="stats"><div><b id="workoutCount">—</b><span>тренировок</span></div><div><b id="weekCount">—</b><span>на этой неделе</span></div><div><b>✓</b><span>последняя</span></div></section><section class="list-card"><div><b>История</b><span id="historyText">Загрузка…</span></div></section>`},
 nutrition:{title:()=> 'Питание',subtitle:()=> 'Основы питания без перегруза',html:()=>`<section class="list-card"><div><b>Питание</b><span>Персональные рекомендации подключим следующим этапом.</span></div></section>`},
 profile:{title:()=> 'Профиль',subtitle:()=> 'Твои данные',html:()=>`<section class="profile-card"><div class="profile-avatar">👤</div><div><b>${escapeHtml(fitLifeUser?.first_name||'Пользователь')}</b><span>${fitLifeUser?.username?'@'+escapeHtml(fitLifeUser.username):'Telegram-профиль'}</span></div></section><section class="list-card"><div><b>Цель</b><span>${goalLabel(fitLifeUser?.goal)}</span></div></section>`},
 trainer:{title:()=> 'Мой тренер',subtitle:()=> 'Связь с тренером',html:()=>`<section class="list-card"><div><b>Загрузка…</b><span>Проверяем назначение тренера.</span></div></section>`},
 clients:{title:()=> 'Клиенты',subtitle:()=> 'CRM тренера',html:()=>`<section class="section"><div class="section-title"><h2>Мои клиенты</h2></div>${trainerClients.length?trainerClients.map(c=>`<article class="client-card"><div><b>${escapeHtml(c.first_name)}${c.last_name?' '+escapeHtml(c.last_name):''}</b><span>${c.telegram_username?'@'+escapeHtml(c.telegram_username):'Telegram ID: '+c.telegram_id}</span><small>${escapeHtml(goalLabel(c.goal))} • Программа: ${c.active_program_count||0} • Осталось тренировок: ${c.sessions_remaining||0}</small></div><button class="small-primary" data-client="${c.id}">Открыть</button></article>`).join(''):'<section class="list-card"><div><b>Клиентов пока нет</b><span>Добавь клиента по Telegram ID после его авторизации.</span></div></section>'}</section><section class="section"><div class="section-title"><h2>Добавить клиента</h2></div><div class="form-row"><input class="text-input" id="clientTelegramId" inputmode="numeric" placeholder="Telegram ID"/><button class="small-primary" data-add-client>Добавить</button></div></section>`},
 onboarding:{title:()=> 'Добро пожаловать',subtitle:()=> 'Настроим FitLife под тебя',html:()=>`<section class="hero-card"><span>ПЕРВЫЙ ШАГ</span><h2>Выбери цель</h2><p>Это поможет настроить будущие тренировки.</p><div class="goal-list"><button class="goal" data-goal="health">🏃 <span>Здоровье и активность</span></button><button class="goal" data-goal="strength">💪 <span>Сила</span></button><button class="goal" data-goal="fitness">🔥 <span>Общая физическая форма</span></button></div></section>`}
};
function render(screen='home'){const data=screens[screen]||screens.home;title.textContent=data.title();subtitle.textContent=data.subtitle();content.innerHTML=data.html();document.querySelectorAll('[data-screen]').forEach(el=>el.addEventListener('click',()=>render(el.dataset.screen)));document.querySelectorAll('.bottom-nav button').forEach(el=>el.classList.toggle('active',el.dataset.screen===screen));if(screen==='progress')loadHistory();if(screen==='trainer')loadTrainerProfile();}
function renderWorkoutDetail(w){activeWorkout=w;activeExerciseIndex=0;clearInterval(timer);title.textContent=w.title;subtitle.textContent=`${w.durationMinutes} мин • собственный вес`;content.innerHTML=`<section class="hero-card"><span>ТРЕНИРОВКА</span><h2>${escapeHtml(w.title)}</h2><p>${escapeHtml(w.description)}</p><button class="primary" data-start-workout>Начать</button></section><section class="section"><div class="section-title"><h2>Упражнения</h2></div>${w.exercises.map((e,i)=>`<article class="list-card"><div><b>${i+1}. ${escapeHtml(e.name)}</b><span>${escapeHtml(e.target)} • ${e.mode==='reps'?e.value+' повторений':e.value+' сек'}</span></div></article>`).join('')}</section>`;content.querySelector('[data-start-workout]').addEventListener('click',renderExercise);}
function renderExercise(){const e=activeWorkout.exercises[activeExerciseIndex];clearInterval(timer);remaining=e.value;title.textContent=`Упражнение ${activeExerciseIndex+1}/${activeWorkout.exercises.length}`;subtitle.textContent=activeWorkout.title;content.innerHTML=`<section class="hero-card"><span>${escapeHtml(e.target.toUpperCase())}</span><h2>${escapeHtml(e.name)}</h2><div class="timer" id="exerciseTimer">${e.mode==='reps'?e.value:e.value+'с'}</div><p>${escapeHtml(e.instructions)}</p><button class="primary" data-next-exercise>${activeExerciseIndex===activeWorkout.exercises.length-1?'Завершить':'Следующее'}</button></section>`;if(e.mode==='seconds')timer=setInterval(()=>{remaining--;const node=document.getElementById('exerciseTimer');if(node)node.textContent=`${Math.max(remaining,0)}с`;if(remaining<=0)clearInterval(timer)},1000);content.querySelector('[data-next-exercise]').addEventListener('click',()=>{if(activeExerciseIndex===activeWorkout.exercises.length-1)finishWorkout();else{activeExerciseIndex++;renderExercise()}});}
async function finishWorkout(){clearInterval(timer);try{await api(`/api/users/${fitLifeUser.id}/workouts/${activeWorkout.id}/complete`,{method:'POST'});tg?.showAlert?.('Тренировка завершена! Отличная работа 💪');render('progress')}catch(e){console.error(e);tg?.showAlert?.('Не удалось сохранить тренировку.');render('home')}}
async function loadHistory(){if(!fitLifeUser)return;try{const[h,p]=await Promise.all([api(`/api/users/${fitLifeUser.id}/workouts/history`),api(`/api/users/${fitLifeUser.id}/progress`)]);document.getElementById('workoutCount').textContent=p.progress.totalWorkouts;document.getElementById('weekCount').textContent=p.progress.completedThisWeek;document.getElementById('historyText').textContent=h.history.length?`Последняя тренировка: ${new Date(h.history[0].completedAt).toLocaleString('ru-RU')}`:'Пока нет завершённых тренировок'}catch{document.getElementById('historyText').textContent='История пока недоступна'}}
async function loadTrainerProfile(){try{const d=await api(`/api/users/${fitLifeUser.id}/trainer`);const t=d.trainer;content.innerHTML=t?`<section class="profile-card"><div class="profile-avatar">🏋️</div><div><b>${escapeHtml(t.first_name)}${t.last_name?' '+escapeHtml(t.last_name):''}</b><span>${t.username?'@'+escapeHtml(t.username):'Твой тренер'}</span></div></section>`:'<section class="list-card"><div><b>Тренер пока не назначен</b><span>Когда тренер подключит тебя к FitLife, он появится здесь.</span></div></section>'}catch{content.innerHTML='<section class="list-card"><div><b>Не удалось загрузить</b><span>Попробуй ещё раз.</span></div></section>'}}
async function renderTrainerClient(clientId){
  try{
    const [c,programs,progression,adjustment,progress,measurements,nutrition,payments,notes]=await Promise.all([
      api(`/api/trainer/crm/clients/${clientId}`),
      api(`/api/trainer/crm/clients/${clientId}/programs`),
      api(`/api/trainer/crm/clients/${clientId}/exercise-progression`),
      api(`/api/trainer/crm/clients/${clientId}/program-adjustment`),
      api(`/api/trainer/crm/clients/${clientId}/progress`),
      api(`/api/trainer/crm/clients/${clientId}/measurements`),
      api(`/api/trainer/crm/clients/${clientId}/nutrition`),
      api(`/api/trainer/crm/clients/${clientId}/payments`),
      api(`/api/trainer/crm/clients/${clientId}/notes`)
    ]);
    selectedCrmClient=c.client; selectedCrmPrograms=programs.programs||[]; selectedCrmProgression=progression.progression||[]; selectedCrmAdjustment=adjustment.adjustments||null;
    selectedCrmProgress=progress; selectedCrmMeasurements=measurements.measurements||[]; selectedCrmNutrition=nutrition.plans||[]; selectedCrmPayments=payments.payments||[]; selectedCrmNotes=notes.notes||[];
    title.textContent=selectedCrmClient.first_name; subtitle.textContent='CRM • Клиент'; selectedCrmTab=selectedCrmTab||'overview'; renderTrainerClientView();
  }catch(error){ console.error(error); tg?.showAlert?.('Не удалось открыть клиента.'); render('clients'); }
}

function progressionSparkline(history){
  if(!history?.length)return '';
  const values=history.map(x=>Number(x.weight_kg??x.estimated_1rm_kg??0)).filter(Number.isFinite);
  if(values.length<2)return '';
  const min=Math.min(...values),max=Math.max(...values),range=max-min||1;
  const points=values.map((v,i)=>`${(i/(values.length-1))*100},${34-((v-min)/range)*28}`).join(' ');
  return `<svg class="sparkline" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true"><polyline points="${points}" fill="none" stroke="currentColor" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>`;
}

function renderTrainerClientView(){
  const c=selectedCrmClient, tab=selectedCrmTab;
  const tabButtons=['overview','programs','progress','measurements','nutrition','payments','notes'];
  const tabs=tabButtons.map(x=>`<button class="crm-tab ${x===tab?'active':''}" data-crm-tab="${x}">${({overview:'Обзор',programs:'Программа',progress:'Прогресс',measurements:'Измерения',nutrition:'Питание',payments:'Оплаты',notes:'Заметки'})[x]}</button>`).join('');
  let body='';
  if(tab==='overview'){
    body=`<section class="section"><div class="section-title"><h2>Сводка</h2></div><article class="list-card"><div><b>Цель</b><span>${escapeHtml(goalLabel(c.goal))}</span><small>${escapeHtml(c.goal_details||'Детали цели не указаны')}</small></div></article><article class="list-card"><div><b>Опыт и формат</b><span>${escapeHtml(c.training_experience||'—')} • ${escapeHtml(c.training_location||'—')}</span><small>${c.training_days_per_week||'—'} тренировок/нед. • ${c.session_duration_minutes||'—'} мин</small></div></article><article class="list-card adjustment-card"><div><b>${escapeHtml(selectedCrmAdjustment?.recommendation||'Недостаточно данных')}</b><span>${escapeHtml(selectedCrmAdjustment?.reason||'Продолжай собирать историю тренировок и RPE.')}</span></div></article></section>`;
  } else if(tab==='programs'){
    body=`<section class="section"><div class="section-title"><h2>Программы</h2></div><button class="primary" data-generate-program>⚡ Сгенерировать программу</button><div id="generatedProgram"></div>${selectedCrmPrograms.length?selectedCrmPrograms.map(p=>`<article class="list-card"><div><b>${escapeHtml(p.name)}</b><span>v${p.version||1} • ${escapeHtml(p.status)} • ${p.starts_on||'без даты'}</span><small>${escapeHtml(p.goal||'Цель не указана')}</small></div></article>`).join(''):'<article class="list-card"><div><b>Программ пока нет</b><span>Сгенерируй первую программу.</span></div></article>'}</section>`;
  } else if(tab==='progress'){
    const p=selectedCrmProgress?.summary||{}; body=`<section class="stats crm-stats"><div><b>${p.totalWorkouts||0}</b><span>всего тренировок</span></div><div><b>${p.completedThisWeek||0}</b><span>на этой неделе</span></div><div><b>${p.lastWorkoutAt?new Date(p.lastWorkoutAt).toLocaleDateString('ru-RU'):'—'}</b><span>последняя</span></div></section><section class="section"><div class="section-title"><h2>Упражнения</h2></div>${selectedCrmProgression.length?selectedCrmProgression.map(item=>`<article class="progress-card"><div class="progress-head"><div><b>${escapeHtml(item.exercise_name)}</b><span>Старт: ${item.start_kg??'—'} кг • Сейчас: ${item.current_kg??'—'} кг</span></div><strong class="${Number(item.change_kg)>=0?'progress-up':'progress-down'}">${Number(item.change_kg)>0?'+':''}${item.change_kg??0} кг</strong></div>${progressionSparkline(item.history)}<div class="history-mini">${(item.history||[]).slice(0,5).map(h=>`<span>${new Date(h.performed_at).toLocaleDateString('ru-RU')} • ${h.weight_kg??h.estimated_1rm_kg??'—'} кг${h.sets&&h.reps?' • '+h.sets+'×'+h.reps:''}</span>`).join('')}</div></article>`).join(''):'<article class="list-card"><div><b>Результатов пока нет</b><span>Добавь первый результат.</span></div></article>'}</section><section class="section"><div class="section-title"><h2>Добавить результат</h2></div><div class="crm-form"><input class="text-input" id="progExerciseName" placeholder="Упражнение"/><div class="form-grid"><input class="text-input" id="progWeight" type="number" step="0.5" min="0" placeholder="Вес, кг"/><input class="text-input" id="prog1rm" type="number" step="0.5" min="0" placeholder="1ПМ, кг"/></div><div class="form-grid"><input class="text-input" id="progSets" type="number" min="1" placeholder="Подходы"/><input class="text-input" id="progReps" type="number" min="1" placeholder="Повторы"/></div><input class="text-input" id="progDate" type="date"/><input class="text-input" id="progNotes" placeholder="Комментарий"/><button class="primary" data-save-progression>Сохранить результат</button></div></section>`;
  } else if(tab==='measurements'){
    body=`<section class="section"><div class="section-title"><h2>Измерения</h2></div>${selectedCrmMeasurements.map(m=>`<article class="list-card"><div><b>${m.measured_on||'—'}</b><span>Вес: ${m.body_weight_kg??'—'} кг • Талия: ${m.waist_cm??'—'} см</span><small>Грудь: ${m.chest_cm??'—'} • Бёдра: ${m.hips_cm??'—'} • Жир: ${m.body_fat_percent??'—'}%</small></div></article>`).join('')||'<article class="list-card"><div><b>Измерений пока нет</b><span>Добавь первое измерение.</span></div></article>'}</section><section class="section"><div class="section-title"><h2>Новое измерение</h2></div><div class="crm-form"><input class="text-input" id="mDate" type="date"/><div class="form-grid"><input class="text-input" id="mWeight" type="number" step="0.1" placeholder="Вес, кг"/><input class="text-input" id="mBodyFat" type="number" step="0.1" placeholder="Жир, %"/></div><div class="form-grid"><input class="text-input" id="mChest" type="number" step="0.1" placeholder="Грудь, см"/><input class="text-input" id="mWaist" type="number" step="0.1" placeholder="Талия, см"/></div><div class="form-grid"><input class="text-input" id="mHips" type="number" step="0.1" placeholder="Бёдра, см"/><input class="text-input" id="mArm" type="number" step="0.1" placeholder="Рука, см"/></div><div class="form-grid"><input class="text-input" id="mThigh" type="number" step="0.1" placeholder="Бедро, см"/><input class="text-input" id="mNotes" placeholder="Комментарий"/></div><button class="primary" data-save-measurement>Сохранить измерение</button></div></section>`;
  } else if(tab==='nutrition'){
    body=`<section class="section"><div class="section-title"><h2>Планы питания</h2></div>${selectedCrmNutrition.map(n=>`<article class="list-card"><div><b>${escapeHtml(n.name)}</b><span>${escapeHtml(n.status)} • ${n.calories??'—'} ккал • Б ${n.protein_g??'—'} / Ж ${n.fat_g??'—'} / У ${n.carbs_g??'—'}</span><small>${escapeHtml(n.instructions||'')}</small></div></article>`).join('')||'<article class="list-card"><div><b>Планов пока нет</b><span>Добавь первый план.</span></div></article>'}</section><section class="section"><div class="section-title"><h2>Новый план</h2></div><div class="crm-form"><input class="text-input" id="nName" placeholder="Название плана"/><input class="text-input" id="nGoal" placeholder="Цель"/><div class="form-grid"><input class="text-input" id="nCalories" type="number" placeholder="Ккал"/><input class="text-input" id="nProtein" type="number" placeholder="Белок, г"/></div><div class="form-grid"><input class="text-input" id="nFat" type="number" placeholder="Жиры, г"/><input class="text-input" id="nCarbs" type="number" placeholder="Углеводы, г"/></div><input class="text-input" id="nStart" type="date"/><input class="text-input" id="nEnd" type="date"/><input class="text-input" id="nInstructions" placeholder="Инструкции"/><button class="primary" data-save-nutrition>Сохранить план</button></div></section>`;
  } else if(tab==='payments'){
    body=`<section class="section"><div class="section-title"><h2>Оплаты</h2></div>${selectedCrmPayments.map(p=>`<article class="list-card"><div><b>${p.amount??0} ${escapeHtml(p.currency||'RUB')}</b><span>${escapeHtml(p.package_name||'Пакет не указан')} • использовано ${p.sessions_used||0}/${p.sessions_purchased||0}</span><small>${p.paid_at?new Date(p.paid_at).toLocaleDateString('ru-RU'):'—'}${p.comment?' • '+escapeHtml(p.comment):''}</small></div>${p.sessions_purchased?`<button class="small-primary" data-use-payment="${p.id}" data-used="${p.sessions_used||0}">+1 использовано</button>`:''}</article>`).join('')||'<article class="list-card"><div><b>Оплат пока нет</b><span>Добавь первую оплату.</span></div></article>'}</section><section class="section"><div class="section-title"><h2>Новая оплата</h2></div><div class="crm-form"><div class="form-grid"><input class="text-input" id="payAmount" type="number" step="0.01" placeholder="Сумма"/><input class="text-input" id="payCurrency" value="RUB" placeholder="Валюта"/></div><input class="text-input" id="payPackage" placeholder="Пакет / услуга"/><input class="text-input" id="paySessions" type="number" min="0" placeholder="Куплено тренировок"/><div class="form-grid"><input class="text-input" id="payStart" type="date"/><input class="text-input" id="payEnd" type="date"/></div><input class="text-input" id="payComment" placeholder="Комментарий"/><button class="primary" data-save-payment>Сохранить оплату</button></div></section>`;
  } else {
    body=`<section class="section"><div class="section-title"><h2>Заметки</h2></div>${selectedCrmNotes.map(n=>`<article class="list-card"><div><b>${n.created_at?new Date(n.created_at).toLocaleString('ru-RU'):'—'}</b><span>${escapeHtml(n.note||'')}</span></div></article>`).join('')||'<article class="list-card"><div><b>Заметок пока нет</b></div></article>'}</section><section class="section"><div class="crm-form"><textarea class="text-input" id="clientNote" rows="4" placeholder="Новая заметка о клиенте"></textarea><button class="primary" data-save-note>Добавить заметку</button></div></section>`;
  }
  content.innerHTML=`<button class="back-button" data-screen="clients">← Назад к клиентам</button><section class="profile-card"><div class="profile-avatar">👤</div><div><b>${escapeHtml(c.first_name)}${c.last_name?' '+escapeHtml(c.last_name):''}</b><span>${c.telegram_username?'@'+escapeHtml(c.telegram_username):'Telegram ID: '+c.telegram_id}</span><small>${escapeHtml(goalLabel(c.goal))} • ${escapeHtml(c.training_experience||'Опыт не указан')}</small></div></section><div class="crm-tabs">${tabs}</div><section class="stats crm-stats"><div><b>${c.active_program_count||0}</b><span>программ</span></div><div><b>${c.active_nutrition_plan_count||0}</b><span>планов питания</span></div><div><b>${c.sessions_remaining||0}</b><span>тренировок осталось</span></div></section>${body}`;
  const date=document.getElementById('progDate'); if(date&&!date.value)date.value=new Date().toISOString().slice(0,10); const md=document.getElementById('mDate'); if(md&&!md.value)md.value=new Date().toISOString().slice(0,10);
}
function progressionSparkline(history){
  if(!history?.length)return '';
  const values=history.map(x=>Number(x.weight_kg??x.estimated_1rm_kg??0)).filter(Number.isFinite);
  if(values.length<2)return '';
  const min=Math.min(...values),max=Math.max(...values),range=max-min||1;
  const points=values.map((v,i)=>`${(i/(values.length-1))*100},${34-((v-min)/range)*28}`).join(' ');
  return `<svg class="sparkline" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true"><polyline points="${points}" fill="none" stroke="currentColor" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>`;
}

function renderTrainerClientView(){
  const c=selectedCrmClient;
  const progression=selectedCrmProgression;
  const adjustment=selectedCrmAdjustment;
  content.innerHTML=`
  <button class="back-button" data-screen="clients">← Назад к клиентам</button>
  <section class="profile-card"><div class="profile-avatar">👤</div><div><b>${escapeHtml(c.first_name)}${c.last_name?' '+escapeHtml(c.last_name):''}</b><span>${c.telegram_username?'@'+escapeHtml(c.telegram_username):'Telegram ID: '+c.telegram_id}</span><small>${escapeHtml(goalLabel(c.goal))} • ${escapeHtml(c.training_experience||'Опыт не указан')}</small></div></section>

  <div class="crm-tabs"><button class="crm-tab" data-crm-tab="overview">Обзор</button><button class="crm-tab" data-crm-tab="programs">Программа</button><button class="crm-tab" data-crm-tab="progress">Прогресс</button><button class="crm-tab" data-crm-tab="measurements">Измерения</button><button class="crm-tab" data-crm-tab="nutrition">Питание</button><button class="crm-tab" data-crm-tab="payments">Оплаты</button><button class="crm-tab" data-crm-tab="notes">Заметки</button></div>
  <section class="stats crm-stats">
    <div><b>${c.active_program_count||0}</b><span>активных программ</span></div>
    <div><b>${c.active_nutrition_plan_count||0}</b><span>планов питания</span></div>
    <div><b>${c.sessions_remaining||0}</b><span>тренировок осталось</span></div>
  </section>

  <section class="section"><div class="section-title"><h2>Анализ результатов</h2></div>
    <article class="list-card adjustment-card"><div><b>${adjustment?.recommendation||'Недостаточно данных'}</b><span>${escapeHtml(adjustment?.reason||'Продолжай собирать историю тренировок и RPE.')}</span></div></article>
  </section>

  <section class="section"><div class="section-title"><h2>Программы</h2></div>
    <button class="primary" data-generate-program>⚡ Сгенерировать программу</button><div id="generatedProgram"></div>
    ${selectedCrmPrograms.length?selectedCrmPrograms.map(p=>`<article class="list-card"><div><b>${escapeHtml(p.name)}</b><span>v${p.version||1} • ${escapeHtml(p.status)} • ${p.starts_on||'без даты'}</span><small>${escapeHtml(p.goal||'Цель не указана')}</small></div></article>`).join(''):'<article class="list-card"><div><b>Программ пока нет</b><span>Создай программу из CRM на следующем шаге.</span></div></article>'}
  </section>

  <section class="section"><div class="section-title"><h2>Прогресс упражнений</h2></div>
    ${progression.length?progression.map(item=>`<article class="progress-card"><div class="progress-head"><div><b>${escapeHtml(item.exercise_name)}</b><span>Старт: ${item.start_kg??'—'} кг • Сейчас: ${item.current_kg??'—'} кг</span></div><strong class="${Number(item.change_kg)>=0?'progress-up':'progress-down'}">${Number(item.change_kg)>0?'+':''}${item.change_kg??0} кг</strong></div>${progressionSparkline(item.history)}<div class="history-mini">${(item.history||[]).slice(0,5).map(h=>`<span>${new Date(h.performed_at).toLocaleDateString('ru-RU')} • ${h.weight_kg??h.estimated_1rm_kg??'—'} кг${h.sets&&h.reps?' • '+h.sets+'×'+h.reps:''}</span>`).join('')}</div></article>`).join(''):'<article class="list-card"><div><b>Результатов пока нет</b><span>Добавь первый результат упражнения ниже.</span></div></article>'}
  </section>

  <section class="section"><div class="section-title"><h2>Добавить результат</h2></div>
    <div class="crm-form">
      <input class="text-input" id="progExerciseName" placeholder="Упражнение, например Жим лёжа"/>
      <div class="form-grid"><input class="text-input" id="progWeight" type="number" step="0.5" min="0" placeholder="Вес, кг"/><input class="text-input" id="prog1rm" type="number" step="0.5" min="0" placeholder="1ПМ, кг"/></div>
      <div class="form-grid"><input class="text-input" id="progSets" type="number" min="1" placeholder="Подходы"/><input class="text-input" id="progReps" type="number" min="1" placeholder="Повторы"/></div>
      <input class="text-input" id="progDate" type="date"/>
      <input class="text-input" id="progNotes" placeholder="Комментарий"/>
      <button class="primary" data-save-progression>Сохранить результат</button>
    </div>
  </section>
  `;
  const date=document.getElementById('progDate'); if(date&&!date.value)date.value=new Date().toISOString().slice(0,10);
}
content?.addEventListener('click',async event=>{const wBtn=event.target.closest('[data-workout]');if(wBtn){const w=workoutCatalog.find(x=>x.id===wBtn.dataset.workout);if(w)renderWorkoutDetail(w);return}const gBtn=event.target.closest('[data-goal]');if(gBtn&&fitLifeUser){try{fitLifeUser=(await api(`/api/users/${fitLifeUser.id}`,{method:'PATCH',body:JSON.stringify({goal:gBtn.dataset.goal,onboardingCompleted:true})})).user;render('home')}catch{tg?.showAlert?.('Не удалось сохранить данные.')}return}const cBtn=event.target.closest('[data-client]');if(cBtn){renderTrainerClient(cBtn.dataset.client);return}
if(event.target.closest('[data-crm-tab]')){selectedCrmTab=event.target.closest('[data-crm-tab]').dataset.crmTab;renderTrainerClientView();return}
if(event.target.closest('[data-generate-program]')){
 try{
  const result=await api(`/api/trainer/crm/clients/${selectedCrmClient.id}/programs/generate`,{method:'POST'});
  const draft=result.draft; window.__fitlifeDraft=draft;
  document.getElementById('generatedProgram').innerHTML=`<article class="generated-program"><b>${escapeHtml(draft.name)}</b><span>${escapeHtml(draft.rationale)}</span>${draft.days.map((day,di)=>`<div class="program-day"><b>День ${day.day_number}: ${escapeHtml(day.title)}</b>${day.exercises.map((e,ei)=>`<div class="program-exercise"><input class="text-input" data-draft-day="${di}" data-draft-ex="${ei}" data-field="name" value="${escapeHtml(e.exercise_name)}"/><div class="form-grid"><input class="text-input" data-draft-day="${di}" data-draft-ex="${ei}" data-field="sets" type="number" value="${e.sets}"/><input class="text-input" data-draft-day="${di}" data-draft-ex="${ei}" data-field="reps" value="${escapeHtml(e.reps)}"/></div><small>${e.rest_seconds} сек • ${escapeHtml(e.coach_comment)}</small></div>`).join('')}</div>`).join('')}<button class="primary" data-save-generated-program>Сохранить и активировать</button></article>`;
 }catch(error){console.error(error);tg?.showAlert?.('Не удалось сгенерировать программу.');}
 return;
}
if(event.target.closest('[data-save-generated-program]')){
 try{
  const draft=window.__fitlifeDraft;if(!draft)return;
  content.querySelectorAll('[data-draft-day]').forEach(input=>{const d=Number(input.dataset.draftDay),e=Number(input.dataset.draftEx),f=input.dataset.field;if(draft.days[d]?.exercises[e])draft.days[d].exercises[e][f]=f==='sets'?Number(input.value):input.value;});
  await api(`/api/trainer/crm/clients/${selectedCrmClient.id}/programs`,{method:'POST',body:JSON.stringify(draft)});
  tg?.showAlert?.('Программа сохранена и активирована 💪');window.__fitlifeDraft=null;await renderTrainerClient(selectedCrmClient.id);
 }catch(error){console.error(error);tg?.showAlert?.('Не удалось сохранить программу.');}
 return;
}
if(event.target.closest('[data-save-measurement]')){
  const num=id=>{const v=Number(document.getElementById(id)?.value);return Number.isFinite(v)?v:null};
  const body={measured_on:document.getElementById('mDate')?.value||new Date().toISOString().slice(0,10),body_weight_kg:num('mWeight'),body_fat_percent:num('mBodyFat'),chest_cm:num('mChest'),waist_cm:num('mWaist'),hips_cm:num('mHips'),arm_cm:num('mArm'),thigh_cm:num('mThigh'),notes:document.getElementById('mNotes')?.value?.trim()||null};
  try{await api(`/api/trainer/crm/clients/${selectedCrmClient.id}/measurements`,{method:'POST',body:JSON.stringify(body)});tg?.showAlert?.('Измерение сохранено 📏');await renderTrainerClient(selectedCrmClient.id);}catch(error){console.error(error);tg?.showAlert?.('Не удалось сохранить измерение.');} return;
}
if(event.target.closest('[data-save-nutrition]')){
  const body={name:document.getElementById('nName')?.value?.trim(),goal:document.getElementById('nGoal')?.value?.trim(),calories:Number(document.getElementById('nCalories')?.value)||null,protein_g:Number(document.getElementById('nProtein')?.value)||null,fat_g:Number(document.getElementById('nFat')?.value)||null,carbs_g:Number(document.getElementById('nCarbs')?.value)||null,starts_on:document.getElementById('nStart')?.value||null,ends_on:document.getElementById('nEnd')?.value||null,instructions:document.getElementById('nInstructions')?.value?.trim()||null};
  if(!body.name){tg?.showAlert?.('Укажи название плана.');return}
  try{await api(`/api/trainer/crm/clients/${selectedCrmClient.id}/nutrition`,{method:'POST',body:JSON.stringify(body)});tg?.showAlert?.('План питания сохранён 🥗');await renderTrainerClient(selectedCrmClient.id);}catch(error){console.error(error);tg?.showAlert?.('Не удалось сохранить план.');} return;
}
if(event.target.closest('[data-save-payment]')){
  const body={amount:Number(document.getElementById('payAmount')?.value)||0,currency:document.getElementById('payCurrency')?.value?.trim()||'RUB',package_name:document.getElementById('payPackage')?.value?.trim()||null,sessions_purchased:Number(document.getElementById('paySessions')?.value)||0,valid_from:document.getElementById('payStart')?.value||null,valid_until:document.getElementById('payEnd')?.value||null,comment:document.getElementById('payComment')?.value?.trim()||null};
  if(body.amount<=0){tg?.showAlert?.('Укажи сумму оплаты.');return}
  try{await api(`/api/trainer/crm/clients/${selectedCrmClient.id}/payments`,{method:'POST',body:JSON.stringify(body)});tg?.showAlert?.('Оплата сохранена 💳');await renderTrainerClient(selectedCrmClient.id);}catch(error){console.error(error);tg?.showAlert?.('Не удалось сохранить оплату.');} return;
}
if(event.target.closest('[data-use-payment]')){
  const btn=event.target.closest('[data-use-payment]'); const used=Number(btn.dataset.used)||0;
  try{await api(`/api/trainer/crm/clients/${selectedCrmClient.id}/payments/${btn.dataset.usePayment}/usage`,{method:'PATCH',body:JSON.stringify({sessions_used:used+1})});tg?.showAlert?.('Тренировка отмечена как использованная ✅');await renderTrainerClient(selectedCrmClient.id);}catch(error){console.error(error);tg?.showAlert?.('Не удалось обновить использование.');} return;
}
if(event.target.closest('[data-save-note]')){
  const note=document.getElementById('clientNote')?.value?.trim(); if(!note){tg?.showAlert?.('Напиши заметку.');return}
  try{await api(`/api/trainer/crm/clients/${selectedCrmClient.id}/notes`,{method:'POST',body:JSON.stringify({note})});tg?.showAlert?.('Заметка добавлена 📝');await renderTrainerClient(selectedCrmClient.id);}catch(error){console.error(error);tg?.showAlert?.('Не удалось добавить заметку.');} return;
}
if(event.target.closest('[data-save-progression]')){
  const body={
    exercise_name:document.getElementById('progExerciseName')?.value?.trim(),
    weight_kg:Number(document.getElementById('progWeight')?.value)||0,
    estimated_1rm_kg:Number(document.getElementById('prog1rm')?.value)||null,
    sets:Number(document.getElementById('progSets')?.value)||null,
    reps:Number(document.getElementById('progReps')?.value)||null,
    performed_at:document.getElementById('progDate')?.value?new Date(document.getElementById('progDate').value+'T12:00:00').toISOString():new Date().toISOString(),
    notes:document.getElementById('progNotes')?.value?.trim()||null
  };
  if(!body.exercise_name||!body.weight_kg){tg?.showAlert?.('Укажи упражнение и вес.');return}
  try{
    await api(`/api/trainer/crm/clients/${selectedCrmClient.id}/exercise-progression`,{method:'POST',body:JSON.stringify(body)});
    tg?.showAlert?.('Результат сохранён 💪');
    await renderTrainerClient(selectedCrmClient.id);
  }catch(error){console.error(error);tg?.showAlert?.('Не удалось сохранить результат.');}
  return;
}if(event.target.closest('[data-add-client]')){const input=document.getElementById('clientTelegramId');const clientId=Number(input?.value);if(!Number.isSafeInteger(clientId)){tg?.showAlert?.('Введи корректный Telegram ID.');return}try{await api('/api/trainer/clients/assign',{method:'POST',body:JSON.stringify({trainerId:fitLifeUser.id,clientId})});tg?.showAlert?.('Клиент добавлен 👥');await loadTrainerClients();render('clients')}catch{tg?.showAlert?.('Не удалось добавить клиента. Убедись, что он уже открыл FitLife.')}return}if(event.target.closest('[data-save-schedule]')){const items=[...content.querySelectorAll('[data-day]')].map(s=>({day:Number(s.dataset.day),workoutId:s.value||null}));try{const d=await api(`/api/trainer/${fitLifeUser.id}/clients/${selectedClient.id}/schedule`,{method:'PUT',body:JSON.stringify({schedule:items})});selectedClientSchedule=d.schedule;tg?.showAlert?.('Программа сохранена 💪')}catch{tg?.showAlert?.('Не удалось сохранить программу.')}return}const sBtn=event.target.closest('[data-screen]');if(sBtn)render(sBtn.dataset.screen)});
document.getElementById('profileButton')?.addEventListener('click',()=>render('profile'));document.querySelectorAll('.bottom-nav button').forEach(b=>b.addEventListener('click',()=>render(b.dataset.screen)));
async function boot(){try{fitLifeUser=await authenticate();await Promise.all([loadWorkouts(),loadSchedule(),fitLifeUser?.role==='client'?loadClientSchedule():loadTrainerClients()]);if(!fitLifeUser?.onboardingCompleted)render('onboarding');else render('home')}catch(error){console.error(error);tg?.showAlert?.('Не удалось подключиться к FitLife.');render('home')}}
render('home');boot();
