(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const services = [
    { id: 'manicure', category: 'nails', name: 'Маникюр + покрытие', duration: 120, price: 3200, masters: ['София'] },
    { id: 'pedicure', category: 'nails', name: 'Smart-педикюр', duration: 90, price: 3600, masters: ['София'] },
    { id: 'haircut', category: 'hair', name: 'Стрижка + укладка', duration: 90, price: 4000, masters: ['Лера'] },
    { id: 'color', category: 'hair', name: 'Окрашивание', duration: 210, price: 7900, masters: ['Лера'] },
    { id: 'face', category: 'skin', name: 'Уход для лица', duration: 75, price: 4900, masters: ['Амина'] },
    { id: 'massage', category: 'skin', name: 'Массаж лица', duration: 60, price: 3900, masters: ['Амина'] }
  ];
  let state = { service: null, master: null, date: null, time: null };
  const money = (value) => `${new Intl.NumberFormat('ru-RU').format(value)} ₽`;

  function renderServices(filter) {
    const container = $('#service-options'); container.innerHTML = '';
    services.filter((service) => !filter || service.category === filter).forEach((service) => {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = service.name;
      button.classList.toggle('active', state.service?.id === service.id);
      button.addEventListener('click', () => { state.service = service; state.master = service.masters[0]; state.time = null; renderAll(); });
      container.appendChild(button);
    });
  }
  function renderMasters() {
    const container = $('#master-options'); container.innerHTML = '';
    const masters = state.service ? state.service.masters : ['София', 'Лера', 'Амина'];
    masters.forEach((master) => { const button = document.createElement('button'); button.type = 'button'; button.textContent = master; button.classList.toggle('active', state.master === master); button.addEventListener('click', () => { state.master = master; state.time = null; renderAll(); }); container.appendChild(button); });
  }
  function renderDates() {
    const container = $('#date-options'); container.innerHTML = '';
    for (let offset = 0; offset < 5; offset += 1) { const date = new Date(); date.setDate(date.getDate() + offset); const iso = date.toISOString().slice(0, 10); const button = document.createElement('button'); button.type = 'button'; button.textContent = offset === 0 ? 'Сегодня' : offset === 1 ? 'Завтра' : date.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' }); button.classList.toggle('active', state.date === iso); button.addEventListener('click', () => { state.date = iso; state.time = null; renderAll(); }); container.appendChild(button); }
  }
  function renderTimes() {
    const container = $('#time-options'); container.innerHTML = '';
    const times = ['10:00', '11:30', '13:00', '15:30', '18:00', '19:30'];
    times.forEach((time, index) => { const busy = (index + (state.date?.charCodeAt(9) || 0)) % 4 === 1; const button = document.createElement('button'); button.type = 'button'; button.textContent = time; button.disabled = busy; button.classList.toggle('busy', busy); button.classList.toggle('active', state.time === time); if (!busy) button.addEventListener('click', () => { state.time = time; renderSummary(); }); container.appendChild(button); });
  }
  function renderSummary() {
    const complete = state.service && state.master && state.date && state.time;
    $('#order-empty').hidden = complete; $('#order-content').hidden = !complete; $('#confirm-booking').disabled = !complete;
    if (!complete) return;
    $('#order-service').textContent = state.service.name;
    $('#order-meta').textContent = `${state.master} · ${state.date} в ${state.time} · ${state.service.duration} мин.`;
    $('#order-price').textContent = money(state.service.price); $('#order-deposit').textContent = money(Math.round(state.service.price * .2));
  }
  function renderAll(filter) { renderServices(filter); renderMasters(); renderDates(); renderTimes(); renderSummary(); }
  renderAll();

  $$('[data-category]').forEach((button) => button.addEventListener('click', () => { state = { service: null, master: null, date: null, time: null }; renderAll(button.dataset.category); $('#booking').scrollIntoView(); }));
  $$('[data-master]').forEach((button) => button.addEventListener('click', () => { state.master = button.dataset.master; state.service = services.find((service) => service.masters.includes(state.master)); renderAll(); $('#booking').scrollIntoView(); }));
  $$('#hot-list button').forEach((button) => button.addEventListener('click', () => { const service = services.find((item) => item.name === button.dataset.service) || { id: 'hot', name: button.dataset.service, duration: 90, price: Number(button.dataset.price), masters: [button.dataset.master] }; state = { service: { ...service, price: Number(button.dataset.price) }, master: button.dataset.master, date: new Date().toISOString().slice(0, 10), time: button.dataset.time }; renderAll(); $('#booking').scrollIntoView(); }));

  const contactDialog = $('#contact-dialog');
  $('#confirm-booking').addEventListener('click', () => { $('#dialog-order').innerHTML = `<b>${state.service.name}</b><br>${state.master} · ${state.date} в ${state.time}<br>Депозит: ${money(Math.round(state.service.price * .2))}`; contactDialog.showModal(); });
  $('#contact-form').addEventListener('submit', (event) => { if (event.submitter?.value === 'cancel') return; event.preventDefault(); if (!event.currentTarget.reportValidity()) return; const code = `EC-${Math.random().toString(36).slice(2, 7).toUpperCase()}`; const record = { ...state, service: state.service.name, code, createdAt: new Date().toISOString() }; localStorage.setItem('eclat-last-booking', JSON.stringify(record)); contactDialog.close(); $('#success-code').textContent = code; $('#success-message').textContent = `${state.service.name}, ${state.date} в ${state.time}. Депозит отмечен как демо.`; $('#success-dialog').showModal(); });
  $('#success-close').addEventListener('click', () => $('#success-dialog').close());
  $('#waitlist-link').addEventListener('click', () => $('#waitlist-dialog').showModal());
  const toast = $('#toast'); const showToast = (text) => { toast.textContent = text; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2500); };
  $('#waitlist-form').addEventListener('submit', (event) => { if (event.submitter?.value === 'cancel') return; event.preventDefault(); if (!event.currentTarget.reportValidity()) return; const data = Object.fromEntries(new FormData(event.currentTarget)); localStorage.setItem('eclat-waitlist', JSON.stringify({ ...data, createdAt: new Date().toISOString() })); $('#waitlist-dialog').close(); showToast('Вы в листе ожидания — демо сохранено'); });
})();
