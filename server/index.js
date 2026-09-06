'use strict';

const path = require('path');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const { GameManager, CONFIG, AVATARS, cleanText } = require('./game');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
  pingTimeout: 20000,
  pingInterval: 10000
});

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

app.use(express.static(PUBLIC_DIR, { extensions: ['html'] }));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, rooms: manager.rooms.size, uptime: process.uptime() });
});

// فحص وجود غرفة قبل الدخول (يستخدمه رابط المشاركة)
app.get('/api/room/:code', (req, res) => {
  const room = manager.getRoom(req.params.code);
  if (!room) return res.status(404).json({ exists: false });
  res.json({
    exists: true,
    code: room.code,
    players: room.players.size,
    maxPlayers: room.settings.maxPlayers,
    phase: room.phase,
    full: room.players.size >= room.settings.maxPlayers
  });
});

app.get('*', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'index.html')));

const manager = new GameManager(io);

/* ============================================================
   Socket.io
   ============================================================ */
io.on('connection', (socket) => {
  // كل سوكت يخزن معلومات جلسته
  socket.data.roomCode = null;
  socket.data.playerId = null;

  const ack = (cb, payload) => { if (typeof cb === 'function') cb(payload); };

  const currentRoom = () => manager.getRoom(socket.data.roomCode);

  function attach(room, player) {
    socket.data.roomCode = room.code;
    socket.data.playerId = player.id;
    socket.join(room.code);
  }

  /* ---------- إنشاء غرفة ---------- */
  socket.on('room:create', (payload = {}, cb) => {
    const name = cleanText(payload.name, CONFIG.MAX_NAME_LEN);
    if (!name) return ack(cb, { error: 'اكتب اسمك أول' });

    const room = manager.createRoom();
    const player = room.addPlayer({
      name,
      avatar: payload.avatar,
      socketId: socket.id
    });
    room.hostId = player.id;
    attach(room, player);

    ack(cb, { ok: true, code: room.code, playerId: player.id });
    room.broadcast();
    console.log(`[room] created ${room.code} by ${player.name}`);
  });

  /* ---------- الدخول لغرفة ---------- */
  socket.on('room:join', (payload = {}, cb) => {
    const code = String(payload.code || '').toUpperCase().trim();
    const room = manager.getRoom(code);
    if (!room) return ack(cb, { error: 'ما لكينا غرفة بهذا الكود، تأكد منه' });

    // محاولة إعادة اتصال بنفس هوية اللاعب
    const existing = payload.playerId ? room.players.get(payload.playerId) : null;
    if (existing) {
      existing.connected = true;
      existing.socketId = socket.id;
      if (payload.name) {
        const n = cleanText(payload.name, CONFIG.MAX_NAME_LEN);
        if (n && !room.isNameTaken(n)) existing.name = n;
      }
      if (payload.avatar && AVATARS.includes(payload.avatar)) existing.avatar = payload.avatar;
      attach(room, existing);
      if (!room.hostId || !room.players.has(room.hostId)) room.reassignHost();
      room.touch();
      ack(cb, { ok: true, code: room.code, playerId: existing.id, rejoined: true });
      room.broadcast();
      room.emitEvent('toast', { text: `${existing.name} رجع للغرفة`, kind: 'info' });
      return;
    }

    const name = cleanText(payload.name, CONFIG.MAX_NAME_LEN);
    if (!name) return ack(cb, { error: 'اكتب اسمك أول' });
    if (room.players.size >= room.settings.maxPlayers) {
      return ack(cb, { error: 'الغرفة كاملة، ما بيها محل' });
    }
    if (room.phase !== 'lobby') {
      return ack(cb, { error: 'اللعبة بديت، انتظر لين تخلص الجولة الحالية' });
    }
    if (room.isNameTaken(name)) {
      return ack(cb, { error: 'هذا الاسم مستخدم، اختار اسم ثاني' });
    }

    const player = room.addPlayer({ name, avatar: payload.avatar, socketId: socket.id });
    attach(room, player);
    ack(cb, { ok: true, code: room.code, playerId: player.id });
    room.broadcast();
    room.emitEvent('toast', { text: `${player.name} دخل الغرفة!`, kind: 'join' });
  });

  /* ---------- تغيير الأفاتار أو الاسم باللوبي ---------- */
  socket.on('player:update', (payload = {}, cb) => {
    const room = currentRoom();
    if (!room) return ack(cb, { error: 'مو داخل غرفة' });
    const p = room.players.get(socket.data.playerId);
    if (!p) return ack(cb, { error: 'مو موجود بالغرفة' });
    // لو اللون مأخوذ من لاعب ثاني، ما ننطيه ياه
    if (payload.avatar && AVATARS.includes(payload.avatar)) {
      const taken = room.playerList.some(o => o.id !== p.id && o.avatar === payload.avatar);
      if (taken) return ack(cb, { error: 'هذا اللون مأخوذ، اختار لون ثاني' });
      p.avatar = payload.avatar;
    }
    if (payload.name) {
      const n = cleanText(payload.name, CONFIG.MAX_NAME_LEN);
      if (n && n !== p.name) {
        if (room.isNameTaken(n)) return ack(cb, { error: 'الاسم مستخدم' });
        p.name = n;
      }
    }
    room.touch();
    room.broadcast();
    ack(cb, { ok: true });
  });

  /* ---------- إعدادات الغرفة ---------- */
  socket.on('room:settings', (payload = {}, cb) => {
    const room = currentRoom();
    if (!room) return ack(cb, { error: 'مو داخل غرفة' });
    ack(cb, room.updateSettings(socket.data.playerId, payload));
  });

  /* ---------- بدء اللعبة ---------- */
  socket.on('game:start', (payload = {}, cb) => {
    const room = currentRoom();
    if (!room) return ack(cb, { error: 'مو داخل غرفة' });
    if (socket.data.playerId !== room.hostId) return ack(cb, { error: 'المضيف بس يكدر يبدي اللعبة' });
    if (room.phase !== 'lobby') return ack(cb, { error: 'اللعبة بديت من كبل' });
    const res = room.startGame();
    ack(cb, res);
  });

  /* ---------- اختيار الفئة ---------- */
  socket.on('game:category', (payload = {}, cb) => {
    const room = currentRoom();
    if (!room) return ack(cb, { error: 'مو داخل غرفة' });
    ack(cb, room.chooseCategory(socket.data.playerId, payload.category));
  });

  /* ---------- إرسال الجواب الغلط ---------- */
  socket.on('game:bluff', (payload = {}, cb) => {
    const room = currentRoom();
    if (!room) return ack(cb, { error: 'مو داخل غرفة' });
    ack(cb, room.submitBluff(socket.data.playerId, payload.text));
  });

  /* ---------- التصويت ---------- */
  socket.on('game:vote', (payload = {}, cb) => {
    const room = currentRoom();
    if (!room) return ack(cb, { error: 'مو داخل غرفة' });
    ack(cb, room.submitVote(socket.data.playerId, payload.answerId));
  });

  /* ---------- تخطي شاشة النتيجة (للمضيف) ---------- */
  socket.on('game:skip', (payload = {}, cb) => {
    const room = currentRoom();
    if (!room) return ack(cb, { error: 'مو داخل غرفة' });
    ack(cb, room.skipReveal(socket.data.playerId));
  });

  /* ---------- العب مرة ثانية ---------- */
  socket.on('game:again', (payload = {}, cb) => {
    const room = currentRoom();
    if (!room) return ack(cb, { error: 'مو داخل غرفة' });
    ack(cb, room.playAgain(socket.data.playerId));
  });

  /* ---------- الخروج من الغرفة ---------- */
  socket.on('room:leave', (payload = {}, cb) => {
    const room = currentRoom();
    if (!room) return ack(cb, { ok: true });
    const p = room.players.get(socket.data.playerId);
    room.removePlayer(socket.data.playerId);
    socket.leave(room.code);
    socket.data.roomCode = null;
    socket.data.playerId = null;
    ack(cb, { ok: true });
    if (p) room.emitEvent('toast', { text: `${p.name} طلع من الغرفة`, kind: 'leave' });
    room.checkViability();
    room.broadcast();
  });

  /* ---------- انقطاع الاتصال ---------- */
  socket.on('disconnect', () => {
    const room = currentRoom();
    if (!room) return;
    const p = room.players.get(socket.data.playerId);
    if (!p || p.socketId !== socket.id) return;

    p.connected = false;
    p.socketId = null;
    room.touch();

    if (room.phase === 'lobby') {
      // باللوبي نشيله مباشرة
      room.removePlayer(p.id);
      room.emitEvent('toast', { text: `${p.name} طلع من الغرفة`, kind: 'leave' });
    } else {
      if (room.hostId === p.id) room.reassignHost();
      room.emitEvent('toast', { text: `${p.name} انقطع اتصاله...`, kind: 'leave' });
    }
    room.checkViability();
    room.broadcast();
  });
});

server.listen(PORT, () => {
  console.log('');
  console.log('  🎭  لعبة الأجوبة الكاذبة شغالة');
  console.log(`  ➜  محلياً:   http://localhost:${PORT}`);
  const nets = require('os').networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        console.log(`  ➜  بالشبكة:  http://${net.address}:${PORT}`);
      }
    }
  }
  console.log('');
});
