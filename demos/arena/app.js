(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const formatMoney = (value) => `${new Intl.NumberFormat('ru-RU').format(value)} ₸`;
  const map = $('#floor-map');
  const selected = new Set();
  const busySeats = new Set([3, 6, 12, 14, 20, 22, 30, 31]);
  const zones = { standard: { price: 900, range: [1, 20] }, pro: { price: 1300, range: [21, 30] }, vip: { price: 1600, range: [31, 36] } };
  let activeZone = 'all';
  let activeTime = '18:00';
  let activeDate = '';

  const localDateKey = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const zoneFor = (number) => Object.entries(zones).find(([, value]) => number >= value.range[0] && number <= value.range[1])[0];
  const seatName = (number) => `${zoneFor(number) === 'standard' ? 'S' : zoneFor(number) === 'pro' ? 'P' : 'V'}-${String(number).padStart(2, '0')}`;

  for (let number = 1; number <= 36; number += 1) {
    const zone = zoneFor(number);
    const seat = document.createElement('button');
    seat.type = 'button';
    seat.className = `seat${busySeats.has(number) ? ' busy' : ''}`;
    seat.dataset.number = number;
    seat.dataset.zone = zone;
    seat.textContent = seatName(number);
    seat.disabled = busySeats.has(number);
    seat.setAttribute('aria-label', `${seatName(number)}, ${busySeats.has(number) ? 'занято' : 'свободно'}`);
    seat.addEventListener('click', () => toggleSeat(number));
    map.appendChild(seat);
  }

  const dates = [];
  const names = ['Сегодня', 'Завтра'];
  for (let offset = 0; offset < 4; offset += 1) {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    dates.push(date);
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.date = localDateKey(date);
    button.textContent = names[offset] || date.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });
    if (offset === 0) { button.classList.add('active'); activeDate = button.dataset.date; }
    button.addEventListener('click', () => {
      $$('#date-tabs button').forEach((node) => node.classList.remove('active'));
      button.classList.add('active'); activeDate = button.dataset.date; updateSelection();
    });
    $('#date-tabs').appendChild(button);
  }

  function toggleSeat(number) {
    if (selected.has(number)) selected.delete(number); else selected.add(number);
    updateSelection();
  }

  function updateSelection() {
    $$('.seat').forEach((seat) => seat.classList.toggle('selected', selected.has(Number(seat.dataset.number))));
    const list = [...selected].sort((a, b) => a - b);
    const duration = Number($('#duration').value);
    const total = list.reduce((sum, number) => sum + zones[zoneFor(number)].price * duration, 0);
    $('#seat-count').textContent = `${list.length} ${list.length === 1 ? 'место' : list.length > 1 && list.length < 5 ? 'места' : 'мест'}`;
    $('#seat-names').textContent = list.length ? list.map(seatName).join(' · ') : 'Выберите ПК на карте';
    $('#total-price').textContent = formatMoney(total);
    $('#price-note').textContent = `${duration} ч. · ${activeTime} · ${activeDate}`;
    $('#open-booking').disabled = !list.length;
  }

  $$('#time-tabs button').forEach((button) => button.addEventListener('click', () => {
    $$('#time-tabs button').forEach((node) => node.classList.remove('active'));
    button.classList.add('active'); activeTime = button.dataset.time; updateSelection();
  }));

  $$('#zone-tabs button').forEach((button) => button.addEventListener('click', () => {
    $$('#zone-tabs button').forEach((node) => node.classList.remove('active'));
    button.classList.add('active'); activeZone = button.dataset.zone;
    $$('.seat').forEach((seat) => seat.classList.toggle('hidden', activeZone !== 'all' && seat.dataset.zone !== activeZone));
    selected.clear();
    updateSelection();
  }));

  $('#duration').addEventListener('input', (event) => {
    const value = Number(event.target.value);
    $('#duration-value').textContent = `${value} ${value === 1 ? 'час' : value < 5 ? 'часа' : 'часов'}`;
    updateSelection();
  });

  const toast = $('#toast');
  const showToast = (text) => { toast.textContent = text; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2400); };
  function findAdjacentGroup(size = 5) {
    const zoneNames = activeZone === 'all' ? Object.keys(zones) : [activeZone];
    for (const zoneName of zoneNames) {
      const [start, end] = zones[zoneName].range;
      for (let first = start; first <= end - size + 1; first += 1) {
        const candidates = Array.from({ length: size }, (_, index) => first + index);
        const sameVisualRow = Math.floor((first - 1) / 6) === Math.floor((first + size - 2) / 6);
        if (sameVisualRow && candidates.every((number) => !busySeats.has(number))) return candidates;
      }
    }
    return [];
  }

  $('#group-pick').addEventListener('click', () => {
    const candidates = findAdjacentGroup();
    if (!candidates.length) {
      showToast('В этой зоне сейчас нет пяти соседних мест');
      return;
    }
    selected.clear();
    candidates.forEach((number) => selected.add(number));
    updateSelection();
    showToast(`Подобрали рядом: ${candidates.map(seatName).join(' · ')}`);
  });

  const bookingDialog = $('#booking-dialog');
  $('#open-booking').addEventListener('click', () => {
    const list = [...selected].sort((a, b) => a - b);
    const duration = Number($('#duration').value);
    const total = list.reduce((sum, number) => sum + zones[zoneFor(number)].price * duration, 0);
    $('#dialog-order').innerHTML = `${list.map(seatName).join(' · ')}<br>${activeDate} / ${activeTime} / ${duration} ч.<br><b>${formatMoney(total)}</b>`;
    bookingDialog.showModal();
  });

  $('#booking-form').addEventListener('submit', (event) => {
    if (event.submitter?.value === 'cancel') return;
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;
    const code = `NA-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const contact = Object.fromEntries(new FormData(event.currentTarget));
    const record = { code, ...contact, seats: [...selected].map(seatName), date: activeDate, time: activeTime, duration: Number($('#duration').value), createdAt: new Date().toISOString() };
    localStorage.setItem('noir-arena-last-booking', JSON.stringify(record));
    event.currentTarget.reset();
    bookingDialog.close();
    $('#booking-code').textContent = code;
    $('#success-copy').textContent = `${record.seats.join(' · ')} забронированы на ${activeTime}. Покажите код администратору.`;
    $('#success-dialog').showModal();
  });
  $('#success-close').addEventListener('click', () => $('#success-dialog').close());
  $('#tournament-button').addEventListener('click', () => { document.querySelector('#stations').scrollIntoView(); showToast('Выберите 5 мест — это заявка команды'); $('#group-pick').click(); });
  updateSelection();
})();
