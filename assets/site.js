(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const menuButton = $('.menu-button');
  const mobileMenu = $('#mobile-menu');
  const setMenu = (open) => {
    menuButton?.setAttribute('aria-expanded', String(open));
    mobileMenu?.classList.toggle('open', open);
    document.body.classList.toggle('menu-open', open);
  };
  menuButton?.addEventListener('click', () => setMenu(menuButton.getAttribute('aria-expanded') !== 'true'));
  $$('#mobile-menu a').forEach((link) => link.addEventListener('click', () => setMenu(false)));

  const reveal = $$('.reveal');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px' });
    reveal.forEach((node, index) => {
      node.style.transitionDelay = `${Math.min(index % 4, 3) * 55}ms`;
      observer.observe(node);
    });
  } else {
    reveal.forEach((node) => node.classList.add('in-view'));
  }

  const niche = $('#calc-niche');
  const slots = $('#calc-slots');
  const check = $('#calc-check');
  const loss = $('#calc-loss');
  const slotsOutput = $('#slots-output');
  const checkOutput = $('#check-output');
  const lossOutput = $('#loss-output');
  const result = $('#calc-result');
  const caption = $('#calc-caption');
  const plan = $('#calc-plan');
  const payback = $('#calc-payback');
  const rubles = new Intl.NumberFormat('ru-RU');
  const configs = {
    club: { retention: .5, price: 89000, plan: 'Бронь + карта мест', defaults: [36, 1400, 18] },
    beauty: { retention: .58, price: 59000, plan: 'Депозит + лист ожидания', defaults: [12, 3200, 22] },
    padel: { retention: .45, price: 119000, plan: 'Корты + открытые матчи', defaults: [18, 7200, 17] },
    space: { retention: .42, price: 79000, plan: 'Конструктор пакета', defaults: [8, 11000, 24] }
  };

  const calculate = () => {
    if (!niche || !slots || !check || !loss) return;
    const config = configs[niche.value];
    const potential = Math.round(Number(slots.value) * Number(check.value) * 30 * (Number(loss.value) / 100) * config.retention);
    const days = Math.max(1, Math.round(config.price / Math.max(potential / 30, 1)));
    slotsOutput.textContent = slots.value;
    checkOutput.textContent = `${rubles.format(check.value)} ₽`;
    lossOutput.textContent = `${loss.value}%`;
    result.textContent = `${rubles.format(potential)} ₽`;
    caption.textContent = `если вернуть ${Math.round(config.retention * 100)}% пустых слотов`;
    plan.textContent = config.plan;
    payback.textContent = `Окупаемость разработки ≈ ${days} ${days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'}`;
  };
  [slots, check, loss].forEach((input) => input?.addEventListener('input', calculate));
  niche?.addEventListener('change', () => {
    const defaults = configs[niche.value].defaults;
    [slots.value, check.value, loss.value] = defaults;
    calculate();
  });
  calculate();

  const toast = $('#toast');
  let toastTimer;
  const showToast = (message) => {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
  };

  $('#brief-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const message = [
      'Привет! Хочу разобрать проект со СЛОТ.',
      '',
      `Бизнес: ${form.get('business')}`,
      `Главная боль: ${form.get('pain')}`,
      `Проект: ${form.get('project')}`,
      form.get('telegram') ? `Мой Telegram: ${form.get('telegram')}` : '',
      '',
      'Нужен короткий расчёт и предложение по запуску.'
    ].filter(Boolean).join('\n');

    const share = `https://t.me/share/url?url=${encodeURIComponent(location.href)}&text=${encodeURIComponent(message)}`;
    window.open(share, '_blank', 'noopener,noreferrer');
    try {
      await navigator.clipboard.writeText(message);
      showToast('Бриф скопирован — выберите адресата в Telegram');
    } catch {
      showToast('Telegram открыт — текст готов к отправке');
    }
  });

  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();
})();
