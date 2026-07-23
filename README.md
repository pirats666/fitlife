<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>FitLife Coach</title>
    <script src="https://telegram.org/js/telegram-web-app.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        body { background-color: #0f172a; color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        .accent-bg { background-color: #84cc16; }
        .accent-text { color: #84cc16; }
        .accent-border { border-color: #84cc16; }
    </style>
</head>
<body class="pb-20 select-none">

    <!-- Beta Banner -->
    <div class="bg-lime-500/10 border-b border-lime-500/20 px-4 py-2 text-center text-xs text-lime-400 font-medium">
        ⚡ Бесплатная Beta-версия 1.0 — Весь функционал разблокирован
    </div>

    <div id="app" class="p-4 max-w-md mx-auto">
        <!-- Onboarding Screen -->
        <div id="onboarding-screen" class="space-y-6">
            <div class="text-center my-4">
                <h1 class="text-2xl font-bold text-white mb-1">FitLife Coach</h1>
                <p class="text-slate-400 text-sm">Персональный онлайн-наставник</p>
            </div>

            <!-- Step 1: Goal -->
            <div class="bg-slate-800 p-4 rounded-2xl border border-slate-700">
                <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">1. Выберите вашу цель</label>
                <div class="grid grid-cols-1 gap-2">
                    <button type="button" onclick="selectGoal('loss', this)" class="goal-btn p-3 rounded-xl border border-slate-700 bg-slate-900/50 text-left hover:border-lime-500 transition">
                        <div class="font-bold text-white">🔥 Похудение и рельеф</div>
                        <div class="text-xs text-slate-400">Сжигание жира с сохранением мышц</div>
                    </button>
                    <button type="button" onclick="selectGoal('mass', this)" class="goal-btn p-3 rounded-xl border border-slate-700 bg-slate-900/50 text-left hover:border-lime-500 transition">
                        <div class="font-bold text-white">💪 Набор мышечной массы</div>
                        <div class="text-xs text-slate-400">Увеличение объемов и силы</div>
                    </button>
                    <button type="button" onclick="selectGoal('health', this)" class="goal-btn p-3 rounded-xl border border-slate-700 bg-slate-900/50 text-left hover:border-lime-500 transition">
                        <div class="font-bold text-white">⚡ Здоровье и тонус</div>
                        <div class="text-xs text-slate-400">Поддержание формы и выносливости</div>
                    </button>
                </div>
            </div>

            <!-- Step 2: Measurements -->
            <div class="bg-slate-800 p-4 rounded-2xl border border-slate-700">
                <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">2. Ваши замеры</label>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <span class="text-xs text-slate-400">Вес (кг)</span>
                        <input type="number" id="input-weight" placeholder="70" class="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white mt-1 focus:outline-none focus:border-lime-500">
                    </div>
                    <div>
                        <span class="text-xs text-slate-400">Рост (см)</span>
                        <input type="number" id="input-height" placeholder="175" class="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white mt-1 focus:outline-none focus:border-lime-500">
                    </div>
                    <div>
                        <span class="text-xs text-slate-400">Возраст</span>
                        <input type="number" id="input-age" placeholder="25" class="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white mt-1 focus:outline-none focus:border-lime-500">
                    </div>
                    <div>
                        <span class="text-xs text-slate-400">Талия (см)</span>
                        <input type="number" id="input-waist" placeholder="80" class="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white mt-1 focus:outline-none focus:border-lime-500">
                    </div>
                </div>
            </div>

            <!-- Step 3: Injuries -->
            <div class="bg-slate-800 p-4 rounded-2xl border border-slate-700">
                <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">3. Ограничения и травмы</label>
                <div class="grid grid-cols-2 gap-2 text-sm">
                    <label class="flex items-center space-x-2 bg-slate-900/50 p-2.5 rounded-xl border border-slate-700 cursor-pointer">
                        <input type="checkbox" value="back" class="injury-check accent-lime-500">
                        <span>Поясница</span>
                    </label>
                    <label class="flex items-center space-x-2 bg-slate-900/50 p-2.5 rounded-xl border border-slate-700 cursor-pointer">
                        <input type="checkbox" value="knees" class="injury-check accent-lime-500">
                        <span>Колени</span>
                    </label>
                    <label class="flex items-center space-x-2 bg-slate-900/50 p-2.5 rounded-xl border border-slate-700 cursor-pointer">
                        <input type="checkbox" value="shoulders" class="injury-check accent-lime-500">
                        <span>Плечи</span>
                    </label>
                    <label class="flex items-center space-x-2 bg-slate-900/50 p-2.5 rounded-xl border border-slate-700 cursor-pointer">
                        <input type="checkbox" value="wrists" class="injury-check accent-lime-500">
                        <span>Запястья</span>
                    </label>
                </div>
            </div>

            <button onclick="saveAndStart()" class="w-full accent-bg text-slate-950 font-bold py-3.5 rounded-xl shadow-lg hover:brightness-110 active:scale-95 transition">
                Сформировать программу
            </button>
        </div>

        <!-- Main App Screen (Hidden initially) -->
        <div id="main-screen" class="hidden space-y-5">
            <!-- Tabs content -->
            <div id="tab-workouts" class="tab-content space-y-4">
                <div class="flex justify-between items-center">
                    <h2 class="text-xl font-bold">Программа тренировок</h2>
                    <span id="badge-goal" class="text-xs font-semibold bg-lime-500/20 text-lime-400 px-2.5 py-1 rounded-full"></span>
                </div>
                <div id="workouts-container" class="space-y-3"></div>
            </div>

            <div id="tab-nutrition" class="tab-content hidden space-y-4">
                <h2 class="text-xl font-bold">Расчет питания</h2>
                <div class="bg-slate-800 p-4 rounded-2xl border border-slate-700 grid grid-cols-2 gap-3 text-center">
                    <div class="bg-slate-900/80 p-3 rounded-xl border border-slate-700/50 col-span-2">
                        <span class="text-xs text-slate-400">Целевая калорийность</span>
                        <div id="calc-calories" class="text-2xl font-black text-lime-400 mt-0.5">0 ккал</div>
                    </div>
                    <div class="bg-slate-900/80 p-3 rounded-xl border border-slate-700/50">
                        <span class="text-xs text-slate-400">Белки</span>
                        <div id="calc-protein" class="text-lg font-bold text-white mt-0.5">0 г</div>
                    </div>
                    <div class="bg-slate-900/80 p-3 rounded-xl border border-slate-700/50">
                        <span class="text-xs text-slate-400">Жиры / Углеводы</span>
                        <div id="calc-fat-carbs" class="text-sm font-bold text-white mt-1">0г / 0г</div>
                    </div>
                </div>
                <div class="bg-slate-800 p-4 rounded-2xl border border-slate-700">
                    <h3 class="font-bold text-sm text-slate-200 mb-2">Рекомендации по рациону:</h3>
                    <ul class="text-xs text-slate-400 space-y-1.5 list-disc pl-4">
                        <li>3-4 полноценных приема пищи в день</li>
                        <li>Белок в каждом приеме (курица, яйца, творог, рыба)</li>
                        <li>Пейте от 2 литров чистой воды в день</li>
                    </ul>
                </div>
            </div>

            <div id="tab-progress" class="tab-content hidden space-y-4">
                <h2 class="text-xl font-bold">Контроль прогресса</h2>
                <div class="bg-slate-800 p-4 rounded-2xl border border-slate-700 space-y-3">
                    <div class="flex justify-between items-center text-sm">
                        <span class="text-slate-400">Текущий вес:</span>
                        <span id="prog-weight" class="font-bold text-white">-- кг</span>
                    </div>
                    <div class="flex justify-between items-center text-sm">
                        <span class="text-slate-400">Обхват талии:</span>
                        <span id="prog-waist" class="font-bold text-white">-- см</span>
                    </div>
                    <button onclick="resetData()" class="w-full text-xs text-rose-400 bg-rose-500/10 py-2.5 rounded-xl border border-rose-500/20 mt-2">
                        Сбросить параметры и пройти заново
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- Bottom Navigation Bar -->
    <div id="bottom-nav" class="hidden fixed bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur-md border-t border-slate-800 py-2 px-6 flex justify-around">
        <button onclick="switchTab('workouts')" class="nav-btn text-lime-400 flex flex-col items-center text-xs gap-1" id="nav-workouts">
            <i class="fa-solid font-bold fa-dumbbell text-lg"></i>
            <span>Тренировки</span>
        </button>
        <button onclick="switchTab('nutrition')" class="nav-btn text-slate-500 flex flex-col items-center text-xs gap-1" id="nav-nutrition">
            <i class="fa-solid fa-utensils text-lg"></i>
            <span>Питание</span>
        </button>
        <button onclick="switchTab('progress')" class="nav-btn text-slate-500 flex flex-col items-center text-xs gap-1" id="nav-progress">
            <i class="fa-solid fa-chart-line text-lg"></i>
            <span>Прогресс</span>
        </button>
    </div>

    <script>
        let tg = window.Telegram?.WebApp;
        if(tg) { tg.ready(); tg.expand(); }

        let userData = { goal: 'loss', weight: 70, height: 175, age: 25, waist: 80, injuries: [] };

        function selectGoal(goal, btn) {
            userData.goal = goal;
            document.querySelectorAll('.goal-btn').forEach(b => b.classList.remove('border-lime-500', 'bg-lime-500/10'));
            btn.classList.add('border-lime-500', 'bg-lime-500/10');
        }

        function saveAndStart() {
            userData.weight = parseFloat(document.getElementById('input-weight').value) || 70;
            userData.height = parseFloat(document.getElementById('input-height').value) || 175;
            userData.age = parseFloat(document.getElementById('input-age').value) || 25;
            userData.waist = parseFloat(document.getElementById('input-waist').value) || 80;

            const checkedInjuries = [];
            document.querySelectorAll('.injury-check:checked').forEach(c => checkedInjuries.push(c.value));
            userData.injuries = checkedInjuries;

            localStorage.setItem('fitlife_user', JSON.stringify(userData));
            renderApp();
        }

        function renderApp() {
            const saved = localStorage.getItem('fitlife_user');
            if(!saved) return;
            userData = JSON.parse(saved);

            document.getElementById('onboarding-screen').classList.add('hidden');
            document.getElementById('main-screen').classList.remove('hidden');
            document.getElementById('bottom-nav').classList.remove('hidden');

            // Render Nutrition
            let bmr = (10 * userData.weight) + (6.25 * userData.height) - (5 * userData.age) + 5;
            let calories = Math.round(bmr * 1.375);
            if(userData.goal === 'loss') calories -= 400;
            if(userData.goal === 'mass') calories += 400;

            let protein = Math.round(userData.weight * 2);
            let fat = Math.round(userData.weight * 1);
            let carbs = Math.round((calories - (protein * 4) - (fat * 9)) / 4);

            document.getElementById('calc-calories').innerText = `${calories} ккал`;
            document.getElementById('calc-protein').innerText = `${protein} г`;
            document.getElementById('calc-fat-carbs').innerText = `${fat}г / ${carbs}г`;

            // Goal badge
            const goalsMap = { 'loss': 'Похудение', 'mass': 'Набор массы', 'health': 'Тонус' };
            document.getElementById('badge-goal').innerText = goalsMap[userData.goal] || 'Тренировки';

            // Progress text
            document.getElementById('prog-weight').innerText = `${userData.weight} кг`;
            document.getElementById('prog-waist').innerText = `${userData.waist} см`;

            // Render Workouts
            renderWorkouts();
        }

        function renderWorkouts() {
            const container = document.getElementById('workouts-container');
            container.innerHTML = '';

            let rawExercises = [
                { name: 'Приседания со штангой', zone: 'knees', safeName: 'Жим ногами в тренажере' },
                { name: 'Становая тяга', zone: 'back', safeName: 'Гиперэкстензия с прямой спиной' },
                { name: 'Жим гантелей стоя', zone: 'shoulders', safeName: 'Махи гантелями через стороны' },
                { name: 'Отжимания на брусьях', zone: 'wrists', safeName: 'Сведение рук в тренажере (Пеп-Дек)' },
                { name: 'Тяга верхнего блока к груди', zone: 'none', safeName: '' },
                { name: 'Скручивания на пресс', zone: 'none', safeName: '' }
            ];

            rawExercises.forEach((ex, idx) => {
                let isReplaced = userData.injuries.includes(ex.zone);
                let finalName = isReplaced ? ex.safeName : ex.name;

                let card = document.createElement('div');
                card.className = 'bg-slate-800 p-4 rounded-2xl border border-slate-700 space-y-2';
                card.innerHTML = `
                    <div class="flex justify-between items-start">
                        <div>
                            <div class="font-bold text-sm text-white">${finalName}</div>
                            ${isReplaced ? '<span class="inline-block bg-amber-500/10 text-amber-400 text-[10px] px-2 py-0.5 rounded mt-1 font-medium border border-amber-500/20">🛡️ Безопасная замена</span>' : ''}
                        </div>
                        <input type="checkbox" class="w-5 h-5 accent-lime-500 rounded cursor-pointer">
                    </div>
                    <div class="text-xs text-slate-400 flex gap-4">
                        <span>Подходы: <b>3-4</b></span>
                        <span>Повторения: <b>10-12</b></span>
                        <span>Отдых: <b>90 сек</b></span>
                    </div>
                `;
                container.appendChild(card);
            });
        }

        function switchTab(tab) {
            document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
            document.getElementById(`tab-${tab}`).classList.remove('hidden');

            document.querySelectorAll('.nav-btn').forEach(btn => {
                btn.classList.remove('text-lime-400');
                btn.classList.add('text-slate-500');
            });
            document.getElementById(`nav-${tab}`).classList.remove('text-slate-500');
            document.getElementById(`nav-${tab}`).classList.add('text-lime-400');
        }

        function resetData() {
            localStorage.removeItem('fitlife_user');
            location.reload();
        }

        window.onload = function() {
            if(localStorage.getItem('fitlife_user')) {
                renderApp();
            }
        };
    </script>
</body>
</html>
