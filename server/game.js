'use strict';

const fs = require('fs');
const path = require('path');

/* ============================================================
   إعدادات اللعبة — كلها قابلة للتعديل من هنا
   ============================================================ */
const CONFIG = {
  MIN_PLAYERS: 3,          // أقل عدد لاعبين لبدء اللعبة
  MAX_PLAYERS: 8,          // أقصى عدد لاعبين بالغرفة
  BLUFF_SECONDS: 35,       // وكت كتابة الجواب الغلط — وكت كافي حتى تفكر بكذبة مقنعة
  VOTE_SECONDS: 25,        // وكت التصويت — تكدر تقرا كل الأجوبة وتوازن بيناتها
  CATEGORY_SECONDS: 20,    // وكت اختيار الفئة
  REVEAL_SECONDS: 18,      // وكت عرض نتيجة الجولة
  INTRO_SECONDS: 5,        // وكت عرض السؤال قبل الكتابة
  CATEGORY_CHOICES: 4,     // عدد الفئات المعروضة للاختيار
  POINT_CORRECT: 1,        // نقاط اختيار الجواب الصحيح
  POINT_FOOL: 1,           // نقاط عن كل شخص ينخدع بجوابك
  MAX_ROUNDS: 20,          // أقصى عدد جولات
  MAX_NAME_LEN: 14,
  MAX_ANSWER_LEN: 70,
  ROOM_TTL_MS: 1000 * 60 * 60 * 4,   // عمر الغرفة الفارغة قبل الحذف
  EMPTY_ROOM_GRACE_MS: 1000 * 60 * 10 // مهلة قبل حذف غرفة كل لاعبيها مفصولين
};

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 5;

// ألوان الأفاتار (أفاتار = دائرة ملونة بأول حرف من الاسم)
const AVATARS = ['blue', 'green', 'purple', 'orange', 'red', 'teal', 'pink', 'indigo', 'amber', 'lime', 'cyan', 'rose'];

// أجوبة احتياطية للاعب اللي ما يكتب بالوكت (ما تنطي نقاط لصاحبها)
const FILLERS = [
  'ما عرفت والله',
  'اكيد شي غريب',
  'نسيت اكتب',
  'الجواب ضاع مني',
  'شنو هالسؤال هذا',
  'خمنوا انتو',
  'راح افكر بالجولة الجاية',
  'كتبت بس ما انرسل'
];

const CATEGORY_ICONS = {
  'حقائق غريبة عن الحيوانات': 'animals',
  'تاريخ ما يعرفه احد': 'history',
  'فضاء وعلوم غريبة': 'space',
  'حقائق غريبة عن الأكل': 'food',
  'حقائق غريبة عن الرياضة': 'sports'
};

const QUESTIONS = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'questions.json'), 'utf8')
);
const CATEGORIES = Object.keys(QUESTIONS);

/* ============================================================
   أدوات مساعدة
   ============================================================ */
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// تطبيع النص العربي عشان نكشف الأجوبة المتشابهة
function normalize(text) {
  return String(text || '')
    .replace(/[ً-ْـ]/g, '')       // تشكيل وتطويل
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/[ىئ]/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ة/g, 'ه')
    .replace(/گ/g, 'ك')
    .replace(/چ/g, 'ج')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')             // شيل الترقيم
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function cleanText(text, maxLen) {
  return String(text == null ? '' : text)
    .replace(/[\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

function newId(prefix) {
  return prefix + '_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

/* ============================================================
   الغرفة
   ============================================================ */
class Room {
  constructor(code, io) {
    this.code = code;
    this.io = io;
    this.createdAt = Date.now();
    this.lastActivity = Date.now();

    this.players = new Map();   // playerId -> player
    this.seat = 0;              // ترتيب الانضمام
    this.hostId = null;

    this.phase = 'lobby';       // lobby | category | intro | bluff | voting | reveal | final
    this.round = 0;
    this.totalRounds = 0;
    this.turnOrder = [];
    this.chooserId = null;

    this.settings = {
      rounds: 0,                // 0 = تلقائي (بعدد اللاعبين)
      maxPlayers: CONFIG.MAX_PLAYERS,
      bluffSeconds: CONFIG.BLUFF_SECONDS,
      voteSeconds: CONFIG.VOTE_SECONDS
    };

    this.usedQuestions = new Set();
    this.categoryChoices = [];
    this.current = null;        // { category, question, answer }
    this.bluffs = new Map();    // playerId -> { text, auto, exact }
    this.answers = [];          // [{ id, text, isCorrect, ownerIds[], auto, voterIds[] }]
    this.votes = new Map();     // playerId -> answerId
    this.roundScores = new Map();
    this.lastReveal = null;
    this.endedReason = null;

    this.timer = null;
    this.phaseEndsAt = 0;
    this.phaseDuration = 0;
  }

  /* ---------- اللاعبين ---------- */
  get playerList() {
    return Array.from(this.players.values()).sort((a, b) => a.seat - b.seat);
  }

  get connectedPlayers() {
    return this.playerList.filter(p => p.connected);
  }

  touch() {
    this.lastActivity = Date.now();
  }

  // لون مو مستخدم بالغرفة، حتى ما يتشابه لاعبين
  freeAvatar(preferred) {
    const taken = new Set(this.playerList.map(p => p.avatar));
    if (AVATARS.includes(preferred) && !taken.has(preferred)) return preferred;
    const free = AVATARS.filter(a => !taken.has(a));
    return free.length ? pick(free) : (AVATARS.includes(preferred) ? preferred : pick(AVATARS));
  }

  addPlayer({ playerId, name, avatar, socketId }) {
    const p = {
      id: playerId || newId('p'),
      name: cleanText(name, CONFIG.MAX_NAME_LEN) || 'لاعب',
      avatar: this.freeAvatar(avatar),
      score: 0,
      seat: this.seat++,
      connected: true,
      socketId
    };
    this.players.set(p.id, p);
    if (!this.hostId) this.hostId = p.id;
    this.touch();
    return p;
  }

  removePlayer(playerId) {
    const p = this.players.get(playerId);
    if (!p) return;
    this.players.delete(playerId);
    this.bluffs.delete(playerId);
    this.votes.delete(playerId);
    this.turnOrder = this.turnOrder.filter(id => id !== playerId);
    if (this.hostId === playerId) this.reassignHost();
    if (this.chooserId === playerId && this.phase === 'category') {
      this.autoPickCategory();
    }
    this.touch();
  }

  reassignHost() {
    const next = this.connectedPlayers[0] || this.playerList[0];
    this.hostId = next ? next.id : null;
  }

  isNameTaken(name) {
    const n = normalize(name);
    return this.playerList.some(p => normalize(p.name) === n);
  }

  /* ---------- المؤقتات ---------- */
  setPhaseTimer(seconds, fn) {
    this.clearTimer();
    this.phaseDuration = seconds;
    this.phaseEndsAt = Date.now() + seconds * 1000;
    this.timer = setTimeout(() => {
      this.timer = null;
      try { fn(); } catch (err) { console.error('[timer]', err); }
    }, seconds * 1000);
  }

  clearTimer() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  /* ---------- دورة اللعبة ---------- */
  startGame() {
    const players = this.connectedPlayers;
    if (players.length < CONFIG.MIN_PLAYERS) {
      return { error: `لازم ${CONFIG.MIN_PLAYERS} لاعبين على الأقل عشان تبدي اللعبة` };
    }
    this.turnOrder = shuffle(players.map(p => p.id));
    const requested = Number(this.settings.rounds) || 0;
    this.totalRounds = Math.min(
      CONFIG.MAX_ROUNDS,
      requested > 0 ? requested : this.turnOrder.length
    );
    this.round = 0;
    this.usedQuestions = new Set();
    this.endedReason = null;
    for (const p of this.players.values()) p.score = 0;
    this.nextRound();
    return { ok: true };
  }

  nextRound() {
    if (this.round >= this.totalRounds) return this.endGame();
    this.round++;
    this.bluffs = new Map();
    this.votes = new Map();
    this.answers = [];
    this.roundScores = new Map();
    this.lastReveal = null;
    this.current = null;

    // صاحب الدور بهذي الجولة (نلف على الترتيب، ونتخطى اللي طلعوا)
    const order = this.turnOrder.filter(id => this.players.has(id));
    if (order.length === 0) return this.endGame();
    this.turnOrder = order;
    this.chooserId = order[(this.round - 1) % order.length];

    // إذا صاحب الدور مفصول، ننقل الدور لأول لاعب متصل
    const chooser = this.players.get(this.chooserId);
    if (!chooser || !chooser.connected) {
      const alt = this.connectedPlayers[0];
      if (alt) this.chooserId = alt.id;
    }

    this.categoryChoices = shuffle(CATEGORIES)
      .filter(c => this.remainingInCategory(c) > 0)
      .slice(0, CONFIG.CATEGORY_CHOICES);
    if (this.categoryChoices.length === 0) {
      this.usedQuestions = new Set();
      this.categoryChoices = shuffle(CATEGORIES).slice(0, CONFIG.CATEGORY_CHOICES);
    }

    this.phase = 'category';
    this.setPhaseTimer(CONFIG.CATEGORY_SECONDS, () => this.autoPickCategory());
    this.broadcast();
  }

  remainingInCategory(cat) {
    return (QUESTIONS[cat] || []).filter(q => !this.usedQuestions.has(cat + '|' + q.question)).length;
  }

  autoPickCategory() {
    const cat = pick(this.categoryChoices.length ? this.categoryChoices : CATEGORIES);
    this.chooseCategory(this.chooserId, cat, true);
  }

  chooseCategory(playerId, category, auto = false) {
    if (this.phase !== 'category') return { error: 'مو وكت اختيار الفئة' };
    if (!auto && playerId !== this.chooserId) return { error: 'مو دورك تختار' };
    if (!CATEGORIES.includes(category)) return { error: 'فئة غير معروفة' };

    let pool = (QUESTIONS[category] || []).filter(
      q => !this.usedQuestions.has(category + '|' + q.question)
    );
    if (pool.length === 0) pool = QUESTIONS[category] || [];
    const q = pick(pool);
    this.usedQuestions.add(category + '|' + q.question);
    this.current = { category, question: q.question, answer: q.answer };

    this.phase = 'intro';
    this.setPhaseTimer(CONFIG.INTRO_SECONDS, () => this.startBluff());
    this.broadcast();
    return { ok: true };
  }

  startBluff() {
    this.phase = 'bluff';
    this.setPhaseTimer(this.settings.bluffSeconds, () => this.endBluff());
    this.broadcast();
  }

  submitBluff(playerId, text) {
    if (this.phase !== 'bluff') return { error: 'انتهى وكت الكتابة' };
    const p = this.players.get(playerId);
    if (!p) return { error: 'مو موجود بالغرفة' };
    const clean = cleanText(text, CONFIG.MAX_ANSWER_LEN);
    if (!clean) return { error: 'اكتب جواب أول' };
    this.bluffs.set(playerId, { text: clean, auto: false });
    this.touch();
    this.broadcast();

    // إذا الكل خلص، ما ننتظر باقي الوكت
    if (this.allSubmittedBluffs()) {
      this.setPhaseTimer(1, () => this.endBluff());
    }
    return { ok: true };
  }

  allSubmittedBluffs() {
    const active = this.connectedPlayers;
    return active.length > 0 && active.every(p => this.bluffs.has(p.id));
  }

  endBluff() {
    if (this.phase !== 'bluff') return;
    const correctNorm = normalize(this.current.answer);
    const usedFillers = new Set();

    // اللاعبين اللي ما كتبوا ياخذون جواب عشوائي بدون نقاط
    for (const p of this.playerList) {
      if (!this.bluffs.has(p.id)) {
        let f = pick(FILLERS);
        let guard = 0;
        while (usedFillers.has(f) && guard++ < 20) f = pick(FILLERS);
        usedFillers.add(f);
        this.bluffs.set(p.id, { text: f, auto: true });
      }
    }

    // بناء قائمة الأجوبة مع دمج المتكرر
    const byNorm = new Map();
    for (const [pid, b] of this.bluffs) {
      const n = normalize(b.text);
      if (!n) continue;
      if (n === correctNorm) {
        // كتب الجواب الصحيح بالغلط — ياخذ نقطة وجوابه ما ينضاف
        b.exact = true;
        continue;
      }
      if (!byNorm.has(n)) {
        byNorm.set(n, {
          id: newId('a'),
          text: b.text,
          isCorrect: false,
          ownerIds: [],
          auto: true,
          voterIds: []
        });
      }
      const entry = byNorm.get(n);
      entry.ownerIds.push(pid);
      if (!b.auto) entry.auto = false;   // إذا واحد كتبه فعلاً، الجواب يحتسب
    }

    const correctAnswer = {
      id: newId('a'),
      text: this.current.answer,
      isCorrect: true,
      ownerIds: [],
      auto: false,
      voterIds: []
    };

    this.answers = shuffle([...byNorm.values(), correctAnswer]);
    this.phase = 'voting';
    this.setPhaseTimer(this.settings.voteSeconds, () => this.endVoting());
    this.broadcast();
  }

  submitVote(playerId, answerId) {
    if (this.phase !== 'voting') return { error: 'انتهى وكت التصويت' };
    const p = this.players.get(playerId);
    if (!p) return { error: 'مو موجود بالغرفة' };
    const ans = this.answers.find(a => a.id === answerId);
    if (!ans) return { error: 'جواب غير موجود' };
    if (ans.ownerIds.includes(playerId)) return { error: 'ما تكدر تصوت على جوابك انته!' };
    if (this.votes.has(playerId)) return { error: 'صوتت من كبل' };

    this.votes.set(playerId, answerId);
    this.touch();
    this.broadcast();

    const eligible = this.connectedPlayers.filter(pl => !this.playerWroteExact(pl.id));
    if (eligible.length > 0 && eligible.every(pl => this.votes.has(pl.id))) {
      this.setPhaseTimer(1, () => this.endVoting());
    }
    return { ok: true };
  }

  playerWroteExact(playerId) {
    const b = this.bluffs.get(playerId);
    return !!(b && b.exact);
  }

  endVoting() {
    if (this.phase !== 'voting') return;

    for (const [pid, aid] of this.votes) {
      const ans = this.answers.find(a => a.id === aid);
      if (ans) ans.voterIds.push(pid);
    }

    const gains = new Map();
    const add = (pid, n) => gains.set(pid, (gains.get(pid) || 0) + n);

    // نقطة لكل من كتب الجواب الصحيح بالصدفة
    for (const [pid, b] of this.bluffs) {
      if (b.exact) add(pid, CONFIG.POINT_CORRECT);
    }

    for (const ans of this.answers) {
      if (ans.isCorrect) {
        // كل من صوت للجواب الصحيح ياخذ نقطة
        for (const voter of ans.voterIds) add(voter, CONFIG.POINT_CORRECT);
      } else if (!ans.auto) {
        // صاحب الجواب الغلط ياخذ نقطة عن كل من انخدع
        for (const owner of ans.ownerIds) {
          add(owner, ans.voterIds.length * CONFIG.POINT_FOOL);
        }
      }
    }

    this.roundScores = gains;
    for (const [pid, n] of gains) {
      const p = this.players.get(pid);
      if (p) p.score += n;
    }

    this.lastReveal = {
      question: this.current.question,
      category: this.current.category,
      correctAnswer: this.current.answer,
      answers: this.answers.map(a => ({
        id: a.id,
        text: a.text,
        isCorrect: a.isCorrect,
        auto: a.auto,
        ownerIds: a.ownerIds.slice(),
        voterIds: a.voterIds.slice()
      })),
      exactIds: Array.from(this.bluffs.entries()).filter(([, b]) => b.exact).map(([pid]) => pid),
      gains: Object.fromEntries(gains)
    };

    this.phase = 'reveal';
    this.setPhaseTimer(CONFIG.REVEAL_SECONDS, () => this.nextRound());
    this.broadcast();
  }

  skipReveal(playerId) {
    if (this.phase !== 'reveal') return { error: 'ما تكدر تتخطى هسه' };
    if (playerId !== this.hostId) return { error: 'المضيف بس يكدر يتخطى' };
    this.nextRound();
    return { ok: true };
  }

  endGame(reason = null) {
    this.clearTimer();
    this.endedReason = reason;
    this.phase = 'final';
    this.phaseEndsAt = 0;
    this.phaseDuration = 0;
    this.broadcast();
  }

  playAgain(playerId) {
    if (playerId !== this.hostId) return { error: 'المضيف بس يكدر يعيد اللعبة' };
    this.clearTimer();
    this.phase = 'lobby';
    this.round = 0;
    this.current = null;
    this.answers = [];
    this.bluffs = new Map();
    this.votes = new Map();
    this.lastReveal = null;
    this.endedReason = null;
    this.usedQuestions = new Set();
    for (const p of this.players.values()) p.score = 0;
    this.broadcast();
    return { ok: true };
  }

  updateSettings(playerId, settings) {
    if (playerId !== this.hostId) return { error: 'المضيف بس يكدر يغير الإعدادات' };
    if (this.phase !== 'lobby') return { error: 'ما تكدر تغير الإعدادات واللعبة شغالة' };
    if (settings.rounds != null) {
      const r = Math.floor(Number(settings.rounds));
      if (Number.isFinite(r) && r >= 0 && r <= CONFIG.MAX_ROUNDS) this.settings.rounds = r;
    }
    if (settings.maxPlayers != null) {
      const m = Math.floor(Number(settings.maxPlayers));
      if (Number.isFinite(m) && m >= CONFIG.MIN_PLAYERS && m <= CONFIG.MAX_PLAYERS) {
        this.settings.maxPlayers = Math.max(m, this.players.size);
      }
    }
    if (settings.bluffSeconds != null) {
      const s = Math.floor(Number(settings.bluffSeconds));
      if (Number.isFinite(s) && s >= 10 && s <= 120) this.settings.bluffSeconds = s;
    }
    if (settings.voteSeconds != null) {
      const s = Math.floor(Number(settings.voteSeconds));
      if (Number.isFinite(s) && s >= 10 && s <= 120) this.settings.voteSeconds = s;
    }
    this.broadcast();
    return { ok: true };
  }

  // إذا اللاعبين المتصلين قلوا كلش، ننهي اللعبة بدل ما تعلق
  checkViability() {
    const inGame = ['category', 'intro', 'bluff', 'voting', 'reveal'].includes(this.phase);
    if (inGame && this.connectedPlayers.length < 2) {
      this.endGame('ما ضل عدد كافي من اللاعبين، انتهت اللعبة');
      return;
    }
    if (this.phase === 'bluff' && this.allSubmittedBluffs()) {
      this.setPhaseTimer(1, () => this.endBluff());
    }
  }

  /* ---------- إرسال الحالة ---------- */
  stateFor(playerId) {
    const me = this.players.get(playerId) || null;
    const base = {
      code: this.code,
      phase: this.phase,
      round: this.round,
      totalRounds: this.totalRounds,
      hostId: this.hostId,
      youId: playerId,
      isHost: playerId === this.hostId,
      settings: this.settings,
      config: {
        minPlayers: CONFIG.MIN_PLAYERS,
        maxPlayers: CONFIG.MAX_PLAYERS,
        maxAnswerLen: CONFIG.MAX_ANSWER_LEN,
        maxRounds: CONFIG.MAX_ROUNDS
      },
      serverNow: Date.now(),
      phaseEndsAt: this.phaseEndsAt,
      phaseDuration: this.phaseDuration,
      endedReason: this.endedReason,
      players: this.playerList.map(p => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        score: p.score,
        connected: p.connected,
        isHost: p.id === this.hostId,
        isChooser: p.id === this.chooserId,
        submitted: this.phase === 'bluff' ? this.bluffs.has(p.id) : undefined,
        voted: this.phase === 'voting' ? this.votes.has(p.id) : undefined
      }))
    };

    if (this.phase === 'category') {
      base.category = {
        chooserId: this.chooserId,
        chooserName: (this.players.get(this.chooserId) || {}).name || '',
        isYourTurn: playerId === this.chooserId,
        choices: this.categoryChoices.map(c => ({ name: c, icon: CATEGORY_ICONS[c] || 'space' }))
      };
    }

    if (['intro', 'bluff', 'voting'].includes(this.phase) && this.current) {
      base.question = {
        text: this.current.question,
        category: this.current.category,
        icon: CATEGORY_ICONS[this.current.category] || 'space'
      };
    }

    if (this.phase === 'bluff') {
      const mine = this.bluffs.get(playerId);
      base.bluff = {
        yourAnswer: mine && !mine.auto ? mine.text : '',
        submitted: !!(mine && !mine.auto),
        submittedCount: this.connectedPlayers.filter(p => this.bluffs.has(p.id)).length,
        total: this.connectedPlayers.length
      };
    }

    if (this.phase === 'voting') {
      const yourAnswerIds = this.answers
        .filter(a => a.ownerIds.includes(playerId))
        .map(a => a.id);
      base.voting = {
        answers: this.answers.map(a => ({ id: a.id, text: a.text })),
        yourAnswerIds,
        wroteExact: this.playerWroteExact(playerId),
        votedAnswerId: this.votes.get(playerId) || null,
        votedCount: this.votes.size,
        total: this.connectedPlayers.length
      };
    }

    if (this.phase === 'reveal' && this.lastReveal) {
      base.reveal = this.lastReveal;
    }

    if (this.phase === 'final') {
      const sorted = this.playerList.slice().sort((a, b) => b.score - a.score || a.seat - b.seat);
      base.final = {
        ranking: sorted.map((p, i) => ({
          id: p.id,
          name: p.name,
          avatar: p.avatar,
          score: p.score,
          rank: i > 0 && sorted[i - 1].score === p.score ? undefined : i + 1
        })),
        winnerIds: sorted.length ? sorted.filter(p => p.score === sorted[0].score).map(p => p.id) : []
      };
      // ترتيب متساوي: نكمل الأرقام الناقصة
      let lastRank = 1;
      base.final.ranking.forEach((r, i) => {
        if (r.rank == null) r.rank = lastRank;
        else lastRank = r.rank;
      });
    }

    if (me) base.me = { id: me.id, name: me.name, avatar: me.avatar, score: me.score };
    return base;
  }

  broadcast() {
    for (const p of this.players.values()) {
      if (p.socketId && p.connected) {
        this.io.to(p.socketId).emit('state', this.stateFor(p.id));
      }
    }
  }

  emitEvent(name, payload) {
    this.io.to(this.code).emit(name, payload);
  }
}

/* ============================================================
   مدير الغرف
   ============================================================ */
class GameManager {
  constructor(io) {
    this.io = io;
    this.rooms = new Map();
    setInterval(() => this.cleanup(), 60 * 1000).unref?.();
  }

  generateCode() {
    let code;
    let guard = 0;
    do {
      code = Array.from({ length: CODE_LENGTH }, () => pick(CODE_ALPHABET.split(''))).join('');
      guard++;
    } while (this.rooms.has(code) && guard < 200);
    return code;
  }

  createRoom() {
    const code = this.generateCode();
    const room = new Room(code, this.io);
    this.rooms.set(code, room);
    return room;
  }

  getRoom(code) {
    return this.rooms.get(String(code || '').toUpperCase().trim());
  }

  cleanup() {
    const now = Date.now();
    for (const [code, room] of this.rooms) {
      const noOneConnected = room.connectedPlayers.length === 0;
      const stale = now - room.lastActivity > CONFIG.EMPTY_ROOM_GRACE_MS;
      const veryOld = now - room.createdAt > CONFIG.ROOM_TTL_MS;
      if ((noOneConnected && stale) || veryOld) {
        room.clearTimer();
        this.rooms.delete(code);
      }
    }
  }
}

module.exports = { GameManager, Room, CONFIG, CATEGORIES, AVATARS, CATEGORY_ICONS, normalize, cleanText };
