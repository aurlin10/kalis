// ---------- Dates ----------
export const pad = (n) => String(n).padStart(2, '0');
export const mkey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
export const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
export const addMonths = (key, n) => { const [y, m] = key.split('-').map(Number); return mkey(new Date(y, m - 1 + n, 1)); };
export const monthDiff = (a, b) => { const [ya, ma] = a.split('-').map(Number); const [yb, mb] = b.split('-').map(Number); return (yb - ya) * 12 + (mb - ma); };
export const daysIn = (key) => { const [y, m] = key.split('-').map(Number); return new Date(y, m, 0).getDate(); };
const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const MOIS_L = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
export const mLabel = (key, long = false) => { const [y, m] = key.split('-').map(Number); return long ? `${MOIS_L[m - 1]} ${y}` : `${MOIS[m - 1]} ${String(y).slice(2)}`; };
export const dLabel = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

// ---------- Nombres ----------
export const fmt = (n) => Math.round(n || 0).toLocaleString('fr-FR').replace(/ | /g, ' ');
export const fcfa = (n) => `${fmt(n)} FCFA`;
export const short = (n) => { const a = Math.abs(n); if (a >= 1e6) return `${(n / 1e6).toFixed(2).replace('.', ',')} M`; if (a >= 1e3) return `${Math.round(n / 1e3)} k`; return fmt(n); };
export const uid = () => Math.random().toString(36).slice(2, 10);

// ---------- Référentiels ----------
export const CATS = {
  salaire: 'Salaire', pension: 'Pension', freelance: 'Missions / freelance', remboursement: 'Remboursement', tontine: 'Tontine',
  logement: 'Logement', factures: 'Factures', abonnements: 'Abonnements', transport: 'Transport', alimentation: 'Alimentation',
  vie: 'Vie courante', sante: 'Santé', famille: 'Famille', epargne: 'Épargne objectif', autre: 'Autre',
};
export const CATS_IN = ['salaire', 'pension', 'freelance', 'remboursement', 'tontine', 'autre'];
export const CATS_OUT = ['logement', 'factures', 'abonnements', 'transport', 'alimentation', 'vie', 'sante', 'famille', 'tontine', 'remboursement', 'autre'];
export const GOAL_COLORS = ['#4F46E5', '#0EA5E9', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6'];
export const SERIES = ['#0F5C4D', '#2F4B7C', '#8A5A2B', '#6B4E8A', '#3D6B8A', '#7A3E4D', '#5B6B3A', '#8B8F98'];

export const defaultState = () => ({
  version: 2,
  soldeInitial: 480000,
  dateInitiale: todayISO(),
  budgetVie: 0,
  hypothese: 'bas', // bas | moyen | haut  (revenus variables)
  inclureIncertains: true,
  horizon: '2027-12',
  items: [], // flux récurrents
  goals: [], // objectifs
  tontines: [],
  creances: [],
  done: {},
  transactions: [],
});

// ---------- Occurrences ----------
const active = (it, key, st) => {
  if (it.incertain && !st.inclureIncertains) return false;
  if (monthDiff(it.debut, key) < 0) return false;
  if (it.fin && monthDiff(key, it.fin) < 0) return false;
  if (it.every > 1 && monthDiff(it.debut, key) % it.every !== 0) return false;
  return true;
};
export const isActive = active;
export const amountOf = (it, st) => {
  if (it.variable && it.min != null && it.max != null) {
    if (st.hypothese === 'haut') return +it.max;
    if (st.hypothese === 'moyen') return (+it.min + +it.max) / 2;
    return +it.min;
  }
  return +it.montant;
};
const dateIn = (key, jour) => `${key}-${pad(Math.min(+jour || 1, daysIn(key)))}`;

export const occurrences = (st, key) => {
  const out = [];
  for (const it of st.items) {
    if (!active(it, key, st)) continue;
    out.push({ ref: `i:${it.id}:${key}`, src: it, label: it.label, kind: it.kind, cat: it.kind === 'save' ? 'epargne' : it.cat, amount: amountOf(it, st), date: dateIn(key, it.jour), goalId: it.goalId, variable: it.variable, min: it.min, max: it.max });
  }
  for (const t of st.tontines) {
    const n = +t.participants;
    const i = monthDiff(t.debut, key);
    if (i >= 0 && i < n) {
      out.push({ ref: `tc:${t.id}:${key}`, label: `Cotisation · ${t.nom}`, kind: 'out', cat: 'tontine', amount: +t.cotisation, date: dateIn(key, t.jour) });
      if (i === +t.position - 1) out.push({ ref: `tr:${t.id}:${key}`, label: `Cagnotte · ${t.nom}`, kind: 'in', cat: 'tontine', amount: +t.cotisation * n, date: dateIn(key, t.jour) });
    }
  }
  for (const c of st.creances) {
    if (c.date.slice(0, 7) !== key) continue;
    out.push({ ref: `cr:${c.id}:${key}`, label: c.sens === 'out' ? `Remboursement à ${c.nom}` : `Remboursement de ${c.nom}`, kind: c.sens === 'out' ? 'out' : 'in', cat: 'remboursement', amount: +c.montant, date: c.date });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
};
export const pending = (st, key) => occurrences(st, key).filter((o) => !st.done[o.ref]);

// Créances en retard (date passée, non soldées) — à reporter dans le mois courant
const overdue = (st, cur) => st.creances
  .filter((c) => c.date.slice(0, 7) < cur && !st.done[`cr:${c.id}:${c.date.slice(0, 7)}`])
  .map((c) => ({ ref: `cr:${c.id}:${c.date.slice(0, 7)}`, label: c.sens === 'out' ? `Remboursement à ${c.nom}` : `Remboursement de ${c.nom}`, kind: c.sens === 'out' ? 'out' : 'in', cat: 'remboursement', amount: +c.montant, date: c.date, late: true }));

export const upcoming = (st, days = 35) => {
  const now = new Date(); const cur = mkey(now);
  const lim = new Date(now.getTime() + days * 864e5);
  const limISO = `${lim.getFullYear()}-${pad(lim.getMonth() + 1)}-${pad(lim.getDate())}`;
  const t = todayISO();
  const list = [...overdue(st, cur), ...pending(st, cur), ...pending(st, addMonths(cur, 1))].filter((o) => o.date <= limISO);
  return list.map((o) => ({ ...o, late: o.late || o.date < t })).sort((a, b) => a.date.localeCompare(b.date));
};

// ---------- Soldes ----------
export const balances = (st) => {
  let dispo = +st.soldeInitial;
  const goals = {};
  for (const g of st.goals) goals[g.id] = +g.initial || 0;
  for (const t of st.transactions) {
    if (t.kind === 'in') dispo += t.montant;
    else if (t.kind === 'out') dispo -= t.montant;
    else if (t.kind === 'save') { dispo -= t.montant; if (t.goalId in goals) goals[t.goalId] += t.montant; }
    else if (t.kind === 'withdraw') { dispo += t.montant; if (t.goalId in goals) goals[t.goalId] -= t.montant; }
  }
  const epargne = Object.values(goals).reduce((s, v) => s + v, 0);
  return { dispo, goals, epargne, total: dispo + epargne };
};
export const spentVie = (st, key) => st.transactions.filter((t) => t.kind === 'out' && t.cat === 'vie' && t.date.startsWith(key)).reduce((s, t) => s + t.montant, 0);

// ---------- Projection ----------
export const projection = (st, today = new Date()) => {
  const cur = mkey(today);
  let end = st.horizon || '2027-12';
  for (const g of st.goals) if (g.echeance > end) end = g.echeance;
  const n = Math.max(0, monthDiff(cur, end));
  const b = balances(st);
  let d = b.dispo;
  const g = { ...b.goals };
  const rows = [];
  for (let i = 0; i <= n; i++) {
    const key = addMonths(cur, i);
    const p = i === 0 ? [...overdue(st, cur), ...pending(st, key)] : pending(st, key);
    const entrees = p.filter((x) => x.kind === 'in').reduce((s, x) => s + x.amount, 0);
    const charges = p.filter((x) => x.kind === 'out').reduce((s, x) => s + x.amount, 0);
    let epargne = 0;
    for (const x of p.filter((x) => x.kind === 'save')) { epargne += x.amount; if (x.goalId in g) g[x.goalId] += x.amount; }
    let vie = +st.budgetVie || 0;
    if (i === 0) { const rest = Math.max(0, vie - spentVie(st, key)); const left = daysIn(key) - today.getDate() + 1; vie = Math.min(rest, (vie * left) / daysIn(key)); }
    d = d + entrees - charges - epargne - vie;
    const totalG = Object.values(g).reduce((s, v) => s + v, 0);
    rows.push({ key, label: mLabel(key), entrees, charges, epargne, vie, dispo: d, epargneCumul: totalG, goals: { ...g } });
  }
  return rows;
};
export const goalReach = (rows, goal) => rows.find((r) => (r.goals[goal.id] || 0) >= +goal.montant);
