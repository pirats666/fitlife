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
let clientSchedule = [];
let trainerClients = [];
let selectedClient = null;
let selectedClientSchedule = [];
let selectedClientHistory = [];

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(tg?.initData ? { 'x-telegram-init-data': tg.initData } : {}), ...(options.headers || {}) };
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
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
async function loadClientSchedule() { if (fitLifeUser) clientSchedule = (await api(`/api/users/${fitLifeUser.id}/schedule`)).schedule; }
async function loadTrainerClients() { if (fitLifeUser?.role === 'trainer') trainerClients = (await api(`/api/trainer/clients?trainerId=${fitLifeUser.id}`)).clients; }

const screens = {
  home: { title: () => `Привет, ${fitLifeUser?.first_name || telegramUser?.first_name || ''} 👋`, subtitle: () => fitLifeUser?.role === 'trainer' ? 'Кабинет тренера FitLife' : 'Твой путь к системному результату', html: () => `<section class="hero-card"><span>СЕГОДНЯ</span><h2>${todayWorkout() ? todayWorkout().title : 'День восстановления'}</h2><p>${todayWorkout() ? 'Твоя тренировка уже в расписании.' : 'Сегодня можно восстановиться и подготовиться к следующей тренировке.'}</p>${todayWorkout() ? `<button class="primary" data-workout="${todayWorkout().id}">Начать тренировку</button>` : ''}</section><section class="section"><div class="section-title"><h2>Разделы</h2></div><div class="grid"><button class="tile" data-screen="workouts"><strong>💪</strong><span>Тренировки</span></button><button class="tile" data-screen="schedule"><strong>📅</strong><span>Расписание</span></button><button class="tile" data-screen="progress"><strong>📈</strong><span>Прогресс</span></button><button class="tile" data-screen="profile"><strong>👤</strong><span>Профиль</span></button>${fitLifeUser?.role === 'trainer' ? '<button class="tile" data-screen="clients"><strong>👥</strong><span>Клиенты</span></button>' : '<button class="tile" data-screen="trainer"><strong>🏋️</strong><span>Мой тренер</span></button>'}</div></section>` },
  workouts: { title: () => 'Тренировки', subtitle: () => 'Программы с собственным весом', html: () => `<section class="section"><div class="section-title"><h2>Доступно сейчас</h2></div>${workoutCatalog.map(w => `<article class="list-card"><div><b>${w.title}</b><span>${w.durationMinutes} мин • ${w.exercises.length} упражнений</span><small>${w.description}</small></div><button class="small-primary" data-workout="${w.id}">Открыть</button></article>`).join('')}</section>` },
  schedule: { title: () => 'Расписание', subtitle: () => 'Твой план тренировок', html: () => `<section class="section"><div class="section-title"><h2>Эта неделя</h2></div>${(fitLifeUser?.role === 'client' ? clientSchedule : weeklySchedule).map(day => { const workout = workoutCatalog.find(w => w.id === day.workoutId); return `<article class="list-card"><div><b>${day.label}</b><span>${workout ? workout.title : 'День восстановления'}</span></div>${workout ? `<button class="small-primary" data-workout="${workout.id}">Открыть</button>` : '<span class="status">Отдых</span>'}</article>`; }).join('')}</section>` },
  progress: { title: () => 'Прогресс', subtitle: () => 'История твоих тренировок', html: () => `<section class="stats"><div><b id="workoutCount">—</b><span>тренировок</span></div><div><b id="weekCount">—</b><span>на этой неделе</span></div><div><b>✓</b><span>последняя</span></div></section><section class="list-card"><div><b>История</b><span id="historyText">Загрузка…</span></div></section>` },
  nutrition: { title: () => 'Питание', subtitle: () => 'Основы питания без перегруза', html: () => `<section class="list-card"><div><b>Питание</b><span>Персональные рекомендации подключим следующим этапом.</span></div></section>` },
  profile: { title: () => 'Профиль', subtitle: () => 'Твои данные', html: () => `<section class="profile-card"><div class="profile-avatar">👤</div><div><b>${fitLifeUser?.first_name || 'Пользователь'}</b><span>${fitLifeUser?.username ? '@' + fitLifeUser.username : 'Telegram-профиль'}</span></div></section><section class="list-card"><div><b>Цель</b><span>${goalLabel(fitLifeUser?.goal)}</span></div></section>` },
  trainer: { title: () => 'Мой тренер', subtitle: () => 'Связь с тренером', html: () => `<section class="list-card"><div><b>Загрузка…</b><span>Проверяем назначение тренера.</span></div></section>` },
  clients: { title: () => 'Клиенты', subtitle: () => 'Управление клиентами', html: () => `<section class="section"><div class="section-title"><h2>Мои клиенты</h2></div>${trainerClients.length ? trainerClients.map(c => `<article class="client-card"><div><b>${escapeHtml(c.first_name)}${c.last_name ? ' ' + escapeHtml(c.last_name) : ''}</b><span>${c.username ? '@' + escapeHtml(c.username) : 'Telegram ID: ' + c.id}</span><small>Цель: ${goalLabel(c.goal)}</small></div><button class="small-primary" data-client="${c.id}">Открыть</button></article>`).join('') : '<section class="list-card"><div><b>Клиентов пока нет</b><span>Сначала клиент должен открыть FitLife и пройти авторизацию.</span></div></section>'}</section><section class="section"><div class="section-title"><h2>Добавить клиента</h2></div><div class="form-row"><input class="text-input" id="clientTelegramId" inputmode="numeric" placeholder="Telegram ID" /><button class="small-primary" data-add-client>Добавить</button></div></section>` },
  onboarding: { title: () => 'Добро пожаловать', subtitle: () => 'Настроим FitLife под тебя', html: () => `<section class="hero-card"><span>ПЕРВЫЙ ШАГ</span><h2>Выбери цель</h2><p>Это поможет настроить будущие тренировки.</p><div class="goal-list"><button class="goal" data-goal="health">🏃 <span>Здоровье и активность</span></button><button class="goal" data-goal="strength">💪 <span>Сила</span></button><button class="goal" data-goal="fitness">🔥 <span>Общая физическая форма</span></button></div></section>` }
};

function escapeHtml(value = '') { return String(value).replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char])); }
function goalLabel(goal) { return ({ health: 'Здоровье и активность', strength: 'Сила', fitness: 'Общая физическая форма' }[goal] || 'Не выбрана'); }
function todayWorkout() { const day = new Date().getDay() || 7; const source = fitLifeUser?.role === 'client' ? clientSchedule : weeklySchedule; return workoutCatalog.find(w => w.id === source.find(item => item.day === day)?.workoutId) || null; }

function render(screen = 'home') {
  const data = screens[screen] || screens.home;
  title.textContent = data.title(); subtitle.textContent = data.subtitle(); content.innerHTML = data.html();
  document.querySelectorAll('[data-screen]').forEach(el => el.addEventListener('click', () => render(el.dataset.screen)));
  document.querySelectorAll('.bottom-nav button').forEach(el => el.classList.toggle('active', el.dataset.screen === screen));
  if (screen === 'progress') loadHistory();
  if (screen === 'trainer') loadTrainerProfile();
  if (screen === 'clients') loadTrainerClients().then(() => render('clients')).catch(() => {});
  if (screen === 'schedule' && fitLifeUser?.role === 'client') loadClientSchedule().then(() => render('schedule')).catch(() => {});
}

function renderWorkoutDetail(workout) {
  activeWorkout = workout; activeExerciseIndex = 0; clearInterval(timer);
  title.textContent = workout.title; subtitle.textContent = `${workout.durationMinutes} мин • собственный вес`;
  content.innerHTML = `<section class="hero-card"><span>ТРЕНИРОВКА</span><h2>${workout.title}</h2><p>${workout.description}</p><button class="primary" data-start-workout>Начать</button></section><section class="section"><div class="section-title"><h2>Упражнения</h2></div>${workout.exercises.map((e,i)=>`<article class="list-card"><div><b>${i+1}. ${e.name}</b><span>${e.target} • ${e.mode === 'reps' ? e.value + ' повторений' : e.value + ' сек'}</span></div></article>`).join('')}</section>`;
  content.querySelector('[data-start-workout]').addEventListener('click', () => renderExercise());
}
function renderExercise() {
  const e = activeWorkout.exercises[activeExerciseIndex]; clearInterval(timer); remaining = e.value;
  title.textContent = `Упражнение ${activeExerciseIndex + 1}/${activeWorkout.exercises.length}`; subtitle.textContent = activeWorkout.title;
  content.innerHTML = `<section class="hero-card"><span>${e.target.toUpperCase()}</span><h2>${e.name}</h2><div class="timer" id="exerciseTimer">${e.mode === 'reps' ? e.value : e.value + 'с'}</div><p>${e.instructions}</p><button class="primary" data-next-exercise>${activeExerciseIndex === activeWorkout.exercises.length - 1 ? 'Завершить' : 'Следующее'}</button></section>`;
  if (e.mode === 'seconds') timer = setInterval(() => { remaining--; const node = document.getElementById('exerciseTimer'); if (node) node.textContent = `${Math.max(remaining, 0)}с`; if (remaining <= 0) clearInterval(timer); }, 1000);
  content.querySelector('[data-next-exercise]').addEventListener('click', () => { if (activeExerciseIndex === activeWorkout.exercises.length - 1) finishWorkout(); else { activeExerciseIndex++; renderExercise(); } });
}
async function finishWorkout() { clearInterval(timer); try { await api(`/api/users/${fitLifeUser.id}/workouts/${activeWorkout.id}/complete`, { method: 'POST' }); tg?.showAlert?.('Тренировка завершена! Отличная работа 💪'); render('progress'); } catch (e) { console.error(e); tg?.showAlert?.('Не удалось сохранить тренировку.'); render('home'); } }
async function loadHistory() {
  if (!fitLifeUser) return;
  try { const [historyData, progressData] = await Promise.all([api(`/api/users/${fitLifeUser.id}/workouts/history`), api(`/api/users/${fitLifeUser.id}/progress`)]); document.getElementById('workoutCount').textContent = progressData.progress.totalWorkouts; document.getElementById('weekCount').textContent = progressData.progress.completedThisWeek; const history = historyData.history; document.getElementById('historyText').textContent = history.length ? `Последняя тренировка: ${new Date(history[0].completedAt).toLocaleString('ru-RU')}` : 'Пока нет завершённых тренировок'; } catch { document.getElementById('historyText').textContent = 'История пока недоступна'; }
}
async function loadTrainerProfile() {
  try { const data = await api(`/api/users/${fitLifeUser.id}/trainer`); const trainer = data.trainer; content.innerHTML = trainer ? `<section class="profile-card"><div class="profile-avatar">🏋️</div><div><b>${escapeHtml(trainer.first_name)}${trainer.last_name ? ' ' + escapeHtml(trainer.last_name) : ''}</b><span>${trainer.username ? '@' + escapeHtml(trainer.username) : 'Твой тренер'}</span></div></section>` : '<section class="list-card"><div><b>Тренер пока не назначен</b><span>Когда тренер подключит тебя к FitLife, он появится здесь.</span></div></section>'; } catch { content.innerHTML = '<section class="list-card"><div><b>Не удалось загрузить</b><span>Попробуй ещё раз.</span></div></section>'; }
}
async function renderTrainerClient(clientId) {
  try { const [progress, schedule] = await Promise.all([api(`/api/trainer/${fitLifeUser.id}/clients/${clientId}/progress`), api(`/api/trainer/${fitLifeUser.id}/clients/${clientId}/schedule`)]); selectedClient = progress.client; selectedClientHistory = progress.history; selectedClientSchedule = schedule.schedule; title.textContent = selectedClient.first_name; subtitle.textContent = 'Клиент'; renderTrainerClientView(); } catch { tg?.showAlert?.('Не удалось открыть клиента.'); render('clients'); }
}
function renderTrainerClientView() {
  content.innerHTML = `<button class="back-button" data-screen="clients">← Назад к клиентам</button><section class="profile-card"><div class="profile-avatar">👤</div><div><b>${escapeHtml(selectedClient.first_name)}${selectedClient.last_name ? ' ' + escapeHtml(selectedClient.last_name) : ''}</b><span>${selectedClient.username ? '@' + escapeHtml(selectedClient.username) : 'Telegram ID: ' + selectedClient.id}</span><small>Цель: ${goalLabel(selectedClient.goal)}</small></div></section><section class="section"><div class="section-title"><h2>Расписание</h2></div><div class="schedule-editor">${selectedClientSchedule.map(day => `<label class="schedule-row"><span>${day.label}</span><select class="select" data-day="${day.day}"><option value="">— отдых —</option>${workoutCatalog.map(w => `<option value="${w.id}" ${w.id === day.workoutId ? 'selected' : ''}>${escapeHtml(w.title)}</option>`).join('')}</select></label>`).join('')}</div><button class="primary" data-save-schedule>Сохранить программу</button></section><section class="section"><div class="section-title"><h2>История</h2></div>${selectedClientHistory.length ? selectedClientHistory.slice(0,10).map(item => `<article class="list-card"><div><b>${escapeHtml(workoutCatalog.find(w => w.id === item.workoutId)?.title || item.workoutId)}</b><span>${new Date(item.completedAt).toLocaleString('ru-RU')}</span></div></article>`).join('') : '<section class="list-card"><div><b>Пока нет завершённых тренировок</b></div></section>'}</section>`;
}

content?.addEventListener('click', async event => {
  const workoutButton = event.target.closest('[data-workout]'); if (workoutButton) { const workout = workoutCatalog.find(w => w.id === workoutButton.dataset.workout); if (workout) renderWorkoutDetail(workout); return; }
  const goalButton = event.target.closest('[data-goal]'); if (goalButton && fitLifeUser) { try { fitLifeUser = (await api(`/api/users/${fitLifeUser.id}`, { method: 'PATCH', body: JSON.stringify({ goal: goalButton.dataset.goal, onboardingCompleted: true }) })).user; render('home'); } catch { tg?.showAlert?.('Не удалось сохранить данные.'); } return; }
  const clientButton = event.target.closest('[data-client]'); if (clientButton) { renderTrainerClient(Number(clientButton.dataset.client)); return; }
  if (event.target.closest('[data-add-client]')) { const input = document.getElementById('clientTelegramId'); const clientId = Number(input?.value); if (!Number.isSafeInteger(clientId)) { tg?.showAlert?.('Введи корректный Telegram ID.'); return; } try { await api('/api/trainer/clients/assign', { method: 'POST', body: JSON.stringify({ trainerId: fitLifeUser.id, clientId }) }); tg?.showAlert?.('Клиент добавлен 👥'); await loadTrainerClients(); render('clients'); } catch { tg?.showAlert?.('Не удалось добавить клиента. Убедись, что он уже открыл FitLife.'); } return; }
  if (event.target.closest('[data-save-schedule]')) { const items = [...content.querySelectorAll('[data-day]')].map(select => ({ day: Number(select.dataset.day), workoutId: select.value || null })); try { const data = await api(`/api/trainer/${fitLifeUser.id}/clients/${selectedClient.id}/schedule`, { method: 'PUT', body: JSON.stringify({ schedule: items }) }); selectedClientSchedule = data.schedule; tg?.showAlert?.('Программа сохранена 💪'); } catch { tg?.showAlert?.('Не удалось сохранить программу.'); } return; }
  const screenButton = event.target.closest('[data-screen]'); if (screenButton) render(screenButton.dataset.screen);
});

document.getElementById('profileButton')?.addEventListener('click', () => render('profile'));
document.querySelectorAll('.bottom-nav button').forEach(button => button.addEventListener('click', () => render(button.dataset.screen)));

async function boot() {
  try { fitLifeUser = await authenticate(); await Promise.all([loadWorkouts(), loadSchedule(), fitLifeUser?.role === 'client' ? loadClientSchedule() : loadTrainerClients()]); if (!fitLifeUser?.onboardingCompleted) render('onboarding'); else render('home'); }
  catch (error) { console.error(error); tg?.showAlert?.('Не удалось подключиться к FitLife.'); render('home'); }
}
render('home'); boot();
