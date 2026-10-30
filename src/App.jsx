import React, { useEffect, useMemo, useState } from 'react';
import {
  LayoutGrid, LineChart as LineIc, Target, Repeat, Users, HandCoins, List, Settings, Plus, Check, Pencil, Trash2, X,
  ArrowDownLeft, ArrowUpRight, PiggyBank, Sun, Moon, Monitor, AlertTriangle, Info, Download, Upload, RotateCcw, Undo2, Wallet, CalendarDays,
  ArrowLeftRight, BarChart3, FlaskConical, Lock, Bell, Star, FileSpreadsheet, FileText, FolderOpen, RefreshCw, Gauge, PartyPopper, KeyRound, ShieldCheck, Smartphone, Keyboard, Power, Delete, Sparkles,
} from 'lucide-react';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine,
} from 'recharts';
import logoUrl from '../build/logo.svg';
import {
  defaultState, balances, projection, pending, upcoming, occurrences, mkey, addMonths, mLabel, dLabel, fmt, fcfa, short, uid,
  CATS, CATS_IN, CATS_OUT, CATS_VIE, GOAL_COLORS, goalReach, monthDiff, todayISO, isActive, amountOf, spentVie, spentCat,
  migrate, fixCat, budgetTotal, accName, creanceOccs, monthStats, monthPlan, applyScenario, SCEN_TYPES, EVENT_PRESETS, daysIn,
} from './data.js';

const STORE = 'kalis-data-v2';
const load = () => { try { const s = migrate(JSON.parse(localStorage.getItem(STORE))); if (s) return s; } catch (e) {} return defaultState(); };
const native = typeof window !== 'undefined' ? window.kalis || null : null;
const sign = (k) => (k === 'in' || k === 'withdraw' ? '+' : k === 'move' ? '' : '−');
const tone = (k) => (k === 'in' || k === 'withdraw' ? 'pos' : k === 'save' ? 'sav' : k === 'move' ? '' : 'neg');
const KindIc = ({ k }) => { const I = k === 'in' || k === 'withdraw' ? ArrowDownLeft : k === 'save' ? PiggyBank : ArrowUpRight; return <div className="ic"><I size={16} /></div>; };

// ================= APP =================
export default function App() {
  const [st, setSt] = useState(load);
  const [page, setPage] = useState('dash');
  const [modal, setModal] = useState(null); // {type, data}
  const [locked, setLocked] = useState(() => !!load().settings?.pinHash);
  const [version, setVersion] = useState(null);
  const [update, setUpdate] = useState(null);
  const [lastBackup, setLastBackup] = useState(null);
  useEffect(() => { try { localStorage.setItem(STORE, JSON.stringify(st)); } catch (e) {} }, [st]);
  const mq = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  const [sysDark, setSysDark] = useState(!!mq?.matches);
  useEffect(() => { if (!mq) return; const h = (e) => setSysDark(e.matches); mq.addEventListener('change', h); return () => mq.removeEventListener('change', h); }, []);
  const mode = st.theme || 'light';
  const eff = mode === 'system' ? (sysDark ? 'dark' : 'light') : mode;
  useEffect(() => { document.documentElement.dataset.theme = eff; }, [eff]);

  const bal = useMemo(() => balances(st), [st]);
  const rows = useMemo(() => projection(st), [st]);
  const set = (p) => setSt((s) => ({ ...s, ...p }));
  const upsert = (coll, obj) => setSt((s) => ({ ...s, [coll]: s[coll].some((x) => x.id === obj.id) ? s[coll].map((x) => (x.id === obj.id ? obj : x)) : [...s[coll], obj] }));
  const remove = (coll, id) => setSt((s) => ({ ...s, [coll]: s[coll].filter((x) => x.id !== id) }));
  const addTx = (tx, ref) => setSt((s) => { const t = { id: uid(), ...tx, ref }; const done = { ...s.done }; if (ref) done[ref] = t.id; return { ...s, transactions: [t, ...s.transactions], done }; });
  const delTx = (id) => setSt((s) => { const t = s.transactions.find((x) => x.id === id); const done = { ...s.done }; if (t?.ref) delete done[t.ref]; return { ...s, transactions: s.transactions.filter((x) => x.id !== id), done }; });
  const setDone = (ref, v) => setSt((s) => { const done = { ...s.done }; if (v) done[ref] = true; else delete done[ref]; return { ...s, done }; });
  const undoRef = (ref) => { const v = st.done[ref]; if (typeof v === 'string') delTx(v); else setDone(ref, false); };
  const open = (type, data = null) => setModal({ type, data });
  const close = () => setModal(null);
  const setSettings = (p) => setSt((s) => ({ ...s, settings: { ...s.settings, ...p } }));
  const addMany = (list) => list.forEach((t) => addTx(t));

  // Raccourcis clavier
  useEffect(() => {
    const h = (e) => {
      if (!e.ctrlKey || locked) return;
      const k = e.key.toLowerCase();
      if (k === 'n') { e.preventDefault(); open('tx'); }
      else if (k === 'b' && !e.shiftKey) { e.preventDefault(); open('tx', { kind: 'move' }); }
      else if (k === 'l' && st.settings.pinHash) { e.preventDefault(); setModal(null); setLocked(true); }
    };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, [locked, st.settings.pinHash]);

  // Version + mise à jour automatique
  const checkUpdate = async () => { if (!native) return { status: 'error', message: 'Indisponible hors de l\'application' }; const r = await native.checkUpdate(); if (r.status === 'ready') setUpdate(r); return r; };
  useEffect(() => {
    if (!native) return;
    native.version().then(setVersion);
    if (st.settings.autoUpdate !== false) { const t = setTimeout(checkUpdate, 4000); const iv = setInterval(checkUpdate, 6 * 3600e3); return () => { clearTimeout(t); clearInterval(iv); }; }
  }, []);

  // Sauvegarde automatique (une copie par jour, 30 jours conservés)
  useEffect(() => {
    if (!native || st.settings.backup === false) return;
    const t = setTimeout(() => { native.backup(JSON.stringify(st, null, 1), st.settings.backupDir).then(setLastBackup).catch(() => {}); }, 3000);
    return () => clearTimeout(t);
  }, [st]);

  // Rappels : notification Windows pour les échéances d'aujourd'hui et de demain (une fois par jour)
  useEffect(() => {
    if (st.settings.notif === false || typeof Notification === 'undefined') return;
    const run = () => {
      const today = todayISO(); if (st.lastNotif === today) return;
      const tm = new Date(Date.now() + 864e5); const tom = `${tm.getFullYear()}-${String(tm.getMonth() + 1).padStart(2, '0')}-${String(tm.getDate()).padStart(2, '0')}`;
      const list = upcoming(st, 2).filter((o) => o.date <= tom);
      set({ lastNotif: today });
      if (!list.length) return;
      const title = list.length === 1 ? `Kalis · ${list[0].label}` : `Kalis · ${list.length} échéances`;
      const body = list.slice(0, 4).map((o) => `${o.date === today ? "Aujourd'hui" : o.date < today ? 'En retard' : 'Demain'} : ${o.label} (${fmt(o.amount)} FCFA)`).join('\n');
      try { new Notification(title, { body, silent: false }); } catch (e) {}
    };
    const t = setTimeout(run, 2500); const iv = setInterval(run, 3600e3);
    return () => { clearTimeout(t); clearInterval(iv); };
  }, [st.settings.notif, st.lastNotif, st.items, st.tontines, st.creances, st.done]);

  const exportPDF = async (name) => {
    const prev = document.documentElement.dataset.theme;
    document.documentElement.dataset.theme = 'light'; document.body.classList.add('printing');
    await new Promise((r) => setTimeout(r, 700));
    try { if (native) await native.exportPDF(name); else window.print(); } finally { document.body.classList.remove('printing'); document.documentElement.dataset.theme = prev; }
  };
  const doExcel = () => exportExcel(st, rows);

  const ctx = { st, set, bal, rows, upsert, remove, addTx, delTx, setDone, undoRef, open, setPage, setSettings, exportPDF, doExcel, version, update, checkUpdate, lastBackup, lock: () => setLocked(true) };

  const NAV = [
    ['Pilotage', [['dash', "Vue d'ensemble", LayoutGrid], ['bilan', 'Bilan mensuel', BarChart3], ['proj', 'Projection', LineIc], ['scen', 'Scénarios', FlaskConical], ['goals', 'Objectifs', Target]]],
    ['Données', [['comptes', 'Comptes', Smartphone], ['budgets', 'Budgets', Gauge], ['flux', 'Flux récurrents', Repeat], ['tont', 'Tontines', Users], ['cre', 'Créances & dettes', HandCoins], ['ops', 'Opérations', List]]],
    ['', [['set', 'Paramètres', Settings]]],
  ];
  const PAGES = { dash: Dashboard, bilan: Bilan, proj: Projection, scen: Scenarios, goals: Goals, comptes: Comptes, budgets: Budgets, flux: Flux, tont: Tontines, cre: Creances, ops: Operations, set: Params };
  const Page = PAGES[page];

  if (locked && st.settings.pinHash) return <ThemeCtx.Provider value={PAL[eff]}><LockScreen hash={st.settings.pinHash} onUnlock={() => setLocked(false)} /></ThemeCtx.Provider>;

  return (
    <ThemeCtx.Provider value={PAL[eff]}>
    <div className="app">
      <aside className="side">
        <div className="brand"><img className="brand-logo" src={logoUrl} alt="" /><div className="brand-name">Kalis</div></div>
        {NAV.map(([sec, items]) => (
          <React.Fragment key={sec || 'x'}>
            {sec ? <div className="nav-sec">{sec}</div> : <div style={{ height: 14 }} />}
            {items.map(([k, l, I]) => <button key={k} className={'nav' + (page === k ? ' on' : '')} onClick={() => setPage(k)}><I size={17} strokeWidth={1.8} />{l}</button>)}
          </React.Fragment>
        ))}
        <div className="side-foot">
          <div className="k">Patrimoine</div>
          <div className="v num">{fcfa(bal.total)}</div>
          <div className="bar"><i style={{ width: bal.total > 0 ? Math.max(0, Math.min(100, (bal.epargne / bal.total) * 100)) + '%' : 0 }} /></div>
          <div className="k" style={{ marginTop: 8, fontSize: 11.5 }}>{bal.total > 0 ? Math.round((bal.epargne / bal.total) * 100) : 0} % affecté aux objectifs</div>
        </div>
        <div className="theme-sw">{[['light', Sun, 'Clair'], ['dark', Moon, 'Sombre'], ['system', Monitor, 'Auto']].map(([m, I, l]) => (
            <button key={m} className={mode === m ? 'on' : ''} title={l} onClick={() => set({ theme: m })}><I size={13} />{l}</button>))}
          {st.settings.pinHash && <button title="Verrouiller (Ctrl+L)" onClick={() => setLocked(true)} style={{ flex: '0 0 auto', padding: '6px 9px' }}><Lock size={13} /></button>}</div>
      </aside>
      <main className="main">
        {update && <div className="update-bar"><Sparkles size={16} /><span>Kalis <b>{update.version}</b> est prête à être installée.</span><button className="btn p sm" onClick={() => native.relaunch()}><RefreshCw size={13} />Redémarrer maintenant</button><button className="ib" onClick={() => setUpdate(null)}><X size={15} /></button></div>}
        <Page {...ctx} />
      </main>

      {modal?.type === 'confirm' && <ConfirmModal occ={modal.data} st={st} onClose={close} onOk={(m, d, skip, accountId) => { if (skip) setDone(modal.data.ref, true); else addTx({ date: d, label: modal.data.label, kind: modal.data.kind, cat: modal.data.cat, montant: m, goalId: modal.data.goalId, accountId }, modal.data.ref); close(); }} />}
      {modal?.type === 'tx' && <TxModal init={modal.data} st={st} bal={bal} goals={st.goals} onClose={close} onFav={(f) => set({ favoris: f })} onOk={(list, fav) => { addMany(list); if (fav) set({ favoris: [...st.favoris, fav] }); close(); }} />}
      {modal?.type === 'account' && <AccountModal a={modal.data} st={st} onClose={close} onOk={(a) => { upsert('accounts', a); close(); }} onDelete={(id) => { remove('accounts', id); close(); }} />}
      {modal?.type === 'pin' && <PinModal onClose={close} onOk={async (p) => { setSettings({ pinHash: await sha('kalis:' + p) }); close(); }} />}
      {modal?.type === 'item' && <ItemModal item={modal.data} goals={st.goals} st={st} onClose={close} onOk={(it) => { upsert('items', it); close(); }} />}
      {modal?.type === 'goal' && <GoalModal goal={modal.data} onClose={close} onOk={(g) => { upsert('goals', g); close(); }} />}
      {modal?.type === 'tontine' && <TontineModal t={modal.data} goals={st.goals} onClose={close} onOk={(t) => { upsert('tontines', t); close(); }} />}
      {modal?.type === 'creance' && <CreanceModal c={modal.data} onClose={close} onOk={(c) => { upsert('creances', c); close(); }} />}
    </div>
    </ThemeCtx.Provider>
  );
}

// ================= Shared UI =================
const Top = ({ title, sub, children }) => (
  <div className="top"><div><h1>{title}</h1>{sub && <div className="sub">{sub}</div>}</div><div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>{children}<div className="avatar">PM</div></div></div>
);
const Card = ({ title, sub, action, children, flush, style, className }) => (
  <div className={'card ' + (className || '')} style={style}>
    {title && <div className="card-h"><div><h3>{title}</h3>{sub && <div className="sub">{sub}</div>}</div>{action}</div>}
    <div className={'card-b' + (flush ? ' flush' : '')}>{children}</div>
  </div>
);
const Kpi = ({ k, v, f, accent, cls, icon: I, tone: tn = 'p', children }) => (
  <div className={'card kpi' + (accent ? ' hero-sm' : '')}>
    <div className="k">{I && <div className={'chip-ic ' + tn}><I size={16} /></div>}{k}</div>
    <div className={'kv ' + (cls || '')}>{v}</div>
    {f && <div className="f">{f}</div>}
    {children}
  </div>
);
const Empty = ({ icon: I = Info, title, text, action }) => (
  <div className="empty"><div className="chip-ic p"><I size={20} /></div><b>{title}</b><div style={{ fontSize: 13 }}>{text}</div>{action && <div style={{ marginTop: 14 }}>{action}</div>}</div>
);
const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="tip"><div className="tt">{payload[0]?.payload?.long || label}</div>
      {payload.map((p) => <div className="r" key={p.dataKey}><span><i style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: p.color || p.stroke, marginRight: 6 }} />{p.name}</span><b>{fmt(p.value)}</b></div>)}
    </div>
  );
};
const PAL = {
  light: { grid: '#EEF0F6', axis: '#9AA3B5', zero: '#E1E4EE', cursor: '#C7CBE0', track: '#EEF0F6', primary: '#4F46E5', sky: '#0EA5E9' },
  dark: { grid: '#1E2536', axis: '#6B7489', zero: '#2A3245', cursor: '#3A4359', track: '#232A3B', primary: '#818CF8', sky: '#38BDF8' },
};
const ThemeCtx = React.createContext(PAL.light);
const useC = () => React.useContext(ThemeCtx);
const axisOf = (c) => ({ tick: { fill: c.axis, fontSize: 12 }, axisLine: false, tickLine: false });
const gname = (st, id) => st.goals.find((g) => g.id === id)?.nom;
const Ring = ({ pct, color, size = 64, stroke = 7, label }) => {
  const C = useC(); color = color || C.primary;
  const r = (size - stroke) / 2; const c = 2 * Math.PI * r; const p = Math.max(0, Math.min(1, pct || 0));
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}><circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C.track} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - p)} style={{ transition: 'stroke-dashoffset .8s ease' }} /></svg>
      <span style={{ fontSize: size > 80 ? 20 : 13 }}>{label ?? `${Math.round(p * 100)}%`}</span>
    </div>
  );
};
function TrendChart({ rows, h = 270, dots }) {
  const c = useC(); const axis = axisOf(c);
  const data = rows.map((r) => ({ ...r, long: mLabel(r.key, true) }));
  return (
    <div style={{ height: h }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="fa" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={c.primary} stopOpacity={0.2} /><stop offset="100%" stopColor={c.primary} stopOpacity={0} /></linearGradient>
            <linearGradient id="fb" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={c.sky} stopOpacity={0.2} /><stop offset="100%" stopColor={c.sky} stopOpacity={0} /></linearGradient>
          </defs>
          <CartesianGrid stroke={c.grid} strokeDasharray="3 4" vertical={false} />
          <XAxis dataKey="label" interval={data.length > 14 ? 1 : 0} {...axis} />
          <YAxis tickFormatter={short} width={56} {...axis} />
          <Tooltip content={<Tip />} cursor={{ stroke: c.cursor, strokeDasharray: '3 3' }} />
          <ReferenceLine y={0} stroke={c.zero} />
          <Area type="monotone" dataKey="epargneCumul" name="Épargne" stroke={c.sky} strokeWidth={2.4} fill="url(#fb)" dot={dots ? { r: 2.5, fill: c.sky } : false} animationDuration={500} />
          <Area type="monotone" dataKey="dispo" name="Disponible" stroke={c.primary} strokeWidth={2.4} fill="url(#fa)" dot={dots ? { r: 2.5, fill: c.primary } : false} animationDuration={500} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
const Spark = ({ values }) => {
  if (values.length < 2) return null;
  const w = 210, h = 56, mx = Math.max(...values), mn = Math.min(0, ...values);
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${((i / (values.length - 1)) * w).toFixed(1)} ${(h - ((v - mn) / (mx - mn || 1)) * h * 0.9 - 2).toFixed(1)}`).join(' ');
  return <svg className="hero-spark" viewBox={`0 0 ${w} ${h}`}><path d={d} fill="none" stroke="rgba(255,255,255,.8)" strokeWidth="2" strokeLinecap="round" /></svg>;
};
const MOIS3 = ['janv', 'févr', 'mars', 'avr', 'mai', 'juin', 'juil', 'août', 'sept', 'oct', 'nov', 'déc'];
const DChip = ({ iso, late }) => { const [, m, d] = iso.split('-'); return <div className={'dchip' + (late ? ' late' : '')}><b>{+d}</b><span>{MOIS3[+m - 1]}</span></div>; };

function OccRow({ o, st, open }) {
  return (
    <div className="row">
      <DChip iso={o.date} late={o.late} />
      <div style={{ minWidth: 0 }}>
        <div className="t">{o.label}{o.kind === 'save' && o.goalId && <span className="badge p">{gname(st, o.goalId)}</span>}{o.late && <span className="badge warn">En attente</span>}</div>
        <div className="s">{o.kind === 'in' ? 'Entrée' : o.kind === 'save' ? 'Épargne' : 'Sortie'} · {CATS[o.cat] || ''}{o.variable && ` · ${short(o.min)}–${short(o.max)}`}</div>
      </div>
      <div className={'a ' + tone(o.kind)}>{sign(o.kind)} {fmt(o.amount)}</div>
      <button className="chk" title="Valider" onClick={() => open('confirm', o)}><Check size={15} /></button>
    </div>
  );
}

// ================= DASHBOARD =================
const REP_COLORS = ['#4F46E5', '#0EA5E9', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#64748B', '#14B8A6'];
function Dashboard({ st, bal, rows, open, setPage }) {
  const up = upcoming(st);
  const inSoon = up.filter((o) => o.kind === 'in').reduce((s, o) => s + o.amount, 0);
  const outSoon = up.filter((o) => o.kind !== 'in').reduce((s, o) => s + o.amount, 0);
  const cur = mkey(new Date());
  const nk = addMonths(cur, 1);
  const vie = spentVie(st, cur);
  const bt = budgetTotal(st);
  const over = CATS_VIE.filter((c) => +st.budgets[c] > 0 && spentCat(st, cur, c) > +st.budgets[c]);
  const neg = rows.find((r) => r.dispo < 0);
  const late = st.goals.map((g) => ({ g, r: goalReach(rows, g) })).find(({ g, r }) => !r || monthDiff(g.echeance, r.key) > 0);
  const steps = [
    { t: 'Comptes', s: `${fcfa(bal.comptes)} sur Wave, Orange Money, Djamo et Mixx`, done: true, a: ['Gérer', () => setPage('comptes')] },
    { t: 'Revenus et charges', s: 'Salaires, loyer, factures, abonnements…', done: st.items.length > 0, a: ['Ajouter un flux', () => open('item')] },
    { t: 'Budgets', s: 'Plafonds par catégorie : alimentation, transport…', done: bt > 0, a: ['Définir', () => setPage('budgets')] },
    { t: 'Objectifs', s: 'Ce pour quoi tu épargnes', done: st.goals.length > 0, a: ['Créer un objectif', () => open('goal')] },
  ];
  const onboarding = steps.some((s) => !s.done);
  const revNext = pending(st, nk).filter((x) => x.kind === 'in').reduce((s, x) => s + x.amount, 0);
  const nbSrc = new Set(pending(st, nk).filter((x) => x.kind === 'in').map((x) => x.label)).size;

  const groups = {};
  pending(st, nk).filter((x) => x.kind !== 'in').forEach((x) => { const k = x.kind === 'save' ? 'epargne' : x.cat; groups[k] = (groups[k] || 0) + x.amount; });
  for (const [c, v] of Object.entries(st.budgets || {})) if (+v > 0) groups[c] = (groups[c] || 0) + +v;
  const rep = Object.entries(groups).sort((a, b) => b[1] - a[1]).map(([k, v], i) => ({ k, v, c: REP_COLORS[i % REP_COLORS.length] }));
  const repTot = rep.reduce((s, x) => s + x.v, 0);
  const hr = new Date().getHours();

  return (
    <>
      <Top title={`${hr >= 5 && hr < 18 ? 'Bonjour' : 'Bonsoir'} Paul`} sub={new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).replace(/^./, (c) => c.toUpperCase())}>
        <button className="btn s" onClick={() => setPage('proj')}><LineIc size={15} />Projection</button>
        <button className="btn p" onClick={() => open('tx')}><Plus size={16} />Nouvelle opération</button>
      </Top>
      <div className="content">
        {onboarding && (
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-h"><div><h3>Configuration de ton espace</h3><div className="sub">Renseigne tes données pour activer la projection</div></div><span className="badge p">{steps.filter((s) => s.done).length} / 4</span></div>
            <div className="steps">{steps.map((s, i) => (
              <div key={s.t} className={'step' + (s.done ? ' done' : '')}>
                <div className="n">{s.done ? <Check size={13} /> : i + 1}</div><div className="t">{s.t}</div><div className="s">{s.s}</div>
                <button className={'btn sm ' + (s.done ? 's' : 'p')} onClick={s.a[1]}>{s.done && i > 0 ? 'Compléter' : s.a[0]}</button>
              </div>))}
            </div>
          </div>
        )}
        {neg ? <div className="alert warn"><div className="chip-ic"><AlertTriangle size={16} /></div><div>Le solde disponible devient négatif en <b>{mLabel(neg.key, true)}</b> ({fcfa(neg.dispo)}). Revois ton budget ou ton épargne programmée.</div></div>
          : late ? <div className="alert warn"><div className="chip-ic"><AlertTriangle size={16} /></div><div>L'objectif <b>{late.g.nom}</b> n'est pas atteint à l'échéance ({mLabel(late.g.echeance, true)}) avec l'épargne programmée actuelle.</div></div>
          : st.goals.length > 0 ? <div className="alert info"><div className="chip-ic"><Check size={16} /></div><div>Tous tes objectifs sont atteints à temps et ton solde reste positif sur toute la période.</div></div> : null}
        {st.migratedV3 && <div className="alert info"><div className="chip-ic"><Smartphone size={16} /></div><div style={{ flex: 1 }}>Nouveau : tes comptes Wave, Orange Money, Djamo et Mixx. Ton solde de départ est sur Wave pour l'instant : répartis-le.</div><button className="btn p sm" onClick={() => setPage('comptes')}>Répartir</button></div>}
        {over.length > 0 && <div className="alert warn"><div className="chip-ic"><Gauge size={16} /></div><div style={{ flex: 1 }}>Budget dépassé ce mois-ci : <b>{over.map((c) => CATS[c]).join(', ')}</b>.</div><button className="btn s sm" onClick={() => setPage('budgets')}>Voir</button></div>}

        <div className="grid gh">
          <div className="card kpi hero">
            <div className="k">Solde disponible</div>
            <div className="kv">{fmt(bal.dispo)}<small>FCFA</small></div>
            <Spark values={rows.map((r) => r.dispo)} />
            <div className="hero-stats">
              <div>Épargne affectée<b>{fmt(bal.epargne)}</b></div>
              <div>Entrées · 35 j<b>{fmt(inSoon)}</b></div>
              <div>Sorties · 35 j<b>{fmt(outSoon)}</b></div>
            </div>
          </div>
          <Kpi icon={ArrowDownLeft} tone="g" k={`Revenus · ${mLabel(nk, true)}`} v={<>{fmt(revNext)}<small>FCFA</small></>}
            f={<div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{nbSrc} source{nbSrc > 1 ? 's' : ''}</span>{revNext > 0 && <span className="badge ok" style={{ margin: 0 }}>prévu</span>}</div>}>
            <div className="bar" style={{ marginTop: 12, height: 6 }}><i style={{ width: revNext ? Math.max(0, Math.min(100, (1 - (repTot / revNext)) * 100)) + '%' : 0, background: 'var(--pos)' }} /></div>
            {revNext > 0 && <div className="f">Reste après sorties : <b style={{ color: 'var(--ink)' }}>{fmt(revNext - repTot)}</b></div>}
          </Kpi>
          <Kpi icon={Gauge} tone="o" k={`Budgets · ${mLabel(cur, true)}`}
            v={bt ? <>{fmt(Math.max(0, bt - vie))}<small>restants</small></> : <span className="muted" style={{ fontSize: 17, fontWeight: 600 }}>Non défini</span>}
            f={bt ? <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{fmt(vie)} / {fmt(bt)}</span><span>{Math.round((vie / bt) * 100)} %</span></div> : <a className="link" onClick={() => setPage('budgets')}>Définir mes budgets</a>}>
            {bt > 0 && <div className="bar" style={{ marginTop: 12, height: 6 }}><i style={{ width: Math.min(100, (vie / bt) * 100) + '%', background: vie > bt ? 'var(--neg)' : 'var(--warn)' }} /></div>}
          </Kpi>
        </div>

        <div className="acc-strip mt">
          {st.accounts.map((a) => (
            <button className="acc-mini" key={a.id} onClick={() => setPage('comptes')}>
              <span className="acc-badge sm" style={{ background: a.couleur }}>{a.nom.slice(0, 1)}</span>
              <span><span className="muted" style={{ fontSize: 12 }}>{a.nom}</span><b className={'num' + ((bal.accounts[a.id] || 0) < 0 ? ' neg' : '')}>{fmt(bal.accounts[a.id] || 0)}</b></span>
            </button>))}
          <button className="acc-mini add" onClick={() => open('tx', { kind: 'move' })}><ArrowLeftRight size={16} /><span>Virement</span></button>
        </div>

        <div className="grid g21 mt">
          <Card title="Trajectoire" sub={`Jusqu'en ${mLabel(rows[rows.length - 1].key, true)}`} action={<div className="legend"><span><i style={{ background: 'var(--primary)' }} />Disponible</span><span><i style={{ background: 'var(--sky)' }} />Épargne</span></div>}>
            <TrendChart rows={rows} h={270} />
          </Card>
          <Card title="Objectifs" sub={`${st.goals.length} actif${st.goals.length > 1 ? 's' : ''}`} action={<button className="btn s sm" onClick={() => setPage('goals')}>Voir tout</button>} flush>
            {st.goals.length ? st.goals.slice(0, 4).map((g) => {
              const v = bal.goals[g.id] || 0; const r = goalReach(rows, g); const ok = r && monthDiff(g.echeance, r.key) <= 0;
              return (
                <div className="gline" key={g.id}>
                  <Ring pct={v / g.montant} color={g.couleur} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 650 }}>{g.nom}</div>
                    <div className="muted num" style={{ fontSize: 12.5 }}>{fmt(v)} / {fmt(g.montant)} FCFA</div>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: ok ? 'var(--pos)' : 'var(--neg)' }}>{r ? `Atteint ${mLabel(r.key)}` : 'Non atteint'}</div>
                  </div>
                </div>);
            }) : <Empty icon={Target} title="Aucun objectif" text="Crée ton premier objectif d'épargne." action={<button className="btn p sm" onClick={() => open('goal')}><Plus size={14} />Créer</button>} />}
          </Card>
        </div>

        <div className="grid g21 mt">
          <Card title="Échéances à venir" sub="Valide chaque mouvement quand il a lieu" flush action={up.length > 0 && <span className="badge p">{up.length}</span>}>
            {up.length ? up.slice(0, 8).map((o) => <OccRow key={o.ref} o={o} st={st} open={open} />) : <Empty icon={CalendarDays} title="Aucune échéance" text="Les flux, tontines et créances que tu ajoutes apparaîtront ici." />}
          </Card>
          <Card title="Répartition des sorties" sub={mLabel(nk, true).replace(/^./, (c) => c.toUpperCase())}>
            {rep.length ? (
              <>
                <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: -.5 }} className="num">{fmt(repTot)} <span className="muted" style={{ fontSize: 13, fontWeight: 500 }}>FCFA</span></div>
                <div className="stack" style={{ margin: '12px 0 16px' }}>{rep.map((x) => <i key={x.k} style={{ width: (x.v / repTot) * 100 + '%', background: x.c }} />)}</div>
                {rep.map((x) => (
                  <div key={x.k} style={{ display: 'flex', alignItems: 'center', fontSize: 13, padding: '6px 0' }}>
                    <i style={{ width: 9, height: 9, borderRadius: 3, background: x.c, marginRight: 10 }} />
                    <span className="muted">{CATS[x.k] || x.k}</span>
                    <span style={{ marginLeft: 'auto' }} className="num"><b>{fmt(x.v)}</b><span className="muted" style={{ display: 'inline-block', width: 44, textAlign: 'right' }}>{Math.round((x.v / repTot) * 100)} %</span></span>
                  </div>))}
              </>) : <Empty title="Rien de prévu" text="Ajoute tes charges récurrentes." />}
          </Card>
        </div>
      </div>
    </>
  );
}

// ================= PROJECTION =================
function Projection({ st, set, rows, exportPDF, doExcel }) {
  const last = rows[rows.length - 1];
  const totIn = rows.reduce((s, r) => s + r.entrees, 0);
  const totOut = rows.reduce((s, r) => s + r.charges + r.vie, 0);
  const hasVar = st.items.some((i) => i.variable);
  const hasInc = st.items.some((i) => i.incertain);
  const minD = rows.reduce((m, r) => (r.dispo < m.dispo ? r : m), rows[0]);
  const data = rows.map((r) => ({ ...r, long: mLabel(r.key, true) }));
  return (
    <>
      <Top title="Projection" sub={`Simulation mois par mois jusqu'en ${mLabel(last.key, true)}`}><button className="btn s no-print" onClick={doExcel}><FileSpreadsheet size={15} />Excel</button><button className="btn s no-print" onClick={() => exportPDF(`Kalis-projection-${todayISO()}.pdf`)}><FileText size={15} />PDF</button></Top>
      <div className="content">
        <div className="card" style={{ padding: '16px 20px' }}>
          <div className="toolbar">
            <div className="field"><label>Revenus variables</label>
              <div className="seg">{[['bas', 'Hypothèse basse'], ['moyen', 'Moyenne'], ['haut', 'Haute']].map(([k, l]) => <button key={k} className={st.hypothese === k ? 'on' : ''} disabled={!hasVar} onClick={() => set({ hypothese: k })}>{l}</button>)}</div></div>
            <div className="field"><label>Budgets vie courante / mois</label><div className="inp num" style={{ width: 170, background: 'var(--line2)' }}>{fmt(budgetTotal(st))}</div></div>
            <div className="field"><label>Horizon</label><input className="inp" type="month" style={{ width: 170 }} value={st.horizon} onChange={(e) => e.target.value && set({ horizon: e.target.value })} /></div>
            <label className="switch" style={{ paddingBottom: 9, opacity: hasInc ? 1 : .5 }}><input type="checkbox" checked={st.inclureIncertains} disabled={!hasInc} onChange={(e) => set({ inclureIncertains: e.target.checked })} />Inclure les revenus incertains</label>
          </div>
        </div>
        <div className="grid g4 mt">
          <Kpi accent icon={Wallet} k="Solde fin de période" v={<span className={last.dispo < 0 ? 'neg' : ''}>{fmt(last.dispo)}</span>} f={mLabel(last.key, true)} />
          <Kpi icon={PiggyBank} tone="s" k="Épargne cumulée" v={fmt(last.epargneCumul)} f="Tous objectifs" />
          <Kpi icon={AlertTriangle} tone="o" k="Point bas du solde" v={<span className={minD.dispo < 0 ? 'neg' : ''}>{fmt(minD.dispo)}</span>} f={mLabel(minD.key, true)} />
          <Kpi icon={Repeat} tone="g" k="Entrées / dépenses" v={<><span className="pos">{short(totIn)}</span> <span className="muted" style={{ fontWeight: 400 }}>/</span> <span className="neg">{short(totOut)}</span></>} f="Hors épargne" />
        </div>
        <Card title="Évolution" style={{ marginTop: 16 }} action={<div className="legend"><span><i style={{ background: 'var(--primary)' }} />Disponible</span><span><i style={{ background: 'var(--sky)' }} />Épargne cumulée</span></div>}>
          <TrendChart rows={rows} h={330} dots />
        </Card>
        <div className="card mt tbl" style={{ overflow: 'hidden' }}>
          <div className="card-h"><h3>Détail mensuel</h3><span className="muted" style={{ fontSize: 12.5 }}>Montants en FCFA</span></div>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead><tr><th>Mois</th><th>Entrées</th><th>Charges</th><th>Vie courante</th><th>Épargne</th><th>Solde disponible</th><th>Épargne cumulée</th></tr></thead>
              <tbody>{rows.map((r) => (
                <tr key={r.key}><td style={{ fontWeight: 500, textTransform: 'capitalize' }}>{mLabel(r.key, true)}</td>
                  <td className="pos">{fmt(r.entrees)}</td><td>{fmt(r.charges)}</td><td>{fmt(r.vie)}</td><td className="sav">{fmt(r.epargne)}</td>
                  <td style={{ fontWeight: 600 }} className={r.dispo < 0 ? 'neg' : ''}>{fmt(r.dispo)}</td><td style={{ fontWeight: 600 }}>{fmt(r.epargneCumul)}</td></tr>))}</tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

// ================= OBJECTIFS =================
function Goals({ st, bal, rows, open, remove, addTx }) {
  const c = useC(); const axis = axisOf(c);
  const cur = mkey(new Date());
  const [fund, setFund] = useState(null);
  const [xfer, setXfer] = useState(null);
  const data = rows.map((r) => { const o = { label: r.label, long: mLabel(r.key, true) }; st.goals.forEach((g) => { o[g.id] = r.goals[g.id] || 0; }); return o; });
  return (
    <>
      <Top title="Objectifs" sub="Épargne affectée à tes projets">{st.goals.length > 0 && <button className="btn s" onClick={() => setXfer({ from: 'dispo', to: st.goals[0].id })}><Repeat size={15} />Transfert</button>}<button className="btn p" onClick={() => open('goal')}><Plus size={16} />Nouvel objectif</button></Top>
      <div className="content">
        {!st.goals.length ? <div className="card"><Empty icon={Target} title="Aucun objectif pour l'instant" text="Définis un montant cible et une échéance, puis programme une épargne mensuelle." action={<button className="btn p" onClick={() => open('goal')}><Plus size={16} />Créer un objectif</button>} /></div> : (
          <>
            <div className="grid g3">
              {st.goals.map((g) => {
                const v = bal.goals[g.id] || 0; const reste = Math.max(0, g.montant - v);
                const mois = Math.max(1, monthDiff(cur, g.echeance) + 1); const r = goalReach(rows, g);
                const ok = r && monthDiff(g.echeance, r.key) <= 0;
                const prog = st.items.filter((i) => i.kind === 'save' && i.goalId === g.id);
                const tons = st.tontines.filter((t) => t.goalId === g.id);
                return (
                  <div className="card goal" key={g.id}>
                    <div className="goal-h">
                      <Ring pct={v / g.montant} color={g.couleur} size={84} stroke={8} />
                      <div style={{ flex: 1, minWidth: 0 }}><div className="goal-n">{g.nom}</div><div className="muted" style={{ fontSize: 12.5, marginTop: 1 }}>Échéance {mLabel(g.echeance, true)}</div>
                        <div className="goal-v">{fmt(v)}</div><div className="muted num" style={{ fontSize: 12.5 }}>sur {fmt(g.montant)} FCFA</div></div>
                      <div style={{ display: 'flex', alignSelf: 'flex-start' }}><button className="ib" onClick={() => open('goal', g)}><Pencil size={15} /></button><button className="ib" onClick={() => { if (window.confirm(`Supprimer l'objectif « ${g.nom} » ?`)) remove('goals', g.id); }}><Trash2 size={15} /></button></div>
                    </div>
                    <div className="meta">
                      <div><div className="k">Reste</div><div className="v">{fmt(reste)}</div></div>
                      <div><div className="k">Effort / mois</div><div className="v">{fmt(Math.max(0, reste - tons.filter((t) => !st.done[`tr:${t.id}:${addMonths(t.debut, t.position - 1)}`]).reduce((x, t) => x + t.cotisation * t.participants, 0)) / mois)}</div></div>
                      <div><div className="k">Atteinte</div><div className={'v ' + (ok ? 'pos' : 'neg')}>{r ? mLabel(r.key) : 'Non atteint'}</div></div>
                    </div>
                    <div className="muted" style={{ fontSize: 12.5, marginTop: 12 }}>{prog.length ? `Épargne programmée : ${prog.map((p) => `${short(p.montant)}/mois`).join(', ')}` : 'Aucune épargne programmée'}</div>
                    {tons.map((t) => <div key={t.id} style={{ fontSize: 12.5, marginTop: 4 }}><span className="badge p" style={{ marginLeft: 0 }}><Users size={11} />{t.nom}</span> <span className="muted">cagnotte de {fmt(t.cotisation * t.participants)} en {mLabel(addMonths(t.debut, t.position - 1), true)}{st.done[`tr:${t.id}:${addMonths(t.debut, t.position - 1)}`] ? ' · reçue' : ''}</span></div>)}
                    <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                      <button className="btn p sm" onClick={() => setFund({ goal: g, kind: 'save', montant: '', date: todayISO() })}><ArrowUpRight size={14} />Alimenter</button>
                      <button className="btn s sm" onClick={() => open('item', { kind: 'save', goalId: g.id, label: `Épargne ${g.nom}` })}><Repeat size={14} />Programmer</button>
                      <button className="btn s sm" disabled={v <= 0} onClick={() => setFund({ goal: g, kind: 'withdraw', montant: '', date: todayISO() })}>Retirer</button>
                      <button className="btn s sm" disabled={v <= 0} onClick={() => setXfer({ from: g.id, to: 'dispo' })}>Transférer</button>
                    </div>
                  </div>);
              })}
            </div>
            <Card title="Progression projetée" style={{ marginTop: 16 }} action={<div className="legend">{st.goals.map((g) => <span key={g.id}><i style={{ background: g.couleur }} />{g.nom}</span>)}</div>}>
              <div style={{ height: 300 }}>
                <ResponsiveContainer>
                  <LineChart data={data} margin={{ top: 6, right: 24, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke={c.grid} strokeDasharray="3 4" vertical={false} /><XAxis dataKey="label" interval={data.length > 14 ? 1 : 0} {...axis} /><YAxis tickFormatter={short} width={56} {...axis} /><Tooltip content={<Tip />} />
                    {st.goals.map((g) => <ReferenceLine key={'r' + g.id} y={+g.montant} stroke={g.couleur} strokeDasharray="4 4" strokeOpacity={.6} />)}
                    {st.goals.map((g) => <Line key={g.id} type="monotone" dataKey={g.id} name={g.nom} stroke={g.couleur} strokeWidth={2.4} dot={false} animationDuration={500} />)}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </>
        )}
      </div>
      {xfer && <TransferModal init={xfer} st={st} bal={bal} onClose={() => setXfer(null)} onOk={(from, to, montant, date) => {
        const nom = (id) => (id === 'dispo' ? 'Solde disponible' : gname(st, id));
        const label = `Transfert ${nom(from)} → ${nom(to)}`;
        if (from !== 'dispo') addTx({ date, label, kind: 'withdraw', cat: 'epargne', montant, goalId: from });
        if (to !== 'dispo') addTx({ date, label, kind: 'save', cat: 'epargne', montant, goalId: to });
        setXfer(null);
      }} />}
      {fund && (
        <Modal title={`${fund.kind === 'save' ? 'Alimenter' : 'Retirer de'} · ${fund.goal.nom}`} onClose={() => setFund(null)}
          footer={<><button className="btn s" onClick={() => setFund(null)}>Annuler</button><button className="btn p" disabled={!+fund.montant} onClick={() => { addTx({ date: fund.date, label: fund.kind === 'save' ? `Épargne ${fund.goal.nom}` : `Retrait ${fund.goal.nom}`, kind: fund.kind, cat: 'epargne', montant: +fund.montant, goalId: fund.goal.id }); setFund(null); }}>Valider</button></>}>
          <div className="form f2">
            <div className="field"><label>Montant (FCFA)</label><input autoFocus className="inp num" type="number" value={fund.montant} onChange={(e) => setFund({ ...fund, montant: e.target.value })} /></div>
            <div className="field"><label>Date</label><input className="inp" type="date" value={fund.date} onChange={(e) => setFund({ ...fund, date: e.target.value })} /></div>
          </div>
          <div className="field" style={{ marginTop: 10 }}><span className="hint">{fund.kind === 'save' ? 'Le montant est déduit du solde disponible et affecté à cet objectif.' : "Le montant revient sur le solde disponible."}</span></div>
        </Modal>
      )}
    </>
  );
}

// ================= FLUX =================
const FREQ = (it) => (it.fin && it.fin === it.debut ? 'Ponctuel' : it.every === 2 ? 'Tous les 2 mois' : it.every === 3 ? 'Trimestriel' : 'Mensuel');
function Flux({ st, open, remove }) {
  const nk = addMonths(mkey(new Date()), 1);
  const secs = [['in', 'Revenus'], ['out', 'Charges'], ['evt', 'Dépenses ponctuelles prévues'], ['save', 'Épargne programmée']];
  return (
    <>
      <Top title="Flux récurrents" sub="Revenus, charges et épargne qui reviennent dans le temps"><button className="btn p" onClick={() => open('item')}><Plus size={16} />Ajouter un flux</button></Top>
      <div className="content">
        {secs.map(([k, l]) => {
          const list = st.items.filter((i) => (k === 'evt' ? i.kind === 'out' && i.cat === 'evenement' : k === 'out' ? i.kind === 'out' && i.cat !== 'evenement' : i.kind === k));
          const tot = list.filter((i) => isActive(i, nk, st)).reduce((s, i) => s + amountOf(i, st), 0);
          return (
            <div className="card tbl" key={k} style={{ marginBottom: 16, overflow: 'hidden' }}>
              <div className="card-h"><div><h3>{l}</h3><div className="sub">{fcfa(tot)} prévus en {mLabel(nk, true)}</div></div>
                <button className="btn s sm" onClick={() => open('item', k === 'evt' ? { kind: 'out', cat: 'evenement', label: '', fin: addMonths(mkey(new Date()), 1) } : { kind: k })}><Plus size={14} />Ajouter</button></div>
              {list.length ? (
                <table>
                  <thead><tr><th>Libellé</th><th style={{ textAlign: 'left' }}>Catégorie</th><th style={{ textAlign: 'left' }}>Fréquence</th><th>Jour</th><th style={{ textAlign: 'left' }}>Période</th><th>Montant</th><th></th></tr></thead>
                  <tbody>{list.map((it) => (
                    <tr key={it.id}>
                      <td style={{ fontWeight: 500 }}>{it.label}{it.incertain && <span className="badge warn">Incertain</span>}{it.variable && <span className="badge">Variable</span>}</td>
                      <td style={{ textAlign: 'left' }} className="muted">{k === 'save' ? gname(st, it.goalId) || '—' : CATS[it.cat]}</td>
                      <td style={{ textAlign: 'left' }} className="muted">{FREQ(it)}</td>
                      <td className="muted">{it.jour}</td>
                      <td style={{ textAlign: 'left' }} className="muted">{mLabel(it.debut)} → {it.fin ? mLabel(it.fin) : 'sans fin'}</td>
                      <td style={{ fontWeight: 600 }} className={tone(k === 'evt' ? 'out' : k)}>{it.variable ? `${fmt(it.min)} – ${fmt(it.max)}` : fmt(it.montant)}</td>
                      <td style={{ width: 70 }}><div style={{ display: 'flex', justifyContent: 'flex-end' }}><button className="ib" onClick={() => open('item', it)}><Pencil size={15} /></button><button className="ib" onClick={() => remove('items', it.id)}><Trash2 size={15} /></button></div></td>
                    </tr>))}</tbody>
                </table>
              ) : <Empty title={`Aucun élément`} text={k === 'save' ? "Programme une épargne depuis un objectif ou ici." : `Ajoute tes ${l.toLowerCase()}.`} />}
            </div>);
        })}
      </div>
    </>
  );
}

// ================= TONTINES =================
function Tontines({ st, open, remove, undoRef }) {
  return (
    <>
      <Top title="Tontines" sub="Cotisations et cagnottes"><button className="btn p" onClick={() => open('tontine')}><Plus size={16} />Nouvelle tontine</button></Top>
      <div className="content">
        {!st.tontines.length ? <div className="card"><Empty icon={Users} title="Aucune tontine" text="Ajoute une ristourne pour suivre tes cotisations et la date de ta cagnotte." action={<button className="btn p" onClick={() => open('tontine')}><Plus size={16} />Ajouter</button>} /></div>
          : <div className="grid g2">{st.tontines.map((t) => {
            const n = +t.participants; const months = Array.from({ length: n }, (_, i) => addMonths(t.debut, i));
            const paid = months.filter((m) => st.done[`tc:${t.id}:${m}`]).length;
            const recvKey = months[+t.position - 1]; const recvRef = `tr:${t.id}:${recvKey}`;
            const occ = (m) => occurrences(st, m).find((o) => o.ref === `tc:${t.id}:${m}`);
            return (
              <div className="card" key={t.id}>
                <div className="card-h"><div><h3>{t.nom}</h3><div className="sub">{fmt(t.cotisation)} FCFA / mois · {n} participants · position {t.position}{t.goalId && gname(st, t.goalId) && <span className="badge p"><Target size={11} />{gname(st, t.goalId)}</span>}</div></div>
                  <div style={{ display: 'flex' }}><button className="ib" onClick={() => open('tontine', t)}><Pencil size={15} /></button><button className="ib" onClick={() => remove('tontines', t.id)}><Trash2 size={15} /></button></div></div>
                <div className="card-b">
                  <div className="meta" style={{ marginTop: 0 }}>
                    <div><div className="muted" style={{ fontSize: 12 }}>Cagnotte</div><div style={{ fontWeight: 650, fontSize: 18 }} className="num">{fmt(t.cotisation * n)}</div></div>
                    <div><div className="muted" style={{ fontSize: 12 }}>Réception</div><div style={{ fontWeight: 650, fontSize: 18, textTransform: 'capitalize' }}>{mLabel(recvKey, true)}</div></div>
                    <div><div className="muted" style={{ fontSize: 12 }}>Cotisé</div><div style={{ fontWeight: 650, fontSize: 18 }} className="num">{fmt(paid * t.cotisation)}</div></div>
                  </div>
                  <div className="tl">{months.map((m, i) => {
                    const ref = `tc:${t.id}:${m}`; const ok = !!st.done[ref];
                    return (
                      <div key={m} className={'m' + (ok ? ' paid' : '') + (i === +t.position - 1 ? ' me' : '')}>
                        <button title={ok ? 'Annuler' : 'Marquer payée'} onClick={() => (ok ? undoRef(ref) : open('confirm', occ(m)))}>{ok ? <Check size={14} /> : i + 1}</button>
                        <div className="l">{mLabel(m)}</div>
                      </div>);
                  })}</div>
                  <div className="muted" style={{ fontSize: 12.5, marginTop: 12 }}>Cagnotte : {st.done[recvRef] ? <span className="badge ok">Reçue</span> : <span className="badge">À recevoir</span>}<span style={{ marginLeft: 8 }}>Contour bleu = ton tour.</span></div>
                </div>
              </div>);
          })}</div>}
      </div>
    </>
  );
}

// ================= CRÉANCES =================
function Creances({ st, open, remove, undoRef }) {
  const sec = (sens, title) => {
    const list = st.creances.filter((c) => c.sens === sens);
    const pend = list.flatMap((c) => creanceOccs(c)).filter((o) => !st.done[o.ref]).reduce((s, o) => s + o.amount, 0);
    return (
      <div className="card tbl" style={{ overflow: 'hidden' }}>
        <div className="card-h"><div><h3>{title}</h3><div className="sub">{fcfa(pend)} en attente</div></div><button className="btn s sm" onClick={() => open('creance', { sens })}><Plus size={14} />Ajouter</button></div>
        {list.length ? list.map((c) => {
          const occ = creanceOccs(c); const paid = occ.filter((o) => st.done[o.ref]); const next = occ.find((o) => !st.done[o.ref]);
          const ok = !next; const n = occ.length; const paidAmt = paid.reduce((s, o) => s + o.amount, 0);
          return (
            <div className="row" key={c.id}>
              <div className="ic"><HandCoins size={16} /></div>
              <div style={{ minWidth: 0, flex: 1 }}><div className="t">{c.nom}{n > 1 && <span className="badge">{paid.length}/{n} échéances</span>}</div>
                <div className="s">{ok ? 'Soldé' : n > 1 ? `Prochaine : ${fmt(next.amount)} le ${dLabel(next.date)}` : `Prévu le ${dLabel(c.date)}`}</div>
                {n > 1 && <div className="bar" style={{ height: 5, marginTop: 6, maxWidth: 260 }}><i style={{ width: (paidAmt / c.montant) * 100 + '%', background: sens === 'in' ? 'var(--pos)' : 'var(--neg)' }} /></div>}</div>
              <div className={'a ' + (sens === 'in' ? 'pos' : 'neg')}>{fmt(c.montant)}{n > 1 && <div className="muted" style={{ fontSize: 11.5, fontWeight: 500, textAlign: 'right' }}>reste {fmt(c.montant - paidAmt)}</div>}</div>
              {ok ? <><span className="badge ok">{sens === 'in' ? 'Reçu' : 'Payé'}</span><button className="ib" title="Annuler la dernière échéance" onClick={() => undoRef(paid[paid.length - 1].ref)}><Undo2 size={15} /></button></>
                : <button className="btn s sm" onClick={() => open('confirm', next)}>{sens === 'in' ? 'Marquer reçu' : 'Marquer payé'}{n > 1 ? ` (${paid.length + 1}/${n})` : ''}</button>}
              <button className="ib" onClick={() => open('creance', c)}><Pencil size={15} /></button>
              <button className="ib" onClick={() => remove('creances', c.id)}><Trash2 size={15} /></button>
            </div>);
        }) : <Empty title="Rien à signaler" text={sens === 'in' ? "Personne ne te doit d'argent." : 'Tu ne dois rien.'} />}
      </div>);
  };
  return (
    <>
      <Top title="Créances & dettes" sub="Argent prêté et emprunté" />
      <div className="content"><div className="grid g2">{sec('in', 'On me doit')}{sec('out', 'Je dois')}</div></div>
    </>
  );
}

// ================= OPÉRATIONS =================
function Operations({ st, open, delTx, doExcel }) {
  const [f, setF] = useState('all');
  const [m, setM] = useState(mkey(new Date()));
  const [acc, setAcc] = useState('all');
  const accOf = (t) => t.accountId || st.accounts[0]?.id;
  const inM = st.transactions.filter((t) => t.date.startsWith(m) && (acc === 'all' || accOf(t) === acc || t.toAccountId === acc));
  const list = inM.filter((t) => f === 'all' || (f === 'in' ? t.kind === 'in' : f === 'out' ? t.kind === 'out' : f === 'move' ? t.kind === 'move' : t.kind === 'save' || t.kind === 'withdraw')).sort((a, b) => b.date.localeCompare(a.date));
  const sum = (k) => inM.filter((t) => t.kind === k).reduce((s, t) => s + t.montant, 0);
  return (
    <>
      <Top title="Opérations" sub="Mouvements enregistrés · Ctrl+N pour saisir"><button className="btn s" onClick={doExcel}><FileSpreadsheet size={15} />Excel</button><button className="btn s" onClick={() => open('tx', { kind: 'move' })}><ArrowLeftRight size={15} />Virement</button><button className="btn p" onClick={() => open('tx')}><Plus size={16} />Nouvelle opération</button></Top>
      <div className="content">
        <div className="grid g3">
          <Kpi icon={ArrowDownLeft} tone="g" k="Entrées du mois" v={<span className="pos">{fmt(sum('in'))}</span>} />
          <Kpi icon={ArrowUpRight} tone="r" k="Dépenses du mois" v={<span className="neg">{fmt(sum('out'))}</span>} />
          <Kpi icon={PiggyBank} tone="p" k="Épargne nette du mois" v={fmt(sum('save') - sum('withdraw'))} />
        </div>
        <div className="card mt tbl" style={{ overflow: 'hidden' }}>
          <div className="card-h">
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><button className="btn s sm" onClick={() => setM(addMonths(m, -1))}>‹</button><b style={{ minWidth: 120, textAlign: 'center', textTransform: 'capitalize' }}>{mLabel(m, true)}</b><button className="btn s sm" onClick={() => setM(addMonths(m, 1))}>›</button></div>
            <div style={{ display: 'flex', gap: 8 }}><select className="inp" style={{ width: 170, padding: '7px 10px' }} value={acc} onChange={(e) => setAcc(e.target.value)}><option value="all">Tous les comptes</option>{st.accounts.map((a) => <option key={a.id} value={a.id}>{a.nom}</option>)}</select>
            <div className="seg">{[['all', 'Tout'], ['in', 'Entrées'], ['out', 'Dépenses'], ['save', 'Épargne'], ['move', 'Virements']].map(([k, l]) => <button key={k} className={f === k ? 'on' : ''} onClick={() => setF(k)}>{l}</button>)}</div></div>
          </div>
          {list.length ? (
            <table>
              <thead><tr><th>Date</th><th style={{ textAlign: 'left' }}>Libellé</th><th style={{ textAlign: 'left' }}>Catégorie</th><th style={{ textAlign: 'left' }}>Compte</th><th>Montant</th><th></th></tr></thead>
              <tbody>{list.map((t) => (
                <tr key={t.id}><td className="muted">{dLabel(t.date)}</td><td style={{ textAlign: 'left', fontWeight: 500 }}>{t.label}</td>
                  <td style={{ textAlign: 'left' }} className="muted">{t.kind === 'move' ? 'Virement' : t.goalId ? gname(st, t.goalId) || 'Objectif supprimé' : CATS[t.cat]}</td>
                  <td style={{ textAlign: 'left' }}>{t.kind === 'save' || t.kind === 'withdraw' ? <span className="muted">—</span> : <span className="acc-tag"><i style={{ background: (st.accounts.find((a) => a.id === accOf(t)) || {}).couleur }} />{accName(st, accOf(t))}{t.kind === 'move' && <> → <i style={{ background: (st.accounts.find((a) => a.id === t.toAccountId) || {}).couleur }} />{accName(st, t.toAccountId)}</>}</span>}</td>
                  <td style={{ fontWeight: 600 }} className={tone(t.kind)}>{sign(t.kind)} {fmt(t.montant)}</td>
                  <td style={{ width: 50 }}><button className="ib" title={t.ref ? 'Annuler la validation' : 'Supprimer'} onClick={() => delTx(t.id)}>{t.ref ? <Undo2 size={15} /> : <Trash2 size={15} />}</button></td></tr>))}</tbody>
            </table>) : <Empty icon={List} title="Aucune opération ce mois" text="Valide tes échéances ou ajoute une opération." />}
        </div>
      </div>
    </>
  );
}

// ================= PARAMÈTRES =================
function Params({ st, set, setSettings, open, version, checkUpdate, lastBackup, doExcel }) {
  const [auto, setAuto] = useState(null); const [upd, setUpd] = useState(null); const [defDir, setDefDir] = useState('');
  useEffect(() => { if (native) { native.getAutoLaunch().then(setAuto); native.backupDefaultDir().then(setDefDir); } }, []);
  const exp = async () => { const json = JSON.stringify(st, null, 2); const name = `kalis-sauvegarde-${todayISO()}.json`; if (native) native.saveFile(name, btoa(unescape(encodeURIComponent(json))), [{ name: 'Sauvegarde Kalis', extensions: ['json'] }]); else { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([json])); a.download = name; a.click(); } };
  const imp = (e) => { const file = e.target.files?.[0]; if (!file) return; file.text().then((t) => { try { const s = migrate(JSON.parse(t)); if (s) set(s); else alert('Fichier non reconnu'); } catch (err) { alert('Fichier invalide'); } }); };
  const S = st.settings;
  const Toggle = ({ on, onChange, label, hint }) => (<label className="switch" style={{ alignItems: 'flex-start' }}><input type="checkbox" checked={!!on} onChange={(e) => onChange(e.target.checked)} /><span>{label}{hint && <span className="muted" style={{ display: 'block', fontSize: 12, fontWeight: 400 }}>{hint}</span>}</span></label>);
  return (
    <>
      <Top title="Paramètres" sub={version ? `Kalis ${version}` : null} />
      <div className="content" style={{ maxWidth: 940 }}>
        <div className="grid g2">
          <Card title="Point de départ" sub="Les soldes de départ se règlent compte par compte">
            <div className="form f2">
              <Field label="Date de départ"><input className="inp" type="date" value={st.dateInitiale} onChange={(e) => set({ dateInitiale: e.target.value })} /></Field>
              <Field label="Horizon de projection"><input className="inp" type="month" value={st.horizon} onChange={(e) => e.target.value && set({ horizon: e.target.value })} /></Field>
            </div>
          </Card>
          <Card title="Apparence" sub="« Auto » suit le réglage de Windows">
            <div className="seg">{[['light', Sun, 'Clair'], ['dark', Moon, 'Sombre'], ['system', Monitor, 'Automatique']].map(([m, I, l]) => (
              <button key={m} className={(st.theme || 'light') === m ? 'on' : ''} onClick={() => set({ theme: m })} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><I size={14} />{l}</button>))}</div>
          </Card>
          <Card title="Rappels" sub="Notifications Windows">
            <div style={{ display: 'grid', gap: 12 }}>
              <Toggle on={S.notif !== false} onChange={(v) => setSettings({ notif: v })} label="Me rappeler les échéances" hint="Une notification par jour pour ce qui tombe aujourd'hui ou demain" />
              <Toggle on={!!auto} onChange={async (v) => native && setAuto(await native.setAutoLaunch(v))} label="Lancer Kalis au démarrage de Windows" hint={native ? 'Démarre en réduit, pour ne rater aucun rappel' : 'Disponible dans l\'application'} />
            </div>
          </Card>
          <Card title="Sécurité" sub="Code PIN à l'ouverture">
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {S.pinHash ? <><span className="badge ok" style={{ marginLeft: 0 }}><ShieldCheck size={12} />PIN actif</span><button className="btn s sm" onClick={() => open('pin')}><KeyRound size={14} />Changer</button><button className="btn d sm" onClick={() => setSettings({ pinHash: null })}>Désactiver</button></>
                : <button className="btn p sm" onClick={() => open('pin')}><KeyRound size={14} />Définir un code PIN</button>}
            </div>
            <div className="muted" style={{ fontSize: 12, marginTop: 10 }}>Ctrl+L verrouille l'application à tout moment.</div>
          </Card>
          <Card title="Sauvegarde automatique" sub="Une copie par jour, 30 jours conservés">
            <div style={{ display: 'grid', gap: 12 }}>
              <Toggle on={S.backup !== false} onChange={(v) => setSettings({ backup: v })} label="Activer la sauvegarde automatique" />
              <div className="muted" style={{ fontSize: 12.5, wordBreak: 'break-all' }}>Dossier : <b style={{ color: 'var(--ink)' }}>{S.backupDir || defDir || 'Documents\\Kalis\\Sauvegardes'}</b></div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="btn s sm" disabled={!native} onClick={async () => { const d = await native.chooseDir(); if (d) setSettings({ backupDir: d }); }}><FolderOpen size={14} />Changer de dossier</button>
                <button className="btn s sm" disabled={!native} onClick={() => native.openPath(S.backupDir || defDir)}>Ouvrir</button>
              </div>
              <div className="muted" style={{ fontSize: 12 }}>Astuce : choisis ton dossier Google Drive ou OneDrive pour une copie dans le cloud.{lastBackup && <><br />Dernière copie : {lastBackup.split(/[\\/]/).pop()}</>}</div>
            </div>
          </Card>
          <Card title="Mises à jour" sub={version ? `Version installée : ${version}` : 'Depuis GitHub (aurlin10/kalis)'}>
            <div style={{ display: 'grid', gap: 12 }}>
              <Toggle on={S.autoUpdate !== false} onChange={(v) => setSettings({ autoUpdate: v })} label="Vérifier automatiquement" hint="Au démarrage puis toutes les 6 heures" />
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <button className="btn s sm" disabled={!native || upd === 'loading'} onClick={async () => { setUpd('loading'); setUpd(await checkUpdate()); }}><RefreshCw size={14} />Vérifier maintenant</button>
                {upd && upd !== 'loading' && <span className={'badge ' + (upd.status === 'error' ? 'r' : 'ok')} style={{ marginLeft: 0 }}>{upd.status === 'latest' ? 'Kalis est à jour' : upd.status === 'ready' ? `Version ${upd.version} prête` : upd.message}</span>}
              </div>
            </div>
          </Card>
        </div>
        <Card title="Données" sub="Tout est stocké sur ce PC" style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn s" onClick={exp}><Download size={15} />Exporter (JSON)</button>
            <button className="btn s" onClick={doExcel}><FileSpreadsheet size={15} />Exporter en Excel</button>
            <label className="btn s" style={{ cursor: 'pointer' }}><Upload size={15} />Importer<input type="file" accept=".json" hidden onChange={imp} /></label>
            <button className="btn d" style={{ marginLeft: 'auto' }} onClick={() => { if (window.confirm('Effacer toutes les données ?')) set(defaultState()); }}><RotateCcw size={15} />Réinitialiser</button>
          </div>
        </Card>
        <Card title="Raccourcis clavier" style={{ marginTop: 16 }}>
          <div className="kbd-list"><span><kbd>Ctrl</kbd>+<kbd>N</kbd> Nouvelle opération</span><span><kbd>Ctrl</kbd>+<kbd>B</kbd> Virement entre comptes</span><span><kbd>Ctrl</kbd>+<kbd>L</kbd> Verrouiller</span><span><kbd>Entrée</kbd> Valider une fenêtre</span><span><kbd>Échap</kbd> Fermer</span></div>
        </Card>
      </div>
    </>
  );
}

// ================= MODALES =================
function Modal({ title, onClose, children, footer, onEnter }) {
  const ref = React.useRef(null);
  useEffect(() => {
    const h = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'Enter' && !e.shiftKey && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'BUTTON') {
        e.preventDefault();
        if (onEnter) onEnter(); else { const b = ref.current?.querySelector('.modal-f .btn.p:not(:disabled)'); if (b) b.click(); }
      }
    };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, [onClose, onEnter]);
  return (
    <div className="ov" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" ref={ref}>
        <div className="modal-h"><h2>{title}</h2><button className="ib" onClick={onClose}><X size={18} /></button></div>
        <div className="modal-b">{children}</div>
        <div className="modal-f">{footer}</div>
      </div>
    </div>
  );
}
const Field = ({ label, hint, children, span }) => (
  <div className="field" style={span ? { gridColumn: '1 / -1' } : undefined}><label>{label}</label>{children}{hint && <span className="hint">{hint}</span>}</div>
);

function ConfirmModal({ occ, st, onClose, onOk }) {
  const [m, setM] = useState(Math.round(occ.amount));
  const [acc, setAcc] = useState(occ.src?.accountId || st.accounts[0]?.id);
  const [d, setD] = useState(todayISO());
  const [skip, setSkip] = useState(false);
  const verb = occ.kind === 'in' ? 'reçu' : occ.kind === 'save' ? 'épargné' : 'payé';
  return (
    <Modal title={occ.label} onClose={onClose} footer={<><button className="btn s" onClick={onClose}>Annuler</button><button className="btn p" onClick={() => onOk(+m, d, skip, acc)}><Check size={15} />Valider</button></>}>
      <div className="muted" style={{ marginBottom: 16, fontSize: 13 }}>Prévu le {dLabel(occ.date)} : <b style={{ color: 'var(--ink)' }}>{fcfa(occ.amount)}</b>{occ.variable && ` (entre ${fmt(occ.min)} et ${fmt(occ.max)})`}</div>
      <div className="form f2">
        <Field label={`Montant ${verb} (FCFA)`}><input className="inp num" type="number" autoFocus value={m} disabled={skip} onChange={(e) => setM(e.target.value)} /></Field>
        <Field label="Date"><input className="inp" type="date" value={d} disabled={skip} onChange={(e) => setD(e.target.value)} /></Field>
        {occ.kind !== 'save' && <Field label={occ.kind === 'in' ? 'Reçu sur' : 'Payé depuis'} span><AccPicker st={st} value={acc} onChange={setAcc} disabled={skip} /></Field>}
      </div>
      <label className="switch" style={{ marginTop: 16 }}><input type="checkbox" checked={skip} onChange={(e) => setSkip(e.target.checked)} />Déjà pris en compte dans mon solde courant</label>
    </Modal>
  );
}

function TransferModal({ init, st, bal, onClose, onOk }) {
  const [from, setFrom] = useState(init.from);
  const [to, setTo] = useState(init.to);
  const [m, setM] = useState('');
  const [d, setD] = useState(todayISO());
  const opts = [['dispo', 'Solde disponible'], ...st.goals.map((g) => [g.id, g.nom])];
  const solde = (id) => (id === 'dispo' ? bal.dispo : bal.goals[id] || 0);
  const over = +m > solde(from);
  const ok = +m > 0 && from !== to && !over;
  return (
    <Modal title="Transfert" onClose={onClose} footer={<><button className="btn s" onClick={onClose}>Annuler</button><button className="btn p" disabled={!ok} onClick={() => onOk(from, to, +m, d)}>Transférer</button></>}>
      <div className="form f2">
        <Field label="De" hint={`Disponible : ${fcfa(solde(from))}`}><select className="inp" value={from} onChange={(e) => setFrom(e.target.value)}>{opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
        <Field label="Vers" hint={`Solde : ${fcfa(solde(to))}`}><select className="inp" value={to} onChange={(e) => setTo(e.target.value)}>{opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
        <Field label="Montant (FCFA)" hint={over ? 'Montant supérieur au solde de la source' : from === to ? 'Choisis deux comptes différents' : null}><input autoFocus className="inp num" type="number" value={m} onChange={(e) => setM(e.target.value)} /></Field>
        <Field label="Date"><input className="inp" type="date" value={d} onChange={(e) => setD(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

const AccPicker = ({ st, value, onChange, disabled, exclude }) => (
  <div className="acc-pick">{st.accounts.filter((a) => a.id !== exclude).map((a) => (
    <button key={a.id} type="button" disabled={disabled} className={value === a.id ? 'on' : ''} onClick={() => onChange(a.id)} style={{ '--c': a.couleur }}><i style={{ background: a.couleur }} />{a.nom}</button>))}</div>
);

function TxModal({ init, st, bal, goals, onClose, onOk, onFav }) {
  const [t, setT] = useState(() => fixCat({ kind: 'out', cat: 'alimentation', label: '', montant: '', date: todayISO(), goalId: goals[0]?.id, accountId: st.accounts[0]?.id, toAccountId: st.accounts[1]?.id, frais: '', ...(init || {}) }));
  const [fav, setFav] = useState(false);
  const u = (p) => setT((x) => ({ ...x, ...p }));
  const isG = t.kind === 'save' || t.kind === 'withdraw';
  const isM = t.kind === 'move';
  const cats = t.kind === 'in' ? CATS_IN : CATS_OUT;
  const ok = +t.montant > 0 && (!isG || t.goalId) && (!isM || (t.toAccountId && t.toAccountId !== t.accountId));
  const favs = (st.favoris || []).filter((f) => f.kind === t.kind || (!isG && !isM && (f.kind === 'in' || f.kind === 'out')));
  const submit = () => {
    if (!ok) return;
    const m = +t.montant;
    if (isM) {
      const list = [{ date: t.date, label: t.label || `Virement ${accName(st, t.accountId)} → ${accName(st, t.toAccountId)}`, kind: 'move', cat: 'virement', montant: m, accountId: t.accountId, toAccountId: t.toAccountId }];
      if (+t.frais > 0) list.push({ date: t.date, label: `Frais · ${accName(st, t.accountId)} → ${accName(st, t.toAccountId)}`, kind: 'out', cat: 'frais', montant: +t.frais, accountId: t.accountId });
      return onOk(list);
    }
    const label = t.label || (isG ? `${t.kind === 'save' ? 'Épargne' : 'Retrait'} ${goals.find((g) => g.id === t.goalId)?.nom}` : CATS[t.cat]);
    const tx = { date: t.date, label, kind: t.kind, cat: isG ? 'epargne' : t.cat, montant: m, goalId: isG ? t.goalId : undefined, accountId: isG ? undefined : t.accountId };
    onOk([tx], fav ? { id: uid(), label, kind: t.kind, cat: tx.cat, montant: m, accountId: t.accountId, goalId: tx.goalId } : null);
  };
  return (
    <Modal title={isM ? 'Virement entre comptes' : 'Nouvelle opération'} onClose={onClose} onEnter={submit}
      footer={<><span className="muted" style={{ fontSize: 12, marginRight: 'auto' }}><Keyboard size={12} style={{ verticalAlign: -2 }} /> Entrée pour enregistrer</span><button className="btn s" onClick={onClose}>Annuler</button><button className="btn p" disabled={!ok} onClick={submit}>Enregistrer</button></>}>
      <div className="seg" style={{ display: 'flex', marginBottom: 14 }}>
        {[['out', 'Dépense', 'alimentation'], ['in', 'Entrée', 'salaire'], ['move', 'Virement'], ['save', 'Épargne'], ['withdraw', 'Retrait']].map(([k, l, c]) => <button key={k} style={{ flex: 1 }} className={t.kind === k ? 'on' : ''} onClick={() => u({ kind: k, cat: c || t.cat })}>{l}</button>)}
      </div>
      {favs.length > 0 && !isM && (
        <div className="favs"><Star size={13} />{favs.map((f) => (
          <span key={f.id} className="fav"><button onClick={() => u({ kind: f.kind, cat: f.cat, label: f.label, montant: String(f.montant), accountId: f.accountId || t.accountId, goalId: f.goalId || t.goalId })}>{f.label} · {short(f.montant)}</button><button className="x" title="Retirer des favoris" onClick={() => onFav(st.favoris.filter((x) => x.id !== f.id))}><X size={11} /></button></span>))}</div>)}
      <div className="form f2">
        <Field label="Montant (FCFA)"><input className="inp num big" type="number" autoFocus value={t.montant} onChange={(e) => u({ montant: e.target.value })} /></Field>
        <Field label="Date"><input className="inp" type="date" value={t.date} onChange={(e) => u({ date: e.target.value })} /></Field>
        {isM ? (<>
          <Field label="Depuis" span hint={`Solde : ${fcfa(bal.accounts[t.accountId] || 0)}`}><AccPicker st={st} value={t.accountId} onChange={(v) => u({ accountId: v, toAccountId: v === t.toAccountId ? st.accounts.find((a) => a.id !== v)?.id : t.toAccountId })} /></Field>
          <Field label="Vers" span><AccPicker st={st} value={t.toAccountId} onChange={(v) => u({ toAccountId: v })} exclude={t.accountId} /></Field>
          <Field label="Frais (FCFA)" hint="Facultatif · enregistrés comme dépense"><input className="inp num" type="number" value={t.frais} onChange={(e) => u({ frais: e.target.value })} /></Field>
          <Field label="Libellé"><input className="inp" placeholder="Facultatif" value={t.label} onChange={(e) => u({ label: e.target.value })} /></Field>
        </>) : (<>
          {isG ? <Field label="Objectif">{goals.length ? <select className="inp" value={t.goalId} onChange={(e) => u({ goalId: e.target.value })}>{goals.map((g) => <option key={g.id} value={g.id}>{g.nom}</option>)}</select> : <span className="hint">Crée d'abord un objectif.</span>}</Field>
            : <Field label="Catégorie"><select className="inp" value={t.cat} onChange={(e) => u({ cat: e.target.value })}>{cats.map((c) => <option key={c} value={c}>{CATS[c]}</option>)}</select></Field>}
          <Field label="Libellé"><input className="inp" placeholder="Facultatif" value={t.label} onChange={(e) => u({ label: e.target.value })} /></Field>
          {!isG && <Field label={t.kind === 'in' ? 'Reçu sur' : 'Payé depuis'} span><AccPicker st={st} value={t.accountId} onChange={(v) => u({ accountId: v })} /></Field>}
        </>)}
      </div>
      {!isM && <label className="switch" style={{ marginTop: 14 }}><input type="checkbox" checked={fav} onChange={(e) => setFav(e.target.checked)} /><Star size={13} />Ajouter aux favoris pour la saisie rapide</label>}
    </Modal>
  );
}

function ItemModal({ item, goals, st, onClose, onOk }) {
  const cur = mkey(new Date());
  const [it, setIt] = useState(() => { const x = { id: uid(), label: '', kind: 'out', cat: 'factures', montant: '', jour: 1, debut: addMonths(cur, 1), fin: null, every: 1, accountId: st.accounts[0]?.id, ...(item || {}) }; if (x.cat === 'evenement' && !item?.id) x.fin = x.debut; if (!x.goalId && goals[0]) x.goalId = goals[0].id; if (!item?.id) { if (x.kind === 'in' && !CATS_IN.includes(x.cat)) x.cat = 'salaire'; if (x.kind === 'save') x.cat = 'epargne'; } return fixCat(x); });
  const u = (p) => setIt((x) => ({ ...x, ...p }));
  const once = it.fin && it.fin === it.debut;
  const freq = once ? 'once' : String(it.every || 1);
  const cats = it.kind === 'in' ? CATS_IN : CATS_OUT;
  const valid = it.label && (it.variable ? +it.min > 0 && +it.max >= +it.min : +it.montant > 0) && (it.kind !== 'save' || it.goalId);
  const isNew = !item?.id;
  return (
    <Modal title={isNew ? 'Nouveau flux' : 'Modifier le flux'} onClose={onClose} footer={<><button className="btn s" onClick={onClose}>Annuler</button><button className="btn p" disabled={!valid} onClick={() => onOk({ ...it, montant: it.variable ? +it.min : +it.montant, min: it.variable ? +it.min : undefined, max: it.variable ? +it.max : undefined, jour: +it.jour || 1, every: +it.every || 1 })}>Enregistrer</button></>}>
      <div className="seg" style={{ display: 'flex', marginBottom: 18 }}>
        {[['in', 'Revenu', 'salaire'], ['out', 'Charge', 'factures'], ['save', 'Épargne']].map(([k, l, c]) => <button key={k} style={{ flex: 1 }} className={it.kind === k ? 'on' : ''} onClick={() => u({ kind: k, cat: c || 'epargne', variable: false, incertain: false })}>{l}</button>)}
      </div>
      {it.cat === 'evenement' && <div className="favs" style={{ marginTop: -4 }}><PartyPopper size={13} />{EVENT_PRESETS.map((p) => <span className="fav" key={p}><button onClick={() => u({ label: p })}>{p}</button></span>)}</div>}
      <div className="form f2">
        <Field label="Libellé" span><input className="inp" autoFocus value={it.label} placeholder={it.kind === 'in' ? 'ex. Salaire' : it.kind === 'out' ? 'ex. Loyer' : 'ex. Épargne mensuelle'} onChange={(e) => u({ label: e.target.value })} /></Field>
        {it.kind === 'save'
          ? <Field label="Objectif">{goals.length ? <select className="inp" value={it.goalId} onChange={(e) => u({ goalId: e.target.value })}>{goals.map((g) => <option key={g.id} value={g.id}>{g.nom}</option>)}</select> : <span className="hint">Crée d'abord un objectif.</span>}</Field>
          : <Field label="Catégorie"><select className="inp" value={it.cat} onChange={(e) => u({ cat: e.target.value })}>{cats.map((c) => <option key={c} value={c}>{CATS[c]}</option>)}</select></Field>}
        {it.variable ? (
          <Field label="Montant min – max (FCFA)"><div style={{ display: 'flex', gap: 8 }}><input className="inp num" type="number" placeholder="Min" value={it.min ?? ''} onChange={(e) => u({ min: e.target.value })} /><input className="inp num" type="number" placeholder="Max" value={it.max ?? ''} onChange={(e) => u({ max: e.target.value })} /></div></Field>
        ) : <Field label="Montant (FCFA)"><input className="inp num" type="number" value={it.montant} onChange={(e) => u({ montant: e.target.value })} /></Field>}
        <Field label="Fréquence"><select className="inp" value={freq} onChange={(e) => { const v = e.target.value; if (v === 'once') u({ fin: it.debut, every: 1 }); else u({ every: +v, fin: once ? null : it.fin }); }}>
          <option value="1">Mensuel</option><option value="2">Tous les 2 mois</option><option value="3">Trimestriel</option><option value="once">Ponctuel</option></select></Field>
        <Field label="Jour du mois"><input className="inp num" type="number" min={1} max={31} value={it.jour} onChange={(e) => u({ jour: e.target.value })} /></Field>
        <Field label={once ? 'Mois' : 'Premier mois'}><input className="inp" type="month" value={it.debut} onChange={(e) => e.target.value && u(once ? { debut: e.target.value, fin: e.target.value } : { debut: e.target.value })} /></Field>
        {!once && <Field label="Dernier mois" hint="Laisser vide si sans fin"><input className="inp" type="month" value={it.fin || ''} onChange={(e) => u({ fin: e.target.value || null })} /></Field>}
        {it.kind !== 'save' && <Field label={it.kind === 'in' ? 'Reçu sur' : 'Payé depuis'} span><AccPicker st={st} value={it.accountId} onChange={(v) => u({ accountId: v })} /></Field>}
      </div>
      {it.kind === 'in' && (
        <div style={{ display: 'flex', gap: 24, marginTop: 16 }}>
          <label className="switch"><input type="checkbox" checked={!!it.variable} onChange={(e) => u({ variable: e.target.checked, min: it.min ?? it.montant, max: it.max ?? it.montant })} />Montant variable</label>
          <label className="switch"><input type="checkbox" checked={!!it.incertain} onChange={(e) => u({ incertain: e.target.checked })} />Revenu incertain</label>
        </div>)}
    </Modal>
  );
}

function GoalModal({ goal, onClose, onOk }) {
  const [g, setG] = useState({ id: uid(), nom: '', montant: '', echeance: addMonths(mkey(new Date()), 12), initial: 0, couleur: GOAL_COLORS[0], ...(goal || {}) });
  const u = (p) => setG((x) => ({ ...x, ...p }));
  return (
    <Modal title={goal ? "Modifier l'objectif" : 'Nouvel objectif'} onClose={onClose} footer={<><button className="btn s" onClick={onClose}>Annuler</button><button className="btn p" disabled={!g.nom || !(+g.montant > 0)} onClick={() => onOk({ ...g, montant: +g.montant, initial: +g.initial || 0 })}>Enregistrer</button></>}>
      <div className="form f2">
        <Field label="Nom" span><input className="inp" autoFocus placeholder="ex. Voiture, Fonds d'urgence, Loyer d'avance…" value={g.nom} onChange={(e) => u({ nom: e.target.value })} /></Field>
        <Field label="Montant cible (FCFA)"><input className="inp num" type="number" value={g.montant} onChange={(e) => u({ montant: e.target.value })} /></Field>
        <Field label="Échéance"><input className="inp" type="month" value={g.echeance} onChange={(e) => e.target.value && u({ echeance: e.target.value })} /></Field>
        <Field label="Déjà épargné (FCFA)" hint="Argent mis de côté hors solde courant"><input className="inp num" type="number" value={g.initial} onChange={(e) => u({ initial: e.target.value })} /></Field>
        <Field label="Couleur"><div className="swatches" style={{ paddingTop: 6 }}>{GOAL_COLORS.map((c) => <button key={c} className={'sw' + (g.couleur === c ? ' on' : '')} style={{ background: c }} onClick={() => u({ couleur: c })} />)}</div></Field>
      </div>
    </Modal>
  );
}

function TontineModal({ t, goals, onClose, onOk }) {
  const [x, setX] = useState({ id: uid(), nom: '', cotisation: '', participants: '', position: '', debut: mkey(new Date()), jour: 10, ...(t || {}) });
  const u = (p) => setX((s) => ({ ...s, ...p }));
  const ok = x.nom && +x.cotisation > 0 && +x.participants > 1 && +x.position >= 1 && +x.position <= +x.participants;
  return (
    <Modal title={t ? 'Modifier la tontine' : 'Nouvelle tontine'} onClose={onClose} footer={<><button className="btn s" onClick={onClose}>Annuler</button><button className="btn p" disabled={!ok} onClick={() => onOk({ ...x, cotisation: +x.cotisation, participants: +x.participants, position: +x.position, jour: +x.jour || 1 })}>Enregistrer</button></>}>
      <div className="form f2">
        <Field label="Nom" span><input className="inp" autoFocus placeholder="ex. Ristourne bureau" value={x.nom} onChange={(e) => u({ nom: e.target.value })} /></Field>
        <Field label="Cotisation mensuelle (FCFA)"><input className="inp num" type="number" value={x.cotisation} onChange={(e) => u({ cotisation: e.target.value })} /></Field>
        <Field label="Nombre de participants" hint="= nombre de mois"><input className="inp num" type="number" value={x.participants} onChange={(e) => u({ participants: e.target.value })} /></Field>
        <Field label="Ta position" hint="Mois où tu reçois la cagnotte"><input className="inp num" type="number" value={x.position} onChange={(e) => u({ position: e.target.value })} /></Field>
        <Field label="Jour de versement"><input className="inp num" type="number" min={1} max={31} value={x.jour} onChange={(e) => u({ jour: e.target.value })} /></Field>
        <Field label="Premier mois"><input className="inp" type="month" value={x.debut} onChange={(e) => e.target.value && u({ debut: e.target.value })} /></Field>
        <Field label="Objectif lié" hint="La cagnotte sera versée directement sur cet objectif"><select className="inp" value={x.goalId || ''} onChange={(e) => u({ goalId: e.target.value || undefined })}><option value="">Aucun (solde disponible)</option>{goals.map((g) => <option key={g.id} value={g.id}>{g.nom}</option>)}</select></Field>
      </div>
    </Modal>
  );
}

function CreanceModal({ c, onClose, onOk }) {
  const [x, setX] = useState({ id: uid(), sens: 'in', nom: '', montant: '', date: todayISO(), n: 1, ...(c || {}) });
  const u = (p) => setX((s) => ({ ...s, ...p }));
  return (
    <Modal title={c?.id ? 'Modifier' : x.sens === 'in' ? 'Nouvelle créance' : 'Nouvelle dette'} onClose={onClose} footer={<><button className="btn s" onClick={onClose}>Annuler</button><button className="btn p" disabled={!x.nom || !(+x.montant > 0)} onClick={() => onOk({ ...x, montant: +x.montant, n: Math.max(1, +x.n || 1) })}>Enregistrer</button></>}>
      <div className="seg" style={{ display: 'flex', marginBottom: 18 }}>{[['in', 'On me doit'], ['out', 'Je dois']].map(([k, l]) => <button key={k} style={{ flex: 1 }} className={x.sens === k ? 'on' : ''} onClick={() => u({ sens: k })}>{l}</button>)}</div>
      <div className="form f2">
        <Field label="Personne" span><input className="inp" autoFocus value={x.nom} onChange={(e) => u({ nom: e.target.value })} /></Field>
        <Field label="Montant total (FCFA)"><input className="inp num" type="number" value={x.montant} onChange={(e) => u({ montant: e.target.value })} /></Field>
        <Field label="Nombre d'échéances" hint={+x.n > 1 && +x.montant > 0 ? `${fmt(Math.floor(x.montant / x.n))} FCFA par mois` : '1 = en une seule fois'}><input className="inp num" type="number" min={1} max={60} value={x.n} onChange={(e) => u({ n: e.target.value })} /></Field>
        <Field label={+x.n > 1 ? 'Date de la 1re échéance' : 'Date prévue'} span><input className="inp" type="date" value={x.date} onChange={(e) => u({ date: e.target.value })} /></Field>
      </div>
    </Modal>
  );
}

// =====================================================================
// ================= COMPTES (Wave, Orange Money, Djamo, Mixx) =========
// =====================================================================
function Comptes({ st, set, bal, open, upsert, remove }) {
  const cur = mkey(new Date());
  const flux = (id) => {
    const tx = st.transactions.filter((t) => t.date.startsWith(cur));
    const inn = tx.filter((t) => (t.kind === 'in' && (t.accountId || st.accounts[0]?.id) === id) || (t.kind === 'move' && t.toAccountId === id)).reduce((s, t) => s + t.montant, 0);
    const out = tx.filter((t) => (t.kind === 'out' && (t.accountId || st.accounts[0]?.id) === id) || (t.kind === 'move' && t.accountId === id)).reduce((s, t) => s + t.montant, 0);
    return { inn, out };
  };
  return (
    <>
      <Top title="Comptes" sub="Où se trouve ton argent">
        <button className="btn s" onClick={() => open('tx', { kind: 'move' })}><ArrowLeftRight size={15} />Virement</button>
        <button className="btn p" onClick={() => open('account')}><Plus size={16} />Ajouter un compte</button>
      </Top>
      <div className="content">
        {st.migratedV3 && (
          <div className="alert info"><div className="chip-ic"><Info size={16} /></div>
            <div style={{ flex: 1 }}>Ton solde de départ a été placé sur <b>{st.accounts[0]?.nom}</b>. Indique le solde de départ réel de chaque compte avec le crayon : le total doit correspondre à ce que tu avais au {dLabel(st.dateInitiale)}.</div>
            <button className="btn s sm" onClick={() => set({ migratedV3: false })}>C'est fait</button></div>
        )}
        <div className="grid g4">
          {st.accounts.map((a) => {
            const f = flux(a.id); const v = bal.accounts[a.id] || 0;
            return (
              <div className="card acc-card" key={a.id}>
                <div className="acc-top">
                  <div className="acc-badge" style={{ background: a.couleur }}>{a.nom.slice(0, 1)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 650 }}>{a.nom}</div><div className="muted" style={{ fontSize: 12 }}>Départ : {fmt(a.initial)}</div></div>
                  <button className="ib" onClick={() => open('account', a)}><Pencil size={15} /></button>
                </div>
                <div className={'acc-v num' + (v < 0 ? ' neg' : '')}>{fmt(v)} <small>FCFA</small></div>
                <div className="acc-f"><span className="pos">+{short(f.inn)}</span><span className="neg">−{short(f.out)}</span><span className="muted">ce mois</span></div>
              </div>);
          })}
        </div>
        <div className="grid g3 mt">
          <Kpi icon={Smartphone} k="Total sur les comptes" v={<>{fmt(bal.comptes)}<small>FCFA</small></>} f="Argent réel, tous comptes confondus" />
          <Kpi icon={PiggyBank} tone="s" k="Affecté aux objectifs" v={<>{fmt(bal.comptes - bal.dispo)}<small>FCFA</small></>} f="Inclus dans les comptes, réservé" />
          <Kpi accent icon={Wallet} k="Solde disponible" v={<>{fmt(bal.dispo)}<small>FCFA</small></>} f="Comptes − épargne affectée" />
        </div>
        <Card title="Derniers virements" style={{ marginTop: 16 }} flush>
          {st.transactions.filter((t) => t.kind === 'move').slice(0, 8).map((t) => (
            <div className="row" key={t.id}><DChip iso={t.date} /><div><div className="t">{accName(st, t.accountId)} → {accName(st, t.toAccountId)}</div><div className="s">{t.label}</div></div><div className="a">{fmt(t.montant)}</div></div>
          ))}
          {!st.transactions.some((t) => t.kind === 'move') && <Empty icon={ArrowLeftRight} title="Aucun virement" text="Transfère de l'argent entre Wave, Orange Money, Djamo et Mixx." />}
        </Card>
      </div>
    </>
  );
}

function AccountModal({ a, st, onClose, onOk, onDelete }) {
  const [x, setX] = useState({ id: uid(), nom: '', couleur: '#64748B', initial: 0, ...(a || {}) });
  const used = a && st.transactions.some((t) => t.accountId === a.id || t.toAccountId === a.id);
  return (
    <Modal title={a ? `Modifier · ${a.nom}` : 'Nouveau compte'} onClose={onClose} onEnter={() => x.nom && onOk({ ...x, initial: +x.initial || 0 })}
      footer={<>{a && st.accounts.length > 1 && <button className="btn d" style={{ marginRight: 'auto' }} disabled={used} title={used ? 'Ce compte a des opérations' : ''} onClick={() => onDelete(a.id)}><Trash2 size={14} />Supprimer</button>}
        <button className="btn s" onClick={onClose}>Annuler</button><button className="btn p" disabled={!x.nom} onClick={() => onOk({ ...x, initial: +x.initial || 0 })}>Enregistrer</button></>}>
      <div className="form f2">
        <Field label="Nom"><input className="inp" autoFocus value={x.nom} onChange={(e) => setX({ ...x, nom: e.target.value })} /></Field>
        <Field label={`Solde au ${dLabel(st.dateInitiale)} (FCFA)`} hint="Solde de départ du compte"><input className="inp num" type="number" value={x.initial} onChange={(e) => setX({ ...x, initial: e.target.value })} /></Field>
        <Field label="Couleur" span><div className="swatches">{['#1DC8FF', '#FF7900', '#7C3AED', '#E6B400', '#10B981', '#64748B', '#EC4899'].map((c) => <button key={c} className={'sw' + (x.couleur === c ? ' on' : '')} style={{ background: c }} onClick={() => setX({ ...x, couleur: c })} />)}</div></Field>
      </div>
    </Modal>
  );
}

// =====================================================================
// ================= BUDGETS ===========================================
// =====================================================================
function Budgets({ st, set }) {
  const [m, setM] = useState(mkey(new Date()));
  const [draft, setDraft] = useState(() => ({ ...st.budgets }));
  const total = CATS_VIE.reduce((s, c) => s + (+draft[c] || 0), 0);
  const spent = spentVie(st, m);
  const dirty = JSON.stringify(Object.fromEntries(Object.entries(draft).filter(([, v]) => +v > 0).map(([k, v]) => [k, +v]))) !== JSON.stringify(Object.fromEntries(Object.entries(st.budgets).filter(([, v]) => +v > 0)));
  const save = () => set({ budgets: Object.fromEntries(Object.entries(draft).filter(([, v]) => +v > 0).map(([k, v]) => [k, +v])) });
  const d = new Date(); const isCur = m === mkey(d); const prog = isCur ? d.getDate() / daysIn(m) : 1;
  return (
    <>
      <Top title="Budgets" sub="Plafonds mensuels de tes dépenses variables">
        {dirty && <button className="btn p" onClick={save}><Check size={15} />Enregistrer</button>}
      </Top>
      <div className="content">
        <div className="grid g3">
          <Kpi accent icon={Gauge} k="Budget mensuel total" v={<>{fmt(total)}<small>FCFA</small></>} f="Utilisé dans la projection" />
          <Kpi icon={ArrowUpRight} tone={spent > total && total > 0 ? 'r' : 'o'} k={`Dépensé · ${mLabel(m, true)}`} v={<>{fmt(spent)}<small>FCFA</small></>} f={total ? `${Math.round((spent / total) * 100)} % du budget` : 'Aucun budget défini'} />
          <Kpi icon={Wallet} tone="g" k="Reste à dépenser" v={<span className={total - spent < 0 ? 'neg' : ''}>{fmt(total - spent)}</span>} f={isCur ? (daysIn(m) - d.getDate() > 1 ? `${daysIn(m) - d.getDate()} jours restants` : daysIn(m) - d.getDate() === 1 ? 'Dernier jour demain' : 'Dernier jour du mois') : 'Mois terminé'} />
        </div>
        <div className="card mt tbl" style={{ overflow: 'hidden' }}>
          <div className="card-h">
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><button className="btn s sm" onClick={() => setM(addMonths(m, -1))}>‹</button><b style={{ minWidth: 120, textAlign: 'center', textTransform: 'capitalize' }}>{mLabel(m, true)}</b><button className="btn s sm" onClick={() => setM(addMonths(m, 1))}>›</button></div>
            <span className="muted" style={{ fontSize: 12.5 }}>Le trait vertical indique où tu devrais en être aujourd'hui</span>
          </div>
          {CATS_VIE.map((c) => {
            const b = +draft[c] || 0; const sp = spentCat(st, m, c); const p = b ? sp / b : 0;
            const col = p > 1 ? 'var(--neg)' : p > 0.85 ? 'var(--warn)' : 'var(--primary)';
            return (
              <div className="row budget-row" key={c}>
                <div style={{ width: 170, fontWeight: 550 }}>{CATS[c]}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="bar budget-bar" style={{ height: 10 }}><i style={{ width: Math.min(100, p * 100) + '%', background: col }} />{isCur && b > 0 && <em style={{ left: prog * 100 + '%' }} />}</div>
                  <div className="s" style={{ marginTop: 5 }}>{fmt(sp)} dépensés{b ? ` · ${Math.round(p * 100)} %` : ''}{p > 1 && <span className="badge r">Dépassé de {fmt(sp - b)}</span>}{p > 0.85 && p <= 1 && <span className="badge warn">Presque atteint</span>}</div>
                </div>
                <input className="inp num" style={{ width: 140, textAlign: 'right' }} type="number" placeholder="Budget" value={draft[c] ?? ''} onChange={(e) => setDraft({ ...draft, [c]: e.target.value })} />
              </div>);
          })}
        </div>
        <div className="muted" style={{ fontSize: 12.5, marginTop: 10 }}>Les dépenses sont comptées à partir des opérations enregistrées dans ces catégories. Les charges fixes (loyer, factures…) se gèrent dans Flux récurrents.</div>
      </div>
    </>
  );
}

// =====================================================================
// ================= BILAN =============================================
// =====================================================================
function Bilan({ st, exportPDF }) {
  const c = useC(); const axis = axisOf(c);
  const [m, setM] = useState(mkey(new Date()));
  const s = monthStats(st, m); const prev = monthStats(st, addMonths(m, -1)); const plan = monthPlan(st, m);
  const delta = (a, b) => (b ? Math.round(((a - b) / b) * 100) : null);
  const D = ({ v, inverse }) => (v == null ? null : <span className={'badge ' + ((inverse ? v <= 0 : v >= 0) ? 'ok' : 'r')} style={{ marginLeft: 0 }}>{v > 0 ? '+' : ''}{v} % vs mois préc.</span>);
  const top = Object.entries(s.byCat).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const hist = Array.from({ length: 6 }, (_, i) => monthStats(st, addMonths(m, i - 5))).map((x) => ({ label: mLabel(x.key), long: mLabel(x.key, true), Entrées: x.entrees, Sorties: x.sorties, taux: x.taux == null ? 0 : Math.round(x.taux * 100) }));
  const rowsPR = [
    ['Entrées', plan.entrees, s.entrees, false],
    ['Charges fixes & tontines', plan.charges, s.sorties - s.vie, true],
    ['Vie courante', plan.vie, s.vie, true],
    ['Épargne objectifs', plan.epargne, s.epargne, false],
  ];
  return (
    <>
      <Top title="Bilan mensuel" sub="Ce qui s'est vraiment passé">
        <div className="seg no-print"><button onClick={() => setM(addMonths(m, -1))}>‹</button><button className="on" style={{ minWidth: 130, textTransform: 'capitalize' }}>{mLabel(m, true)}</button><button onClick={() => setM(addMonths(m, 1))}>›</button></div>
        <button className="btn s no-print" onClick={() => exportPDF(`Kalis-bilan-${m}.pdf`)}><FileText size={15} />PDF</button>
      </Top>
      <div className="content">
        <div className="grid g4">
          <Kpi icon={ArrowDownLeft} tone="g" k="Entrées" v={<span className="pos">{fmt(s.entrees)}</span>} f={<D v={delta(s.entrees, prev.entrees)} />} />
          <Kpi icon={ArrowUpRight} tone="r" k="Sorties" v={<span className="neg">{fmt(s.sorties)}</span>} f={<D v={delta(s.sorties, prev.sorties)} inverse />} />
          <Kpi icon={PiggyBank} tone="s" k="Épargne objectifs" v={fmt(s.epargne)} f={`${s.n} opérations`} />
          <Kpi accent icon={Gauge} k="Taux d'épargne" v={s.taux == null ? '—' : `${Math.round(s.taux * 100)} %`} f="(Entrées − sorties) / entrées" />
        </div>
        <div className="grid g21 mt">
          <Card title="Prévu et réel" sub="Écart entre la projection et tes opérations" flush>
            <table>
              <thead><tr><th>Poste</th><th>Prévu</th><th>Réel</th><th>Écart</th></tr></thead>
              <tbody>{rowsPR.map(([l, p, r, inv]) => { const e = r - p; const good = inv ? e <= 0 : e >= 0; return (
                <tr key={l}><td style={{ fontWeight: 550 }}>{l}</td><td className="muted">{fmt(p)}</td><td style={{ fontWeight: 600 }}>{fmt(r)}</td><td className={e === 0 ? 'muted' : good ? 'pos' : 'neg'} style={{ fontWeight: 600 }}>{e > 0 ? '+' : ''}{fmt(e)}</td></tr>); })}</tbody>
            </table>
          </Card>
          <Card title="Plus gros postes de dépense">
            {top.length ? top.map(([k, v], i) => (
              <div key={k} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}><span>{i + 1}. {CATS[k] || k}</span><b className="num">{fmt(v)}</b></div>
                <div className="bar" style={{ height: 6 }}><i style={{ width: (v / top[0][1]) * 100 + '%', background: REP_COLORS[i] }} /></div>
              </div>)) : <Empty title="Aucune dépense" text="Rien d'enregistré ce mois-ci." />}
          </Card>
        </div>
        <div className="grid g2 mt">
          <Card title="Entrées et sorties" sub="6 derniers mois" action={<div className="legend"><span><i style={{ background: 'var(--pos)' }} />Entrées</span><span><i style={{ background: 'var(--neg)' }} />Sorties</span></div>}>
            <div style={{ height: 240 }}><ResponsiveContainer><BarChart data={hist} margin={{ top: 6, right: 8, left: 0, bottom: 0 }} barGap={4}>
              <CartesianGrid stroke={c.grid} strokeDasharray="3 4" vertical={false} /><XAxis dataKey="label" {...axis} /><YAxis tickFormatter={short} width={52} {...axis} />
              <Tooltip content={<Tip />} cursor={{ fill: c.grid }} />
              <Bar dataKey="Entrées" fill="#10B981" radius={[6, 6, 0, 0]} animationDuration={500} /><Bar dataKey="Sorties" fill="#F43F5E" radius={[6, 6, 0, 0]} animationDuration={500} />
            </BarChart></ResponsiveContainer></div>
          </Card>
          <Card title="Taux d'épargne" sub="6 derniers mois, en %">
            <div style={{ height: 240 }}><ResponsiveContainer><AreaChart data={hist} margin={{ top: 6, right: 16, left: 0, bottom: 0 }}>
              <defs><linearGradient id="ft" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={c.primary} stopOpacity={0.25} /><stop offset="100%" stopColor={c.primary} stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid stroke={c.grid} strokeDasharray="3 4" vertical={false} /><XAxis dataKey="label" {...axis} /><YAxis unit=" %" width={52} {...axis} />
              <Tooltip content={({ active, payload }) => active && payload?.length ? <div className="tip"><div className="tt">{payload[0].payload.long}</div><div className="r"><span>Taux d'épargne</span><b>{payload[0].value} %</b></div></div> : null} />
              <ReferenceLine y={20} stroke={c.zero} strokeDasharray="4 4" label={{ value: 'Repère 20 %', fill: c.axis, fontSize: 11, position: 'insideTopLeft' }} />
              <Area type="monotone" dataKey="taux" stroke={c.primary} strokeWidth={2.4} fill="url(#ft)" dot={{ r: 3, fill: c.primary }} animationDuration={500} />
            </AreaChart></ResponsiveContainer></div>
          </Card>
        </div>
      </div>
    </>
  );
}

// =====================================================================
// ================= SCÉNARIOS =========================================
// =====================================================================
function Scenarios({ st, set, rows }) {
  const c = useC(); const axis = axisOf(c);
  const [sel, setSel] = useState(st.scenarios[0]?.id || null);
  const [adj, setAdj] = useState(null);
  const sc = st.scenarios.find((x) => x.id === sel);
  const upd = (s2) => set({ scenarios: st.scenarios.map((x) => (x.id === s2.id ? s2 : x)) });
  const add = () => { const s2 = { id: uid(), nom: `Scénario ${st.scenarios.length + 1}`, adjustments: [] }; set({ scenarios: [...st.scenarios, s2] }); setSel(s2.id); };
  const simRows = useMemo(() => (sc ? projection(applyScenario(st, sc)) : null), [st, sc]);
  const data = rows.map((r, i) => ({ label: r.label, long: mLabel(r.key, true), Actuel: Math.round(r.dispo), Scénario: simRows ? Math.round(simRows[i]?.dispo ?? 0) : undefined }));
  const lastA = rows[rows.length - 1]; const lastS = simRows?.[simRows.length - 1];
  const minS = simRows ? simRows.reduce((m, r) => (r.dispo < m.dispo ? r : m), simRows[0]) : null;
  const itemLabel = (id) => st.items.find((i) => i.id === id)?.label || 'Flux supprimé';
  const desc = (a) => a.type === 'stop' ? `Arrêter « ${itemLabel(a.itemId)} » à partir de ${mLabel(a.mois, true)}`
    : a.type === 'change' ? `« ${itemLabel(a.itemId)} » passe à ${fcfa(a.montant)} dès ${mLabel(a.mois, true)}`
    : a.type === 'budget' ? `Budget vie courante à ${fcfa(a.montant)} / mois`
    : `${a.label || SCEN_TYPES[a.type]} : ${a.type === 'once_in' ? '+' : '−'}${fcfa(a.montant)} en ${mLabel(a.mois, true)}`;
  return (
    <>
      <Top title="Scénarios" sub="Teste une décision sans toucher à tes vraies données"><button className="btn p" onClick={add}><Plus size={16} />Nouveau scénario</button></Top>
      <div className="content">
        {!st.scenarios.length ? <div className="card"><Empty icon={FlaskConical} title="Aucun scénario" text="Exemples : « J'achète la voiture en juin », « Karmoova s'arrête en avril », « Je réduis mes sorties de 20 000 »." action={<button className="btn p" onClick={add}><Plus size={16} />Créer un scénario</button>} /></div> : (
          <>
            <div className="seg" style={{ marginBottom: 16, flexWrap: 'wrap' }}>{st.scenarios.map((x) => <button key={x.id} className={sel === x.id ? 'on' : ''} onClick={() => setSel(x.id)}>{x.nom}</button>)}</div>
            {sc && (
              <div className="grid g21">
                <div>
                  <div className="grid g3">
                    <Kpi icon={Wallet} k="Solde fin de période" v={<span className={lastS.dispo < 0 ? 'neg' : ''}>{fmt(lastS.dispo)}</span>} f={<>Actuel : {fmt(lastA.dispo)} <b className={lastS.dispo - lastA.dispo >= 0 ? 'pos' : 'neg'}>({lastS.dispo - lastA.dispo >= 0 ? '+' : ''}{short(lastS.dispo - lastA.dispo)})</b></>} />
                    <Kpi icon={AlertTriangle} tone={minS.dispo < 0 ? 'r' : 'o'} k="Point bas" v={<span className={minS.dispo < 0 ? 'neg' : ''}>{fmt(minS.dispo)}</span>} f={mLabel(minS.key, true)} />
                    <Kpi icon={Target} tone="s" k="Objectifs" v={`${st.goals.filter((g) => { const r = goalReach(simRows, g); return r && monthDiff(g.echeance, r.key) <= 0; }).length} / ${st.goals.length}`} f="atteints à temps" />
                  </div>
                  <Card title="Solde disponible : actuel et scénario" style={{ marginTop: 16 }} action={<div className="legend"><span><i style={{ background: c.axis }} />Actuel</span><span><i style={{ background: 'var(--primary)' }} />{sc.nom}</span></div>}>
                    <div style={{ height: 300 }}><ResponsiveContainer><LineChart data={data} margin={{ top: 6, right: 24, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke={c.grid} strokeDasharray="3 4" vertical={false} /><XAxis dataKey="label" interval={data.length > 14 ? 1 : 0} {...axis} /><YAxis tickFormatter={short} width={56} {...axis} />
                      <Tooltip content={<Tip />} /><ReferenceLine y={0} stroke={c.zero} />
                      <Line type="monotone" dataKey="Actuel" stroke={c.axis} strokeWidth={2} strokeDasharray="6 4" dot={false} animationDuration={400} />
                      <Line type="monotone" dataKey="Scénario" name={sc.nom} stroke={c.primary} strokeWidth={2.6} dot={false} animationDuration={400} />
                    </LineChart></ResponsiveContainer></div>
                  </Card>
                  {st.goals.length > 0 && <Card title="Objectifs dans ce scénario" style={{ marginTop: 16 }} flush>
                    {st.goals.map((g) => { const a = goalReach(rows, g); const b = goalReach(simRows, g); return (
                      <div className="row" key={g.id}><span className="goal-dot" style={{ width: 10, height: 10, borderRadius: 3, background: g.couleur }} /><div className="t">{g.nom}</div>
                        <div className="a muted" style={{ fontWeight: 500 }}>Actuel : {a ? mLabel(a.key) : 'non atteint'} → <b style={{ color: b && monthDiff(g.echeance, b.key) <= 0 ? 'var(--pos)' : 'var(--neg)' }}>{b ? mLabel(b.key) : 'non atteint'}</b></div></div>); })}
                  </Card>}
                </div>
                <Card title={<input className="inp scen-name" value={sc.nom} onChange={(e) => upd({ ...sc, nom: e.target.value })} />} action={<button className="ib" title="Supprimer le scénario" onClick={() => { set({ scenarios: st.scenarios.filter((x) => x.id !== sc.id) }); setSel(st.scenarios.find((x) => x.id !== sc.id)?.id || null); }}><Trash2 size={15} /></button>} flush>
                  {sc.adjustments.map((a) => (
                    <div className="row" key={a.id}><div className="chip-ic p" style={{ width: 30, height: 30 }}><FlaskConical size={14} /></div><div style={{ flex: 1, fontSize: 13 }}>{desc(a)}</div>
                      <button className="ib" onClick={() => upd({ ...sc, adjustments: sc.adjustments.filter((x) => x.id !== a.id) })}><X size={15} /></button></div>))}
                  {!sc.adjustments.length && <div className="empty" style={{ padding: 20 }}>Ajoute une hypothèse ci-dessous.</div>}
                  <div style={{ padding: '10px 22px 14px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {Object.entries(SCEN_TYPES).map(([k, l]) => <button key={k} className="btn s sm" onClick={() => setAdj({ id: uid(), type: k, mois: addMonths(mkey(new Date()), 2), montant: '', label: '', itemId: st.items[0]?.id })}><Plus size={13} />{l}</button>)}
                  </div>
                </Card>
              </div>)}
          </>)}
      </div>
      {adj && (
        <Modal title={SCEN_TYPES[adj.type]} onClose={() => setAdj(null)} onEnter={() => {}}
          footer={<><button className="btn s" onClick={() => setAdj(null)}>Annuler</button><button className="btn p" disabled={(adj.type !== 'stop' && !(+adj.montant > 0)) || ((adj.type === 'stop' || adj.type === 'change') && !adj.itemId)} onClick={() => { upd({ ...sc, adjustments: [...sc.adjustments, { ...adj, montant: +adj.montant }] }); setAdj(null); }}>Ajouter</button></>}>
          <div className="form f2">
            {(adj.type === 'stop' || adj.type === 'change') && <Field label="Flux" span><select className="inp" value={adj.itemId} onChange={(e) => setAdj({ ...adj, itemId: e.target.value })}>{st.items.map((i) => <option key={i.id} value={i.id}>{i.label} · {fmt(i.montant)}</option>)}</select></Field>}
            {(adj.type === 'once_out' || adj.type === 'once_in') && <Field label="Libellé" span><input className="inp" autoFocus placeholder={adj.type === 'once_out' ? 'ex. Achat voiture, Tabaski' : 'ex. Prime, mission'} value={adj.label} onChange={(e) => setAdj({ ...adj, label: e.target.value })} /></Field>}
            {adj.type !== 'stop' && <Field label={adj.type === 'budget' ? 'Nouveau budget mensuel (FCFA)' : adj.type === 'change' ? 'Nouveau montant (FCFA)' : 'Montant (FCFA)'}><input className="inp num" type="number" value={adj.montant} onChange={(e) => setAdj({ ...adj, montant: e.target.value })} /></Field>}
            {adj.type !== 'budget' && <Field label={adj.type === 'stop' ? 'Dernier mois perçu / payé : le mois précédent' : 'Mois'}><input className="inp" type="month" value={adj.mois} onChange={(e) => e.target.value && setAdj({ ...adj, mois: e.target.value })} /></Field>}
          </div>
        </Modal>)}
    </>
  );
}

// =====================================================================
// ================= VERROUILLAGE (code PIN) ===========================
// =====================================================================
const sha = async (txt) => { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt)); return Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, '0')).join(''); };
function LockScreen({ hash, onUnlock }) {
  const [pin, setPin] = useState(''); const [err, setErr] = useState(false);
  const tryPin = async (p) => { if (p.length < 4) return; if ((await sha('kalis:' + p)) === hash) onUnlock(); else if (p.length >= 6) { setErr(true); setTimeout(() => { setPin(''); setErr(false); }, 600); } };
  const press = (k) => { if (k === 'del') { setPin(pin.slice(0, -1)); return; } if (pin.length >= 6) return; const p = pin + k; setPin(p); tryPin(p); };
  useEffect(() => { const h = (e) => { if (/^\d$/.test(e.key)) press(e.key); else if (e.key === 'Backspace') press('del'); }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); });
  return (
    <div className="lock">
      <div className={'lock-box' + (err ? ' shake' : '')}>
        <img src={logoUrl} alt="" width={64} height={64} />
        <h2>Kalis est verrouillé</h2><div className="muted" style={{ fontSize: 13 }}>Saisis ton code PIN</div>
        <div className="pin-dots">{Array.from({ length: 6 }, (_, i) => <i key={i} className={i < pin.length ? 'on' : ''} />)}</div>
        <div className="pad">{['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((k, i) => k === '' ? <span key={i} /> : <button key={i} onClick={() => press(k)}>{k === 'del' ? <Delete size={18} /> : k}</button>)}</div>
      </div>
    </div>
  );
}
function PinModal({ onClose, onOk }) {
  const [a, setA] = useState(''); const [b, setB] = useState('');
  const ok = /^\d{4,6}$/.test(a) && a === b;
  return (
    <Modal title="Définir un code PIN" onClose={onClose} onEnter={() => ok && onOk(a)} footer={<><button className="btn s" onClick={onClose}>Annuler</button><button className="btn p" disabled={!ok} onClick={async () => onOk(a)}>Enregistrer</button></>}>
      <div className="form f2">
        <Field label="Code PIN (4 à 6 chiffres)"><input className="inp num" type="password" inputMode="numeric" autoFocus maxLength={6} value={a} onChange={(e) => setA(e.target.value.replace(/\D/g, ''))} /></Field>
        <Field label="Confirmer" hint={b && a !== b ? 'Les codes ne correspondent pas' : null}><input className="inp num" type="password" inputMode="numeric" maxLength={6} value={b} onChange={(e) => setB(e.target.value.replace(/\D/g, ''))} /></Field>
      </div>
      <div className="muted" style={{ fontSize: 12.5, marginTop: 12 }}>Le code est demandé à chaque ouverture de Kalis et avec Ctrl+L. En cas d'oubli, il faudra restaurer une sauvegarde.</div>
    </Modal>
  );
}

// =====================================================================
// ================= EXPORT EXCEL ======================================
// =====================================================================
const toB64 = (u8) => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
async function exportExcel(st, rows) {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  const kindL = { in: 'Entrée', out: 'Dépense', save: 'Épargne', withdraw: 'Retrait épargne', move: 'Virement' };
  const ops = [...st.transactions].sort((a, b) => b.date.localeCompare(a.date)).map((t) => ({
    Date: t.date, Type: kindL[t.kind] || t.kind, Libellé: t.label, Catégorie: CATS[t.cat] || t.cat || '', Compte: t.kind === 'move' ? `${accName(st, t.accountId)} → ${accName(st, t.toAccountId)}` : (t.kind === 'save' || t.kind === 'withdraw') ? '' : accName(st, t.accountId),
    Objectif: t.goalId ? gname(st, t.goalId) || '' : '', 'Montant (FCFA)': (t.kind === 'out' || t.kind === 'save' ? -1 : 1) * t.montant,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ops), 'Opérations');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows.map((r) => ({ Mois: mLabel(r.key, true), Entrées: Math.round(r.entrees), Charges: Math.round(r.charges), 'Vie courante': Math.round(r.vie), Épargne: Math.round(r.epargne), 'Solde disponible': Math.round(r.dispo), 'Épargne cumulée': Math.round(r.epargneCumul) }))), 'Projection');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(st.items.map((i) => ({ Libellé: i.label, Type: i.kind === 'in' ? 'Revenu' : i.kind === 'out' ? 'Charge' : 'Épargne', Catégorie: CATS[i.cat] || '', Montant: i.montant, Jour: i.jour, Début: i.debut, Fin: i.fin || '', Compte: i.kind === 'save' ? '' : accName(st, i.accountId) }))), 'Flux récurrents');
  const b = balances(st);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([...st.accounts.map((a) => ({ Compte: a.nom, 'Solde (FCFA)': b.accounts[a.id] })), ...st.goals.map((g) => ({ Compte: `Objectif · ${g.nom}`, 'Solde (FCFA)': b.goals[g.id] }))]), 'Soldes');
  const u8 = new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }));
  const name = `Kalis-${todayISO()}.xlsx`;
  if (native) return native.saveFile(name, toB64(u8), [{ name: 'Excel', extensions: ['xlsx'] }]);
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([u8])); a.download = name; a.click(); return name;
}
