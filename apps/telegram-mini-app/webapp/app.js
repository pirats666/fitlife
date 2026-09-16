const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
  tg.setHeaderColor?.('#0b0d0f');
  tg.setBackgroundColor?.('#0b0d0f');
}

const user = tg?.initDataUnsafe?.user;
if (user) document.querySelector('h1').textContent = `Привет, ${user.first_name} 👋`;

function openTab(tab) {
  const labels = {
    home: 'Главная',
    workouts: 'Тренировки',
    progress: 'Прогресс',
    profile: 'Профиль',
    schedule: 'Расписание',
    nutrition: 'Питание'
  };
  if (tg?.showPopup) {
    tg.showPopup({ title: labels[tab] || 'FitLife', message: 'Раздел будет подключен на следующем этапе.', buttons: [{ type: 'ok' }] });
  }
}

document.querySelectorAll('[data-tab]').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.bottom-nav button').forEach((item) => item.classList.remove('active'));
    if (button.closest('.bottom-nav')) button.classList.add('active');
    openTab(button.dataset.tab);
  });
});

document.getElementById('startWorkout').addEventListener('click', () => openTab('workouts'));
document.getElementById('profileButton').addEventListener('click', () => openTab('profile'));
