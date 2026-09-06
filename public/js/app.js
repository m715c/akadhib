/* ============================================================
   app.js — منطق الواجهة والاتصال بالسيرفر
   ============================================================ */
(function () {
  'use strict';

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));
  const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  };
  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  // أرقام غربية: أوضح بالقراءة، وخصوصاً الصفر (الصفر العربي ٠ يشبه نقطة بلوحة النقاط)
  const AR_NUM = (n) => String(n);

  /* ---------- التخزين المحلي (لكل تبويب) ---------- */
  const store = {
    get(k, def) {
      try { return JSON.parse(sessionStorage.getItem('fib_' + k)) ?? def; }
      catch { return def; }
    },
    set(k, v) {
      try { sessionStorage.setItem('fib_' + k, JSON.stringify(v)); } catch {}
    },
    del(k) { try { sessionStorage.removeItem('fib_' + k); } catch {} }
  };
  // الاسم والأفاتار يضلون محفوظين بين الجلسات
  const prefs = {
    get(k, def) { try { return JSON.parse(localStorage.getItem('fib_' + k)) ?? def; } catch { return def; } },
    set(k, v) { try { localStorage.setItem('fib_' + k, JSON.stringify(v)); } catch {} }
  };

  /* ---------- الحالة ---------- */
  const app = {
    socket: null,
    state: null,
    prevState: null,
    playerId: store.get('playerId', null),
    roomCode: store.get('roomCode', null),
    avatar: prefs.get('avatar', null),
    name: prefs.get('name', ''),
    clockOffset: 0,
    tickHandle: null,
    lastPhase: null,
    lastScores: {},
    connected: false
  };

  /* ============================================================
     أدوات الواجهة
     ============================================================ */
  function showScreen(id) {
    $$('.screen').forEach(s => s.classList.toggle('active', s.id === id));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function toast(text, kind = 'info', ms = 2600) {
    const stack = $('#toasts');
    const t = el('div', 'toast ' + kind, esc(text));
    stack.appendChild(t);
    setTimeout(() => {
      t.classList.add('out');
      setTimeout(() => t.remove(), 320);
    }, ms);
  }

  function overlay(show, text) {
    const o = $('#overlay');
    if (show) {
      $('#overlay-text').textContent = text || '...';
      o.hidden = false;
    } else {
      o.hidden = true;
    }
  }

  function avatarOf(player) {
    return Art.avatarSVG(player && player.avatar, player && player.name);
  }

  function playerById(id) {
    if (!app.state) return null;
    return app.state.players.find(p => p.id === id) || null;
  }

  /* ============================================================
     المؤقت الموحد (يعتمد وكت السيرفر)
     ============================================================ */
  function remainingSeconds() {
    if (!app.state || !app.state.phaseEndsAt) return 0;
    const now = Date.now() + app.clockOffset;
    return Math.max(0, Math.ceil((app.state.phaseEndsAt - now) / 1000));
  }

  function startTicking() {
    stopTicking();
    app.tickHandle = setInterval(renderTimers, 200);
    renderTimers();
  }

  function stopTicking() {
    if (app.tickHandle) clearInterval(app.tickHandle);
    app.tickHandle = null;
  }

  // نسبة الوكت المتبقي (0 إلى 1) للشريط المتناقص
  function remainingRatio() {
    const s = app.state;
    if (!s || !s.phaseEndsAt || !s.phaseDuration) return 0;
    const now = Date.now() + app.clockOffset;
    return Math.max(0, Math.min(1, (s.phaseEndsAt - now) / (s.phaseDuration * 1000)));
  }

  // شريط تقدم الجولات بأعلى الشاشة
  function setRoundBar(id) {
    const s = app.state;
    const bar = $(id);
    if (!bar || !s.totalRounds) return;
    bar.style.width = Math.round((s.round / s.totalRounds) * 100) + '%';
  }

  function renderTimers() {
    if (!app.state) return;
    const secs = remainingSeconds();
    const phase = app.state.phase;
    const ratio = remainingRatio();

    if (phase === 'bluff' || phase === 'voting') {
      const p = phase === 'bluff' ? 'bluff' : 'vote';
      const n = $('#' + p + '-timer');
      n.textContent = AR_NUM(secs);
      n.classList.toggle('danger', secs <= 3);
      const bar = $('#' + p + '-timerbar');
      bar.classList.toggle('low', secs <= 5);
      $('#' + p + '-glass').classList.toggle('low', secs <= 10);
      bar.firstElementChild.style.width = (ratio * 100) + '%';
      setRoundBar('#' + p + '-pbar');
    } else if (phase === 'category') {
      $('#cat-timer').innerHTML = Art.uiIcon('clock') + '<span>' + AR_NUM(secs) + ' ث</span>';
      setRoundBar('#cat-pbar');
    } else if (phase === 'reveal') {
      $('#reveal-timer').innerHTML = Art.uiIcon('clock') + '<span>' + AR_NUM(secs) + ' ث</span>';
      setRoundBar('#reveal-pbar');
    }
  }

  /* ============================================================
     شاشة البداية
     ============================================================ */
  function buildAvatarPicker() {
    const wrap = $('#avatar-picker');
    wrap.innerHTML = '';
    if (!app.avatar) app.avatar = Art.AVATAR_KEYS[Math.floor(Math.random() * Art.AVATAR_KEYS.length)];
    const typed = $('#input-name').value.trim() || app.name || '';
    Art.AVATAR_KEYS.forEach(key => {
      const b = el('button', 'avatar-opt' + (key === app.avatar ? ' selected' : ''), Art.avatarSVG(key, typed));
      b.type = 'button';
      b.dataset.avatar = key;
      b.addEventListener('click', () => {
        app.avatar = key;
        prefs.set('avatar', key);
        $$('.avatar-opt').forEach(o => o.classList.toggle('selected', o.dataset.avatar === key));
        if (app.state && app.state.phase === 'lobby') {
          app.socket.emit('player:update', { avatar: key });
        }
      });
      wrap.appendChild(b);
    });
  }

  // كل أيقونات الواجهة الثابتة تنزرع مرة وحدة عند الإقلاع
  function paintStaticIcons() {
    const map = {
      '#btn-leave-lobby': ['close'],
      '#btn-copy-link': ['link'],
      '#btn-rules-back': ['back'],
      '#rules-icon': ['book', '#1073a8'],
      '#ri-target': ['target'],
      '#ri-users': ['users', '#1073a8'],
      '#ri-book': ['book', '#3c3c3c'],
      '#ri-check': ['check'],
      '#ri-bulb': ['bulb'],
      '#ri-pen': ['pen', '#3c3c3c'],
      '#ri-clock': ['clock', '#3c3c3c'],
      '#truth-icon': ['check', '#458500']
    };
    for (const sel in map) {
      const node = $(sel);
      if (node) node.innerHTML = Art.uiIcon(map[sel][0], map[sel][1]);
    }
  }

  function initHome() {
    paintStaticIcons();
    buildAvatarPicker();
    $('#input-name').value = app.name || '';

    // كود من الرابط
    const params = new URLSearchParams(location.search);
    const fromUrl = (params.get('room') || params.get('code') || location.hash.replace('#', '')).toUpperCase().trim();
    if (fromUrl && /^[A-Z0-9]{4,6}$/.test(fromUrl)) {
      $('#input-code').value = fromUrl;
      $('#home-hint').textContent = 'اكتب اسمك وادخل للغرفة ' + fromUrl;
    }
  }

  function homeError(msg) {
    const h = $('#home-hint');
    h.textContent = msg;
    h.classList.add('error');
    shake($('#screen-home .card'));
    setTimeout(() => h.classList.remove('error'), 2500);
  }

  // اهتزاز قصير للفت الانتباه عند الخطأ
  function shake(node) {
    if (!node) return;
    node.classList.remove('shake');
    void node.offsetWidth;   // إعادة تشغيل الأنيميشن
    node.classList.add('shake');
    setTimeout(() => node.classList.remove('shake'), 500);
  }

  function readName() {
    const name = $('#input-name').value.trim();
    if (!name) { homeError('اكتب اسمك أول'); $('#input-name').focus(); return null; }
    app.name = name;
    prefs.set('name', name);
    return name;
  }

  /* ============================================================
     الاتصال
     ============================================================ */
  function connect() {
    app.socket = io({ transports: ['websocket', 'polling'] });

    app.socket.on('connect', () => {
      app.connected = true;
      overlay(false);
      // إعادة الانضمام التلقائي بعد انقطاع أو تحديث الصفحة
      if (app.roomCode && app.playerId) {
        app.socket.emit('room:join', {
          code: app.roomCode,
          playerId: app.playerId,
          name: app.name,
          avatar: app.avatar
        }, (res) => {
          if (!res || res.error) {
            store.del('roomCode'); store.del('playerId');
            app.roomCode = null; app.playerId = null; app.state = null;
            showScreen('screen-home');
          }
        });
      }
    });

    app.socket.on('disconnect', () => {
      app.connected = false;
      stopTicking();
      if (app.roomCode) overlay(true, 'انقطع الاتصال... نحاول نرجع');
    });

    app.socket.on('connect_error', () => {
      overlay(true, 'ما نكدر نوصل للسيرفر...', 'sad');
    });

    app.socket.on('state', (state) => {
      app.clockOffset = state.serverNow - Date.now();
      app.prevState = app.state;
      app.state = state;
      app.playerId = state.youId;
      app.roomCode = state.code;
      store.set('playerId', state.youId);
      store.set('roomCode', state.code);
      render();
    });

    app.socket.on('toast', (t) => {
      if (t && t.text) toast(t.text, t.kind || 'info');
    });
  }

  /* ============================================================
     الرسم الرئيسي
     ============================================================ */
  function render() {
    const s = app.state;
    if (!s) return;
    const phaseChanged = app.lastPhase !== s.phase;

    switch (s.phase) {
      case 'lobby': renderLobby(s); showScreen('screen-lobby'); break;
      case 'category': renderCategory(s); showScreen('screen-category'); break;
      case 'intro': renderIntro(s); showScreen('screen-intro'); break;
      case 'bluff': renderBluff(s, phaseChanged); showScreen('screen-bluff'); break;
      case 'voting': renderVoting(s, phaseChanged); showScreen('screen-voting'); break;
      case 'reveal': renderReveal(s, phaseChanged); showScreen('screen-reveal'); break;
      case 'final': renderFinal(s, phaseChanged); showScreen('screen-final'); break;
    }

    app.lastPhase = s.phase;
    if (['bluff', 'voting', 'category', 'reveal'].includes(s.phase)) startTicking();
    else stopTicking();
  }

  /* ---------- اللوبي ---------- */
  function renderLobby(s) {
    $('#lobby-code').textContent = s.code;

    const grid = $('#lobby-players');
    grid.innerHTML = '';
    s.players.forEach(p => {
      const chip = el('div', 'player-chip' + (p.id === s.youId ? ' you' : '') + (p.connected ? '' : ' disconnected'));
      chip.innerHTML =
        avatarOf(p) +
        `<div class="pname">${esc(p.name)}</div>` +
        (p.isHost ? `<span class="badge" title="المضيف">${Art.uiIcon('crown')}</span>` : '');
      grid.appendChild(chip);
    });

    const count = s.players.length;
    const need = s.config.minPlayers;
    $('#lobby-title').textContent = count >= need ? 'جاهزين للعب!' : 'بانتظار اللاعبين...';
    $('#lobby-sub').textContent = count >= need
      ? `${AR_NUM(count)} لاعبين بالغرفة`
      : `تحتاج ${AR_NUM(need - count)} لاعب بعد (${AR_NUM(count)}/${AR_NUM(need)})`;

    // إعدادات المضيف
    const hs = $('#host-settings');
    hs.hidden = !s.isHost;
    if (s.isHost) {
      const r = s.settings.rounds;
      $('#set-rounds').textContent = r > 0 ? AR_NUM(r) + ' جولة' : 'تلقائي (' + AR_NUM(count) + ')';
      $('#set-bluff').textContent = AR_NUM(s.settings.bluffSeconds) + ' ث';
      $('#set-vote').textContent = AR_NUM(s.settings.voteSeconds) + ' ث';
    }

    const btn = $('#btn-start');
    btn.hidden = !s.isHost;
    btn.disabled = count < need;
    btn.classList.toggle('ready', s.isHost && count >= need);
    $('#lobby-hint').textContent = s.isHost
      ? (count < need ? `لازم ${AR_NUM(need)} لاعبين على الأقل` : '')
      : 'ننتظر المضيف يبدي اللعبة...';
  }

  /* ---------- اختيار الفئة ---------- */
  function renderCategory(s) {
    $('#cat-round').textContent = `الجولة ${AR_NUM(s.round)}/${AR_NUM(s.totalRounds)}`;
    const c = s.category || { choices: [] };
    const mine = c.isYourTurn;
    $('#cat-title').textContent = mine ? 'دورك! اختار الفئة' : `${c.chooserName} يختار الفئة...`;

    const grid = $('#category-grid');
    grid.innerHTML = '';
    c.choices.forEach((cat, i) => {
      const card = el('button', 'cat-card' + (mine ? '' : ' locked'));
      card.type = 'button';
      card.style.animationDelay = (i * 60) + 'ms';
      const st = Art.categoryStyle(cat.icon);
      card.style.setProperty('--accent', st.accent);
      card.style.setProperty('--tint', st.tint);
      card.innerHTML = '<span class="cat-bar"></span>' + `<div class="cname">${esc(cat.name)}</div>`;
      if (mine) {
        card.addEventListener('click', () => {
          $$('.cat-card').forEach(x => x.classList.add('locked'));
          card.classList.add('chosen');
          app.socket.emit('game:category', { category: cat.name }, (res) => {
            if (res && res.error) toast(res.error, 'error');
          });
        });
      }
      grid.appendChild(card);
    });

    $('#cat-hint').textContent = mine ? 'اختار بسرعة قبل ما يخلص الوكت!' : 'استنى شوية...';
  }

  /* ---------- عرض السؤال ---------- */
  function renderIntro(s) {
    const q = s.question || {};
    const ist = Art.categoryStyle(q.icon);
    $('#intro-cat').innerHTML =
      `<span class="cat-chip" style="background:${ist.tint};color:${ist.accent}">${esc(q.category || '')}</span>`;
    $('#intro-question').textContent = q.text || '';
  }

  /* ---------- كتابة الجواب الغلط ---------- */
  function renderBluff(s, phaseChanged) {
    const q = s.question || {};
    $('#bluff-round').textContent = `الجولة ${AR_NUM(s.round)}/${AR_NUM(s.totalRounds)}`;
    $('#bluff-question').textContent = q.text || '';
    $('#bluff-glass').innerHTML = Art.hourglass();
    $('#bluff-done').innerHTML = Art.uiIcon('check');

    const b = s.bluff || {};
    $('#bluff-counter').innerHTML = Art.uiIcon('pen') + `<span>${AR_NUM(b.submittedCount || 0)}/${AR_NUM(b.total || 0)}</span>`;

    const input = $('#input-bluff');
    if (phaseChanged) {
      input.value = '';
      input.disabled = false;
      $('#btn-bluff').disabled = false;
      $('#bluff-count').textContent = '0 / ' + input.maxLength;
      $('#bluff-count').classList.remove('near');
      setTimeout(() => { if (!b.submitted) input.focus(); }, 250);
    }

    const done = !!b.submitted;
    $('.bluff-input-wrap').hidden = done;
    $('#bluff-hint').hidden = done;
    $('#bluff-waiting').hidden = !done;
    if (done) $('#bluff-your').textContent = b.yourAnswer || '';
  }

  function sendBluff() {
    const input = $('#input-bluff');
    const text = input.value.trim();
    if (!text) { toast('اكتب شي أول', 'error'); shake(input); input.focus(); return; }
    $('#btn-bluff').disabled = true;
    app.socket.emit('game:bluff', { text }, (res) => {
      if (res && res.error) {
        toast(res.error, 'error');
        $('#btn-bluff').disabled = false;
      }
    });
  }

  /* ---------- التصويت ---------- */
  function renderVoting(s, phaseChanged) {
    const q = s.question || {};
    $('#vote-round').textContent = `الجولة ${AR_NUM(s.round)}/${AR_NUM(s.totalRounds)}`;
    $('#vote-question').textContent = q.text || '';
    $('#vote-glass').innerHTML = Art.hourglass();

    const v = s.voting || { answers: [], yourAnswerIds: [] };
    $('#vote-counter').innerHTML = Art.uiIcon('vote') + `<span>${AR_NUM(v.votedCount || 0)}/${AR_NUM(v.total || 0)}</span>`;

    const list = $('#answers-list');
    list.innerHTML = '';
    v.answers.forEach((a, i) => {
      const isMine = (v.yourAnswerIds || []).includes(a.id);
      const isSelected = v.votedAnswerId === a.id;
      const btn = el('button', 'bubble' + (isMine ? ' mine' : '') + (isSelected ? ' selected' : ''));
      btn.type = 'button';
      btn.style.animationDelay = (i * 70) + 'ms';
      btn.innerHTML = `<span class="btext">${esc(a.text)}</span>` +
        (isMine ? '<span class="tag">جوابك</span>' : '');
      btn.disabled = isMine || !!v.votedAnswerId;
      if (!btn.disabled) {
        btn.addEventListener('click', () => {
          $$('.bubble').forEach(x => { x.disabled = true; });
          btn.classList.add('selected');
          app.socket.emit('game:vote', { answerId: a.id }, (res) => {
            if (res && res.error) {
              toast(res.error, 'error');
              btn.classList.remove('selected');
              shake(btn);
              render();
            }
          });
        });
      }
      list.appendChild(btn);
    });

    if (v.wroteExact) {
      $('#vote-hint').textContent = 'صدفة حلوة! كتبت الجواب الصحيح، خذيت نقطة';
    } else if (v.votedAnswerId) {
      $('#vote-hint').textContent = 'صوتك وصل! ننتظر الباقين...';
    } else {
      $('#vote-hint').textContent = 'ما تكدر تصوت على جوابك انته';
    }
  }

  /* ---------- نتيجة الجولة ---------- */
  function renderReveal(s, phaseChanged) {
    const r = s.reveal;
    if (!r) return;
    $('#reveal-round').textContent = `الجولة ${AR_NUM(s.round)}/${AR_NUM(s.totalRounds)}`;
    $('#reveal-correct').textContent = r.correctAnswer;
    $('#reveal-question').textContent = r.question;

    const list = $('#reveal-list');
    list.innerHTML = '';

    // الجواب الصحيح أول، بعدين الأجوبة اللي انخدع بيها الناس
    const sorted = r.answers.slice().sort((a, b) => {
      if (a.isCorrect !== b.isCorrect) return a.isCorrect ? -1 : 1;
      return b.voterIds.length - a.voterIds.length;
    });

    sorted.forEach((a, i) => {
      const item = el('div', 'reveal-item' + (a.isCorrect ? ' correct' : ''));
      item.style.animationDelay = (i * 90) + 'ms';

      const authors = a.isCorrect
        ? '<span class="mini-tag author">هاي الحقيقة</span>'
        : a.ownerIds.map(id => {
            const p = playerById(id);
            if (!p) return '';
            // الأجوبة التلقائية ما تنطي نقاط لصاحبها
            const gain = a.auto ? 0 : a.voterIds.length;
            return `<span class="mini-tag author">${avatarOf(p)}${esc(p.name)}${gain ? ' +' + AR_NUM(gain) : ''}</span>`;
          }).join('');

      const voters = a.voterIds.map(id => {
        const p = playerById(id);
        return p ? `<span class="mini-tag voter">${avatarOf(p)}${esc(p.name)}</span>` : '';
      }).join('');

      item.innerHTML =
        `<div class="rtext">${esc(a.text)}${a.auto && !a.isCorrect ? ' <span class="tag">جواب تلقائي</span>' : ''}</div>` +
        `<div class="reveal-meta"><span class="meta-label">${a.isCorrect ? '' : 'كتبه:'}</span>${authors}</div>` +
        (voters
          ? `<div class="reveal-meta"><span class="meta-label">صوّت له:</span>${voters}</div>`
          : `<div class="reveal-meta"><span class="meta-label">محد صوت له</span></div>`);

      list.appendChild(item);
    });

    // من كتب الجواب الصحيح بالصدفة
    if (r.exactIds && r.exactIds.length) {
      const names = r.exactIds.map(id => (playerById(id) || {}).name).filter(Boolean).join('، ');
      if (names) {
        const item = el('div', 'reveal-item correct',
          `<div class="rtext">${esc(names)} كتب الجواب الصحيح بالصدفة! +1</div>`);
        list.appendChild(item);
      }
    }

    renderScoreboard($('#reveal-scores'), s, r.gains || {});

    $('#btn-skip').hidden = !s.isHost;

    if (phaseChanged) {
      const myGain = (r.gains || {})[s.youId] || 0;
      if (myGain > 0) {
        Art.confetti({ count: 50 });
        setTimeout(() => Art.starBurst($('.score-row.you')), 200);
      }
    }
  }

  function renderScoreboard(container, s, gains) {
    const sorted = s.players.slice().sort((a, b) => b.score - a.score);
    container.innerHTML = '';
    sorted.forEach((p, i) => {
      const row = el('div', 'score-row' + (p.id === s.youId ? ' you' : '') + (p.connected ? '' : ' disconnected'));
      row.style.animationDelay = (i * 60) + 'ms';
      const g = gains[p.id] || 0;
      row.innerHTML =
        `<span class="rankn">${AR_NUM(i + 1)}</span>` +
        avatarOf(p) +
        `<span class="sname">${esc(p.name)}${p.connected ? '' : ' (منقطع)'}</span>` +
        (g > 0 ? `<span class="sgain">+${AR_NUM(g)}</span>` : '') +
        `<span class="spts">${AR_NUM(p.score)}</span>`;
      container.appendChild(row);
    });
  }

  /* ---------- النهاية ---------- */
  function renderFinal(s, phaseChanged) {
    const f = s.final || { ranking: [], winnerIds: [] };
    const iWon = f.winnerIds.includes(s.youId);
    $('#final-cup').innerHTML = Art.uiIcon('trophy');

    const winners = f.ranking.filter(p => f.winnerIds.includes(p.id));
    const cup = Art.uiIcon('trophy');
    const line = $('#winner-line');
    if (s.endedReason) {
      line.textContent = s.endedReason;
    } else if (winners.length === 1) {
      line.innerHTML = `${cup}<span>الفايز: ${esc(winners[0].name)} بـ ${AR_NUM(winners[0].score)} نقطة</span>`;
    } else if (winners.length > 1) {
      line.innerHTML = `${cup}<span>تعادل بين: ${esc(winners.map(w => w.name).join('، '))}</span>`;
    } else {
      line.textContent = '';
    }

    // المنصة (الأول والثاني والثالث)
    const podium = $('#podium');
    podium.innerHTML = '';
    const order = [1, 0, 2]; // الثاني، الأول، الثالث — للترتيب البصري
    order.forEach((idx, i) => {
      const p = f.ranking[idx];
      if (!p) return;
      const pod = el('div', 'pod p' + (idx + 1));
      pod.style.animationDelay = (i * 130) + 'ms';
      pod.innerHTML =
        Art.avatarSVG(p.avatar, p.name).replace('<svg ', '<svg class="av" ') +
        `<div class="pname">${esc(p.name)}</div>` +
        `<div class="block"><span class="prank">#${idx + 1}</span><span class="pscore">${AR_NUM(p.score)}</span></div>`;
      podium.appendChild(pod);
    });

    // لوحة النقاط النهائية
    const box = $('#final-scores');
    box.innerHTML = '';
    f.ranking.forEach((p, i) => {
      const row = el('div', `score-row rank${p.rank} ${p.id === s.youId ? 'you' : ''}`);
      row.style.animationDelay = (i * 70) + 'ms';
      row.innerHTML =
        `<span class="rankn">${AR_NUM(p.rank)}</span>` +
        Art.avatarSVG(p.avatar, p.name) +
        `<span class="sname">${esc(p.name)}</span>` +
        `<span class="spts">${AR_NUM(p.score)}</span>`;
      box.appendChild(row);
    });

    $('#btn-again').hidden = !s.isHost;
    $('#final-hint').textContent = s.isHost ? '' : 'ننتظر المضيف يعيد اللعبة...';

    if (phaseChanged) {
      Art.confetti({ count: 140, duration: 3400 });
      setTimeout(() => Art.confetti({ count: 60 }), 900);
    }
  }

  /* ============================================================
     ربط الأحداث
     ============================================================ */
  function bindEvents() {
    // إنشاء غرفة
    $('#btn-create').addEventListener('click', () => {
      const name = readName();
      if (!name) return;
      overlay(true, 'نسوي غرفتك...', 'happy');
      app.socket.emit('room:create', { name, avatar: app.avatar }, (res) => {
        overlay(false);
        if (!res || res.error) return homeError((res && res.error) || 'صار خطأ، جرب مرة ثانية');
        history.replaceState(null, '', '/?room=' + res.code);
      });
    });

    // دخول غرفة
    const doJoin = () => {
      const name = readName();
      if (!name) return;
      const code = $('#input-code').value.trim().toUpperCase();
      if (!code) { homeError('اكتب كود الغرفة'); return; }
      overlay(true, 'ندخلك للغرفة...', 'think');
      app.socket.emit('room:join', { code, name, avatar: app.avatar }, (res) => {
        overlay(false);
        if (!res || res.error) return homeError((res && res.error) || 'ما كدرنا ندخلك');
        history.replaceState(null, '', '/?room=' + res.code);
      });
    };
    $('#btn-join').addEventListener('click', doJoin);
    $('#input-code').addEventListener('keydown', e => { if (e.key === 'Enter') doJoin(); });
    $('#input-name').addEventListener('keydown', e => {
      if (e.key === 'Enter') { $('#input-code').value.trim() ? doJoin() : $('#btn-create').click(); }
    });

    // نسخ الرابط
    $('#btn-copy-link').addEventListener('click', async () => {
      const url = location.origin + '/?room=' + (app.roomCode || '');
      const shareText = `تعال العب وياي "الأجوبة الكاذبة"! كود الغرفة: ${app.roomCode}`;
      try {
        if (navigator.share) {
          await navigator.share({ title: 'الأجوبة الكاذبة', text: shareText, url });
        } else {
          await navigator.clipboard.writeText(url);
          toast('انتسخ الرابط! ارسله لأصحابك', 'join');
        }
      } catch {
        try {
          await navigator.clipboard.writeText(url);
          toast('انتسخ الرابط!', 'join');
        } catch { toast('الرابط: ' + url, 'info', 5000); }
      }
    });

    // طلعة من اللوبي
    $('#btn-leave-lobby').addEventListener('click', () => leaveRoom());

    // إعدادات المضيف
    $$('.stepper button').forEach(b => {
      b.addEventListener('click', () => {
        const key = b.dataset.key;
        const step = Number(b.dataset.step);
        const s = app.state;
        if (!s) return;
        let val = s.settings[key];
        if (key === 'rounds') {
          val = Math.max(0, Math.min(s.config.maxRounds, (val || 0) + step));
        } else {
          val = Math.max(5, Math.min(60, val + step));
        }
        app.socket.emit('room:settings', { [key]: val }, (res) => {
          if (res && res.error) toast(res.error, 'error');
        });
      });
    });

    // بدء اللعبة
    $('#btn-start').addEventListener('click', () => {
      $('#btn-start').disabled = true;
      app.socket.emit('game:start', {}, (res) => {
        if (res && res.error) { toast(res.error, 'error'); $('#btn-start').disabled = false; }
      });
    });

    // إرسال الجواب الغلط
    $('#btn-bluff').addEventListener('click', sendBluff);
    $('#input-bluff').addEventListener('keydown', e => { if (e.key === 'Enter') sendBluff(); });

    // تخطي شاشة النتيجة
    $('#btn-skip').addEventListener('click', () => {
      $('#btn-skip').disabled = true;
      app.socket.emit('game:skip', {}, (res) => {
        $('#btn-skip').disabled = false;
        if (res && res.error) toast(res.error, 'error');
      });
    });

    // العب مرة ثانية
    $('#btn-again').addEventListener('click', () => {
      app.socket.emit('game:again', {}, (res) => {
        if (res && res.error) toast(res.error, 'error');
      });
    });

    $('#btn-exit').addEventListener('click', () => leaveRoom());

    // ---------- شاشة القوانين ----------
    const openRules = () => showScreen('screen-rules');
    const closeRules = () => showScreen('screen-home');
    $('#btn-rules').addEventListener('click', openRules);
    $('#btn-rules-back').addEventListener('click', closeRules);
    $('#btn-rules-close').addEventListener('click', closeRules);

    // ---------- أفاتار الحروف يتحدث وانته تكتب اسمك ----------
    let nameTimer = null;
    $('#input-name').addEventListener('input', () => {
      clearTimeout(nameTimer);
      nameTimer = setTimeout(buildAvatarPicker, 120);
    });

    // ---------- عدّاد حروف الجواب ----------
    const bluffInput = $('#input-bluff');
    const bluffCount = $('#bluff-count');
    const max = bluffInput.maxLength;
    bluffInput.addEventListener('input', () => {
      const n = bluffInput.value.length;
      bluffCount.textContent = `${n} / ${max}`;
      bluffCount.classList.toggle('near', n > max - 12);
    });
  }

  function leaveRoom() {
    app.socket.emit('room:leave', {}, () => {});
    store.del('roomCode'); store.del('playerId');
    app.roomCode = null; app.playerId = null; app.state = null; app.lastPhase = null;
    stopTicking();
    history.replaceState(null, '', '/');
    $('#input-code').value = '';
    showScreen('screen-home');
  }

  /* ============================================================
     الإقلاع
     ============================================================ */
  document.addEventListener('DOMContentLoaded', () => {
    initHome();
    bindEvents();
    connect();
    overlay(true, 'جاري الاتصال...', 'think');
    setTimeout(() => { if (app.connected) overlay(false); }, 400);
  });
})();
