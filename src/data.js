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
  loisirs: 'Sorties & loisirs', shopping: 'Shopping', frais: 'Frais de transfert', evenement: 'Événement',
};
export const CATS_IN = ['salaire', 'pension', 'freelance', 'remboursement', 'tontine', 'autre'];
export const CATS_OUT = ['alimentation', 'transport', 'loisirs', 'shopping', 'sante', 'famille', 'vie', 'logement', 'factures', 'abonnements', 'evenement', 'frais', 'tontine', 'remboursement', 'autre'];
// Catégories de dépenses variables, pilotées par les budgets
export const CATS_VIE = ['alimentation', 'transport', 'loisirs', 'shopping', 'sante', 'famille', 'vie'];
export const ACCOUNT_PRESETS = [
  { id: 'wave', nom: 'Wave', couleur: '#1DC8FF' },
  { id: 'om', nom: 'Orange Money', couleur: '#FF7900' },
  { id: 'djamo', nom: 'Djamo', couleur: '#7C3AED' },
  { id: 'mixx', nom: 'Mixx by Yas', couleur: '#E6B400' },
];
export const EVENT_PRESETS = ['Tabaski', 'Korité', 'Magal', 'Rentrée scolaire', 'Voyage', 'Fêtes de fin d\'année'];
export const GOAL_COLORS = ['#4F46E5', '#0EA5E9', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6'];
export const SERIES = ['#0F5C4D', '#2F4B7C', '#8A5A2B', '#6B4E8A', '#3D6B8A', '#7A3E4D', '#5B6B3A', '#8B8F98'];

export const defaultState = () => ({
  version: 3,
  dateInitiale: todayISO(),
  accounts: ACCOUNT_PRESETS.map((a) => ({ ...a, initial: 0 })),
  budgets: {},
  favoris: [],
  scenarios: [],
  settings: { notif: true, backup: true, backupDir: null, pinHash: null, autoUpdate: true, autostart: false },
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

// ---------- Migration ----------
export const fixCat = (x) => {
  if (x.kind === 'in' && !CATS_IN.includes(x.cat)) return { ...x, cat: 'salaire' };
  if (x.kind === 'out' && !CATS_OUT.includes(x.cat)) return { ...x, cat: 'autre' };
  return x;
};
export const migrate = (s) => {
  if (!s || !s.version) return null;
  let st = { ...s };
  if (st.version === 2) {
    const first = ACCOUNT_PRESETS[0].id;
    st.accounts = ACCOUNT_PRESETS.map((a, i) => ({ ...a, initial: i === 0 ? +st.soldeInitial || 0 : 0 }));
    st.budgets = +st.budgetVie > 0 ? { vie: +st.budgetVie } : {};
    st.transactions = (st.transactions || []).map((t) => ({ accountId: first, ...t }));
    st.items = (st.items || []).map((i) => (i.kind === 'save' ? i : { accountId: first, ...i }));
    st.favoris = []; st.scenarios = [];
    st.settings = { notif: true, backup: true, backupDir: null, pinHash: null, autoUpdate: true, autostart: false };
    delete st.soldeInitial; delete st.budgetVie;
    st.version = 3;
    st.migratedV3 = true;
  }
  if (st.version !== 3) return null;
  const base = defaultState();
  st = { ...base, ...st, settings: { ...base.settings, ...(st.settings || {}) } };
  st.items = st.items.map(fixCat);
  st.transactions = st.transactions.map((t) => (t.kind === 'in' || t.kind === 'out' ? fixCat(t) : t));
  st.creances = st.creances.map((c) => ({ n: 1, ...c }));
  if (!st.accounts.length) st.accounts = ACCOUNT_PRESETS.map((a) => ({ ...a, initial: 0 }));
  return st;
};
export const budgetTotal = (st) => Object.entries(st.budgets || {}).reduce((s, [, v]) => s + (+v || 0), 0);
export const accName = (st, id) => (st.accounts.find((a) => a.id === id) || st.accounts[0] || {}).nom || '—';

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
      if (i === +t.position - 1) { const gl = t.goalId && st.goals.find((g) => g.id === t.goalId); out.push({ ref: `tr:${t.id}:${key}`, label: `Cagnotte · ${t.nom}${gl ? ` → ${gl.nom}` : ''}`, kind: 'in', cat: 'tontine', amount: +t.cotisation * n, date: dateIn(key, t.jour), goalId: gl ? gl.id : undefined }); }
    }
  }
  for (const c of st.creances) for (const o of creanceOccs(c)) if (o.key === key) out.push(o);
  return out.sort((a, b) => a.date.localeCompare(b.date));
};
export const pending = (st, key) => occurrences(st, key).filter((o) => !st.done[o.ref]);

// Échéances d'une créance / dette (en une fois ou échelonnée)
export const creanceOccs = (c) => {
  const n = Math.max(1, +c.n || 1); const k0 = c.date.slice(0, 7); const jour = +c.date.slice(8, 10);
  const part = Math.floor(+c.montant / n);
  return Array.from({ length: n }, (_, i) => {
    const key = addMonths(k0, i);
    const amount = i === n - 1 ? +c.montant - part * (n - 1) : part;
    const lbl = c.sens === 'out' ? `Remboursement à ${c.nom}` : `Remboursement de ${c.nom}`;
    return { ref: `cr:${c.id}:${key}`, key, label: n > 1 ? `${lbl} (${i + 1}/${n})` : lbl, kind: c.sens === 'out' ? 'out' : 'in', cat: 'remboursement', amount, date: dateIn(key, jour) };
  });
};
// Échéances de créances passées et non soldées — reportées dans le mois courant
const overdue = (st, cur) => st.creances.flatMap((c) => creanceOccs(c)).filter((o) => o.key < cur && !st.done[o.ref]).map((o) => ({ ...o, late: true }));

export const upcoming = (st, days = 35) => {
  const now = new Date(); const cur = mkey(now);
  const lim = new Date(now.getTime() + days * 864e5);
  const limISO = `${lim.getFullYear()}-${pad(lim.getMonth() + 1)}-${pad(lim.getDate())}`;
  const t = todayISO();
  const list = [...overdue(st, cur), ...pending(st, cur), ...pending(st, addMonths(cur, 1))].filter((o) => o.date <= limISO);
  return list.map((o) => ({ ...o, late: o.late || o.date < t })).sort((a, b) => a.date.localeCompare(b.date));
};

// ---------- Soldes ----------
// Comptes = argent réel (Wave, Orange Money…). Objectifs = enveloppes virtuelles prises sur ces comptes.
// Solde disponible = total des comptes − argent affecté aux objectifs.
export const balances = (st) => {
  const acc = {};
  for (const a of st.accounts) acc[a.id] = +a.initial || 0;
  const def = st.accounts[0]?.id;
  const A = (id) => (id in acc ? id : def);
  const goals = {};
  for (const g of st.goals) goals[g.id] = +g.initial || 0;
  let env = 0;
  for (const t of st.transactions) {
    const m = +t.montant || 0;
    if (t.kind === 'in') { acc[A(t.accountId)] += m; if (t.goalId && t.goalId in goals) { goals[t.goalId] += m; env += m; } }
    else if (t.kind === 'out') acc[A(t.accountId)] -= m;
    else if (t.kind === 'save') { if (t.goalId in goals) { goals[t.goalId] += m; env += m; } }
    else if (t.kind === 'withdraw') { if (t.goalId in goals) { goals[t.goalId] -= m; env -= m; } }
    else if (t.kind === 'move') { acc[A(t.accountId)] -= m; acc[A(t.toAccountId)] += m; }
  }
  const comptes = Object.values(acc).reduce((s, v) => s + v, 0);
  const dispo = comptes - env;
  const epargne = Object.values(goals).reduce((s, v) => s + v, 0);
  return { dispo, goals, epargne, total: dispo + epargne, accounts: acc, comptes };
};
export const spentCat = (st, key, cat) => st.transactions.filter((t) => t.kind === 'out' && t.cat === cat && t.date.startsWith(key)).reduce((s, t) => s + t.montant, 0);
export const spentVie = (st, key) => st.transactions.filter((t) => t.kind === 'out' && CATS_VIE.includes(t.cat) && t.date.startsWith(key)).reduce((s, t) => s + t.montant, 0);

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
    // Entrées versées directement sur un objectif (ex. cagnotte de tontine liée)
    for (const x of p.filter((x) => x.kind === 'in' && x.goalId && x.goalId in g)) { epargne += x.amount; g[x.goalId] += x.amount; }
    let vie = budgetTotal(st);
    if (i === 0) { const rest = Math.max(0, vie - spentVie(st, key)); const left = daysIn(key) - today.getDate() + 1; vie = Math.min(rest, (vie * left) / daysIn(key)); }
    d = d + entrees - charges - epargne - vie;
    const totalG = Object.values(g).reduce((s, v) => s + v, 0);
    rows.push({ key, label: mLabel(key), entrees, charges, epargne, vie, dispo: d, epargneCumul: totalG, goals: { ...g } });
  }
  return rows;
};
export const goalReach = (rows, goal) => rows.find((r) => (r.goals[goal.id] || 0) >= +goal.montant);

// ---------- Bilan ----------
export const monthStats = (st, key) => {
  const tx = st.transactions.filter((t) => t.date.startsWith(key));
  const sum = (f) => tx.filter(f).reduce((s, t) => s + (+t.montant || 0), 0);
  const entrees = sum((t) => t.kind === 'in');
  const sorties = sum((t) => t.kind === 'out');
  const epargne = sum((t) => t.kind === 'save') - sum((t) => t.kind === 'withdraw') + sum((t) => t.kind === 'in' && t.goalId);
  const byCat = {};
  for (const t of tx.filter((t) => t.kind === 'out')) byCat[t.cat] = (byCat[t.cat] || 0) + t.montant;
  const vie = sum((t) => t.kind === 'out' && CATS_VIE.includes(t.cat));
  const taux = entrees > 0 ? (entrees - sorties) / entrees : null;
  return { key, entrees, sorties, epargne, solde: entrees - sorties, byCat, vie, taux, n: tx.length };
};
export const monthPlan = (st, key) => {
  const occ = occurrences(st, key);
  const sum = (f) => occ.filter(f).reduce((s, o) => s + o.amount, 0);
  return { entrees: sum((o) => o.kind === 'in'), charges: sum((o) => o.kind === 'out'), epargne: sum((o) => o.kind === 'save') + sum((o) => o.kind === 'in' && o.goalId), vie: budgetTotal(st) };
};

// ---------- Scénarios (simulation, ne modifie jamais les vraies données) ----------
export const SCEN_TYPES = { once_out: 'Dépense ponctuelle', once_in: 'Rentrée ponctuelle', stop: 'Arrêter un flux', change: 'Modifier un montant', budget: 'Changer le budget vie courante' };
export const applyScenario = (st, sc) => {
  let items = st.items.map((i) => ({ ...i }));
  let budgets = { ...st.budgets };
  for (const a of sc.adjustments || []) {
    if (a.type === 'once_out' || a.type === 'once_in') {
      items.push({ id: `sc_${a.id}`, label: a.label || SCEN_TYPES[a.type], kind: a.type === 'once_in' ? 'in' : 'out', cat: a.type === 'once_in' ? 'autre' : 'evenement', montant: +a.montant, jour: 15, debut: a.mois, fin: a.mois, every: 1 });
    } else if (a.type === 'stop') {
      items = items.map((i) => (i.id === a.itemId ? { ...i, fin: addMonths(a.mois, -1) } : i));
    } else if (a.type === 'change') {
      const it = items.find((i) => i.id === a.itemId);
      if (it) {
        items = items.map((i) => (i.id === a.itemId ? { ...i, fin: addMonths(a.mois, -1) } : i));
        items.push({ ...it, id: `sc_${a.id}`, debut: a.mois, montant: +a.montant, variable: false, min: undefined, max: undefined });
      }
    } else if (a.type === 'budget') {
      budgets = { vie: +a.montant };
    }
  }
  return { ...st, items, budgets };
};
