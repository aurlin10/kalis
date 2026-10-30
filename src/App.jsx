import React, { useEffect, useMemo, useState } from 'react';
import {
  LayoutGrid, LineChart as LineIc, Target, Repeat, Users, HandCoins, List, Settings, Plus, Check, Pencil, Trash2, X,
  ArrowDownLeft, ArrowUpRight, PiggyBank, Sun, Moon, Monitor, AlertTriangle, Info, Download, Upload, RotateCcw, Undo2, Wallet, CalendarDays,
} from 'lucide-react';
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine,
} from 'recharts';
import {
  defaultState, balances, projection, pending, upcoming, occurrences, mkey, addMonths, mLabel, dLabel, fmt, fcfa, short, uid,
  CATS, CATS_IN, CATS_OUT, GOAL_COLORS, goalReach, monthDiff, todayISO, isActive, amountOf, spentVie,
} from './data.js';

const STORE = 'kalis-data-v2';
const load = () => { try { const s = JSON.parse(localStorage.getItem(STORE)); if (s && s.version === 2) return s; } catch (e) {} return defaultState(); };
const sign = (k) => (k === 'in' || k === 'withdraw' ? '+' : '−');
const tone = (k) => (k === 'in' || k === 'withdraw' ? 'pos' : k === 'save' ? 'sav' : 'neg');
const KindIc = ({ k }) => { const I = k === 'in' || k === 'withdraw' ? ArrowDownLeft : k === 'save' ? PiggyBank : ArrowUpRight; return <div className="ic"><I size={16} /></div>; };

// ================= APP =================
export default function App() {
  const [st, setSt] = useState(load);
  const [page, setPage] = useState('dash');
  const [modal, setModal] = useState(null); // {type, data}
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

  const ctx = { st, set, bal, rows, upsert, remove, addTx, delTx, setDone, undoRef, open, setPage };

  const NAV = [
    ['Pilotage', [['dash', "Vue d'ensemble", LayoutGrid], ['proj', 'Projection', LineIc], ['goals', 'Objectifs', Target]]],
    ['Données', [['flux', 'Flux récurrents', Repeat], ['tont', 'Tontines', Users], ['cre', 'Créances & dettes', HandCoins], ['ops', 'Opérations', List]]],
    ['', [['set', 'Paramètres', Settings]]],
  ];
  const PAGES = { dash: Dashboard, proj: Projection, goals: Goals, flux: Flux, tont: Tontines, cre: Creances, ops: Operations, set: Params };
  const Page = PAGES[page];

  return (
    <ThemeCtx.Provider value={PAL[eff]}>
    <div className="app">
      <aside className="side">
        <div className="brand"><div className="brand-mark">K</div><div className="brand-name">Kalis</div></div>
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
            <button key={m} className={mode === m ? 'on' : ''} title={l} onClick={() => set({ theme: m })}><I size={13} />{l}</button>))}</div>
      </aside>
      <main className="main"><Page {...ctx} /></main>

      {modal?.type === 'confirm' && <ConfirmModal occ={modal.data} goals={st.goals} onClose={close} onOk={(m, d, skip) => { if (skip) setDone(modal.data.ref, true); else addTx({ date: d, label: modal.data.label, kind: modal.data.kind, cat: modal.data.cat, montant: m, goalId: modal.data.goalId }, modal.data.ref); close(); }} />}
      {modal?.type === 'tx' && <TxModal init={modal.data} goals={st.goals} onClose={close} onOk={(t) => { addTx(t); close(); }} />}
      {modal?.type === 'item' && <ItemModal item={modal.data} goals={st.goals} onClose={close} onOk={(it) => { upsert('items', it); close(); }} />}
      {modal?.type === 'goal' && <GoalModal goal={modal.data} onClose={close} onOk={(g) => { upsert('goals', g); close(); }} />}
      {modal?.type === 'tontine' && <TontineModal t={modal.data} onClose={close} onOk={(t) => { upsert('tontines', t); close(); }} />}
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
  const neg = rows.find((r) => r.dispo < 0);
  const late = st.goals.map((g) => ({ g, r: goalReach(rows, g) })).find(({ g, r }) => !r || monthDiff(g.echeance, r.key) > 0);
  const steps = [
    { t: 'Solde courant', s: `${fcfa(st.soldeInitial)} au ${dLabel(st.dateInitiale)}`, done: true, a: ['Modifier', () => setPage('set')] },
    { t: 'Revenus et charges', s: 'Salaires, loyer, factures, abonnements…', done: st.items.length > 0, a: ['Ajouter un flux', () => open('item')] },
    { t: 'Budget vie courante', s: 'Dépenses mensuelles hors charges fixes', done: +st.budgetVie > 0, a: ['Définir', () => setPage('set')] },
    { t: 'Objectifs', s: 'Ce pour quoi tu épargnes', done: st.goals.length > 0, a: ['Créer un objectif', () => open('goal')] },
  ];
  const onboarding = steps.some((s) => !s.done);
  const revNext = pending(st, nk).filter((x) => x.kind === 'in').reduce((s, x) => s + x.amount, 0);
  const nbSrc = new Set(pending(st, nk).filter((x) => x.kind === 'in').map((x) => x.label)).size;

  const groups = {};
  pending(st, nk).filter((x) => x.kind !== 'in').forEach((x) => { const k = x.kind === 'save' ? 'epargne' : x.cat; groups[k] = (groups[k] || 0) + x.amount; });
  if (+st.budgetVie) groups.vie = (groups.vie || 0) + +st.budgetVie;
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
          <Kpi icon={CalendarDays} tone="o" k={`Vie courante · ${mLabel(cur, true)}`}
            v={+st.budgetVie ? <>{fmt(Math.max(0, st.budgetVie - vie))}<small>restants</small></> : <span className="muted" style={{ fontSize: 17, fontWeight: 600 }}>Non défini</span>}
            f={+st.budgetVie ? <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{fmt(vie)} / {fmt(st.budgetVie)}</span><span>{Math.round((vie / st.budgetVie) * 100)} %</span></div> : 'À définir dans Paramètres'}>
            {+st.budgetVie > 0 && <div className="bar" style={{ marginTop: 12, height: 6 }}><i style={{ width: Math.min(100, (vie / st.budgetVie) * 100) + '%', background: vie > st.budgetVie ? 'var(--neg)' : 'var(--warn)' }} /></div>}
          </Kpi>
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
function Projection({ st, set, rows }) {
  const last = rows[rows.length - 1];
  const totIn = rows.reduce((s, r) => s + r.entrees, 0);
  const totOut = rows.reduce((s, r) => s + r.charges + r.vie, 0);
  const hasVar = st.items.some((i) => i.variable);
  const hasInc = st.items.some((i) => i.incertain);
  const minD = rows.reduce((m, r) => (r.dispo < m.dispo ? r : m), rows[0]);
  const data = rows.map((r) => ({ ...r, long: mLabel(r.key, true) }));
  return (
    <>
      <Top title="Projection" sub={`Simulation mois par mois jusqu'en ${mLabel(last.key, true)}`} />
      <div className="content">
        <div className="card" style={{ padding: '16px 20px' }}>
          <div className="toolbar">
            <div className="field"><label>Revenus variables</label>
              <div className="seg">{[['bas', 'Hypothèse basse'], ['moyen', 'Moyenne'], ['haut', 'Haute']].map(([k, l]) => <button key={k} className={st.hypothese === k ? 'on' : ''} disabled={!hasVar} onClick={() => set({ hypothese: k })}>{l}</button>)}</div></div>
            <div className="field"><label>Budget vie courante / mois</label><input className="inp num" type="number" style={{ width: 170 }} value={st.budgetVie} onChange={(e) => set({ budgetVie: +e.target.value })} /></div>
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
  const data = rows.map((r) => { const o = { label: r.label, long: mLabel(r.key, true) }; st.goals.forEach((g) => { o[g.id] = r.goals[g.id] || 0; }); return o; });
  return (
    <>
      <Top title="Objectifs" sub="Épargne affectée à tes projets"><button className="btn p" onClick={() => open('goal')}><Plus size={16} />Nouvel objectif</button></Top>
      <div className="content">
        {!st.goals.length ? <div className="card"><Empty icon={Target} title="Aucun objectif pour l'instant" text="Définis un montant cible et une échéance, puis programme une épargne mensuelle." action={<button className="btn p" onClick={() => open('goal')}><Plus size={16} />Créer un objectif</button>} /></div> : (
          <>
            <div className="grid g3">
              {st.goals.map((g) => {
                const v = bal.goals[g.id] || 0; const reste = Math.max(0, g.montant - v);
                const mois = Math.max(1, monthDiff(cur, g.echeance) + 1); const r = goalReach(rows, g);
                const ok = r && monthDiff(g.echeance, r.key) <= 0;
                const prog = st.items.filter((i) => i.kind === 'save' && i.goalId === g.id);
                return (
                  <div className="card goal" key={g.id}>
                    <div className="goal-h">
                      <Ring pct={v / g.montant} color={g.couleur} size={84} stroke={8} />
                      <div style={{ flex: 1, minWidth: 0 }}><div className="goal-n">{g.nom}</div><div className="muted" style={{ fontSize: 12.5, marginTop: 1 }}>Échéance {mLabel(g.echeance, true)}</div>
                        <div className="goal-v">{fmt(v)} <small>/ {fmt(g.montant)} FCFA</small></div></div>
                      <div style={{ display: 'flex', alignSelf: 'flex-start' }}><button className="ib" onClick={() => open('goal', g)}><Pencil size={15} /></button><button className="ib" onClick={() => { if (window.confirm(`Supprimer l'objectif « ${g.nom} » ?`)) remove('goals', g.id); }}><Trash2 size={15} /></button></div>
                    </div>
                    <div className="meta">
                      <div><div className="k">Reste</div><div className="v">{fmt(reste)}</div></div>
                      <div><div className="k">Effort / mois</div><div className="v">{fmt(reste / mois)}</div></div>
                      <div><div className="k">Atteinte</div><div className={'v ' + (ok ? 'pos' : 'neg')}>{r ? mLabel(r.key) : 'Non atteint'}</div></div>
                    </div>
                    <div className="muted" style={{ fontSize: 12.5, marginTop: 12 }}>{prog.length ? `Épargne programmée : ${prog.map((p) => `${short(p.montant)}/mois`).join(', ')}` : 'Aucune épargne programmée'}</div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                      <button className="btn p sm" onClick={() => setFund({ goal: g, kind: 'save', montant: '', date: todayISO() })}><ArrowUpRight size={14} />Alimenter</button>
                      <button className="btn s sm" onClick={() => open('item', { kind: 'save', goalId: g.id, label: `Épargne ${g.nom}` })}><Repeat size={14} />Programmer</button>
                      <button className="btn s sm" disabled={v <= 0} onClick={() => setFund({ goal: g, kind: 'withdraw', montant: '', date: todayISO() })}>Retirer</button>
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
  const secs = [['in', 'Revenus'], ['out', 'Charges'], ['save', 'Épargne programmée']];
  return (
    <>
      <Top title="Flux récurrents" sub="Revenus, charges et épargne qui reviennent dans le temps"><button className="btn p" onClick={() => open('item')}><Plus size={16} />Ajouter un flux</button></Top>
      <div className="content">
        {secs.map(([k, l]) => {
          const list = st.items.filter((i) => i.kind === k);
          const tot = list.filter((i) => isActive(i, nk, st)).reduce((s, i) => s + amountOf(i, st), 0);
          return (
            <div className="card tbl" key={k} style={{ marginBottom: 16, overflow: 'hidden' }}>
              <div className="card-h"><div><h3>{l}</h3><div className="sub">{fcfa(tot)} prévus en {mLabel(nk, true)}</div></div>
                <button className="btn s sm" onClick={() => open('item', { kind: k })}><Plus size={14} />Ajouter</button></div>
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
                      <td style={{ fontWeight: 600 }} className={tone(k)}>{it.variable ? `${fmt(it.min)} – ${fmt(it.max)}` : fmt(it.montant)}</td>
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
                <div className="card-h"><div><h3>{t.nom}</h3><div className="sub">{fmt(t.cotisation)} FCFA / mois · {n} participants · position {t.position}</div></div>
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
    const pend = list.filter((c) => !st.done[`cr:${c.id}:${c.date.slice(0, 7)}`]).reduce((s, c) => s + +c.montant, 0);
    return (
      <div className="card tbl" style={{ overflow: 'hidden' }}>
        <div className="card-h"><div><h3>{title}</h3><div className="sub">{fcfa(pend)} en attente</div></div><button className="btn s sm" onClick={() => open('creance', { sens })}><Plus size={14} />Ajouter</button></div>
        {list.length ? list.map((c) => {
          const ref = `cr:${c.id}:${c.date.slice(0, 7)}`; const ok = !!st.done[ref];
          const o = { ref, label: sens === 'out' ? `Remboursement à ${c.nom}` : `Remboursement de ${c.nom}`, kind: sens === 'out' ? 'out' : 'in', cat: 'remboursement', amount: +c.montant, date: c.date };
          return (
            <div className="row" key={c.id}>
              <div className="ic"><HandCoins size={16} /></div>
              <div><div className="t">{c.nom}</div><div className="s">Prévu le {dLabel(c.date)}</div></div>
              <div className={'a ' + (sens === 'in' ? 'pos' : 'neg')}>{fmt(c.montant)}</div>
              {ok ? <><span className="badge ok">{sens === 'in' ? 'Reçu' : 'Payé'}</span><button className="ib" title="Annuler" onClick={() => undoRef(ref)}><Undo2 size={15} /></button></>
                : <button className="btn s sm" onClick={() => open('confirm', o)}>{sens === 'in' ? 'Marquer reçu' : 'Marquer payé'}</button>}
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
function Operations({ st, open, delTx }) {
  const [f, setF] = useState('all');
  const [m, setM] = useState(mkey(new Date()));
  const inM = st.transactions.filter((t) => t.date.startsWith(m));
  const list = inM.filter((t) => f === 'all' || (f === 'in' ? t.kind === 'in' : f === 'out' ? t.kind === 'out' : t.kind === 'save' || t.kind === 'withdraw')).sort((a, b) => b.date.localeCompare(a.date));
  const sum = (k) => inM.filter((t) => t.kind === k).reduce((s, t) => s + t.montant, 0);
  return (
    <>
      <Top title="Opérations" sub="Mouvements enregistrés"><button className="btn p" onClick={() => open('tx')}><Plus size={16} />Nouvelle opération</button></Top>
      <div className="content">
        <div className="grid g3">
          <Kpi icon={ArrowDownLeft} tone="g" k="Entrées du mois" v={<span className="pos">{fmt(sum('in'))}</span>} />
          <Kpi icon={ArrowUpRight} tone="r" k="Dépenses du mois" v={<span className="neg">{fmt(sum('out'))}</span>} />
          <Kpi icon={PiggyBank} tone="p" k="Épargne nette du mois" v={fmt(sum('save') - sum('withdraw'))} />
        </div>
        <div className="card mt tbl" style={{ overflow: 'hidden' }}>
          <div className="card-h">
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><button className="btn s sm" onClick={() => setM(addMonths(m, -1))}>‹</button><b style={{ minWidth: 120, textAlign: 'center', textTransform: 'capitalize' }}>{mLabel(m, true)}</b><button className="btn s sm" onClick={() => setM(addMonths(m, 1))}>›</button></div>
            <div className="seg">{[['all', 'Tout'], ['in', 'Entrées'], ['out', 'Dépenses'], ['save', 'Épargne']].map(([k, l]) => <button key={k} className={f === k ? 'on' : ''} onClick={() => setF(k)}>{l}</button>)}</div>
          </div>
          {list.length ? (
            <table>
              <thead><tr><th>Date</th><th style={{ textAlign: 'left' }}>Libellé</th><th style={{ textAlign: 'left' }}>Catégorie</th><th>Montant</th><th></th></tr></thead>
              <tbody>{list.map((t) => (
                <tr key={t.id}><td className="muted">{dLabel(t.date)}</td><td style={{ textAlign: 'left', fontWeight: 500 }}>{t.label}</td>
                  <td style={{ textAlign: 'left' }} className="muted">{t.goalId ? gname(st, t.goalId) || 'Objectif supprimé' : CATS[t.cat]}</td>
                  <td style={{ fontWeight: 600 }} className={tone(t.kind)}>{sign(t.kind)} {fmt(t.montant)}</td>
                  <td style={{ width: 50 }}><button className="ib" title={t.ref ? 'Annuler la validation' : 'Supprimer'} onClick={() => delTx(t.id)}>{t.ref ? <Undo2 size={15} /> : <Trash2 size={15} />}</button></td></tr>))}</tbody>
            </table>) : <Empty icon={List} title="Aucune opération ce mois" text="Valide tes échéances ou ajoute une opération." />}
        </div>
      </div>
    </>
  );
}

// ================= PARAMÈTRES =================
function Params({ st, set }) {
  const exp = () => { const b = new Blob([JSON.stringify(st, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `kalis-sauvegarde-${todayISO()}.json`; a.click(); };
  const imp = (e) => { const file = e.target.files?.[0]; if (!file) return; file.text().then((t) => { try { const s = JSON.parse(t); if (s.version === 2) set(s); else alert('Fichier non reconnu'); } catch (err) { alert('Fichier invalide'); } }); };
  return (
    <>
      <Top title="Paramètres" />
      <div className="content" style={{ maxWidth: 880 }}>
        <Card title="Solde courant" sub="Montant disponible à la date de départ. Toutes les opérations validées s'y ajoutent.">
          <div className="form f2">
            <div className="field"><label>Solde (FCFA)</label><input className="inp num" type="number" value={st.soldeInitial} onChange={(e) => set({ soldeInitial: +e.target.value })} /></div>
            <div className="field"><label>À la date du</label><input className="inp" type="date" value={st.dateInitiale} onChange={(e) => set({ dateInitiale: e.target.value })} /></div>
          </div>
        </Card>
        <Card title="Budget" sub="Dépenses de vie courante hors charges fixes (alimentation, transport, sorties…)" style={{ marginTop: 16 }}>
          <div className="form f2">
            <div className="field"><label>Budget vie courante / mois (FCFA)</label><input className="inp num" type="number" value={st.budgetVie} onChange={(e) => set({ budgetVie: +e.target.value })} /></div>
            <div className="field"><label>Horizon de projection</label><input className="inp" type="month" value={st.horizon} onChange={(e) => e.target.value && set({ horizon: e.target.value })} /></div>
          </div>
        </Card>
        <Card title="Apparence" sub="Thème de l'application. « Auto » suit le réglage de Windows." style={{ marginTop: 16 }}>
          <div className="seg">{[['light', Sun, 'Clair'], ['dark', Moon, 'Sombre'], ['system', Monitor, 'Automatique']].map(([m, I, l]) => (
            <button key={m} className={(st.theme || 'light') === m ? 'on' : ''} onClick={() => set({ theme: m })} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><I size={14} />{l}</button>))}</div>
        </Card>
        <Card title="Données" sub="Tout est stocké localement sur ce PC. Exporte une sauvegarde régulièrement." style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn s" onClick={exp}><Download size={15} />Exporter</button>
            <label className="btn s" style={{ cursor: 'pointer' }}><Upload size={15} />Importer<input type="file" accept=".json" hidden onChange={imp} /></label>
            <button className="btn d" style={{ marginLeft: 'auto' }} onClick={() => { if (window.confirm('Effacer toutes les données ?')) set(defaultState()); }}><RotateCcw size={15} />Réinitialiser</button>
          </div>
        </Card>
      </div>
    </>
  );
}

// ================= MODALES =================
function Modal({ title, onClose, children, footer }) {
  useEffect(() => { const h = (e) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [onClose]);
  return (
    <div className="ov" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
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

function ConfirmModal({ occ, goals, onClose, onOk }) {
  const [m, setM] = useState(Math.round(occ.amount));
  const [d, setD] = useState(todayISO());
  const [skip, setSkip] = useState(false);
  const verb = occ.kind === 'in' ? 'reçu' : occ.kind === 'save' ? 'épargné' : 'payé';
  return (
    <Modal title={occ.label} onClose={onClose} footer={<><button className="btn s" onClick={onClose}>Annuler</button><button className="btn p" onClick={() => onOk(+m, d, skip)}><Check size={15} />Valider</button></>}>
      <div className="muted" style={{ marginBottom: 16, fontSize: 13 }}>Prévu le {dLabel(occ.date)} : <b style={{ color: 'var(--ink)' }}>{fcfa(occ.amount)}</b>{occ.variable && ` (entre ${fmt(occ.min)} et ${fmt(occ.max)})`}</div>
      <div className="form f2">
        <Field label={`Montant ${verb} (FCFA)`}><input className="inp num" type="number" autoFocus value={m} disabled={skip} onChange={(e) => setM(e.target.value)} /></Field>
        <Field label="Date"><input className="inp" type="date" value={d} disabled={skip} onChange={(e) => setD(e.target.value)} /></Field>
      </div>
      <label className="switch" style={{ marginTop: 16 }}><input type="checkbox" checked={skip} onChange={(e) => setSkip(e.target.checked)} />Déjà pris en compte dans mon solde courant</label>
    </Modal>
  );
}

function TxModal({ init, goals, onClose, onOk }) {
  const [t, setT] = useState({ kind: 'out', cat: 'vie', label: '', montant: '', date: todayISO(), goalId: goals[0]?.id, ...(init || {}) });
  const u = (p) => setT((x) => ({ ...x, ...p }));
  const isG = t.kind === 'save' || t.kind === 'withdraw';
  const cats = t.kind === 'in' ? CATS_IN : CATS_OUT;
  const ok = +t.montant > 0 && (!isG || t.goalId);
  return (
    <Modal title="Nouvelle opération" onClose={onClose} footer={<><button className="btn s" onClick={onClose}>Annuler</button><button className="btn p" disabled={!ok} onClick={() => onOk({ ...t, montant: +t.montant, cat: isG ? 'epargne' : t.cat, goalId: isG ? t.goalId : undefined, label: t.label || (isG ? `${t.kind === 'save' ? 'Épargne' : 'Retrait'} ${goals.find((g) => g.id === t.goalId)?.nom}` : CATS[t.cat]) })}>Enregistrer</button></>}>
      <div className="seg" style={{ display: 'flex', marginBottom: 18 }}>
        {[['out', 'Dépense', 'vie'], ['in', 'Entrée', 'salaire'], ['save', 'Épargne'], ['withdraw', 'Retrait épargne']].map(([k, l, c]) => <button key={k} style={{ flex: 1 }} className={t.kind === k ? 'on' : ''} onClick={() => u({ kind: k, cat: c || t.cat })}>{l}</button>)}
      </div>
      <div className="form f2">
        <Field label="Montant (FCFA)"><input className="inp num" type="number" autoFocus value={t.montant} onChange={(e) => u({ montant: e.target.value })} /></Field>
        <Field label="Date"><input className="inp" type="date" value={t.date} onChange={(e) => u({ date: e.target.value })} /></Field>
        {isG ? <Field label="Objectif">{goals.length ? <select className="inp" value={t.goalId} onChange={(e) => u({ goalId: e.target.value })}>{goals.map((g) => <option key={g.id} value={g.id}>{g.nom}</option>)}</select> : <span className="hint">Crée d'abord un objectif.</span>}</Field>
          : <Field label="Catégorie"><select className="inp" value={t.cat} onChange={(e) => u({ cat: e.target.value })}>{cats.map((c) => <option key={c} value={c}>{CATS[c]}</option>)}</select></Field>}
        <Field label="Libellé"><input className="inp" placeholder="Facultatif" value={t.label} onChange={(e) => u({ label: e.target.value })} /></Field>
      </div>
    </Modal>
  );
}

function ItemModal({ item, goals, onClose, onOk }) {
  const cur = mkey(new Date());
  const [it, setIt] = useState(() => { const x = { id: uid(), label: '', kind: 'out', cat: 'factures', montant: '', jour: 1, debut: addMonths(cur, 1), fin: null, every: 1, ...(item || {}) }; if (!x.goalId && goals[0]) x.goalId = goals[0].id; return x; });
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

function TontineModal({ t, onClose, onOk }) {
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
        <Field label="Premier mois" span><input className="inp" type="month" value={x.debut} onChange={(e) => e.target.value && u({ debut: e.target.value })} /></Field>
      </div>
    </Modal>
  );
}

function CreanceModal({ c, onClose, onOk }) {
  const [x, setX] = useState({ id: uid(), sens: 'in', nom: '', montant: '', date: todayISO(), ...(c || {}) });
  const u = (p) => setX((s) => ({ ...s, ...p }));
  return (
    <Modal title={c?.id ? 'Modifier' : x.sens === 'in' ? 'Nouvelle créance' : 'Nouvelle dette'} onClose={onClose} footer={<><button className="btn s" onClick={onClose}>Annuler</button><button className="btn p" disabled={!x.nom || !(+x.montant > 0)} onClick={() => onOk({ ...x, montant: +x.montant })}>Enregistrer</button></>}>
      <div className="seg" style={{ display: 'flex', marginBottom: 18 }}>{[['in', 'On me doit'], ['out', 'Je dois']].map(([k, l]) => <button key={k} style={{ flex: 1 }} className={x.sens === k ? 'on' : ''} onClick={() => u({ sens: k })}>{l}</button>)}</div>
      <div className="form f2">
        <Field label="Personne" span><input className="inp" autoFocus value={x.nom} onChange={(e) => u({ nom: e.target.value })} /></Field>
        <Field label="Montant (FCFA)"><input className="inp num" type="number" value={x.montant} onChange={(e) => u({ montant: e.target.value })} /></Field>
        <Field label="Date prévue"><input className="inp" type="date" value={x.date} onChange={(e) => u({ date: e.target.value })} /></Field>
      </div>
    </Modal>
  );
}
