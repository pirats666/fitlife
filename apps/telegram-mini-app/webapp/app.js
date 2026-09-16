const tg = window.Telegram?.WebApp;
const API_BASE = window.FITLIFE_API_BASE || '';

if (tg) {
  tg.ready();
  tg.expand();
  tg.setHeaderColor?.('#0b0d0f');
  tg.setBackgroundColor?.('#0b0d0f');
}

const telegramUser = tg?.initDataUnsafe?.user;
const app = document.getElementById('app');
const content = document.getElementById('screenContent');
const title = document.getElementById('screenTitle');
const subtitle = document.getElementById('screenSubtitle');

let fitLifeUser = null;

async function authenticate() {
  if (!tg?.initData) return null;

  const response = await fetch(`${API_BASE}/api/auth/telegram`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initData: tg.initData })
  });

  if (!response.ok) throw new Error('Не удалось авторизоваться');
  const data = await response.json();
  if (!data.ok) throw new Error(data.error || 'Ошибка авторизации');
  return data.user;
}

const screens = {
  home: {
    title: () => `Привет, ${fitLifeUser?.first_name || telegramUser?.first_name || ''} 👋`,
    subtitle: 'Твой путь к системному результату',
    html: () => `
      <section class="hero-card">
        <span>СЕГОДНЯ</span>
        <h2>Твоя тренировка</h2>
        <p>Последовательность важнее идеального дня.</p>
        <button class="primary" data-action="workout">Начать тренировку</button>
      </section>
      <section class="section">
        <div class="section-title"><h2>Разделы</h2></div>
        <div class="grid">
          <button class="tile" data-screen="workouts"><strong>💪</strong><span>Тренировки</span></button>
          <button class="tile" data-screen="schedule"><strong>📅</strong><span>Расписание</span></button>
          <button class="tile" data-screen="progress"><strong>📈</strong><span>Прогресс</span></button>
          <button class="tile" data-screen="nutrition"><strong>🥗</strong><span>Питание</span></button>
        </div>
      </section>`
  },
  workouts: {
    title: () => 'Тренировки', subtitle: 'Твоя программа на сегодня',
    html: () => `<section class="list-card"><div><b>Тренировка №1</b><span>Ноги • грудь • плечи • кор</span></div><button class="small-primary">Открыть</button></section><section class="list-card"><div><b>История</b><span>Здесь появятся завершённые тренировки</span></div></section>`
  },
  schedule: {
    title: () => 'Расписание', subtitle: 'План тренировок',
    html: () => `<section class="list-card"><div><b>Сегодня</b><span>Тренировка запланирована</span></div><span class="status">Запланировано</span></section><section class="list-card"><div><b>Следующая тренировка</b><span>Календарь подключим следующим этапом</span></div></section>`
  },
  progress: {
    title: () => 'Прогресс', subtitle: 'Отслеживай изменения',
    html: () => `<section class="stats"><div><b>0</b><span>тренировок</span></div><div><b>0</b><span>недель</span></div><div><b>0%</b><span>выполнения</span></div></section><section class="list-card"><div><b>Замеры</b><span>Показатели подключим далее.</span></div></section>`
  },
  nutrition: {
    title: () => 'Питание', subtitle: 'Основы питания без перегруза',
    html: () => `<section class="list-card"><div><b>Питание</b><span>Персональные рекомендации подключим следующим этапом.</span></div></section>`
  },
  profile: {
    title: () => 'Профиль', subtitle: 'Твои данные',
    html: () => `<section class="profile-card"><div class="profile-avatar">👤</div><div><b>${fitLifeUser?.first_name || telegramUser?.first_name || 'Пользователь'}</b><span>${fitLifeUser?.username ? '@' + fitLifeUser.username : 'Telegram-профиль'}</span></div></section><section class="list-card"><div><b>Цель</b><span>${fitLifeUser?.goal || 'Не выбрана'}</span></div></section>`
  }
};

function render(screen = 'home') {
  const data = screens[screen] || screens.home;
  title.textContent = typeof data.title === 'function' ? data.title() : data.title;
  subtitle.textContent = typeof data.subtitle === 'function' ? data.subtitle() : data.subtitle;
  content.innerHTML = typeof data.html === 'function' ? data.html() : data.html;

  document.querySelectorAll('[data-screen]').forEach((el) => {
    el.addEventListener('click', () => render(el.dataset.screen));
  });
  document.querySelectorAll('.bottom-nav button').forEach((el) => {
    el.classList.toggle('active', el.dataset.screen === screen);
  });
  document.querySelector('[data-action="workout"]')?.addEventListener('click', () => render('workouts'));
}

content?.addEventListener('click', (event) => {
  if (event.target.closest('.small-primary')) tg?.showAlert?.('Экран тренировки подключим следующим этапом.');
});

document.getElementById('profileButton')?.addEventListener('click', () => render('profile'));

async function boot() {
  try {
    fitLifeUser = await authenticate();
    if (!fitLifeUser?.onboardingCompleted) {
      render('onboarding');
      return;
    }
    render('home');
  } catch (error) {
    console.error(error);
    tg?.showAlert?.('Не удалось подключиться к FitLife. Проверьте сервер приложения.');
    render('home');
  }
}

screens.onboarding = {
  title: () => 'Добро пожаловать', subtitle: 'Настроим FitLife под тебя',
  html: () => `<section class="hero-card"><span>ПЕРВЫЙ ШАГ</span><h2>Выбери цель</h2><p>Это поможет настроить будущие тренировки.</p><div class="goal-list"><button class="goal" data-goal="health">🏃 <span>Здоровье и активность</span></button><button class="goal" data-goal="strength">💪 <span>Сила</span></button><button class="goal" data-goal="fitness">🔥 <span>Общая физическая форма</span></button></div></section>`
};

content?.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-goal]');
  if (!button || !fitLifeUser) return;
  const goal = button.dataset.goal;
  try {
    const response = await fetch(`${API_BASE}/api/users/${fitLifeUser.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goal, onboardingCompleted: true })
    });
    if (!response.ok) throw new Error('Не удалось сохранить цель');
    const data = await response.json();
    fitLifeUser = data.user;
    render('home');
  } catch (error) {
    console.error(error);
    tg?.showAlert?.('Не удалось сохранить данные. Попробуй ещё раз.');
  }
});

render('home');
boot();
