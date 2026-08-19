(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const money = new Intl.NumberFormat('ru-RU');
  const monthDay = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' });
  const weekDay = new Intl.DateTimeFormat('ru-RU', { weekday: 'short' });

  const state = {
    guests: 4,
    duration: 3,
    program: 'Тихий вечер',
    base: 18000,
    included: ['Мягкий прогрев', 'Одно парение', 'Купель и чай'],
    addons: new Map(),
    date: '',
    dateLabel: '',
    time: ''
  };

  const localDateKey = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const dates = Array.from({ length: 6 }, (_, index) => {
    const value = new Date();
    value.setHours(12, 0, 0, 0);
    value.setDate(value.getDate() + index + 1);
    return {
      iso: localDateKey(value),
      label: monthDay.format(value).replace('.', ''),
      weekday: weekDay.format(value).replace('.', '')
    };
  });

  const slotSets = [
    ['11:00', '15:30', '19:00'],
    ['10:30', '14:00', '18:30'],
    ['11:00', '16:00', '20:00'],
    ['12:00', '17:30'],
    ['10:00', '15:00', '19:30'],
    ['11:30', '18:00']
  ];

  function customBase() {
    const durationBase = { 3: 18000, 4: 23500, 5: 31000 }[state.duration];
    return durationBase + Math.max(0, state.guests - 4) * 1800;
  }

  function total() {
    return state.base + [...state.addons.values()].reduce((sum, item) => sum + item.price, 0);
  }

  function pluralGuests(count) {
    if (count === 2) return '2 человека';
    return `${count} гостей`;
  }

  function pluralHours(count) {
    return `${count} ${count === 5 ? 'часов' : 'часа'}`;
  }

  function renderOrder() {
    $('#order-title').textContent = state.program === 'Свой вечер'
      ? `Вечер для ${pluralGuests(state.guests)}`
      : state.program;
    $('#order-guests').textContent = pluralGuests(state.guests);
    $('#order-duration').textContent = pluralHours(state.duration);
    $('#order-date').textContent = state.dateLabel && state.time ? `${state.dateLabel} · ${state.time}` : 'Выберите окно';
    $('#order-addons').textContent = [...state.included, ...[...state.addons.values()].map((item) => item.name)].join(', ');
    $('#order-price').textContent = `${money.format(total())} ₽`;
    $('#order-submit').disabled = !(state.date && state.time);
  }

  function setCustom() {
    state.program = 'Свой вечер';
    state.base = customBase();
    state.included = ['Дом целиком', 'Парная', 'Купель и чай'];
  }

  function renderControls() {
    $$('#guest-options button').forEach((button) => button.classList.toggle('active', Number(button.dataset.guests) === state.guests));
    $$('#duration-options button').forEach((button) => button.classList.toggle('active', Number(button.dataset.duration) === state.duration));
  }

  function renderDates() {
    $('#builder-dates').innerHTML = dates.map((date, index) => `
      <button type="button" data-date="${date.iso}" data-index="${index}">
        <b>${date.label}</b><small>${date.weekday}</small>
      </button>`).join('');

    $$('#builder-dates button').forEach((button) => button.addEventListener('click', () => {
      state.date = button.dataset.date;
      state.dateLabel = dates[Number(button.dataset.index)].label;
      state.time = '';
      $$('#builder-dates button').forEach((item) => item.classList.toggle('active', item === button));
      renderTimes(Number(button.dataset.index));
      renderOrder();
    }));
  }

  function renderTimes(dateIndex) {
    const slots = slotSets[dateIndex];
    $('#builder-times').innerHTML = slots.map((time, index) => {
      const busy = dateIndex === 1 && index === 1;
      return `<button type="button" data-time="${time}" ${busy ? 'disabled' : ''}>${time}${busy ? '<small>занято</small>' : ''}</button>`;
    }).join('');
    $$('#builder-times button:not([disabled])').forEach((button) => button.addEventListener('click', () => {
      state.time = button.dataset.time;
      $$('#builder-times button').forEach((item) => item.classList.toggle('active', item === button));
      renderOrder();
    }));
  }

  function choosePreset(card) {
    const program = card.dataset.program;
    const preset = {
      'Тихий вечер': { guests: 4, duration: 3, base: 18000, included: ['Мягкий прогрев', 'Одно парение', 'Купель и чай'] },
      'Полный круг': { guests: 6, duration: 4, base: 29000, included: ['Два парения', 'Скрабирование', 'Сезонный стол'] },
      'Большой сбор': { guests: 10, duration: 5, base: 42000, included: ['Три парения', 'Контрастный ритуал', 'Ужин за длинным столом'] }
    }[program];
    Object.assign(state, { ...preset, program });
    state.addons.clear();
    $$('#addon-options input').forEach((input) => { input.checked = false; });
    renderControls();
    renderOrder();
    $('#builder').scrollIntoView({ behavior: 'smooth', block: 'start' });
    showToast(`Программа «${program}» добавлена в конструктор`);
  }

  function openBooking(quickLabel = '') {
    if (quickLabel) {
      state.date = 'quick';
      const parts = quickLabel.split('·').map((item) => item.trim());
      state.dateLabel = parts[0];
      state.time = parts[1] || '';
      renderOrder();
    }
    const composition = [...state.included, ...[...state.addons.values()].map((item) => item.name)].join(', ');
    $('#dialog-summary').innerHTML = `<strong>${state.program}</strong><br>${pluralGuests(state.guests)} · ${pluralHours(state.duration)} · ${state.dateLabel} в ${state.time}<br>${composition}<br><b>${money.format(total())} ₽</b>`;
    $('#booking-dialog').showModal();
    document.body.classList.add('modal-open');
  }

  function persist(kind, payload) {
    try {
      const key = 'slot_banya_demo_requests';
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      existing.push({ kind, ...payload, createdAt: new Date().toISOString() });
      localStorage.setItem(key, JSON.stringify(existing.slice(-20)));
    } catch (error) {
      console.info('Demo storage unavailable', error);
    }
  }

  function showSuccess(title, text) {
    $$('dialog[open]').forEach((dialog) => dialog.close());
    $('#success-title').innerHTML = title;
    $('#success-text').textContent = text;
    $('#success-code').textContent = `ТШ-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    $('#success-dialog').showModal();
    document.body.classList.add('modal-open');
  }

  let toastTimer;
  function syncModalState() {
    document.body.classList.toggle('modal-open', Boolean($('dialog[open]')));
  }

  function showToast(message) {
    const toast = $('#toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
  }

  $$('#guest-options button').forEach((button) => button.addEventListener('click', () => {
    state.guests = Number(button.dataset.guests);
    setCustom();
    renderControls();
    renderOrder();
  }));

  $$('#duration-options button').forEach((button) => button.addEventListener('click', () => {
    state.duration = Number(button.dataset.duration);
    setCustom();
    renderControls();
    renderOrder();
  }));

  $$('#addon-options input').forEach((input) => input.addEventListener('change', () => {
    if (input.checked) state.addons.set(input.dataset.name, { name: input.dataset.name, price: Number(input.value) });
    else state.addons.delete(input.dataset.name);
    renderOrder();
  }));

  $$('.program-pick').forEach((button) => button.addEventListener('click', () => choosePreset(button.closest('.ritual-card'))));
  $$('[data-jump-builder]').forEach((button) => button.addEventListener('click', () => $('#builder').scrollIntoView({ behavior: 'smooth' })));
  $$('[data-quick-slot]').forEach((button) => button.addEventListener('click', () => openBooking(button.dataset.quickSlot)));
  $('#order-submit').addEventListener('click', () => openBooking());

  $('#waitlist-open').addEventListener('click', () => {
    const dateInput = $('#waitlist-form input[type="date"]');
    dateInput.min = dates[0].iso;
    $('#waitlist-dialog').showModal();
    document.body.classList.add('modal-open');
  });

  $$('[data-close-dialog]').forEach((button) => button.addEventListener('click', () => {
    button.closest('dialog').close();
    document.body.classList.remove('modal-open');
  }));

  $('#booking-form').addEventListener('submit', (event) => {
    event.preventDefault();
    if (!event.currentTarget.checkValidity()) return event.currentTarget.reportValidity();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    persist('booking', { ...data, order: { ...state, addons: [...state.addons.values()], total: total() } });
    event.currentTarget.reset();
    showSuccess('До встречи<br>в тишине.', `Мы удерживаем ${state.dateLabel} в ${state.time}. В настоящем проекте администратор уже получил бы заявку и связался с вами.`);
  });

  $('#waitlist-form').addEventListener('submit', (event) => {
    event.preventDefault();
    if (!event.currentTarget.checkValidity()) return event.currentTarget.reportValidity();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    persist('waitlist', data);
    event.currentTarget.reset();
    showSuccess('Вы в листе<br>ожидания.', 'Если освободится подходящее окно, система первой отправит вам сообщение.');
  });

  $('#success-close').addEventListener('click', () => {
    $('#success-dialog').close();
    document.body.classList.remove('modal-open');
  });

  $$('dialog').forEach((dialog) => {
    dialog.addEventListener('close', () => requestAnimationFrame(syncModalState));
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close();
    });
  });

  renderDates();
  renderControls();
  renderOrder();

  const nearest = dates[0];
  $('#next-slot').textContent = `${nearest.label} · 18:30`;
  const heroQuick = $('.hero-date [data-quick-slot]');
  heroQuick.dataset.quickSlot = `${nearest.label} · 18:30`;
})();
