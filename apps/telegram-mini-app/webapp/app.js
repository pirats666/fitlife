const tg = window.Telegram?.WebApp;
const API_BASE = window.FITLIFE_API_BASE || '';

if (tg) { tg.ready(); tg.expand(); tg.setHeaderColor?.('#0b0d0f'); tg.setBackgroundColor?.('#0b0d0f'); }

const telegramUser = tg?.initDataUnsafe?.user;
const content = document.getElementById('screenContent');
const title = document.getElementById('screenTitle');
const subtitle = document.getElementById('screenSubtitle');
let fitLifeUser = null;
let workoutCatalog = [];
let activeWorkout = null;
let activeExerciseIndex = 0;
let timer = null;
let remaining = 0;
let weeklySchedule = [];

async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, { headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options });
  const data = await response.json();
  if (!response.ok || !data.ok) throw new Error(data.error || 'Ошибка запроса');
  return data;
}

async function authenticate() {
  if (!tg?.initData) return null;
  return (await api('/api/auth/telegram', { method: 'POST', body: JSON.stringify({ initData: tg.initData }) })).user;
}

async function loadWorkouts() { workoutCatalog = (await api('/api/workouts')).workouts; }
async function loadSchedule() { weeklySchedule = (await api('/api/schedule')).schedule; }

const screens = {
  home: { title: () => `Привет, ${fitLifeUser?.first_name || telegramUser?.first_name || ''} 👋`, subtitle: 'Твой путь к системному результату', html: () => `<section class="hero-card"><span>СЕГОДНЯ</span><h2>Твоя тренировка</h2><p>Последовательность важнее идеального дня.</p><button class="primary" data-action="workout">Начать тренировку</button></section><section class="section"><div class="section-title"><h2>Разделы</h2></div><div class="grid"><button class="tile" data-screen="workouts"><strong>💪</strong><span>Тренировки</span></button><button class="tile" data-screen="schedule"><strong>📅</strong><span>Расписание</span></button><button class="tile" data-screen="progress"><strong>📈</strong><span>Прогресс</span></button><button class="tile" data-screen="nutrition"><strong>🥗</strong><span>Питание</span></button></div></section>` },
  workouts: { title: () => 'Тренировки', subtitle: 'Программы с собственным весом', html: () => `<section class="section"><div class="section-title"><h2>Доступно сейчас</h2></div>${workoutCatalog.map(w => `<article class="list-card"><div><b>${w.title}</b><span>${w.durationMinutes} мин • ${w.exercises.length} упражнений</span><small>${w.description}</small></div><button class="small-primary" data-workout="${w.id}">Открыть</button></article>`).join('')}</section>` },
  schedule: { title: () => 'Расписание', subtitle: 'План тренировок', html: () => `<section class="section"><div class="section-title"><h2>Эта неделя</h2></div>${weeklySchedule.map(day => { const workout = workoutCatalog.find(w => w.id === day.workoutId); return `<article class="list-card"><div><b>${day.label}</b><span>${workout ? workout.title : 'День восстановления'}</span></div>${workout ? `<button class="small-primary" data-workout="${workout.id}">Открыть</button>` : '<span class="status">Отдых</span>'}</article>`; }).join('')}</section>` },
  progress: { title: () => 'Прогресс', subtitle: 'История твоих тренировок', html: () => `<section class="stats"><div><b id="workoutCount">—</b><span>тренировок</span></div><div><b id="weekCount">—</b><span>на этой неделе</span></div><div><b>✓</b><span>последняя</span></div></section><section class="list-card"><div><b>История</b><span id="historyText">Загрузка…</span></div></section>` },
  nutrition: { title: () => 'Питание', subtitle: 'Основы питания без перегруза', html: () => `<section class="list-card"><div><b>Питание</b><span>Персональные рекомендации подключим следующим этапом.</span></div></section>` },
  profile: { title: () => 'Профиль', subtitle: 'Твои данные', html: () => `<section class="profile-card"><div class="profile-avatar">👤</div><div><b>${fitLifeUser?.first_name || 'Пользователь'}</b><span>${fitLifeUser?.username ? '@' + fitLifeUser.username : 'Telegram-профиль'}</span></div></section><section class="list-card"><div><b>Цель</b><span>${fitLifeUser?.goal || 'Не выбрана'}</span></div></section>` },
  onboarding: { title: () => 'Добро пожаловать', subtitle: 'Настроим FitLife под тебя', html: () => `<section class="hero-card"><span>ПЕРВЫЙ ШАГ</span><h2>Выбери цель</h2><p>Это поможет настроить будущие тренировки.</p><div class="goal-list"><button class="goal" data-goal="health">🏃 <span>Здоровье и активность</span></button><button class="goal" data-goal="strength">💪 <span>Сила</span></button><button class="goal" data-goal="fitness">🔥 <span>Общая физическая форма</span></button></div></section>` }
};

function render(screen = 'home') {
  const data = screens[screen] || screens.home;
  title.textContent = data.title(); subtitle.textContent = data.subtitle(); content.innerHTML = data.html();
  document.querySelectorAll('[data-screen]').forEach(el => el.addEventListener('click', () => render(el.dataset.screen)));
  document.querySelectorAll('.bottom-nav button').forEach(el => el.classList.toggle('active', el.dataset.screen === screen));
  document.querySelector('[data-action="workout"]')?.addEventListener('click', () => render('workouts'));
  if (screen === 'progress') loadHistory();
  if (screen === 'schedule' && !weeklySchedule.length) loadSchedule().then(() => render('schedule')).catch(() => {});
}

function renderWorkoutDetail(workout) {
  activeWorkout = workout; activeExerciseIndex = 0; clearInterval(timer);
  title.textContent = workout.title; subtitle.textContent = `${workout.durationMinutes} мин • собственный вес`;
  content.innerHTML = `<section class="hero-card"><span>ТРЕНИРОВКА</span><h2>${workout.title}</h2><p>${workout.description}</p><button class="primary" data-start-workout>Начать</button></section><section class="section"><div class="section-title"><h2>Упражнения</h2></div>${workout.exercises.map((e,i)=>`<article class="list-card"><div><b>${i+1}. ${e.name}</b><span>${e.target} • ${e.mode === 'reps' ? e.value + ' повторений' : e.value + ' сек'}</span></div></article>`).join('')}</section>`;
  content.querySelector('[data-start-workout]').addEventListener('click', () => renderExercise());
}

function renderExercise() {
  const e = activeWorkout.exercises[activeExerciseIndex];
  clearInterval(timer); remaining = e.value;
  title.textContent = `Упражнение ${activeExerciseIndex + 1}/${activeWorkout.exercises.length}`; subtitle.textContent = activeWorkout.title;
  content.innerHTML = `<section class="hero-card"><span>${e.target.toUpperCase()}</span><h2>${e.name}</h2><div class="timer" id="exerciseTimer">${e.mode === 'reps' ? e.value : e.value + 'с'}</div><p>${e.instructions}</p><button class="primary" data-next-exercise>${activeExerciseIndex === activeWorkout.exercises.length - 1 ? 'Завершить' : 'Следующее'}</button></section>`;
  if (e.mode === 'seconds') timer = setInterval(() => { remaining--; const node = document.getElementById('exerciseTimer'); if (node) node.textContent = `${Math.max(remaining, 0)}с`; if (remaining <= 0) clearInterval(timer); }, 1000);
  content.querySelector('[data-next-exercise]').addEventListener('click', () => { if (activeExerciseIndex === activeWorkout.exercises.length - 1) finishWorkout(); else { activeExerciseIndex++; renderExercise(); } });
}

async function finishWorkout() {
  clearInterval(timer);
  try { await api(`/api/users/${fitLifeUser.id}/workouts/${activeWorkout.id}/complete`, { method: 'POST' }); tg?.showAlert?.('Тренировка завершена! Отличная работа 💪'); render('progress'); }
  catch (e) { console.error(e); tg?.showAlert?.('Не удалось сохранить тренировку.'); render('home'); }
}

async function loadHistory() {
  if (!fitLifeUser) return;
  try {
    const [historyData, progressData] = await Promise.all([
      api(`/api/users/${fitLifeUser.id}/workouts/history`),
      api(`/api/users/${fitLifeUser.id}/progress`)
    ]);
    document.getElementById('workoutCount').textContent = progressData.progress.totalWorkouts;
    document.getElementById('weekCount').textContent = progressData.progress.completedThisWeek;
    const history = historyData.history;
    document.getElementById('historyText').textContent = history.length ? `Последняя тренировка: ${new Date(history[0].completedAt).toLocaleString('ru-RU')}` : 'Пока нет завершённых тренировок';
  } catch { document.getElementById('historyText').textContent = 'История пока недоступна'; }
}

content?.addEventListener('click', async event => {
  const workoutButton = event.target.closest('[data-workout]');
  if (workoutButton) { const workout = workoutCatalog.find(w => w.id === workoutButton.dataset.workout); if (workout) renderWorkoutDetail(workout); return; }
  const goalButton = event.target.closest('[data-goal]');
  if (!goalButton || !fitLifeUser) return;
  try { fitLifeUser = (await api(`/api/users/${fitLifeUser.id}`, { method: 'PATCH', body: JSON.stringify({ goal: goalButton.dataset.goal, onboardingCompleted: true }) })).user; render('home'); }
  catch { tg?.showAlert?.('Не удалось сохранить данные.'); }
});

document.getElementById('profileButton')?.addEventListener('click', () => render('profile'));

document.querySelectorAll('.bottom-nav button').forEach(button => button.addEventListener('click', () => render(button.dataset.screen)));

async function boot() {
  try { fitLifeUser = await authenticate(); await Promise.all([loadWorkouts(), loadSchedule()]); if (!fitLifeUser?.onboardingCompleted) render('onboarding'); else render('home'); }
  catch (error) { console.error(error); tg?.showAlert?.('Не удалось подключиться к FitLife.'); render('home'); }
}
render('home');
boot();
