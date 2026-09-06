/* ============================================================
   art.js — أفاتارات الحروف، ألوان الفئات، أيقونات الواجهة، الكونفيتي
   بدون أي رسومات كرتونية أو شخصيات
   ============================================================ */
(function (global) {
  'use strict';

  const S = (inner, vb) =>
    `<svg viewBox="${vb || '0 0 100 100'}" xmlns="http://www.w3.org/2000/svg" fill="none">${inner}</svg>`;

  const xml = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  /* ============================================================
     أفاتارات الحروف — دائرة ملونة + أول حرف من الاسم
     ============================================================ */
  const AVATAR_COLORS = {
    blue:   '#1cb0f6',
    green:  '#58cc02',
    purple: '#a560d8',
    orange: '#ff9600',
    red:    '#ff4b4b',
    teal:   '#14b8a6',
    pink:   '#ec4899',
    indigo: '#6366f1',
    amber:  '#e5b400',
    lime:   '#65a30d',
    cyan:   '#0891b2',
    rose:   '#e11d48'
  };

  const AVATAR_KEYS = Object.keys(AVATAR_COLORS);

  // أول حرف فعلي من الاسم (يتخطى المسافات والترقيم)
  function firstLetter(name) {
    const m = String(name || '').match(/[\p{L}\p{N}]/u);
    return m ? m[0] : '؟';
  }

  // إذا ما انختار لون، نشتقه من الاسم حتى يضل ثابت لنفس اللاعب
  function colorFor(name, key) {
    if (key && AVATAR_COLORS[key]) return AVATAR_COLORS[key];
    const s = String(name || '');
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return AVATAR_COLORS[AVATAR_KEYS[h % AVATAR_KEYS.length]];
  }

  function avatarSVG(key, name) {
    const bg = colorFor(name, key);
    const ch = xml(firstLetter(name));
    return S(`
      <circle cx="50" cy="50" r="50" fill="${bg}"/>
      <text x="50" y="52" text-anchor="middle" dominant-baseline="central"
            font-family="Alexandria,Rubik,Cairo,sans-serif" font-size="46" font-weight="700"
            fill="#ffffff">${ch}</text>`);
  }

  /* ============================================================
     ألوان الفئات — بدل الأيقونات المرسومة
     ============================================================ */
  const CATEGORY_STYLE = {
    animals: { accent: '#ff9600', tint: '#fff4e5' },
    history: { accent: '#a560d8', tint: '#f7ecff' },
    space:   { accent: '#1cb0f6', tint: '#ddf4ff' },
    food:    { accent: '#58cc02', tint: '#eaffd6' },
    sports:  { accent: '#e5b400', tint: '#fff8e0' }
  };

  const categoryStyle = (key) => CATEGORY_STYLE[key] || CATEGORY_STYLE.space;

  /* ============================================================
     أيقونات الواجهة — هندسية بسيطة
     ============================================================ */
  const UI = {
    close: (c = 'currentColor') =>
      S(`<path d="M6 6l12 12M18 6L6 18" stroke="${c}" stroke-width="2.6" stroke-linecap="round"/>`, '0 0 24 24'),

    link: (c = 'currentColor') =>
      S(`<path d="M9.5 14.5l5-5M8 12l-2 2a3.5 3.5 0 0 0 5 5l2-2M16 12l2-2a3.5 3.5 0 0 0-5-5l-2 2"
           stroke="${c}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`, '0 0 24 24'),

    crown: (c = '#e5b400') =>
      S(`<path d="M3.5 8.5l4.2 3.2L12 5.5l4.3 6.2 4.2-3.2-1.5 9.5H5z"
           stroke="${c}" stroke-width="2" stroke-linejoin="round" fill="none"/>`, '0 0 24 24'),

    check: (c = '#58cc02') =>
      S(`<path d="M5 12.5l4.5 4.5L19 7" stroke="${c}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>`, '0 0 24 24'),

    clock: (c = 'currentColor') =>
      S(`<circle cx="12" cy="12" r="9" stroke="${c}" stroke-width="2.2"/>
         <path d="M12 7v5.3l3.4 2" stroke="${c}" stroke-width="2.2" stroke-linecap="round"/>`, '0 0 24 24'),

    pen: (c = 'currentColor') =>
      S(`<path d="M4 20l1-4.5L15.5 5a2.1 2.1 0 0 1 3 3L8 18.5z" stroke="${c}" stroke-width="2.2" stroke-linejoin="round"/>
         <path d="M13.5 7l3.5 3.5" stroke="${c}" stroke-width="2.2" stroke-linecap="round"/>`, '0 0 24 24'),

    vote: (c = 'currentColor') =>
      S(`<path d="M4 13l4 4 12-12" stroke="${c}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
         <path d="M4 19h16" stroke="${c}" stroke-width="2.4" stroke-linecap="round"/>`, '0 0 24 24'),

    trophy: (c = '#e5b400') =>
      S(`<path d="M7.5 4h9v6a4.5 4.5 0 0 1-9 0z" stroke="${c}" stroke-width="2" stroke-linejoin="round"/>
         <path d="M7.5 5.5H5V8a3 3 0 0 0 2.7 3" stroke="${c}" stroke-width="2" stroke-linecap="round"/>
         <path d="M16.5 5.5H19V8a3 3 0 0 1-2.7 3" stroke="${c}" stroke-width="2" stroke-linecap="round"/>
         <path d="M12 14.5v3.5M8 20h8" stroke="${c}" stroke-width="2" stroke-linecap="round"/>`, '0 0 24 24'),

    medal: (place) => {
      const c = place === 1 ? '#e5b400' : place === 2 ? '#9aa0a6' : '#cd8b5b';
      return S(`<circle cx="12" cy="14.5" r="6.5" stroke="${c}" stroke-width="2"/>
        <path d="M8.5 3l2.2 4M15.5 3l-2.2 4" stroke="${c}" stroke-width="2" stroke-linecap="round"/>`, '0 0 24 24');
    },

    users: (c = 'currentColor') =>
      S(`<circle cx="9" cy="8" r="3.4" stroke="${c}" stroke-width="2"/>
         <path d="M3 19a6 6 0 0 1 12 0" stroke="${c}" stroke-width="2" stroke-linecap="round"/>
         <path d="M16 5.5a3.4 3.4 0 0 1 0 6.6M17 19a6 6 0 0 0-2-4.5" stroke="${c}" stroke-width="2" stroke-linecap="round"/>`, '0 0 24 24'),

    book: (c = 'currentColor') =>
      S(`<path d="M4 5.5A2 2 0 0 1 6 3.5h13v15H6a2 2 0 0 0-2 2z" stroke="${c}" stroke-width="2" stroke-linejoin="round"/>
         <path d="M8 8h7M8 12h7" stroke="${c}" stroke-width="2" stroke-linecap="round"/>`, '0 0 24 24'),

    back: (c = 'currentColor') =>
      S(`<path d="M9 5l7 7-7 7" stroke="${c}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`, '0 0 24 24'),

    bulb: (c = '#e5b400') =>
      S(`<path d="M12 3.5a5.8 5.8 0 0 1 3.5 10.4V16h-7v-2.1A5.8 5.8 0 0 1 12 3.5z" stroke="${c}" stroke-width="2" stroke-linejoin="round"/>
         <path d="M9.5 19h5M10.5 21.5h3" stroke="${c}" stroke-width="2" stroke-linecap="round"/>`, '0 0 24 24'),

    target: (c = '#ff4b4b') =>
      S(`<circle cx="12" cy="12" r="8.5" stroke="${c}" stroke-width="2"/>
         <circle cx="12" cy="12" r="4.5" stroke="${c}" stroke-width="2"/>
         <circle cx="12" cy="12" r="1.4" fill="${c}"/>`, '0 0 24 24'),

    // ساعة رملية هندسية للمؤقت
    hourglass: (c = '#1cb0f6') =>
      S(`<path d="M6 3h12M6 21h12" stroke="#c9cdd6" stroke-width="2.4" stroke-linecap="round"/>
         <path d="M7.5 3.5c0 4.5 4.5 6.5 4.5 8.5s-4.5 4-4.5 8.5h9c0-4.5-4.5-6.5-4.5-8.5s4.5-4 4.5-8.5z"
               stroke="${c}" stroke-width="2" stroke-linejoin="round"/>`, '0 0 24 24')
  };

  const uiIcon = (name, color) => (UI[name] ? UI[name](color) : '');
  const hourglass = () => UI.hourglass();

  /* ============================================================
     الكونفيتي والنجوم
     ============================================================ */
  const COLORS = ['#58cc02', '#1cb0f6', '#ffc800', '#ff9600', '#a560d8', '#ff4b4b', '#14b8a6'];

  function confetti(opts = {}) {
    const count = opts.count || 80;
    const duration = opts.duration || 2800;
    let layer = document.querySelector('.confetti-layer');
    if (!layer) {
      layer = document.createElement('div');
      layer.className = 'confetti-layer';
      document.body.appendChild(layer);
    }
    for (let i = 0; i < count; i++) {
      const p = document.createElement('i');
      const size = 6 + Math.random() * 7;
      p.style.cssText = `
        left:${Math.random() * 100}vw;
        width:${size}px; height:${size * (Math.random() > .5 ? 1 : 1.7)}px;
        background:${COLORS[(Math.random() * COLORS.length) | 0]};
        border-radius:${Math.random() > .6 ? '50%' : '2px'};
        animation-duration:${1600 + Math.random() * 1500}ms;
        animation-delay:${Math.random() * 450}ms;
        --spin:${(Math.random() * 800 - 400) | 0}deg;
        --drift:${(Math.random() * 180 - 90) | 0}px;`;
      layer.appendChild(p);
    }
    setTimeout(() => { layer.innerHTML = ''; }, duration + 900);
  }

  function starBurst(el) {
    if (!el) return;
    const rect = el.getBoundingClientRect();
    for (let i = 0; i < 9; i++) {
      const s = document.createElement('span');
      s.className = 'star-pop';
      s.textContent = '+';
      s.style.cssText = `left:${rect.left + rect.width / 2}px; top:${rect.top + rect.height / 2}px;
        color:${COLORS[(Math.random() * COLORS.length) | 0]};
        --dx:${(Math.random() * 140 - 70) | 0}px; --dy:${(-30 - Math.random() * 70) | 0}px;
        animation-delay:${Math.random() * 150}ms;`;
      document.body.appendChild(s);
      setTimeout(() => s.remove(), 1000);
    }
  }

  global.Art = {
    avatarSVG, AVATAR_KEYS, AVATAR_COLORS, firstLetter,
    categoryStyle, uiIcon, hourglass, confetti, starBurst, COLORS
  };
})(window);
