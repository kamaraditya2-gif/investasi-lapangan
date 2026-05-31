const express = require('express');
const Database = require('better-sqlite3');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dsc-investasi-jwt-secret-2026';
const PASSWORD_HASH = '$2b$10$Ff5Ou5BT8JyKIYKDQy780O2DQygI5E3rLB9rNdsqpHsbeyfzZh3Bi';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- Database ---
const db = new Database(path.join(__dirname, 'data', 'investasi.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS bulan_input (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bulan TEXT UNIQUE NOT NULL,
    pemasukanLap1 INTEGER DEFAULT 0,
    pemasukanLap2 INTEGER DEFAULT 0,
    pemasukanKan INTEGER DEFAULT 0,
    pengeluaranOp INTEGER DEFAULT 0,
    kama INTEGER DEFAULT 0,
    kiki INTEGER DEFAULT 0,
    adit INTEGER DEFAULT 0,
    keuntunganPemodal INTEGER DEFAULT 0,
    pengembalianModal INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS reinvestasi (
    id INTEGER PRIMARY KEY CHECK(id = 1),
    adit INTEGER DEFAULT 0,
    kama INTEGER DEFAULT 0
  );
`);

// Insert default reinvestasi row if not exists
const reinvestRow = db.prepare('SELECT id FROM reinvestasi WHERE id = 1').get();
if (!reinvestRow) {
  db.prepare('INSERT INTO reinvestasi (id, adit, kama) VALUES (1, 0, 0)').run();
}

// --- Auth Middleware ---
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>
  if (!token) return res.status(401).json({ error: 'Token tidak ditemukan' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token tidak valid' });
    req.user = user;
    next();
  });
}

// --- Routes ---

// Login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (username !== 'admin') {
    return res.status(401).json({ error: 'Username atau password salah' });
  }
  const valid = bcrypt.compareSync(password, PASSWORD_HASH);
  if (!valid) {
    return res.status(401).json({ error: 'Username atau password salah' });
  }
  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token });
});

// Verify token (ping check)
app.get('/api/me', verifyToken, (req, res) => {
  res.json({ username: req.user.username });
});

// --- Bulan Input CRUD ---

// List all
app.get('/api/bulan', verifyToken, (req, res) => {
  const rows = db.prepare('SELECT * FROM bulan_input ORDER BY id').all();
  res.json(rows);
});

// Upsert (simpan/update)
app.post('/api/bulan', verifyToken, (req, res) => {
  const {
    bulan, pemasukanLap1, pemasukanLap2, pemasukanKan,
    pengeluaranOp, kama, kiki, adit,
    keuntunganPemodal, pengembalianModal
  } = req.body;

  if (!bulan) return res.status(400).json({ error: 'Bulan wajib diisi' });

  const existing = db.prepare('SELECT id FROM bulan_input WHERE bulan = ?').get(bulan);

  if (existing) {
    db.prepare(`
      UPDATE bulan_input SET
        pemasukanLap1 = ?, pemasukanLap2 = ?, pemasukanKan = ?,
        pengeluaranOp = ?, kama = ?, kiki = ?, adit = ?,
        keuntunganPemodal = ?, pengembalianModal = ?
      WHERE bulan = ?
    `).run(
      pemasukanLap1 || 0, pemasukanLap2 || 0, pemasukanKan || 0,
      pengeluaranOp || 0, kama || 0, kiki || 0, adit || 0,
      keuntunganPemodal || 0, pengembalianModal || 0, bulan
    );
  } else {
    db.prepare(`
      INSERT INTO bulan_input
      (bulan, pemasukanLap1, pemasukanLap2, pemasukanKan, pengeluaranOp, kama, kiki, adit, keuntunganPemodal, pengembalianModal)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      bulan,
      pemasukanLap1 || 0, pemasukanLap2 || 0, pemasukanKan || 0,
      pengeluaranOp || 0, kama || 0, kiki || 0, adit || 0,
      keuntunganPemodal || 0, pengembalianModal || 0
    );
  }

  res.json({ ok: true });
});

// Delete
app.delete('/api/bulan/:bulan', verifyToken, (req, res) => {
  const { bulan } = req.params;
  db.prepare('DELETE FROM bulan_input WHERE bulan = ?').run(bulan);
  res.json({ ok: true });
});

// --- Reinvestasi ---

app.get('/api/reinvestasi', verifyToken, (req, res) => {
  const row = db.prepare('SELECT adit, kama FROM reinvestasi WHERE id = 1').get();
  res.json(row || { adit: 0, kama: 0 });
});

app.post('/api/reinvestasi', verifyToken, (req, res) => {
  const { adit, kama } = req.body;
  db.prepare('UPDATE reinvestasi SET adit = ?, kama = ? WHERE id = 1').run(adit || 0, kama || 0);
  res.json({ ok: true });
});

// --- Kimi AI Analisa ---
const KIMI_API_KEY = process.env.KIMI_API_KEY || '';

app.post('/api/analisa', verifyToken, async (req, res) => {
  if (!KIMI_API_KEY) {
    return res.status(500).json({ error: 'KIMI_API_KEY tidak dikonfigurasi' });
  }

  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Messages array wajib diisi' });
  }

  try {
    const response = await fetch('https://api.moonshot.cn/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + KIMI_API_KEY
      },
      body: JSON.stringify({
        model: 'moonshot-v1-8k',
        messages: [
          { role: 'system', content: 'Kamu adalah AI Financial Advisor untuk bisnis lapangan futsal DSC. Berikan analisis keuangan yang praktis, realistis, dan actionable dalam Bahasa Indonesia. Format gunakan heading, bullet points, dan angka rupiah yang jelas.' },
          ...messages
        ],
        temperature: 0.7
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(502).json({ error: data.error?.message || 'Kimi API error' });
    }

    res.json({ reply: data.choices?.[0]?.message?.content || 'Tidak ada respons dari AI.' });
  } catch (e) {
    res.status(500).json({ error: 'Gagal menghubungi AI: ' + e.message });
  }
});

// Serve index.html for any non-API route (SPA fallback)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Investasi Lapangan server running on port ${PORT}`);
});
