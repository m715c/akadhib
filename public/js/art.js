/* ============================================================
   art.js — رسومات مسطحة بطبقات وظلال ناعمة
   أفاتارات، ماسكوت ثعلب، أيقونات فئات، أيقونات واجهة، كونفيتي
   ============================================================ */
(function (global) {
  'use strict';

  const S = (inner, vb) =>
    `<svg viewBox="${vb || '0 0 100 100'}" xmlns="http://www.w3.org/2000/svg" fill="none">${inner}</svg>`;

  const INK = '#3c3c3c';

  /* ============================================================
     عناصر وجه مشتركة
     ============================================================ */
  // عين لامعة: بؤبؤ + لمعة كبيرة + لمعة صغيرة (يعطي إحساس عمق)
  const eye = (cx, cy, r = 5) => `
    <ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${r * 1.12}" fill="${INK}"/>
    <circle cx="${cx + r * 0.32}" cy="${cy - r * 0.42}" r="${r * 0.34}" fill="#fff"/>
    <circle cx="${cx - r * 0.34}" cy="${cy + r * 0.4}" r="${r * 0.17}" fill="#fff" opacity=".65"/>`;

  const eyes = (x1, x2, y, r = 5) => eye(x1, y, r) + eye(x2, y, r);

  const smile = (y, w = 9, color = INK, sw = 3) =>
    `<path d="M${50 - w} ${y} Q50 ${y + w} ${50 + w} ${y}" stroke="${color}" stroke-width="${sw}" stroke-linecap="round"/>`;

  const blush = (y, c = '#ff9db5', o = '.5') =>
    `<ellipse cx="24" cy="${y}" rx="7.5" ry="4.2" fill="${c}" opacity="${o}"/>
     <ellipse cx="76" cy="${y}" rx="7.5" ry="4.2" fill="${c}" opacity="${o}"/>`;

  // قرص الخلفية + ظل داخلي خفيف بالأسفل يعطي عمق
  const disc = (color, shade) => `
    <circle cx="50" cy="50" r="50" fill="${color}"/>
    <path d="M0 62a50 50 0 0 0 100 0 50 50 0 0 1-100 0z" fill="${shade || '#000'}" opacity="${shade ? '1' : '.04'}"/>`;

  // ظل ناعم تحت رأس الحيوان
  const dropShadow = (cx, cy, rx) =>
    `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${rx * 0.16}" fill="#000" opacity=".07"/>`;

  /* ============================================================
     الأفاتارات — كل واحد: قرص خلفية + رأس بطبقتين + وجه
     ============================================================ */
  const AVATARS = {
    fox: () => S(`${disc('#ffefe0')}
      <path d="M19 41 L27 15 L46 31 Z" fill="#f27d20"/>
      <path d="M81 41 L73 15 L54 31 Z" fill="#f27d20"/>
      <path d="M24 38 L29 23 L39 32 Z" fill="#ffd0a8"/>
      <path d="M76 38 L71 23 L61 32 Z" fill="#ffd0a8"/>
      ${dropShadow(50, 86, 26)}
      <ellipse cx="50" cy="58" rx="31" ry="28" fill="#ff9a2e"/>
      <path d="M50 86c-9 0-17-2-24-7 6 3 14 5 24 5s18-2 24-5c-7 5-15 7-24 7z" fill="#e8781a" opacity=".35"/>
      <path d="M50 86c-14 0-24-9-27-21 8 5 17 8 27 8s19-3 27-8c-3 12-13 21-27 21z" fill="#fffaf4"/>
      ${eyes(38, 62, 54, 5)}
      <path d="M46.5 67h7a1.6 1.6 0 0 1 1.2 2.6l-3.5 3.4a1.6 1.6 0 0 1-2.4 0l-3.5-3.4A1.6 1.6 0 0 1 46.5 67z" fill="${INK}"/>
      ${smile(77, 6.5)}
      ${blush(64, '#ff7a4d', '.35')}`),

    cat: () => S(`${disc('#f0e9ff')}
      <path d="M21 39 L26 14 L46 30 Z" fill="#9b7ff0"/>
      <path d="M79 39 L74 14 L54 30 Z" fill="#9b7ff0"/>
      <path d="M26 36 L29 22 L39 31 Z" fill="#ffc9e0"/>
      <path d="M74 36 L71 22 L61 31 Z" fill="#ffc9e0"/>
      ${dropShadow(50, 85, 26)}
      <ellipse cx="50" cy="57" rx="31" ry="28" fill="#a78bfa"/>
      <path d="M50 85c-13 0-23-7-27-18 7 4 16 7 27 7s20-3 27-7c-4 11-14 18-27 18z" fill="#8b6fe8" opacity=".28"/>
      ${eyes(38, 62, 53, 5)}
      <path d="M47 65h6a1.4 1.4 0 0 1 1 2.3l-3 2.9a1.4 1.4 0 0 1-2 0l-3-2.9A1.4 1.4 0 0 1 47 65z" fill="#ff85b3"/>
      <path d="M50 70v3M50 73q-4 4-7.5 1M50 73q4 4 7.5 1" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>
      <g stroke="#8b6fe8" stroke-width="2" stroke-linecap="round" opacity=".75">
        <path d="M17 59h13"/><path d="M17 67h13"/><path d="M83 59H70"/><path d="M83 67H70"/>
      </g>${blush(66)}`),

    panda: () => S(`${disc('#eef1f6')}
      <circle cx="25" cy="29" r="11.5" fill="#454b57"/>
      <circle cx="75" cy="29" r="11.5" fill="#454b57"/>
      <circle cx="25" cy="29" r="6" fill="#5d6473"/>
      <circle cx="75" cy="29" r="6" fill="#5d6473"/>
      ${dropShadow(50, 85, 26)}
      <ellipse cx="50" cy="57" rx="31" ry="28" fill="#fff"/>
      <path d="M50 85c-13 0-23-7-27-18 7 4 16 7 27 7s20-3 27-7c-4 11-14 18-27 18z" fill="#e6e9ef"/>
      <ellipse cx="37" cy="53" rx="10" ry="11.5" fill="#454b57" transform="rotate(-14 37 53)"/>
      <ellipse cx="63" cy="53" rx="10" ry="11.5" fill="#454b57" transform="rotate(14 63 53)"/>
      ${eyes(38, 62, 53, 4.2)}
      <ellipse cx="50" cy="68" rx="5" ry="3.6" fill="#454b57"/>
      <path d="M50 71.5v2.5M50 74q-4 4-7 1M50 74q4 4 7 1" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>`),

    frog: () => S(`${disc('#e6f8e1')}
      <circle cx="30" cy="32" r="14" fill="#63cf45"/>
      <circle cx="70" cy="32" r="14" fill="#63cf45"/>
      <circle cx="30" cy="32" r="8.5" fill="#fff"/>
      <circle cx="70" cy="32" r="8.5" fill="#fff"/>
      <circle cx="31" cy="33" r="4.3" fill="${INK}"/>
      <circle cx="71" cy="33" r="4.3" fill="${INK}"/>
      <circle cx="32.5" cy="31" r="1.6" fill="#fff"/>
      <circle cx="72.5" cy="31" r="1.6" fill="#fff"/>
      ${dropShadow(50, 87, 26)}
      <ellipse cx="50" cy="61" rx="31" ry="25" fill="#6fd44f"/>
      <path d="M50 86c-13 0-23-6-27-16 7 4 16 6 27 6s20-2 27-6c-4 10-14 16-27 16z" fill="#4fb537" opacity=".3"/>
      <path d="M33 62Q50 79 67 62" stroke="#3f9c2c" stroke-width="3.4" stroke-linecap="round"/>
      <circle cx="39" cy="55" r="2.2" fill="#4fb537"/><circle cx="61" cy="55" r="2.2" fill="#4fb537"/>
      ${blush(67, '#a8e88c', '.8')}`),

    lion: () => S(`${disc('#fff5dd')}
      <g fill="#f0a02e">${Array.from({ length: 13 }, (_, i) => {
        const a = (i / 13) * Math.PI * 2;
        return `<circle cx="${(50 + Math.cos(a) * 30).toFixed(1)}" cy="${(56 + Math.sin(a) * 28).toFixed(1)}" r="11.5"/>`;
      }).join('')}</g>
      <g fill="#ffb840">${Array.from({ length: 13 }, (_, i) => {
        const a = (i / 13) * Math.PI * 2 + 0.24;
        return `<circle cx="${(50 + Math.cos(a) * 27).toFixed(1)}" cy="${(56 + Math.sin(a) * 25).toFixed(1)}" r="10"/>`;
      }).join('')}</g>
      <ellipse cx="50" cy="56" rx="25" ry="24" fill="#ffdd96"/>
      <path d="M50 80c-11 0-19-5-22-13 6 3 13 5 22 5s16-2 22-5c-3 8-11 13-22 13z" fill="#f5cd7c" opacity=".55"/>
      ${eyes(41, 59, 53, 4.5)}
      <path d="M47 64h6a1.4 1.4 0 0 1 1 2.3l-3 2.9a1.4 1.4 0 0 1-2 0l-3-2.9A1.4 1.4 0 0 1 47 64z" fill="#c07a34"/>
      <path d="M50 69v2.5M50 71.5q-4 3.5-6.5 .5M50 71.5q4 3.5 6.5 .5" stroke="${INK}" stroke-width="2.3" stroke-linecap="round"/>`),

    owl: () => S(`${disc('#f0e9ff')}
      <path d="M22 33 L34 16 L43 32 Z" fill="#7f5fe0"/>
      <path d="M78 33 L66 16 L57 32 Z" fill="#7f5fe0"/>
      ${dropShadow(50, 86, 26)}
      <ellipse cx="50" cy="57" rx="30" ry="29" fill="#8b6fe8"/>
      <path d="M34 74Q50 88 66 74Q50 82 34 74z" fill="#7a5ed8"/>
      <circle cx="39" cy="51" r="12.5" fill="#fff7e2"/>
      <circle cx="61" cy="51" r="12.5" fill="#fff7e2"/>
      <circle cx="39" cy="51" r="7.5" fill="#ffb340" opacity=".35"/>
      <circle cx="61" cy="51" r="7.5" fill="#ffb340" opacity=".35"/>
      ${eyes(39, 61, 51, 5.5)}
      <path d="M50 60l-4.5 6.5h9L50 60z" fill="#ffb340"/>
      <path d="M50 66.5l-3 4h6l-3-4z" fill="#f09a20"/>`),

    penguin: () => S(`${disc('#e2f2fc')}
      ${dropShadow(50, 86, 26)}
      <ellipse cx="50" cy="57" rx="30" ry="29" fill="#3d4a63"/>
      <ellipse cx="50" cy="63" rx="19.5" ry="23" fill="#fff"/>
      <path d="M50 86c-9 0-16-3-19.5-9 5 3 12 4 19.5 4s14.5-1 19.5-4c-3.5 6-10.5 9-19.5 9z" fill="#e8edf5"/>
      ${eyes(41, 59, 50, 4.5)}
      <path d="M44 57h12a1.6 1.6 0 0 1 1.2 2.7l-5.9 5.6a1.8 1.8 0 0 1-2.6 0l-5.9-5.6A1.6 1.6 0 0 1 44 57z" fill="#ffb340"/>
      <path d="M44.5 61h11l-4.2 4a1.8 1.8 0 0 1-2.6 0l-4.2-4z" fill="#f09a20"/>
      ${blush(62, '#ffb3c6', '.7')}`),

    bear: () => S(`${disc('#f6ede3')}
      <circle cx="25" cy="31" r="12.5" fill="#a5744c"/>
      <circle cx="75" cy="31" r="12.5" fill="#a5744c"/>
      <circle cx="25" cy="31" r="6.8" fill="#e5c4a1"/>
      <circle cx="75" cy="31" r="6.8" fill="#e5c4a1"/>
      ${dropShadow(50, 87, 26)}
      <ellipse cx="50" cy="58" rx="30" ry="28" fill="#b58256"/>
      <path d="M50 86c-13 0-23-7-27-17 7 4 16 6 27 6s20-2 27-6c-4 10-14 17-27 17z" fill="#a5744c" opacity=".4"/>
      <ellipse cx="50" cy="69" rx="14.5" ry="11.5" fill="#eed3b3"/>
      ${eyes(39, 61, 52, 4.5)}
      <ellipse cx="50" cy="65.5" rx="4.8" ry="3.6" fill="${INK}"/>
      <path d="M50 69v3M50 72q-4.5 3.5-7 .5M50 72q4.5 3.5 7 .5" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>`),

    monkey: () => S(`${disc('#f7ede2')}
      <circle cx="20" cy="53" r="12.5" fill="#9c6b45"/>
      <circle cx="80" cy="53" r="12.5" fill="#9c6b45"/>
      <circle cx="20" cy="53" r="6.8" fill="#f0cba5"/>
      <circle cx="80" cy="53" r="6.8" fill="#f0cba5"/>
      ${dropShadow(50, 84, 25)}
      <ellipse cx="50" cy="55" rx="29" ry="27" fill="#ac7b52"/>
      <ellipse cx="50" cy="64" rx="21.5" ry="19.5" fill="#f4d3b0"/>
      ${eyes(41, 59, 51, 4.5)}
      <ellipse cx="46" cy="67" rx="2.1" ry="1.5" fill="#a8764e"/>
      <ellipse cx="54" cy="67" rx="2.1" ry="1.5" fill="#a8764e"/>
      <path d="M42 73Q50 80 58 73" stroke="${INK}" stroke-width="2.8" stroke-linecap="round"/>`),

    unicorn: () => S(`${disc('#fdeaf7')}
      <path d="M50 11 L57 33 L43 33 Z" fill="#ffc800"/>
      <path d="M50 15 L53.5 27 L46.5 27 Z" fill="#f0a800"/>
      <path d="M27 36Q18 21 35 26Q44 16 50 28" fill="#ff85c8"/>
      <path d="M73 36Q82 21 65 26Q56 16 50 28" fill="#7bd8ff"/>
      <path d="M31 34Q25 25 36 28" fill="#ffa8d8"/>
      ${dropShadow(50, 87, 25)}
      <ellipse cx="50" cy="59" rx="29" ry="27" fill="#fff"/>
      <path d="M50 86c-12 0-21-6-25-15 6 3 15 5 25 5s19-2 25-5c-4 9-13 15-25 15z" fill="#f6eaf3"/>
      ${eyes(40, 60, 55, 4.5)}
      <ellipse cx="50" cy="71" rx="8" ry="5.5" fill="#ffd9ee"/>
      <ellipse cx="47" cy="70" rx="1.5" ry="2" fill="#d977ae"/>
      <ellipse cx="53" cy="70" rx="1.5" ry="2" fill="#d977ae"/>
      ${blush(64)}`),

    pig: () => S(`${disc('#fdeaf1')}
      <path d="M23 38 L21 18 L42 29 Z" fill="#f593b8"/>
      <path d="M77 38 L79 18 L58 29 Z" fill="#f593b8"/>
      ${dropShadow(50, 87, 26)}
      <ellipse cx="50" cy="58" rx="30" ry="27" fill="#ffbcd6"/>
      <path d="M50 85c-13 0-22-6-26-16 7 4 16 6 26 6s19-2 26-6c-4 10-13 16-26 16z" fill="#f593b8" opacity=".35"/>
      ${eyes(39, 61, 51, 4.5)}
      <ellipse cx="50" cy="69" rx="12" ry="9" fill="#ff94bd"/>
      <ellipse cx="50" cy="67.5" rx="10.5" ry="7" fill="#ffa8c9"/>
      <ellipse cx="46" cy="69" rx="2.2" ry="3.1" fill="#d4658d"/>
      <ellipse cx="54" cy="69" rx="2.2" ry="3.1" fill="#d4658d"/>
      ${blush(59, '#ff8fb5')}`),

    shark: () => S(`${disc('#e2f0fb')}
      <path d="M50 13 L63 36 L37 36 Z" fill="#3f83c9"/>
      ${dropShadow(50, 87, 26)}
      <ellipse cx="50" cy="59" rx="30" ry="27" fill="#63a9e8"/>
      <path d="M50 86c-15 0-26-10-28-22 8 6 17 9 28 9s20-3 28-9c-2 12-13 22-28 22z" fill="#e4f2ff"/>
      ${eyes(38, 62, 51, 4.5)}
      <path d="M30 67Q50 82 70 67Q50 74 30 67z" fill="#fff"/>
      <path d="M30 67Q50 82 70 67" stroke="#3f83c9" stroke-width="2" fill="none"/>
      <g fill="#fff">${[36, 43, 50, 57, 64].map(x => `<path d="M${x} 69l2.4 4 2.4-4z"/>`).join('')}</g>`)
  };

  const AVATAR_KEYS = Object.keys(AVATARS);
  const avatarSVG = (key) => (AVATARS[key] || AVATARS.fox)();

  /* ============================================================
     الماسكوت: ثعلب — رمز الخداع باللعبة
     ============================================================ */
  function mascot(mood = 'happy') {
    const F = {
      happy: `${mEyes(0)}${mSmile(80, 11)}`,

      think: `${mEyes(-1)}
        <path d="M52 82Q60 78 68 83" stroke="${INK}" stroke-width="3.4" stroke-linecap="round"/>
        <circle cx="100" cy="38" r="4" fill="#e4e4ec"/>
        <circle cx="110" cy="27" r="6.5" fill="#e4e4ec"/>`,

      shock: `<ellipse cx="46" cy="63" rx="8" ry="9" fill="#fff"/>
        <ellipse cx="70" cy="63" rx="8" ry="9" fill="#fff"/>
        <circle cx="46" cy="64" r="4.4" fill="${INK}"/>
        <circle cx="70" cy="64" r="4.4" fill="${INK}"/>
        <ellipse cx="58" cy="83" rx="6.5" ry="8" fill="${INK}"/>
        <ellipse cx="58" cy="86" rx="3.5" ry="4" fill="#ff85b3"/>`,

      sad: `${mEyes(2)}
        <path d="M50 86Q58 78 66 86" stroke="${INK}" stroke-width="3.4" stroke-linecap="round"/>
        <path d="M42 69q-2.5 8 1.5 11.5" stroke="#1cb0f6" stroke-width="3.4" stroke-linecap="round"/>`,

      party: `<path d="M38 60q8 -9 16 0" stroke="${INK}" stroke-width="3.6" stroke-linecap="round"/>
        <path d="M62 60q8 -9 16 0" stroke="${INK}" stroke-width="3.6" stroke-linecap="round"/>
        <path d="M46 76Q58 94 70 76 Z" fill="${INK}"/>
        <path d="M52 87q6 6 12 -3" fill="#ff85b3"/>`,

      sneaky: `<path d="M38 60q8 -5 16 -1" stroke="${INK}" stroke-width="3.4" stroke-linecap="round"/>
        <circle cx="46" cy="66" r="4" fill="${INK}"/><circle cx="70" cy="66" r="4" fill="${INK}"/>
        <circle cx="47.3" cy="64.8" r="1.4" fill="#fff"/><circle cx="71.3" cy="64.8" r="1.4" fill="#fff"/>
        <path d="M62 59q8 -4 16 1" stroke="${INK}" stroke-width="3.4" stroke-linecap="round"/>
        <path d="M49 82Q58 88 70 79" stroke="${INK}" stroke-width="3.4" stroke-linecap="round"/>`
    }[mood] || '';

    return S(`
      <ellipse cx="58" cy="128" rx="30" ry="5.5" fill="#000" opacity=".08"/>
      <path d="M24 45 L33 12 L58 33 Z" fill="#f27d20"/>
      <path d="M92 45 L83 12 L58 33 Z" fill="#f27d20"/>
      <path d="M31 42 L37 21 L50 35 Z" fill="#ffd0a8"/>
      <path d="M85 42 L79 21 L66 35 Z" fill="#ffd0a8"/>
      <ellipse cx="58" cy="73" rx="37" ry="35" fill="#ff9a2e"/>
      <path d="M58 108c-11 0-20-3-28-9 8 4 17 6 28 6s20-2 28-6c-8 6-17 9-28 9z" fill="#e8781a" opacity=".3"/>
      <path d="M58 108c-18 0-30-12-33-26 10 7 21 10 33 10s23-3 33-10c-3 14-15 26-33 26z" fill="#fffaf4"/>
      <ellipse cx="24" cy="77" rx="7.5" ry="4.5" fill="#ff7a4d" opacity=".38"/>
      <ellipse cx="92" cy="77" rx="7.5" ry="4.5" fill="#ff7a4d" opacity=".38"/>
      ${F}
      <path d="M53 70h10a2 2 0 0 1 1.5 3.3l-4.9 4.8a2.2 2.2 0 0 1-3.2 0l-4.9-4.8A2 2 0 0 1 53 70z" fill="${INK}"/>
    `, '0 0 116 136');

    function mEyes(dy) {
      return `<ellipse cx="46" cy="${64 + dy}" rx="5.6" ry="6.6" fill="${INK}"/>
              <ellipse cx="70" cy="${64 + dy}" rx="5.6" ry="6.6" fill="${INK}"/>
              <circle cx="48" cy="${61.5 + dy}" r="2.1" fill="#fff"/>
              <circle cx="72" cy="${61.5 + dy}" r="2.1" fill="#fff"/>
              <circle cx="44.5" cy="${66.5 + dy}" r="1" fill="#fff" opacity=".6"/>
              <circle cx="68.5" cy="${66.5 + dy}" r="1" fill="#fff" opacity=".6"/>`;
    }
    function mSmile(y, w) {
      return `<path d="M${58 - w} ${y}Q58 ${y + w} ${58 + w} ${y}" stroke="${INK}" stroke-width="3.6" stroke-linecap="round"/>`;
    }
  }

  /* ============================================================
     أيقونات الفئات — مشهد صغير بطبقات، مو شكل مسطح واحد
     ============================================================ */
  const ICONS = {
    // بصمة كف حيوان
    animals: () => S(`
      <circle cx="50" cy="50" r="50" fill="#fff1e0"/>
      <circle cx="50" cy="50" r="41" fill="#ffe2c4"/>
      <ellipse cx="33" cy="35" rx="8" ry="10" fill="#e8781a" transform="rotate(-16 33 35)"/>
      <ellipse cx="50" cy="30" rx="8" ry="10.5" fill="#e8781a"/>
      <ellipse cx="67" cy="35" rx="8" ry="10" fill="#e8781a" transform="rotate(16 67 35)"/>
      <ellipse cx="78" cy="52" rx="7.5" ry="9" fill="#e8781a" transform="rotate(32 78 52)"/>
      <path d="M50 46c11 0 20 8 20 17 0 8-6 12-13 12-3 0-5-1-7-1s-4 1-7 1c-7 0-13-4-13-12 0-9 9-17 20-17z" fill="#ff9a2e"/>
      <ellipse cx="43" cy="60" rx="4" ry="3" fill="#fff" opacity=".35"/>`),

    // لفافة قديمة مع ختم
    history: () => S(`
      <circle cx="50" cy="50" r="50" fill="#fff8e4"/>
      <circle cx="50" cy="50" r="41" fill="#ffeec2"/>
      <path d="M30 26h42v46a8 8 0 0 1-8 8H26a8 8 0 0 0 8-8z" fill="#fffaf0"/>
      <path d="M30 26a8 8 0 0 0-8 8v38a8 8 0 0 1 8-8z" fill="#e8cf9a"/>
      <path d="M64 80H26a8 8 0 0 0 8-8h38a8 8 0 0 1-8 8z" fill="#e8cf9a"/>
      <g stroke="#c9a34a" stroke-width="3.2" stroke-linecap="round" opacity=".9">
        <path d="M41 40h22"/><path d="M41 50h22"/><path d="M41 60h13"/>
      </g>
      <circle cx="66" cy="63" r="8.5" fill="#e05252"/>
      <circle cx="66" cy="63" r="5" fill="#c33d3d"/>`),

    // صاروخ بلهب
    space: () => S(`
      <circle cx="50" cy="50" r="50" fill="#e9f1ff"/>
      <circle cx="50" cy="50" r="41" fill="#d6e6ff"/>
      <circle cx="24" cy="27" r="2.6" fill="#ffc800"/>
      <circle cx="78" cy="31" r="3.4" fill="#ffc800"/>
      <circle cx="73" cy="72" r="2.2" fill="#ffc800"/>
      <path d="M31 55l-8 15 12-4z" fill="#f27d20"/>
      <path d="M69 55l8 15-12-4z" fill="#f27d20"/>
      <path d="M50 16c10 10 15 24 15 38l-5 12H40l-5-12c0-14 5-28 15-38z" fill="#fff"/>
      <path d="M50 16c10 10 15 24 15 38l-5 12H50V16z" fill="#e3e9f5"/>
      <circle cx="50" cy="44" r="8.5" fill="#1cb0f6"/>
      <circle cx="50" cy="44" r="5.5" fill="#5ec9fb"/>
      <path d="M43 70h14l-3 8h-8z" fill="#ffc800"/>
      <path d="M46 78h8l-4 9z" fill="#f27d20"/>`),

    // برجر بطبقات
    food: () => S(`
      <circle cx="50" cy="50" r="50" fill="#fff1e6"/>
      <circle cx="50" cy="50" r="41" fill="#ffe0cc"/>
      <path d="M24 48c0-13 12-22 26-22s26 9 26 22z" fill="#f5a63c"/>
      <path d="M24 48c0-13 12-22 26-22v22z" fill="#ffb857"/>
      <circle cx="38" cy="36" r="1.8" fill="#fff3dc"/>
      <circle cx="50" cy="32" r="1.8" fill="#fff3dc"/>
      <circle cx="62" cy="37" r="1.8" fill="#fff3dc"/>
      <rect x="22" y="48" width="56" height="8" rx="4" fill="#6fd44f"/>
      <rect x="24" y="55" width="52" height="10" rx="4" fill="#a5744c"/>
      <rect x="22" y="64" width="56" height="7" rx="3.5" fill="#ffd34d"/>
      <path d="M24 71h52c0 9-12 14-26 14s-26-5-26-14z" fill="#f5a63c"/>`),

    // كأس بطولة
    sports: () => S(`
      <circle cx="50" cy="50" r="50" fill="#fff8e0"/>
      <circle cx="50" cy="50" r="41" fill="#fff0bf"/>
      <path d="M36 22h28v16c0 8-6 14-14 14s-14-6-14-14z" fill="#ffc800"/>
      <path d="M50 22h14v16c0 8-6 14-14 14z" fill="#f0ad00"/>
      <path d="M36 26h-8v6c0 6 4 10 9 11" stroke="#ffc800" stroke-width="4.5" stroke-linecap="round"/>
      <path d="M64 26h8v6c0 6-4 10-9 11" stroke="#ffc800" stroke-width="4.5" stroke-linecap="round"/>
      <rect x="45" y="52" width="10" height="12" fill="#f0ad00"/>
      <rect x="34" y="64" width="32" height="9" rx="3.5" fill="#f27d20"/>
      <rect x="30" y="72" width="40" height="8" rx="3.5" fill="#e8781a"/>
      <path d="M46 32l1.6 3.4 3.7.5-2.7 2.6.7 3.7-3.3-1.8-3.3 1.8.7-3.7-2.7-2.6 3.7-.5z" fill="#fff" opacity=".7"/>`)
  };

  const categoryIcon = (key) => (ICONS[key] || ICONS.space)();

  /* ============================================================
     أيقونات الواجهة — بدل الإيموجي
     ============================================================ */
  const UI = {
    close: (c = 'currentColor') =>
      S(`<path d="M6 6l12 12M18 6L6 18" stroke="${c}" stroke-width="2.6" stroke-linecap="round"/>`, '0 0 24 24'),

    link: (c = 'currentColor') =>
      S(`<path d="M9.5 14.5l5-5M8 12l-2 2a3.5 3.5 0 0 0 5 5l2-2M16 12l2-2a3.5 3.5 0 0 0-5-5l-2 2"
           stroke="${c}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`, '0 0 24 24'),

    crown: () => S(`
      <path d="M3 8l4 3.5L12 5l5 6.5L21 8l-1.6 10H4.6z" fill="#ffc800"/>
      <path d="M4.6 18h14.8l-.3 2H4.9z" fill="#f0ad00"/>
      <circle cx="3" cy="7" r="1.7" fill="#f0ad00"/>
      <circle cx="21" cy="7" r="1.7" fill="#f0ad00"/>
      <circle cx="12" cy="4" r="1.9" fill="#f0ad00"/>`, '0 0 24 24'),

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

    trophy: () => S(`
      <path d="M7 4h10v6a5 5 0 0 1-10 0z" fill="#ffc800"/>
      <path d="M12 4h5v6a5 5 0 0 1-5 5z" fill="#f0ad00"/>
      <path d="M7 5.5H4.5V8A3.5 3.5 0 0 0 7.6 11.5" stroke="#ffc800" stroke-width="2" stroke-linecap="round"/>
      <path d="M17 5.5h2.5V8a3.5 3.5 0 0 1-3.1 3.5" stroke="#ffc800" stroke-width="2" stroke-linecap="round"/>
      <rect x="10.5" y="14.5" width="3" height="3.5" fill="#f0ad00"/>
      <rect x="7" y="18" width="10" height="2.6" rx="1.2" fill="#f27d20"/>`, '0 0 24 24'),

    medal: (place) => {
      const c = place === 1 ? ['#ffd54a', '#f0ad00'] : place === 2 ? ['#d8dde3', '#b3bac2'] : ['#e8a877', '#cd8b5b'];
      return S(`<circle cx="12" cy="14" r="7.5" fill="${c[0]}"/>
        <circle cx="12" cy="14" r="5" fill="${c[1]}"/>
        <path d="M8 2h3l2 4h-3zM16 2h-3l-2 4h3z" fill="#1cb0f6"/>`, '0 0 24 24');
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

    bulb: () => S(`
      <path d="M12 3a6.5 6.5 0 0 1 4 11.6V17H8v-2.4A6.5 6.5 0 0 1 12 3z" fill="#ffc800"/>
      <rect x="8.5" y="17.5" width="7" height="2.2" rx="1.1" fill="#c9a34a"/>
      <rect x="9.5" y="20.3" width="5" height="2" rx="1" fill="#c9a34a"/>`, '0 0 24 24'),

    target: () => S(`
      <circle cx="12" cy="12" r="9" fill="#ffdfe0"/>
      <circle cx="12" cy="12" r="6" fill="#fff"/>
      <circle cx="12" cy="12" r="3" fill="#ff4b4b"/>`, '0 0 24 24')
  };

  const uiIcon = (name, color) => (UI[name] ? UI[name](color) : '');

  /* ============================================================
     ساعة رملية للمؤقت
     ============================================================ */
  function hourglass() {
    return S(`
      <path d="M28 14h44M28 86h44" stroke="#c9cdd6" stroke-width="8" stroke-linecap="round"/>
      <path d="M34 16q0 22 18 34-18 12-18 34h32q0-22-18-34 18-12 18-34z" fill="#eef1f6"/>
      <path class="sand-top" d="M38 22h24q0 15-12 25-12-10-12-25z" fill="#1cb0f6"/>
      <path class="sand-bot" d="M40 80q0-14 10-22 10 8 10 22z" fill="#1cb0f6"/>
      <rect x="49" y="48" width="2.4" height="24" fill="#1cb0f6" opacity=".7"/>`);
  }

  /* ============================================================
     الكونفيتي والنجوم
     ============================================================ */
  const COLORS = ['#58cc02', '#1cb0f6', '#ffc800', '#ff9600', '#ce82ff', '#ff4b4b', '#2ec4b6'];

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
      s.textContent = '★';
      s.style.cssText = `left:${rect.left + rect.width / 2}px; top:${rect.top + rect.height / 2}px;
        color:${COLORS[(Math.random() * COLORS.length) | 0]};
        --dx:${(Math.random() * 140 - 70) | 0}px; --dy:${(-30 - Math.random() * 70) | 0}px;
        animation-delay:${Math.random() * 150}ms;`;
      document.body.appendChild(s);
      setTimeout(() => s.remove(), 1000);
    }
  }

  global.Art = {
    avatarSVG, AVATAR_KEYS, mascot, categoryIcon, uiIcon, hourglass,
    confetti, starBurst, COLORS
  };
})(window);
