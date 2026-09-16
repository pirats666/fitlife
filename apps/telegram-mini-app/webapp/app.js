const tg = window.Telegram?.WebApp;

if (tg) {
  tg.ready();
  tg.expand();
  tg.setHeaderColor?.('#0b0d0f');
  tg.setBackgroundColor?.('#0b0d0f');
}

const user = tg?.initDataUnsafe?.user;
const app = document.getElementById('app');
const content = document.getElementById('screenContent');
const title = document.getElementById('screenTitle');
const subtitle = document.getElementById('screenSubtitle');

const screens = {
  home: {
    title: user ? `Привет, ${user.first_name} 👋` : 'Привет 👋',
    subtitle: 'Твой путь к системному результату',
    html: `
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
    title: 'Тренировки',
    subtitle: 'Твоя программа на сегодня',
    html: `<section class="list-card"><div><b>Тренировка №1</b><span>Ноги • грудь • плечи • кор</span></div><button class="small-primary">Открыть</button></section><section class="list-card"><div><b>История</b><span>Здесь появятся завершённые тренировки</span></div></section>`
  },
  schedule: {
    title: 'Расписание',
    subtitle: 'План тренировок',
    html: `<section class="list-card"><div><b>Сегодня</b><span>Тренировка запланирована</span></div><span class="status">Запланировано</span></section><section class="list-card"><div><b>Следующая тренировка</b><span>Добавим календарь на следующем этапе</span></div></section>`
  },
  progress: {
    title: 'Прогресс',
    subtitle: 'Отслеживай изменения',
    html: `<section class="stats"><div><b>0</b><span>тренировок</span></div><div><b>0</b><span>недель</span></div><div><b>0%</b><span>выполнения</span></div></section><section class="list-card"><div><b>Замеры</b><span>Вес, талия и другие показатели подключим далее.</span></div></section>`
  },
  nutrition: {
    title: 'Питание',
    subtitle: 'Основы питания без перегруза',
    html: `<section class="list-card"><div><b>Питание</b><span>Персональные рекомендации и дневник питания подключим следующим этапом.</span></div></section>`
  },
  profile: {
    title: 'Профиль',
    subtitle: 'Твои данные',
    html: `<section class="profile-card"><div class="profile-avatar">👤</div><div><b>${user?.first_name || 'Пользователь'}</b><span>${user?.username ? '@' + user.username : 'Telegram-профиль'}</span></div></section><section class="list-card"><div><b>Настройки</b><span>Профиль, цели и уведомления подключим далее.</span></div></section>`
  }
};

function render(screen = 'home') {
  const data = screens[screen] || screens.home;
  title.textContent = data.title;
  subtitle.textContent = data.subtitle;
  content.innerHTML = data.html;

  document.querySelectorAll('[data-screen]').forEach((el) => {
    el.addEventListener('click', () => render(el.dataset.screen));
  });

  document.querySelectorAll('.bottom-nav button').forEach((el) => {
    el.classList.toggle('active', el.dataset.screen === screen);
  });

  document.querySelector('[data-action="workout"]')?.addEventListener('click', () => render('workouts'));
}

content?.addEventListener('click', (event) => {
  if (event.target.closest('.small-primary')) {
    tg?.showAlert?.('Экран тренировки подключим следующим этапом.');
  }
});

render('home');
