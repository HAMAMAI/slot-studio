(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const dates = [];
  let selectedDate = '';
  let selectedSlot = null;
  const courts = ['C1', 'C2', 'C3', 'C4', 'C5'];
  const times = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];
  const busy = new Set(['C1-10:00', 'C1-18:00', 'C2-12:00', 'C2-20:00', 'C3-08:00', 'C3-16:00', 'C4-14:00', 'C4-18:00', 'C5-12:00', 'C5-22:00']);
  const money = (value) => `${new Intl.NumberFormat('ru-RU').format(value)} ₽`;
  $$('.close').forEach((button) => button.addEventListener('click', () => button.closest('dialog').close()));
  const localDateKey = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  for (let offset = 0; offset < 5; offset += 1) {
    const date = new Date(); date.setDate(date.getDate() + offset); dates.push(date);
    const button = document.createElement('button'); button.type = 'button'; button.dataset.date = localDateKey(date); button.textContent = offset === 0 ? 'Сегодня' : offset === 1 ? 'Завтра' : date.toLocaleDateString('ru-RU', { weekday: 'short', day: '2-digit', month: 'short' });
    if (offset === 0) { selectedDate = button.dataset.date; button.classList.add('active'); }
    button.addEventListener('click', () => { $$('#date-row button').forEach((node) => node.classList.remove('active')); button.classList.add('active'); selectedDate = button.dataset.date; selectedSlot = null; renderSchedule(); renderOrder(); });
    $('#date-row').appendChild(button);
  }

  function renderSchedule() {
    const schedule = $('#schedule'); schedule.innerHTML = '<div class="corner">COURT / TIME</div>';
    times.forEach((time) => { const head = document.createElement('div'); head.className = 'time-head'; head.textContent = time; schedule.appendChild(head); });
    courts.forEach((court, courtIndex) => {
      const head = document.createElement('div'); head.className = 'court-head'; head.textContent = court; schedule.appendChild(head);
      times.forEach((time, timeIndex) => {
        const key = `${court}-${time}`; const isBusy = busy.has(key) || ((courtIndex + timeIndex + Number(selectedDate.slice(-2))) % 9 === 0);
        const button = document.createElement('button'); button.type = 'button'; button.textContent = isBusy ? 'занято' : money(timeIndex >= 5 ? 8000 : 6500); button.disabled = isBusy; button.classList.toggle('busy', isBusy); button.classList.toggle('selected', selectedSlot?.key === key);
        if (!isBusy) button.addEventListener('click', () => { selectedSlot = { key, court, time, price: timeIndex >= 5 ? 8000 : 6500 }; renderSchedule(); renderOrder(); });
        schedule.appendChild(button);
      });
    });
  }

  function renderOrder() {
    const filled = Boolean(selectedSlot); $('#order-empty').hidden = filled; $('#order-content').hidden = !filled; $('#book-court').disabled = !filled;
    if (!filled) return;
    $('#order-court').textContent = selectedSlot.court; $('#order-date').textContent = new Date(`${selectedDate}T12:00:00`).toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }); $('#order-time').textContent = `${selectedSlot.time} — ${String((Number(selectedSlot.time.slice(0, 2)) + 1) % 24).padStart(2, '0')}:30`; $('#order-price').textContent = money(selectedSlot.price);
  }
  renderSchedule(); renderOrder();
  $('#open-game').addEventListener('change', (event) => { $('#level-row').hidden = !event.target.checked; });

  const bookingDialog = $('#booking-dialog');
  $('#book-court').addEventListener('click', () => { const open = $('#open-game').checked; $('#dialog-summary').innerHTML = `<b>${selectedSlot.court} · ${selectedDate} · ${selectedSlot.time}</b><br>90 минут · ${money(selectedSlot.price)}${open ? `<br>Открытая игра · ${$('#game-level').value}` : ''}`; bookingDialog.showModal(); });
  $('#booking-form').addEventListener('submit', (event) => { if (event.submitter?.value === 'cancel') return; event.preventDefault(); if (!event.currentTarget.reportValidity()) return; const code = `RL-${Math.random().toString(36).slice(2, 7).toUpperCase()}`; const contact = Object.fromEntries(new FormData(event.currentTarget)); const record = { ...selectedSlot, ...contact, date: selectedDate, open: $('#open-game').checked, level: $('#game-level').value, code, createdAt: new Date().toISOString() }; localStorage.setItem('rally-last-booking', JSON.stringify(record)); event.currentTarget.reset(); bookingDialog.close(); showSuccess(`${selectedSlot.court} забронирован на ${selectedDate}, ${selectedSlot.time}.`, code); });

  const partnerDialog = $('#partner-dialog');
  ['#hero-match', '#find-partner'].forEach((selector) => $(selector).addEventListener('click', () => partnerDialog.showModal()));
  $('#partner-form').addEventListener('submit', (event) => { if (event.submitter?.value === 'cancel') return; event.preventDefault(); if (!event.currentTarget.reportValidity()) return; const data = Object.fromEntries(new FormData(event.currentTarget)); localStorage.setItem('rally-partner-request', JSON.stringify({ ...data, createdAt: new Date().toISOString() })); event.currentTarget.reset(); partnerDialog.close(); showSuccess(`Поиск игроков уровня ${data.level} запущен. Демо-заявка сохранена.`, `PM-${Math.random().toString(36).slice(2, 6).toUpperCase()}`); });
  $('#trial-button').addEventListener('click', () => { partnerDialog.showModal(); $('#partner-form select[name="level"]').value = 'Первый раз'; });
  const matchDialog = $('#match-dialog');
  let selectedMatch = null;
  $$('#match-grid article button').forEach((button) => button.addEventListener('click', () => {
    const card = button.closest('article');
    selectedMatch = {
      name: card.dataset.match,
      spots: Number(card.dataset.spots),
      time: $('.match-top span', card).textContent,
      level: $('.match-top b', card).textContent,
      court: $('p', card).textContent
    };
    $('#match-summary').innerHTML = `<b>${selectedMatch.name}</b><br>${selectedMatch.time} · уровень ${selectedMatch.level}<br>${selectedMatch.court} · свободно мест: ${selectedMatch.spots}`;
    matchDialog.showModal();
  }));

  $('#match-form').addEventListener('submit', (event) => {
    if (event.submitter?.value === 'cancel') return;
    event.preventDefault();
    if (!event.currentTarget.reportValidity() || !selectedMatch) return;
    const contact = Object.fromEntries(new FormData(event.currentTarget));
    const code = `MT-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    localStorage.setItem('rally-match-request', JSON.stringify({ ...selectedMatch, ...contact, code, createdAt: new Date().toISOString() }));
    event.currentTarget.reset();
    matchDialog.close();
    showSuccess(`Место в игре «${selectedMatch.name}» отмечено за вами.`, code);
  });

  function showSuccess(text, code) { $('#success-text').textContent = text; $('#success-code').textContent = code; $('#success-dialog').showModal(); }
  $('#success-close').addEventListener('click', () => $('#success-dialog').close());
})();
