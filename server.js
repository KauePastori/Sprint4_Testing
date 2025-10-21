// server.js — Mini API "Controle de Apostas Impulsivas"
// Rodar: node server.js  (BaseURL: http://localhost:3333)

const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// ======== Dados em memória (resetam ao reiniciar) ========
const users = [{ id: 1, email: "user01@teste.com", password: "Senha@123" }];
const sessions = new Map(); // token -> userId
const limitsByUser = new Map(); // userId -> { daily, weekly, monthly }
const autoExclusion = new Map(); // userId -> Date (timestamp ms)
const bets = []; // { userId, amount, description, ts (ms) }

// Valores padrão:
limitsByUser.set(1, { daily: 50, weekly: 200, monthly: 500 });

// ======== Helpers de data (ISO: semana inicia segunda) ========
function toDate(tsOrIso) {
  if (!tsOrIso) return new Date();
  const d = new Date(tsOrIso);
  return isNaN(d.getTime()) ? new Date() : d;
}
function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d) {
  const x = startOfDay(d);
  x.setDate(x.getDate() + 1);
  return x;
}
function startOfISOWeek(d) {
  const x = startOfDay(d);
  const dow = x.getDay(); // 0=Dom, 1=Seg
  const diff = dow === 0 ? -6 : 1 - dow; // volta até segunda
  x.setDate(x.getDate() + diff);
  return x;
}
function endOfISOWeek(d) {
  const x = startOfISOWeek(d);
  x.setDate(x.getDate() + 7); // exclusivo
  return x;
}
function startOfMonth(d) {
  const x = new Date(d);
  x.setDate(1);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfMonth(d) {
  const x = startOfMonth(d);
  x.setMonth(x.getMonth() + 1);
  return x;
}

function sumBets(userId, start, end) {
  return bets
    .filter(b => b.userId === userId && b.ts >= start.getTime() && b.ts < end.getTime())
    .reduce((s, b) => s + b.amount, 0);
}

// ======== Auth ========
app.post("/auth/login", (req, res) => {
  const { email, password } = req.body || {};
  const u = users.find(x => x.email === email && x.password === password);
  if (!u) return res.status(401).json({ error: "Credenciais inválidas" });
  const token = "fakejwt-" + Date.now();
  sessions.set(token, u.id);
  return res.json({ token, userId: u.id });
});

function auth(req, res, next) {
  const h = req.header("Authorization") || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token || !sessions.has(token)) return res.status(401).json({ error: "Não autenticado" });
  req.userId = sessions.get(token);
  next();
}

// ======== Limites ========
app.get("/limits", auth, (req, res) => {
  const lim = limitsByUser.get(req.userId) || { daily: 50, weekly: 200, monthly: 500 };
  res.json(lim);
});

app.put("/limits", auth, (req, res) => {
  const { daily, weekly, monthly } = req.body || {};
  const d = Number(daily), w = Number(weekly), m = Number(monthly);
  if ([d, w, m].some(v => isNaN(v) || v < 0)) {
    return res.status(400).json({ error: "Valores inválidos" });
  }
  limitsByUser.set(req.userId, { daily: d, weekly: w, monthly: m });
  res.json({ ok: true, saved: limitsByUser.get(req.userId) });
});

// ======== Apostas ========
app.post("/bets", auth, (req, res) => {
  const { amount, description, timestamp } = req.body || {};
  const amt = Number(amount);
  if (isNaN(amt) || amt <= 0) return res.status(400).json({ error: "amount inválido" });

  const ts = toDate(timestamp);
  const userId = req.userId;

  // Autoexclusão
  const until = autoExclusion.get(userId);
  if (until && Date.now() < until) {
    return res.status(403).json({ error: "Conta autoexcluída" });
  }

  const limits = limitsByUser.get(userId) || { daily: 50, weekly: 200, monthly: 500 };

  // Somatórios atuais
  const daySum = sumBets(userId, startOfDay(ts), endOfDay(ts));
  const weekSum = sumBets(userId, startOfISOWeek(ts), endOfISOWeek(ts));
  const monthSum = sumBets(userId, startOfMonth(ts), endOfMonth(ts));

  // Bloqueio por limite diário
  if (daySum + amt > limits.daily) {
    return res.status(422).json({ error: "Limite diário excedido" });
  }

  // (Opcional) Poderia bloquear também semanal/mensal, se quiser:
  // if (weekSum + amt > limits.weekly) return res.status(422).json({ error: "Limite semanal excedido" });
  // if (monthSum + amt > limits.monthly) return res.status(422).json({ error: "Limite mensal excedido" });

  bets.push({
    userId,
    amount: amt,
    description: String(description || ""),
    ts: ts.getTime(),
  });

  const newDaySum = daySum + amt;
  const newWeekSum = weekSum + amt;
  const newMonthSum = monthSum + amt;

  return res.status(201).json({
    ok: true,
    bet: { amount: amt, description, timestamp: ts.toISOString() },
    remainingDaily: Math.max(limits.daily - newDaySum, 0),
    remainingWeekly: Math.max(limits.weekly - newWeekSum, 0),
    remainingMonthly: Math.max(limits.monthly - newMonthSum, 0),
  });
});

// ======== Autoexclusão ========
app.post("/self-exclusion", auth, (req, res) => {
  const { days } = req.body || {};
  const d = Number(days) || 7;
  const until = Date.now() + d * 24 * 60 * 60 * 1000;
  autoExclusion.set(req.userId, until);
  res.json({ ok: true, untilISO: new Date(until).toISOString() });
});

// ======== Relatórios ========
app.get("/reports/month", auth, (req, res) => {
  const now = new Date();
  const y = Number(req.query.year) || now.getFullYear();
  const m = Number(req.query.month) || (now.getMonth() + 1); // 1..12
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 1);

  const userId = req.userId;
  const rows = [];

  for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
    const s = startOfDay(d);
    const e = endOfDay(d);
    const total = sumBets(userId, s, e);
    if (total > 0) {
      rows.push({ date: new Date(s).toISOString(), total });
    }
  }

  const totalMonth = rows.reduce((s, r) => s + r.total, 0);
  res.json({ year: y, month: m, days: rows, totalMonth });
});

app.get("/reports/export.csv", auth, (req, res) => {
  // Exporta todas as apostas do usuário no mês atual (ou ?year=&month=)
  const now = new Date();
  const y = Number(req.query.year) || now.getFullYear();
  const m = Number(req.query.month) || (now.getMonth() + 1);
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 1);

  const userId = req.userId;

  // Para cada aposta, calculamos os "restantes" após aquela aposta naquele dia/semana.
  const userBets = bets
    .filter(b => b.userId === userId && b.ts >= start.getTime() && b.ts < end.getTime())
    .sort((a, b) => a.ts - b.ts);

  const limits = limitsByUser.get(userId) || { daily: 50, weekly: 200, monthly: 500 };

  let csv = "data,descricao,valor,limiteDiarioRestante,limiteSemanalRestante\n";

  // Acumuladores por dia/semana
  let dayKey = null, daySum = 0;
  let weekStart = null, weekSum = 0;

  userBets.forEach(b => {
    const d = new Date(b.ts);
    const dk = startOfDay(d).toISOString();

    // Dia
    if (dk !== dayKey) {
      dayKey = dk;
      daySum = 0;
    }
    // Semana
    const ws = startOfISOWeek(d).getTime();
    if (ws !== weekStart) {
      weekStart = ws;
      weekSum = sumBets(userId, startOfISOWeek(d), new Date(startOfISOWeek(d).getTime())); // iniciar 0
      weekSum = 0;
    }

    // Somar esta aposta
    daySum += b.amount;
    weekSum += b.amount;

    const remainingDaily = Math.max(limits.daily - daySum, 0);
    const remainingWeekly = Math.max(limits.weekly - weekSum, 0);

    const line = [
      new Date(b.ts).toISOString().replace("T", " ").slice(0, 19),
      `"${(b.description || "").replace(/"/g, '""')}"`,
      b.amount.toFixed(2).replace(".", ","),
      remainingDaily.toFixed(2).replace(".", ","),
      remainingWeekly.toFixed(2).replace(".", ","),
    ].join(",");

    csv += line + "\n";
  });

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.send(csv);
});

// ======== Health ========
app.get("/health", (_, res) => res.json({ ok: true }));

// ======== Start ========
const PORT = process.env.PORT || 3333;
app.listen(PORT, () => console.log(`Mini API rodando em http://localhost:${PORT}`));
