import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  LayoutGrid, LineChart as LineIc, Target, Repeat, Users, HandCoins, List, Settings, Plus, Check, Pencil, Trash2, X,
  ArrowDownLeft, ArrowUpRight, PiggyBank, Sun, Moon, Monitor, AlertTriangle, Info, Download, Upload, RotateCcw, Undo2, Wallet, CalendarDays,
  ArrowLeftRight, BarChart3, FlaskConical, Lock, Bell, Star, FileSpreadsheet, FileText, FolderOpen, RefreshCw, Gauge, PartyPopper, KeyRound, ShieldCheck, Smartphone, Keyboard, Power, Delete, Sparkles, Search, Trophy, Archive, History, CheckCheck, Clock, Banknote, ArchiveRestore, Zap, Tag, CalendarRange, UtensilsCrossed, Bus, HeartPulse, ShoppingBag, Ticket, CornerDownLeft, ChevronDown,
  MessageCircle, Scale, ClipboardPaste, ListChecks, Copy, Send, Command, FileBarChart, PanelLeftClose, PanelLeftOpen, Palette, Database,
} from 'lucide-react';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine,
} from 'recharts';
import logoUrl from '../build/logo.svg';
import {
  defaultState, balances, projection, pending, upcoming, occurrences, mkey, addMonths, mLabel, dLabel, fmt, fcfa, short, uid,
  CATS, CATS_IN, CATS_OUT, CATS_VIE, GOAL_COLORS, goalReach, monthDiff, todayISO, isActive, amountOf, spentVie, spentCat,
  migrate, fixCat, budgetTotal, CATS_DEBT, accName, creanceOccs, monthStats, monthPlan, applyScenario, SCEN_TYPES, EVENT_PRESETS, daysIn, isGoalActive, applyCustomCats, amountSuggestions, weeklySummary, weekKey, paidMap, parseSMS, prevMonth, JOURS, habitToday, habitsMonthly, habitLogged, budgetTotal as bTotal, dateIn,
} from './data.js';
import { reportHTML } from './report.js';

const STORE = 'kalis-data-v2';
const load = () => { try { const s = migrate(JSON.parse(localStorage.getItem(STORE))); if (s) return s; } catch (e) {} return defaultState(); };
const native = typeof window !== 'undefined' ? window.kalis || null : null;
const sign = (k) => (k === 'in' || k === 'withdraw' ? '+' : k === 'move' ? '' : '−');
const tone = (k) => (k === 'in' || k === 'withdraw' ? 'pos' : k === 'save' ? 'sav' : k === 'move' ? '' : 'neg');
const KindIc = ({ k }) => { const I = k === 'in' || k === 'withdraw' ? ArrowDownLeft : k === 'save' ? PiggyBank : ArrowUpRight; return <div className="ic"><I size={16} /></div>; };

// ================= APP =================
export default function App() {
  const [st, setSt] = useState(load);
  applyCustomCats(st.customCats || []);
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
  const [toast, setToast] = useState(null);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 7000); return () => clearTimeout(t); }, [toast]);
  const NOMS = { items: 'Flux supprimé', goals: 'Objectif supprimé', tontines: 'Tontine supprimée', creances: 'Créance supprimée', accounts: 'Compte supprimé' };
  const remove = (coll, id) => {
    const linked = coll === 'creances' ? st.creances.find((x) => x.id === id)?.initTx : null;
    setToast({ msg: linked ? (st.creances.find((x) => x.id === id).sens === 'in' ? 'Créance supprimée · le prêt est annulé sur le solde' : 'Dette supprimée · l’emprunt est retiré du solde') : NOMS[coll] || 'Élément supprimé', prev: st });
    setSt((s) => ({ ...s, [coll]: s[coll].filter((x) => x.id !== id), ...(linked ? { transactions: s.transactions.filter((t) => t.id !== linked) } : {}) }));
  };
  // Créance / dette : l'argent prêté sort d'un compte, l'argent emprunté y entre
  const saveCreance = (c, mv) => {
    const prev = st;
    setSt((s) => {
      let tx = s.transactions; let cc = { ...c };
      const old = cc.initTx && tx.find((t) => t.id === cc.initTx);
      if (!old) delete cc.initTx;
      if (mv.on) {
        const t = { kind: c.sens === 'in' ? 'out' : 'in', cat: c.sens === 'in' ? 'pret' : 'emprunt', label: c.sens === 'in' ? `Prêt à ${c.nom}` : `Emprunt auprès de ${c.nom}`, montant: c.montant, accountId: mv.accountId, date: mv.date };
        if (old) tx = tx.map((x) => (x.id === old.id ? { ...x, ...t } : x));
        else { const id = uid(); tx = [{ id, ...t }, ...tx]; cc.initTx = id; }
      } else if (old) { tx = tx.filter((x) => x.id !== old.id); delete cc.initTx; }
      const exists = s.creances.some((x) => x.id === cc.id);
      return { ...s, transactions: tx, creances: exists ? s.creances.map((x) => (x.id === cc.id ? cc : x)) : [...s.creances, cc] };
    });
    if (mv.on) setToast({ msg: c.sens === 'in' ? `${fmt(c.montant)} FCFA prêtés à ${c.nom} · retirés de ${accName(st, mv.accountId)}` : `${fmt(c.montant)} FCFA empruntés à ${c.nom} · ajoutés sur ${accName(st, mv.accountId)}`, prev });
  };
  const updateTx = (id, nt) => setSt((s) => ({ ...s, transactions: s.transactions.map((x) => (x.id === id ? { ...x, ...nt, id, ref: x.ref } : x)) }));
  const addTx = (tx, ref) => setSt((s) => { const t = { id: uid(), ...tx, ref }; const done = { ...s.done }; if (ref) done[ref] = t.id; return { ...s, transactions: [t, ...s.transactions], done }; });
  const delTx = (id) => { const t0 = st.transactions.find((x) => x.id === id); setToast({ msg: t0?.ref ? 'Validation annulée' : 'Opération supprimée', prev: st }); delTx0(id); };
  const delTx0 = (id) => setSt((s) => { const t = s.transactions.find((x) => x.id === id); const done = { ...s.done }; if (t?.ref) delete done[t.ref]; return { ...s, transactions: s.transactions.filter((x) => x.id !== id), done }; });
  const setDone = (ref, v) => setSt((s) => { const done = { ...s.done }; if (v) done[ref] = true; else delete done[ref]; return { ...s, done }; });
  const undoRef = (ref) => { const v = st.done[ref]; if (typeof v === 'string') delTx(v); else setDone(ref, false); };
  const open = (type, data = null) => setModal({ type, data });
  const close = () => setModal(null);
  const [focusSearch, setFocusSearch] = useState(0);
  const setSettings = (p) => setSt((s) => ({ ...s, settings: { ...s.settings, ...p } }));
  const addMany = (list) => list.forEach((t) => addTx(t));

  // Raccourcis clavier
  useEffect(() => {
    const h = (e) => {
      if (locked) return;
      if (e.key === 'F1') { e.preventDefault(); open('keys'); return; }
      if (!e.ctrlKey) return;
      const k = e.key.toLowerCase();
      const PG = ['dash', 'bilan', 'proj', 'scen', 'goals', 'comptes', 'budgets', 'flux', 'tont', 'cre'];
      if (/^[0-9]$/.test(k) && !e.shiftKey) { e.preventDefault(); setModal(null); setPage(k === '0' ? 'ops' : PG[+k - 1]); return; }
      if (k === 'n') { e.preventDefault(); open('tx'); }
      else if (k === 'j') { e.preventDefault(); open('adjust'); }
      else if (k === 'm') { e.preventDefault(); open('sms', ''); }
      else if (k === 'k') { e.preventDefault(); setModal(null); setPage('ops'); setFocusSearch((x) => x + 1); }
      else if (k === '/' || e.key === '?') { e.preventDefault(); open('keys'); }
      else if (k === 'b' && !e.shiftKey) { e.preventDefault(); open('tx', { kind: 'move' }); }
      else if (k === 'l' && st.settings.pinHash) { e.preventDefault(); setModal(null); setLocked(true); }
    };
    window.addEventListener('keydown', h);
    // Coller un SMS n'importe où (hors champ de saisie) ouvre l'import
    const pst = (e) => {
      if (locked || modal) return; const el = document.activeElement;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT')) return;
      const txt = e.clipboardData?.getData('text') || '';
      if (parseSMS(txt, st.accounts).length) { e.preventDefault(); open('sms', txt); }
    };
    window.addEventListener('paste', pst);
    return () => { window.removeEventListener('keydown', h); window.removeEventListener('paste', pst); };
  }, [locked, st.settings.pinHash, modal, st.accounts]);

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

  // Bilan de la semaine : dimanche soir (ou lundi matin si l'app était fermée)
  const sendWeekly = (force) => {
    if (typeof Notification === 'undefined') return;
    const d = new Date(); let target = null; let at = d;
    if (d.getDay() === 0 && d.getHours() >= 18) target = weekKey(d);
    else if (d.getDay() === 1 && d.getHours() < 12) { at = new Date(d.getTime() - 864e5); at.setHours(23, 59); target = weekKey(at); }
    if (!force && (!target || st.lastWeekly === target)) return;
    const w = weeklySummary(st, force ? d : at);
    const body = [`Dépensé cette semaine : ${fmt(w.spent)} FCFA`, w.bt ? `Reste sur tes budgets du mois : ${fmt(w.budgetLeft)} FCFA` : null, w.next.length ? `7 prochains jours : ${w.next.length} échéance${w.next.length > 1 ? 's' : ''} (−${fmt(w.nextOut)} / +${fmt(w.nextIn)})` : 'Aucune échéance dans les 7 prochains jours'].filter(Boolean).join('\n');
    try { new Notification('Kalis · Bilan de la semaine', { body }); } catch (e) {}
    if (!force) set({ lastWeekly: target });
  };
  useEffect(() => {
    if (st.settings.weekly === false) return;
    const t = setTimeout(() => sendWeekly(false), 5000); const iv = setInterval(() => sendWeekly(false), 1800e3);
    return () => { clearTimeout(t); clearInterval(iv); };
  }, [st.settings.weekly, st.lastWeekly, st.transactions]);

  const exportPDF = async (name) => {
    const prev = document.documentElement.dataset.theme;
    document.documentElement.dataset.theme = 'light'; document.body.classList.add('printing');
    await new Promise((r) => setTimeout(r, 700));
    try { if (native) await native.exportPDF(name); else window.print(); } finally { document.body.classList.remove('printing'); document.documentElement.dataset.theme = prev; }
  };
  const doExcel = () => exportExcel(st, rows);
  const makeReport = async (key, auto = false) => {
    const html = reportHTML(st, key); const name = `Kalis-rapport-${key}.pdf`;
    if (native?.reportPDF) return native.reportPDF(html, name, auto);
    const w = window.open(URL.createObjectURL(new Blob([html], { type: 'text/html' }))); setTimeout(() => { try { w?.print(); } catch (e) {} }, 800); return null;
  };
  // Rapport du mois écoulé : généré automatiquement à partir du 1er
  useEffect(() => {
    if (!native?.reportPDF || st.settings.report === false) return;
    const pk = prevMonth(); if (st.lastReport === pk || !st.transactions.some((t) => t.date.startsWith(pk))) return;
    const t = setTimeout(async () => {
      try {
        const file = await makeReport(pk, true); set({ lastReport: pk });
        if (file && typeof Notification !== 'undefined') { const n = new Notification(`Kalis · Rapport de ${mLabel(pk, true)}`, { body: 'Ton récap PDF du mois est prêt. Clique pour l’ouvrir.' }); n.onclick = () => native.openPath(file); }
      } catch (e) {}
    }, 9000);
    return () => clearTimeout(t);
  }, [st.lastReport, st.settings.report]);

  const ctx = { st, set, bal, rows, upsert, remove, addTx, delTx, updateTx, setDone, undoRef, open, setPage, setSettings, setToast, sendWeekly, exportPDF, doExcel, makeReport, focusSearch, version, update, checkUpdate, lastBackup, lock: () => setLocked(true) };

  const collapsed = !!st.settings.sideCollapsed;
  const msSide = monthStats(st, mkey(new Date()));
  const badges = useMemo(() => {
    const t = todayISO(); const cur = mkey(new Date());
    const due = upcoming(st).filter((o) => o.date <= t).length;
    const over = CATS_VIE.filter((c) => +st.budgets[c] > 0 && spentCat(st, cur, c) > +st.budgets[c]).length;
    const late = st.creances.flatMap((c) => creanceOccs(c)).filter((o) => !st.done[o.ref] && o.date < t).length;
    const neg = st.accounts.filter((a) => (bal.accounts[a.id] || 0) < 0).length;
    return { dash: due ? [due, 'warn'] : null, budgets: over ? [over, 'r'] : null, cre: late ? [late, 'warn'] : null, comptes: neg ? [neg, 'r'] : null };
  }, [st, bal]);
  const NAV = [
    ['Pilotage', [['dash', "Vue d'ensemble", LayoutGrid], ['bilan', 'Bilan mensuel', BarChart3], ['proj', 'Projection', LineIc], ['scen', 'Scénarios', FlaskConical], ['goals', 'Objectifs', Target]]],
    ['Données', [['comptes', 'Comptes', Smartphone], ['budgets', 'Budgets', Gauge], ['flux', 'Flux récurrents', Repeat], ['tont', 'Tontines', Users], ['cre', 'Créances & dettes', HandCoins], ['ops', 'Opérations', List]]],
  ];
  const PAGES = { dash: Dashboard, bilan: Bilan, proj: Projection, scen: Scenarios, goals: Goals, comptes: Comptes, budgets: Budgets, flux: Flux, tont: Tontines, cre: Creances, ops: Operations, set: Params };
  const Page = PAGES[page];

  if (locked && st.settings.pinHash) return <ThemeCtx.Provider value={PAL[eff]}><LockScreen hash={st.settings.pinHash} onUnlock={() => setLocked(false)} /></ThemeCtx.Provider>;

  return (
    <ThemeCtx.Provider value={PAL[eff]}>
    <div className={'app' + (collapsed ? ' collapsed' : '')}>
      <aside className="side">
        <div className="brand"><img className="brand-logo" src={logoUrl} alt="" /><div className="brand-name">Kalis<span className="brand-v">v2</span></div>
          <button className="ib side-tog" title={collapsed ? 'Déplier le menu' : 'Replier le menu'} onClick={() => setSettings({ sideCollapsed: !collapsed })}>{collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}</button></div>
        <button className="side-search" title="Rechercher (Ctrl+K)" onClick={() => { setModal(null); setPage('ops'); setFocusSearch((x) => x + 1); }}><Search size={15} /><span className="nl">Rechercher…</span><kbd className="nl">Ctrl K</kbd></button>
        {NAV.map(([sec, items]) => (
          <React.Fragment key={sec || 'x'}>
            {sec ? <div className="nav-sec">{sec}</div> : <div className="nav-gap" />}
            {items.map(([k, l, I]) => <button key={k} title={l} className={'nav' + (page === k ? ' on' : '')} onClick={() => setPage(k)}><I size={17} strokeWidth={1.8} /><span className="nl">{l}</span>{badges[k] ? <span className={'nav-badge ' + (badges[k][1] || '')}>{badges[k][0]}</span> : null}</button>)}
          </React.Fragment>
        ))}
        <div className="side-foot">
          <div className="sf-top"><span className="k">Patrimoine</span><span className={'sf-d ' + (msSide.solde >= 0 ? 'pos' : 'neg')}>{msSide.solde >= 0 ? '+' : '−'}{short(Math.abs(msSide.solde))} ce mois</span></div>
          <div className="v num">{fcfa(bal.total)}</div>
          <div className="sf-accs">{st.accounts.filter((x) => (bal.accounts[x.id] || 0) > 0).map((x) => <i key={x.id} title={`${x.nom} · ${fmt(bal.accounts[x.id])}`} style={{ flex: bal.accounts[x.id] || 0, background: x.couleur }} />)}</div>
        </div>
        <div className="side-user">
          <div className="avatar">PM</div>
          <div className="su-t nl"><b>Paul Aurlin</b><span>Kalis {version || '2.0'}</span></div>
          <div className="su-act">
            <button className="ib" title={`Thème : ${mode === 'light' ? 'clair' : mode === 'dark' ? 'sombre' : 'automatique'} (changer)`} onClick={() => set({ theme: mode === 'light' ? 'dark' : mode === 'dark' ? 'system' : 'light' })}>{mode === 'light' ? <Sun size={15} /> : mode === 'dark' ? <Moon size={15} /> : <Monitor size={15} />}</button>
            {st.settings.pinHash && <button className="ib" title="Verrouiller (Ctrl+L)" onClick={() => setLocked(true)}><Lock size={15} /></button>}
            <button className={'ib' + (page === 'set' ? ' on' : '')} title="Paramètres" onClick={() => setPage('set')}><Settings size={15} /></button>
          </div>
        </div>
      </aside>
      <main className="main">
        {update && <div className="update-bar"><Sparkles size={16} /><span>Kalis <b>{update.version}</b> est prête à être installée.</span><button className="btn p sm" onClick={() => native.relaunch()}><RefreshCw size={13} />Redémarrer maintenant</button><button className="ib" onClick={() => setUpdate(null)}><X size={15} /></button></div>}
        <Page {...ctx} />
        {toast && <div className="toast"><CheckCheck size={16} /><span>{toast.msg}</span>{toast.prev && <button onClick={() => { setSt(toast.prev); setToast(null); }}>Annuler</button>}<button className="x" onClick={() => setToast(null)}><X size={14} /></button></div>}
      </main>

      {modal?.type === 'confirm' && <ConfirmModal occ={modal.data} st={st} onClose={close} onOk={(m, d, skip, accountId, opt = {}) => {
        const o = modal.data;
        if (skip) setDone(o.ref, true);
        else if (opt.partial) { addTx({ date: d, label: `${o.label} (partiel)`, kind: o.kind, cat: o.cat, montant: m, goalId: o.goalId, accountId, partOf: o.ref }); setToast({ msg: `Paiement partiel : il reste ${fmt(o.amount - m)} FCFA`, prev: st }); }
        else addTx({ date: d, label: o.label, kind: o.kind, cat: o.cat, montant: m, goalId: o.goalId, accountId }, o.ref);
        if (opt.updateItem && o.src) upsert('items', { ...o.src, montant: m });
        close(); }} />}
      {modal?.type === 'tx' && <TxModal init={modal.data} st={st} bal={bal} goals={st.goals.filter(isGoalActive)} onClose={close} onFav={(f) => set({ favoris: f })} onOk={(list, fav) => { if (modal.data?.editId) updateTx(modal.data.editId, list[0]); else { addMany(list); if (fav) set({ favoris: [...st.favoris, fav] }); } close(); }} />}
      {modal?.type === 'bulk' && <BulkModal list={modal.data} st={st} onClose={close} onOk={(sel) => { const prev = st; sel.forEach((o) => { const part = o.kind !== 'save' && o.amount < o.due; const tx = { date: o.date, label: part ? `${o.label} (partiel)` : o.label, kind: o.kind, cat: o.cat, montant: o.amount, goalId: o.goalId, accountId: o.kind === 'save' ? undefined : o.accountId }; if (part) addTx({ ...tx, partOf: o.ref }); else addTx(tx, o.ref); }); setToast({ msg: `${sel.length} échéance${sel.length > 1 ? 's' : ''} validée${sel.length > 1 ? 's' : ''}`, prev }); close(); }} />}
      {modal?.type === 'goalDone' && <GoalDoneModal g={modal.data} st={st} bal={bal} onClose={close} onOk={({ spend, montant, accountId, cat, label, release }) => {
        const g = modal.data; const today = todayISO(); const prev = st;
        if (spend && montant > 0) { addTx({ date: today, label, kind: 'withdraw', cat: 'epargne', montant, goalId: g.id }); addTx({ date: today, label, kind: 'out', cat, montant, accountId }); }
        if (release > 0) addTx({ date: today, label: `Libération · ${g.nom}`, kind: 'withdraw', cat: 'epargne', montant: release, goalId: g.id });
        setSt((s) => ({ ...s, goals: s.goals.map((x) => (x.id === g.id ? { ...x, status: g.archive ? 'archive' : 'atteint', doneDate: today } : x)) }));
        setToast({ msg: g.archive ? `${g.nom} archivé` : `Bravo, objectif ${g.nom} atteint !`, prev }); close();
      }} />}
      {modal?.type === 'plan' && <PlanModal g={modal.data} st={st} bal={bal} onClose={close} onOk={(item, replace) => { setSt((s) => ({ ...s, items: (replace ? s.items.filter((i) => !(i.kind === 'save' && i.goalId === item.goalId)) : s.items).concat(item) })); setToast({ msg: `Épargne programmée : ${fmt(item.montant)} FCFA / mois`, prev: st }); close(); }} />}
      {modal?.type === 'cat' && <CatModal onClose={close} onOk={(c) => { set({ customCats: [...(st.customCats || []), c] }); close(); }} />}
      {modal?.type === 'goalHist' && <GoalHistoryModal g={modal.data} st={st} bal={bal} onClose={close} />}
      {modal?.type === 'account' && <AccountModal a={modal.data} st={st} onClose={close} onOk={(a) => { upsert('accounts', a); close(); }} onDelete={(id) => { remove('accounts', id); close(); }} />}
      {modal?.type === 'pin' && <PinModal onClose={close} onOk={async (p) => { setSettings({ pinHash: await sha('kalis:' + p) }); close(); }} />}
      {modal?.type === 'item' && <ItemModal item={modal.data} goals={st.goals} st={st} onClose={close} onOk={(it) => { upsert('items', it); close(); }} />}
      {modal?.type === 'goal' && <GoalModal goal={modal.data} onClose={close} onOk={(g) => { upsert('goals', g); close(); }} />}
      {modal?.type === 'tontine' && <TontineModal t={modal.data} goals={st.goals} onClose={close} onOk={(t) => { upsert('tontines', t); close(); }} />}
      {modal?.type === 'adjust' && <AdjustModal init={modal.data} st={st} bal={bal} onClose={close} onOk={(list) => { const prev = st; addMany(list); setToast({ msg: list.length ? `${list.length} solde${list.length > 1 ? 's' : ''} ajusté${list.length > 1 ? 's' : ''}` : 'Soldes déjà justes', prev }); close(); }} />}
      {modal?.type === 'sms' && <SmsModal text={modal.data} st={st} bal={bal} onClose={close} onOk={(list) => { const prev = st; addMany(list); setToast({ msg: `${list.filter((t) => t.cat !== 'frais' && t.cat !== 'ajust').length} opération(s) importée(s) depuis les SMS`, prev }); close(); }} />}
      {modal?.type === 'relance' && <RelanceModal c={modal.data} st={st} onClose={close} onSent={(tel) => { upsert('creances', { ...modal.data, tel: tel || modal.data.tel, lastRelance: todayISO() }); close(); }} />}
      {modal?.type === 'tri' && <TriModal st={st} updateTx={updateTx} onClose={close} />}
      {modal?.type === 'keys' && <KeysModal onClose={close} />}
      {modal?.type === 'habits' && <HabitsModal st={st} onClose={close} onOk={(habits, applyB) => { const prev = st; setSt((s) => { const ns = { ...s, settings: { ...s.settings, habits } }; if (applyB) { const nb = { ...s.budgets }; for (const [c, v] of Object.entries(applyB)) nb[c] = v; ns.budgets = nb; } return ns; }); setToast({ msg: applyB ? 'Habitudes enregistrées · budgets ajustés' : 'Habitudes enregistrées', prev }); close(); }} />}
      {modal?.type === 'creance' && <CreanceModal c={modal.data} st={st} onClose={close} onOk={(c, mv) => { saveCreance(c, mv); close(); }} />}
    </div>
    </ThemeCtx.Provider>
  );
}

// ================= Shared UI =================
// Liste déroulante maison : même API qu'un <select> (value, onChange(e) avec e.target.value, <option>)
const selOpts = (children) => {
  const out = [];
  const walk = (ch) => React.Children.forEach(ch, (c) => {
    if (!c || typeof c !== 'object') return;
    if (c.type === React.Fragment || c.type === 'optgroup') walk(c.props.children);
    else if (c.type === 'option') { const label = React.Children.toArray(c.props.children).join(''); out.push({ value: String(c.props.value ?? label), label, disabled: !!c.props.disabled }); }
  });
  walk(children); return out;
};
function Sel({ value, onChange, children, className = '', style, disabled, title }) {
  const opts = selOpts(children);
  const ref = React.useRef(null); const listRef = React.useRef(null); const typed = React.useRef({ s: '', t: 0 });
  const [open, setOpen] = useState(false); const [hi, setHi] = useState(0); const [pos, setPos] = useState(null);
  const curI = Math.max(0, opts.findIndex((o) => o.value === String(value ?? '')));
  const cur = opts[curI];
  const place = () => {
    const r = ref.current.getBoundingClientRect(); const h = Math.min(320, opts.length * 36 + 10);
    const below = window.innerHeight - r.bottom > h + 10 || r.top < h + 10;
    const w = Math.max(r.width, 190); const left = Math.min(r.left, window.innerWidth - w - 8);
    setPos({ left, width: w, top: below ? r.bottom + 6 : r.top - h - 6, maxHeight: h });
  };
  const openIt = () => { if (disabled || !opts.length) return; place(); setHi(curI); setOpen(true); };
  const pick = (o) => { if (!o || o.disabled) return; setOpen(false); if (o.value !== String(value ?? '')) onChange?.({ target: { value: o.value } }); ref.current?.focus(); };
  useEffect(() => {
    if (!open) return;
    const down = (e) => { if (!ref.current?.contains(e.target) && !listRef.current?.contains(e.target)) setOpen(false); };
    const sc = (e) => { if (!listRef.current?.contains(e.target)) setOpen(false); };
    window.addEventListener('mousedown', down); window.addEventListener('resize', sc); window.addEventListener('scroll', sc, true);
    return () => { window.removeEventListener('mousedown', down); window.removeEventListener('resize', sc); window.removeEventListener('scroll', sc, true); };
  }, [open]);
  useEffect(() => { if (open) listRef.current?.querySelector('.sel-o.hi')?.scrollIntoView({ block: 'nearest' }); }, [open, hi]);
  const key = (e) => {
    const k = e.key;
    if (k === 'Escape') { if (open) { e.stopPropagation(); e.preventDefault(); setOpen(false); } return; }
    if (k === 'Tab') { setOpen(false); return; }
    if (k === 'ArrowDown' || k === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); if (!open) return openIt(); let i = hi; do { i = (i + (k === 'ArrowDown' ? 1 : -1) + opts.length) % opts.length; } while (opts[i].disabled && i !== hi); setHi(i); return; }
    if (k === 'Enter' || k === ' ') { e.preventDefault(); e.stopPropagation(); if (open) pick(opts[hi]); else openIt(); return; }
    if (k.length === 1 && /\S/.test(k)) {
      const t = Date.now(); typed.current = { s: (t - typed.current.t < 700 ? typed.current.s : '') + k.toLowerCase(), t };
      const nrm = (x) => x.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      const i = opts.findIndex((o) => nrm(o.label).startsWith(nrm(typed.current.s)));
      if (i >= 0) { if (open) setHi(i); else pick(opts[i]); }
    }
  };
  return (
    <>
      <button type="button" ref={ref} className={'sel ' + className + (open ? ' open' : '')} style={style} disabled={disabled} title={title} aria-haspopup="listbox" aria-expanded={open} onClick={() => (open ? setOpen(false) : openIt())} onKeyDown={key}>
        <span className="sel-v">{cur?.label ?? ''}</span><ChevronDown size={14} className="sel-chev" />
      </button>
      {open && pos && createPortal(
        <div className="sel-pop" ref={listRef} role="listbox" style={{ left: pos.left, top: pos.top, minWidth: pos.width, maxHeight: pos.maxHeight }}>
          {opts.map((o, i) => (
            <div key={o.value + i} role="option" aria-selected={i === curI} className={'sel-o' + (i === hi ? ' hi' : '') + (i === curI ? ' on' : '') + (o.disabled ? ' dis' : '')} onMouseEnter={() => setHi(i)} onMouseDown={(e) => e.preventDefault()} onClick={() => pick(o)}>
              <span>{o.label}</span>{i === curI && <Check size={14} />}
            </div>))}
        </div>, document.body)}
    </>
  );
}

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
  light: { grid: '#EEF0F6', axis: '#9AA3B5', zero: '#E1E4EE', cursor: '#C7CBE0', track: '#EEF0F6', track2: '#CDD1E0', primary: '#4F46E5', sky: '#0EA5E9' },
  dark: { grid: '#1E2536', axis: '#6B7489', zero: '#2A3245', cursor: '#3A4359', track: '#232A3B', track2: '#3A4359', primary: '#818CF8', sky: '#38BDF8' },
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
        <div className="t">{o.label}{o.kind === 'save' && o.goalId && <span className="badge p">{gname(st, o.goalId)}</span>}{o.late && <span className="badge warn">En attente</span>}{o.paid ? <span className="badge">Reste {fmt(o.amount)} / {fmt(o.total)}</span> : null}</div>
        <div className="s">{o.kind === 'in' ? 'Entrée' : o.kind === 'save' ? 'Épargne' : 'Sortie'} · {CATS[o.cat] || ''}{o.variable && ` · ${short(o.min)}–${short(o.max)}`}</div>
      </div>
      <div className={'a ' + tone(o.kind)}>{sign(o.kind)} {fmt(o.amount)}</div>
      <button className="chk" title="Valider" onClick={() => open('confirm', o)}><Check size={15} /></button>
    </div>
  );
}

// ================= DASHBOARD =================
const REP_COLORS = ['#4F46E5', '#0EA5E9', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#64748B', '#14B8A6'];
function HeroChart({ rows }) {
  const data = rows.map((r) => ({ label: r.label, long: mLabel(r.key, true), v: Math.round(r.dispo) }));
  return (
    <div className="hero-chart">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs><linearGradient id="hg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fff" stopOpacity={0.35} /><stop offset="100%" stopColor="#fff" stopOpacity={0} /></linearGradient></defs>
          <Tooltip cursor={{ stroke: 'rgba(255,255,255,.4)' }} content={({ active, payload }) => active && payload?.length ? <div className="tip"><div className="tt">{payload[0].payload.long}</div><div className="r"><span>Solde prévu</span><b>{fmt(payload[0].value)}</b></div></div> : null} />
          <Area type="monotone" dataKey="v" stroke="rgba(255,255,255,.9)" strokeWidth={2} fill="url(#hg)" dot={false} animationDuration={500} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

const isoD = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const addD = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const monday = (d) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
const PER_L = { j: ["Aujourd'hui", 'hier', 'par jour'], s: ['Cette semaine', 'la semaine dernière à date', 'par semaine'], m: ['Ce mois', 'le mois dernier à date', 'par mois'] };

function Dashboard({ st, bal, rows, open, setPage, addTx, setSettings, setToast, upsert }) {
  const c = useC();
  const now = new Date(); const today = todayISO();
  const up = upcoming(st);
  const cur = mkey(now);
  const bt = budgetTotal(st);
  const goalsA = st.goals.filter(isGoalActive);
  const dash = st.settings.dash || {};
  const [per, setPer0] = useState(dash.per || 'm');
  const [acc, setAcc] = useState('all');
  const [cat, setCat] = useState('all');
  const setPer = (p) => { setPer0(p); setSettings({ dash: { ...dash, per: p } }); };
  const steps = [
    { t: 'Comptes', s: `${fcfa(bal.comptes)} sur tes comptes`, done: true, a: ['Gérer', () => setPage('comptes')] },
    { t: 'Revenus et charges', s: 'Salaires, loyer, factures, abonnements…', done: st.items.length > 0, a: ['Ajouter un flux', () => open('item')] },
    { t: 'Budgets', s: 'Plafonds par catégorie : alimentation, transport…', done: bt > 0, a: ['Définir', () => setPage('budgets')] },
    { t: 'Objectifs', s: 'Ce pour quoi tu épargnes', done: st.goals.length > 0, a: ['Créer un objectif', () => open('goal')] },
  ];
  const onboarding = steps.some((s) => !s.done);

  // ---------- Dépenses filtrées (compte, catégorie) ----------
  const accOf = (t) => t.accountId || st.accounts[0]?.id;
  const outs = st.transactions.filter((t) => t.kind === 'out' && CATS_VIE.includes(t.cat) && (acc === 'all' || accOf(t) === acc));
  const outsC = outs.filter((t) => cat === 'all' || t.cat === cat);
  const sumR = (a, b, list = outsC) => list.filter((t) => t.date >= a && t.date <= b).reduce((s, t) => s + t.montant, 0);
  const budBase = cat === 'all' ? bt : +st.budgets[cat] || 0;
  const perDayB = budBase / daysIn(cur);

  let bars = [], ref = 0, curA, curB, prevA, prevB, daysLeftP = 1;
  if (per === 'j') {
    bars = Array.from({ length: 14 }, (_, i) => { const d = addD(now, i - 13); const k = isoD(d); return { na: k < (st.dateInitiale || ''), l: `${d.getDate()}/${d.getMonth() + 1}`, long: d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }), v: sumR(k, k), cur: i === 13 }; });
    ref = perDayB; curA = curB = today; prevA = prevB = isoD(addD(now, -1));
  } else if (per === 's') {
    const m0 = monday(now); const el = Math.round((now - m0) / 864e5);
    bars = Array.from({ length: 8 }, (_, i) => { const a = addD(m0, (i - 7) * 7); const b = addD(a, 6); return { na: isoD(b) < (st.dateInitiale || ''), l: `${a.getDate()}/${a.getMonth() + 1}`, long: `Semaine du ${a.getDate()} au ${b.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`, v: sumR(isoD(a), isoD(b)), cur: i === 7 }; });
    ref = perDayB * 7; curA = isoD(m0); curB = today; prevA = isoD(addD(m0, -7)); prevB = isoD(addD(m0, el - 7)); daysLeftP = 7 - el;
  } else {
    bars = Array.from({ length: 6 }, (_, i) => { const k = addMonths(cur, i - 5); return { l: mLabel(k), long: mLabel(k, true), v: sumR(`${k}-01`, `${k}-31`), cur: i === 5, na: k < (st.dateInitiale || '').slice(0, 7) }; }).filter((b) => !b.na);
    ref = budBase; curA = `${cur}-01`; curB = today; const pk = addMonths(cur, -1); prevA = `${pk}-01`; prevB = `${pk}-${String(Math.min(now.getDate(), daysIn(pk))).padStart(2, '0')}`; daysLeftP = daysIn(cur) - now.getDate() + 1;
  }
  const vCur = sumR(curA, curB); const vPrev = sumR(prevA, prevB);
  const delta = vPrev > 0 ? Math.round(((vCur - vPrev) / vPrev) * 100) : null;
  const past = bars.filter((b) => !b.cur && !b.na); const avg = past.length ? past.reduce((s, b) => s + b.v, 0) / past.length : 0;
  const reste = ref - vCur;
  const perDayLeft = per === 'j' ? Math.max(0, reste) : Math.max(0, reste) / Math.max(1, daysLeftP);
  const catRows = CATS_VIE.map((k) => ({ k, a: sumR(curA, curB, outs.filter((t) => t.cat === k)), b: sumR(prevA, prevB, outs.filter((t) => t.cat === k)), bud: (+st.budgets[k] || 0) * (per === 'm' ? 1 : per === 's' ? 7 / daysIn(cur) : 1 / daysIn(cur)) }))
    .filter((r) => r.a || r.b).sort((x, y) => y.a - x.a);

  // ---------- À surveiller ----------
  const due = up.filter((o) => o.date <= today);
  const alerts = [];
  const neg = rows.find((r) => r.dispo < 0);
  if (neg) alerts.push({ tone: 'r', icon: AlertTriangle, text: <>Solde négatif en <b>{mLabel(neg.key, true)}</b> ({fmt(neg.dispo)})</>, act: ['Voir', () => setPage('proj')] });
  const lateN = due.filter((o) => o.late).length;
  if (lateN) alerts.push({ tone: 'o', icon: Clock, text: <><b>{lateN}</b> échéance{lateN > 1 ? 's' : ''} en retard</>, act: ['Valider', () => open('bulk', due)] });
  for (const k of CATS_VIE.filter((k) => +st.budgets[k] > 0 && spentCat(st, cur, k) > +st.budgets[k])) alerts.push({ tone: 'r', icon: Gauge, text: <><b>{CATS[k]}</b> dépassé de {fmt(spentCat(st, cur, k) - st.budgets[k])}</>, act: ['Voir', () => setPage('budgets')] });
  for (const a of st.accounts.filter((a) => (bal.accounts[a.id] || 0) < 0)) alerts.push({ tone: 'r', icon: Smartphone, text: <><b>{a.nom}</b> négatif ({fmt(bal.accounts[a.id])})</>, act: ['Corriger', () => open('adjust', { accountId: a.id })] });
  const nVie = st.transactions.filter((t) => t.kind === 'out' && t.cat === 'vie' && t.date.startsWith(cur)).length;
  if (nVie >= 3) alerts.push({ tone: 'p', icon: ListChecks, text: <><b>{nVie}</b> dépenses à trier</>, act: ['Trier', () => open('tri')] });
  for (const g of goalsA) { const r = goalReach(rows, g); if (!r || monthDiff(g.echeance, r.key) > 0) alerts.push({ tone: 'o', icon: Target, text: <><b>{g.nom}</b> en retard</>, act: ['Planifier', () => open('plan', g)] }); }
  for (const g of goalsA.filter((g) => (bal.goals[g.id] || 0) >= g.montant)) alerts.push({ tone: 'g', icon: Trophy, text: <><b>{g.nom}</b> atteint</>, act: ['Clôturer', () => open('goalDone', g)] });
  for (const sg of amountSuggestions(st)) alerts.push({ tone: 'p', icon: RefreshCw, text: <><b>{sg.item.label}</b> : réel {fmt(sg.avg)}</>, act: ['Ajuster', () => { upsert('items', { ...sg.item, montant: sg.avg }); setToast({ msg: `${sg.item.label} : ${fmt(sg.avg)} FCFA à partir de maintenant`, prev: st }); }] });
  if (st.migratedV3) alerts.push({ tone: 'p', icon: Smartphone, text: <>Répartis ton solde entre tes comptes</>, act: ['Répartir', () => setPage('comptes')] });

  const in7 = isoD(addD(now, 7));
  const groupsE = [['En retard', up.filter((o) => o.late), 'warn'], ['Cette semaine', up.filter((o) => !o.late && o.date <= in7), 'p'], ['Plus tard', up.filter((o) => !o.late && o.date > in7), '']].filter((g) => g[1].length);
  const sumNet = (l) => l.reduce((s, o) => s + (o.kind === 'in' ? o.amount : -o.amount), 0);
  const ms = monthStats(st, cur);
  const hr = now.getHours();
  const accSel = acc === 'all' ? null : st.accounts.find((a) => a.id === acc);
  const dispoV = accSel ? bal.accounts[acc] || 0 : bal.dispo;
  const over = ref > 0 && vCur > ref;
  const L = PER_L[per];
  const QA = [
    [Plus, 'Dépense', 'Ctrl+N', () => open('tx'), 'p'],
    [ArrowLeftRight, 'Virement', 'Ctrl+B', () => open('tx', { kind: 'move' }), 's'],
    [ClipboardPaste, 'Coller un SMS', 'Ctrl+M', () => open('sms', ''), 'g'],
    [Scale, 'Ajuster soldes', 'Ctrl+J', () => open('adjust'), 'o'],
  ];

  return (
    <>
      <Top title={`${hr >= 5 && hr < 18 ? 'Bonjour' : 'Bonsoir'} Paul`} sub={now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).replace(/^./, (x) => x.toUpperCase())}>
        <div className="seg dash-per">{[['j', "Aujourd'hui"], ['s', 'Semaine'], ['m', 'Mois']].map(([k, l]) => <button key={k} className={per === k ? 'on' : ''} onClick={() => setPer(k)}>{l}</button>)}</div>
        <label className="dsel"><Smartphone size={14} /><Sel value={acc} onChange={(e) => setAcc(e.target.value)}><option value="all">Tous les comptes</option>{st.accounts.map((a) => <option key={a.id} value={a.id}>{a.nom}</option>)}</Sel><ChevronDown size={13} /></label>
        <label className="dsel"><Tag size={14} /><Sel value={cat} onChange={(e) => setCat(e.target.value)}><option value="all">Toutes catégories</option>{CATS_VIE.map((k) => <option key={k} value={k}>{CATS[k]}</option>)}</Sel><ChevronDown size={13} /></label>
      </Top>
      <div className="content dash dashB">
        {onboarding && (
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-h"><div><h3>Configuration de ton espace</h3><div className="sub">Renseigne tes données pour activer la projection</div></div><span className="badge p">{steps.filter((s) => s.done).length} / 4</span></div>
            <div className="steps">{steps.map((s, i) => (
              <div key={s.t} className={'step' + (s.done ? ' done' : '')}>
                <div className="n">{s.done ? <Check size={13} /> : i + 1}</div><div className="t">{s.t}</div><div className="s">{s.s}</div>
                <button className={'btn sm ' + (s.done ? 's' : 'p')} onClick={s.a[1]}>{s.done && i > 0 ? 'Compléter' : s.a[0]}</button>
              </div>))}
            </div>
          </div>)}

        <div className="dB-layout">
          <div className="dB-main">
            {/* ---- KPI ---- */}
            <div className="dB-kpis">
              <div className="dk dk-hero">
                <div className="dk-top"><span>{accSel ? `Solde · ${accSel.nom}` : 'Solde disponible'}</span><span className={'hero-pill ' + (ms.solde >= 0 ? 'up' : 'down')}>{ms.solde >= 0 ? '+' : '−'}{fmt(Math.abs(ms.solde))} ce mois</span></div>
                <div className="dk-v num">{fmt(dispoV)}<small>FCFA</small></div>
                <div className="dk-accs">{st.accounts.map((a) => <button key={a.id} className={acc === a.id ? 'on' : ''} title={a.nom} onClick={() => setAcc(acc === a.id ? 'all' : a.id)}><i style={{ background: a.couleur }} />{short(bal.accounts[a.id] || 0)}</button>)}</div>
                <svg className="dk-wave" viewBox="0 0 200 60" preserveAspectRatio="none"><path d="M0 45 C40 30 60 52 100 34 S160 18 200 26 L200 60 L0 60 Z" /></svg>
              </div>
              <div className={'dk dk-spent' + (over ? ' over' : '')}>
                <div className="dk-top"><span className="dk-ic"><ArrowUpRight size={15} /></span><span>Dépensé <em className="dk-p">{per === 'j' ? 'auj.' : per === 's' ? 'semaine' : 'mois'}</em></span>{delta != null && <span className={'dk-delta ' + (delta > 0 ? 'up' : 'dn')} title={`vs ${L[1]} (${fmt(vPrev)})`}>{delta > 0 ? '↑' : '↓'} {Math.abs(delta)} %</span>}</div>
                <div className="dk-v num">{fmt(vCur)}<small>FCFA</small></div>
                <div className="dk-bar"><i style={{ width: ref ? Math.min(100, (vCur / ref) * 100) + '%' : 0 }} /></div>
                <div className="dk-f">{ref ? <>{Math.round((vCur / ref) * 100)} % de <b className="num">{fmt(ref)}</b> {per === 'm' ? 'de budget' : per === 's' ? 'de budget semaine' : 'de budget jour'}</> : 'Aucun budget défini'}</div>
                {bars.length >= 4 && <div className="dk-spark">{bars.slice(-8).map((b, i) => <i key={i} className={b.cur ? 'cur' : ''} style={{ height: Math.max(6, (b.v / Math.max(1, ...bars.slice(-8).map((x) => x.v))) * 100) + '%' }} />)}</div>}
              </div>
              <div className={'dk dk-left' + (reste < 0 ? ' over' : '')}>
                <div className="dk-top"><span className="dk-ic"><Wallet size={15} /></span><span>Reste <em className="dk-p">{per === 'j' ? 'auj.' : per === 's' ? 'semaine' : 'mois'}</em></span></div>
                <div className={'dk-v num' + (reste < 0 ? ' neg' : '')}>{reste < 0 ? '−' : ''}{fmt(Math.abs(reste))}<small>FCFA</small></div>
                <div className="dk-f">{reste < 0 ? `Budget dépassé de ${fmt(-reste)}` : per === 'j' ? 'encore possible aujourd’hui' : <>soit <b className="num">{fmt(perDayLeft)}</b> par jour ({daysLeftP} j)</>}</div>
                <div className="dk-ring"><Ring pct={ref ? Math.min(1, Math.max(0, reste) / ref) : 0} color={reste < 0 ? 'var(--neg)' : 'var(--pos)'} size={54} stroke={6} label={ref ? `${Math.max(0, Math.round((reste / ref) * 100))}%` : '—'} /></div>
              </div>
            </div>

            {/* ---- Comparateur ---- */}
            <div className="card cmpB">
              <div className="card-h"><div><h3>Comparateur de dépenses</h3><div className="sub">Dépenses courantes {L[2]}{cat !== 'all' ? ` · ${CATS[cat]}` : ''}{accSel ? ` · ${accSel.nom}` : ''}</div></div>
                <div className="seg">{[['j', 'Jour'], ['s', 'Semaine'], ['m', 'Mois']].map(([k, l]) => <button key={k} className={per === k ? 'on' : ''} onClick={() => setPer(k)}>{l}</button>)}</div></div>
              <div className="cmp-sum">
                <div><span>{L[0]}</span><b className="num">{fmt(vCur)}</b></div>
                <div><span>Écart au budget</span><b className={'num ' + (ref && vCur > ref ? 'neg' : 'pos')}>{ref ? `${vCur > ref ? '+' : '−'}${fmt(Math.abs(vCur - ref))}` : '—'}</b></div>
                <div><span>vs {L[1]}</span><b className={'num ' + (delta > 0 ? 'neg' : 'pos')}>{delta == null ? '—' : `${delta > 0 ? '+' : ''}${delta} %`}</b><em className="num">{fmt(vPrev)}</em></div>
                <div><span>Moyenne {per === 'j' ? 'des jours' : per === 's' ? 'des semaines' : 'des mois'} passés</span><b className="num">{past.length ? fmt(avg) : '—'}</b>{!past.length && <em>pas encore d'historique</em>}</div>
              </div>
              <div style={{ height: 230 }}>
                <ResponsiveContainer>
                  <BarChart data={bars} margin={{ top: 18, right: 72, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke={c.grid} />
                    <XAxis dataKey="l" {...axisOf(c)} interval={0} tick={{ fill: c.axis, fontSize: 11.5 }} />
                    <YAxis {...axisOf(c)} width={44} tickFormatter={(v) => short(v)} />
                    <Tooltip content={<Tip />} cursor={{ fill: c.grid }} />
                    {ref > 0 && <ReferenceLine y={ref} stroke="var(--ink)" strokeDasharray="5 4" label={{ value: `Budget ${short(ref)}`, position: 'right', fill: 'var(--ink2)', fontSize: 11.5 }} />}
                    {avg > 0 && <ReferenceLine y={avg} stroke={c.primary} strokeOpacity={0.45} label={{ value: `Moy. ${short(avg)}`, position: 'right', fill: c.primary, fontSize: 11.5 }} />}
                    <Bar dataKey="v" name="Dépensé" radius={[6, 6, 0, 0]} maxBarSize={46}>
                      {bars.map((b, i) => <Cell key={i} fill={b.cur ? c.primary : b.na ? c.track : ref && b.v > ref ? 'var(--neg-soft2)' : c.track2 || '#CDD1E0'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {catRows.length > 0 && <div className="cmp-cats">
                <div className="cc-h"><span>Catégorie</span><span>{L[0]}</span><span>{per === 'j' ? 'Hier' : per === 's' ? 'Sem. dern.' : 'Mois dern.'}</span><span>Écart</span></div>
                {catRows.slice(0, 6).map((r) => { const d = r.a - r.b; return (
                  <button className="cc-r" key={r.k} onClick={() => setCat(cat === r.k ? 'all' : r.k)} title="Filtrer sur cette catégorie">
                    <span className="cc-n"><span className="bud-ic">{React.createElement(catIcon(r.k), { size: 13 })}</span>{CATS[r.k]}</span>
                    <span className="num"><b>{fmt(r.a)}</b>{r.bud > 0 && <i className="cc-bar"><em style={{ width: Math.min(100, (r.a / r.bud) * 100) + '%', background: r.a > r.bud ? 'var(--neg)' : 'var(--primary)' }} /></i>}</span>
                    <span className="num muted">{fmt(r.b)}</span>
                    <span className={'num ' + (d > 0 ? 'neg' : d < 0 ? 'pos' : 'muted')}>{d === 0 ? '=' : `${d > 0 ? '+' : '−'}${fmt(Math.abs(d))}`}</span>
                  </button>); })}
              </div>}
            </div>

            {/* ---- Échéances ---- */}
            <Card title="Échéances" sub="Valide chaque mouvement quand il a lieu" flush className="mt" action={due.length > 0 ? <button className="btn p sm" onClick={() => open('bulk', due)}><CheckCheck size={14} />Valider les échues ({due.length})</button> : <button className="btn s sm" onClick={() => setPage('flux')}>Flux</button>}>
              {groupsE.length ? groupsE.map(([title, list, tn]) => (
                <div key={title}>
                  <div className={'grp-h ' + tn}><span>{title}</span><span className="num">{list.length} · {sumNet(list) >= 0 ? '+' : '−'}{fmt(Math.abs(sumNet(list)))}</span></div>
                  {list.slice(0, title === 'Plus tard' ? 4 : 8).map((o) => <OccRow key={o.ref} o={o} st={st} open={open} />)}
                </div>)) : <Empty icon={CalendarDays} title="Aucune échéance" text="Les flux, tontines et créances que tu ajoutes apparaîtront ici." />}
            </Card>

            <Card title="Trajectoire" sub={`Jusqu'en ${mLabel(rows[rows.length - 1].key, true)}`} className="mt" action={<div className="legend"><span><i style={{ background: 'var(--primary)' }} />Disponible</span><span><i style={{ background: 'var(--sky)' }} />Épargne</span></div>}>
              <TrendChart rows={rows} h={230} />
            </Card>
          </div>

          {/* ---- Colonne de droite ---- */}
          <div className="dB-rail">
            <div className="card rail-card">
              <div className="rc-h"><h3>Actions rapides</h3><button className="ib" title="Raccourcis (F1)" onClick={() => open('keys')}><Keyboard size={15} /></button></div>
              <div className="qaB">{QA.map(([I, l, k, fn, tn]) => <button key={l} onClick={fn}><span className={'chip-ic ' + tn}><I size={16} /></span><b>{l}</b><kbd>{k}</kbd></button>)}</div>
            </div>
            <QuickAdd st={st} addTx={addTx} setSettings={setSettings} setToast={setToast} open={open} compact />
            <div className="card rail-card">
              <div className="rc-h"><h3>À surveiller</h3>{alerts.length > 0 && <span className="badge">{alerts.length}</span>}</div>
              {alerts.length ? alerts.slice(0, 6).map((a, i) => (
                <div className={'alB ' + a.tone} key={i}>
                  <a.icon size={15} />
                  <div>{a.text}</div>
                  <button onClick={a.act[1]}>{a.act[0]}</button>
                </div>)) : <div className="ok-state"><ShieldCheck size={18} />Tout est en ordre</div>}
            </div>
            <div className="card rail-card">
              <div className="rc-h"><h3>Objectifs</h3><button className="btn s sm" onClick={() => setPage('goals')}>Voir</button></div>
              {goalsA.length ? goalsA.slice(0, 4).map((g) => {
                const v = bal.goals[g.id] || 0; const p = Math.min(1, v / g.montant); const r = goalReach(rows, g); const ok = r && monthDiff(g.echeance, r.key) <= 0;
                return (
                  <div className="goalB" key={g.id} onClick={() => open('goalHist', g)}>
                    <Ring pct={p} color={g.couleur} size={40} stroke={5} label="" />
                    <div style={{ flex: 1, minWidth: 0 }}><div className="gB-n">{g.nom}</div><div className="gB-s num">{fmt(v)} / {fmt(g.montant)}</div></div>
                    <div className="gB-r"><b className="num">{Math.round(p * 100)} %</b><span className={ok ? 'pos' : 'neg'}>{v >= g.montant ? 'Atteint' : r ? mLabel(r.key) : 'Non atteint'}</span></div>
                  </div>);
              }) : <Empty icon={Target} title="Aucun objectif" text="Crée un objectif d'épargne." action={<button className="btn p sm" onClick={() => open('goal')}><Plus size={14} />Créer</button>} />}
            </div>
          </div>
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
function Goals({ st, bal, rows, open, remove, addTx, upsert }) {
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
            <div className="grid g3 goals-grid">
              {st.goals.filter(isGoalActive).map((g) => {
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
                      <div style={{ display: 'flex', alignSelf: 'flex-start' }}><button className="ib" onClick={() => open('goal', g)}><Pencil size={15} /></button><button className="ib" title="Historique" onClick={() => open('goalHist', g)}><History size={15} /></button><button className="ib" title="Supprimer" onClick={() => remove('goals', g.id)}><Trash2 size={15} /></button></div>
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
                      <button className="btn s sm" onClick={() => open('plan', g)}><CalendarRange size={14} />Planifier</button>
                      <button className="btn s sm" disabled={v <= 0} onClick={() => setFund({ goal: g, kind: 'withdraw', montant: '', date: todayISO() })}>Retirer</button>
                      <button className="btn s sm" disabled={v <= 0} onClick={() => setXfer({ from: g.id, to: 'dispo' })}>Transférer</button>
                    </div>
                    <div className="goal-foot">
                      <button className={'btn sm ' + (v >= g.montant ? 'p' : 's')} onClick={() => open('goalDone', g)}><Trophy size={14} />{v >= g.montant ? 'Objectif atteint !' : 'Marquer atteint'}</button>
                      <button className="btn s sm" onClick={() => open('goalDone', { ...g, archive: true })}><Archive size={14} />Archiver</button>
                    </div>
                  </div>);
              })}
            </div>
            {st.goals.some((g) => !isGoalActive(g)) && (
              <Card title="Atteints et archivés" style={{ marginTop: 16 }} flush>
                {st.goals.filter((g) => !isGoalActive(g)).map((g) => (
                  <div className="row" key={g.id}>
                    <div className={'chip-ic ' + (g.status === 'atteint' ? 'g' : 'p')} style={{ width: 34, height: 34 }}>{g.status === 'atteint' ? <Trophy size={16} /> : <Archive size={16} />}</div>
                    <div style={{ minWidth: 0 }}><div className="t">{g.nom}</div><div className="s">{g.status === 'atteint' ? 'Atteint' : 'Archivé'}{g.doneDate ? ` le ${dLabel(g.doneDate)}` : ''} · objectif {fmt(g.montant)} FCFA{(bal.goals[g.id] || 0) > 0 ? ` · ${fmt(bal.goals[g.id])} encore de côté` : ''}</div></div>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                      <button className="ib" title="Historique" onClick={() => open('goalHist', g)}><History size={15} /></button>
                      <button className="ib" title="Réactiver" onClick={() => upsert('goals', { ...g, status: 'actif', doneDate: undefined })}><ArchiveRestore size={15} /></button>
                      <button className="ib" title="Supprimer" onClick={() => remove('goals', g.id)}><Trash2 size={15} /></button>
                    </div>
                  </div>))}
              </Card>)}
            {st.goals.some(isGoalActive) && <Card title="Progression projetée" style={{ marginTop: 16 }} action={<div className="legend">{st.goals.filter(isGoalActive).map((g) => <span key={g.id}><i style={{ background: g.couleur }} />{g.nom}</span>)}</div>}>
              <div style={{ height: 300 }}>
                <ResponsiveContainer>
                  <LineChart data={data} margin={{ top: 6, right: 24, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke={c.grid} strokeDasharray="3 4" vertical={false} /><XAxis dataKey="label" interval={data.length > 14 ? 1 : 0} {...axis} /><YAxis tickFormatter={short} width={56} {...axis} /><Tooltip content={<Tip />} />
                    {st.goals.filter(isGoalActive).map((g) => <ReferenceLine key={'r' + g.id} y={+g.montant} stroke={g.couleur} strokeDasharray="4 4" strokeOpacity={.6} />)}
                    {st.goals.filter(isGoalActive).map((g) => <Line key={g.id} type="monotone" dataKey={g.id} name={g.nom} stroke={g.couleur} strokeWidth={2.4} dot={false} animationDuration={500} />)}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>}
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
const daysBetween = (a, b) => Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 864e5);
const initials = (n) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase();
const AV_COLS = ['#4F46E5', '#0EA5E9', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#14B8A6', '#64748B'];
const avCol = (n) => AV_COLS[[...n].reduce((s, ch) => s + ch.charCodeAt(0), 0) % AV_COLS.length];

function Flux({ st, open, remove }) {
  const cur = mkey(new Date()); const today = todayISO();
  const [f, setF] = useState('all');
  const [q, setQ] = useState('');
  const [m, setM] = useState(cur);
  const kindOf = (i) => (i.kind === 'out' && i.cat === 'evenement' ? 'evt' : i.kind);
  const actM = st.items.filter((i) => isActive(i, m, st));
  const sum = (k) => actM.filter((i) => kindOf(i) === k).reduce((s, i) => s + amountOf(i, st), 0);
  const rev = sum('in'), chg = sum('out'), evt = sum('evt'), sav = sum('save');
  const reste = rev - chg - evt - sav;
  const occ = occurrences(st, m);
  const dim = daysIn(m);
  const byDay = {}; for (const o of occ) { const d = +o.date.slice(8, 10); (byDay[d] = byDay[d] || []).push(o); }
  const ending = st.items.filter((i) => i.fin && i.fin !== i.debut && i.fin >= cur && monthDiff(cur, i.fin) <= 3);
  const norm = (x) => String(x || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const list = st.items.filter((i) => (f === 'all' || kindOf(i) === f) && (!q || norm(`${i.label} ${CATS[i.cat]}`).includes(norm(q))))
    .sort((a, b) => ({ in: 0, out: 1, evt: 2, save: 3 }[kindOf(a)] - { in: 0, out: 1, evt: 2, save: 3 }[kindOf(b)]) || (+a.jour - +b.jour));
  const FL = [['all', 'Tous'], ['in', 'Revenus'], ['out', 'Charges'], ['evt', 'Ponctuels'], ['save', 'Épargne']];
  const statusOf = (it) => {
    if (!isActive(it, cur, st)) return it.debut > cur ? ['à venir', 'muted'] : ['terminé', 'muted'];
    const ref = `i:${it.id}:${cur}`;
    if (st.done[ref]) return ['fait ce mois', 'ok'];
    return dateIn(cur, it.jour) < today ? ['en attente', 'warn'] : [`le ${it.jour}`, ''];
  };
  return (
    <>
      <Top title="Flux récurrents" sub="Revenus, charges et épargne qui reviennent dans le temps">
        <button className="btn p" onClick={() => open('item')}><Plus size={16} />Ajouter un flux</button>
      </Top>
      <div className="content">
        <div className="pg-kpis">
          <div className="dk dk-hero"><div className="dk-top"><span>Reste après charges</span><span className="hero-pill up" style={{ textTransform: 'capitalize' }}>{mLabel(m, true)}</span></div>
            <div className="dk-v num">{reste < 0 ? '−' : ''}{fmt(Math.abs(reste))}<small>FCFA</small></div>
            <div className="acc-split" title="Part des revenus">{rev > 0 && <><i style={{ width: Math.min(100, (chg / rev) * 100) + '%', background: '#FCA5A5' }} /><i style={{ width: Math.min(100, (evt / rev) * 100) + '%', background: '#FCD34D' }} /><i style={{ width: Math.min(100, (sav / rev) * 100) + '%', background: '#7DD3FC' }} /></>}</div>
            <div className="acc-legend"><span><i style={{ background: '#FCA5A5' }} />Charges <b>{rev ? Math.round((chg / rev) * 100) : 0} %</b></span><span><i style={{ background: '#FCD34D' }} />Ponctuels <b>{rev ? Math.round((evt / rev) * 100) : 0} %</b></span><span><i style={{ background: '#7DD3FC' }} />Épargne <b>{rev ? Math.round((sav / rev) * 100) : 0} %</b></span></div>
            <svg className="dk-wave" viewBox="0 0 200 60" preserveAspectRatio="none"><path d="M0 45 C40 30 60 52 100 34 S160 18 200 26 L200 60 L0 60 Z" /></svg></div>
          <div className="dk dk-g"><div className="dk-top"><span className="dk-ic"><ArrowDownLeft size={15} /></span><span>Revenus prévus</span></div><div className="dk-v num pos">+{fmt(rev)}</div><div className="dk-f">{actM.filter((i) => i.kind === 'in').length} source{actM.filter((i) => i.kind === 'in').length > 1 ? 's' : ''} ce mois-là</div></div>
          <div className="dk dk-r"><div className="dk-top"><span className="dk-ic"><ArrowUpRight size={15} /></span><span>Charges fixes</span></div><div className="dk-v num neg">−{fmt(chg + evt)}</div><div className="dk-f">{actM.filter((i) => i.kind === 'out').length} sortie{actM.filter((i) => i.kind === 'out').length > 1 ? 's' : ''}{evt ? ` dont ${fmt(evt)} ponctuels` : ''}</div></div>
          <div className="dk dk-s"><div className="dk-top"><span className="dk-ic"><PiggyBank size={15} /></span><span>Épargne programmée</span></div><div className="dk-v num">{fmt(sav)}</div><div className="dk-f">{actM.filter((i) => i.kind === 'save').length ? `${actM.filter((i) => i.kind === 'save').length} versement(s)` : 'Aucune épargne programmée'}</div></div>
        </div>

        {ending.length > 0 && <div className="alert warn"><div className="chip-ic"><AlertTriangle size={16} /></div><div style={{ flex: 1 }}>Bientôt terminé : {ending.map((i) => <b key={i.id} style={{ marginRight: 10 }}>{i.label} ({fmt(i.montant)}) en {mLabel(i.fin, true)}</b>)}</div></div>}

        {/* ---- Calendrier du mois ---- */}
        <div className="card cal-card">
          <div className="card-h"><div><h3>Calendrier des flux</h3><div className="sub">Quand l'argent entre et sort</div></div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}><button className="btn s sm" onClick={() => setM(addMonths(m, -1))}>‹</button><b style={{ minWidth: 120, textAlign: 'center', textTransform: 'capitalize', fontSize: 13.5 }}>{mLabel(m, true)}</b><button className="btn s sm" onClick={() => setM(addMonths(m, 1))}>›</button></div></div>
          <div className="cal">
            {Array.from({ length: dim }, (_, i) => i + 1).map((d) => {
              const os = byDay[d] || []; const net = os.reduce((s, o) => s + (o.kind === 'in' ? o.amount : -o.amount), 0);
              const iso = `${m}-${String(d).padStart(2, '0')}`; const dow = new Date(iso + 'T12:00:00').getDay();
              return (
                <div key={d} className={'cal-d' + (iso === today ? ' today' : '') + (dow === 0 || dow === 6 ? ' we' : '') + (os.length ? ' has' : '')} title={os.map((o) => `${o.label} : ${o.kind === 'in' ? '+' : '−'}${fmt(o.amount)}`).join('\n')}>
                  <span className="cal-n">{d}</span>
                  <div className="cal-dots">{os.slice(0, 4).map((o) => <i key={o.ref} className={o.kind === 'in' ? 'in' : o.kind === 'save' ? 'sv' : 'out'} />)}</div>
                  {os.length > 0 && <span className={'cal-v num ' + (net >= 0 ? 'pos' : 'neg')}>{net >= 0 ? '+' : '−'}{short(Math.abs(net))}</span>}
                </div>);
            })}
          </div>
          <div className="cal-leg"><span><i className="in" />Entrée</span><span><i className="out" />Sortie</span><span><i className="sv" />Épargne</span><span className="muted">Survole un jour pour le détail</span></div>
        </div>

        {/* ---- Liste ---- */}
        <div className="card mt" style={{ overflow: 'hidden' }}>
          <div className="card-h" style={{ flexWrap: 'wrap', gap: 10 }}>
            <div className="seg">{FL.map(([k, l]) => <button key={k} className={f === k ? 'on' : ''} onClick={() => setF(k)}>{l} <span className="seg-n">{k === 'all' ? st.items.length : st.items.filter((i) => kindOf(i) === k).length}</span></button>)}</div>
            <div className="search" style={{ minWidth: 220 }}><Search size={15} /><input placeholder="Rechercher un flux" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          </div>
          {list.length ? list.map((it) => {
            const k = kindOf(it); const [stL, stT] = statusOf(it); const acc = st.accounts.find((a) => a.id === it.accountId);
            const end = it.fin && it.fin !== it.debut && it.fin >= cur && monthDiff(cur, it.fin) <= 3;
            return (
              <div className={'fx-row k-' + k} key={it.id}>
                <div className="fx-ic">{k === 'save' ? <PiggyBank size={16} /> : k === 'in' ? <ArrowDownLeft size={16} /> : React.createElement(catIcon(it.cat), { size: 16 })}</div>
                <div className="fx-main">
                  <div className="fx-t">{it.label}{it.incertain && <span className="badge warn">Incertain</span>}{it.variable && <span className="badge">Variable</span>}{end && <span className="badge r">Se termine en {mLabel(it.fin)}</span>}</div>
                  <div className="fx-s">{k === 'save' ? gname(st, it.goalId) || 'Épargne' : CATS[it.cat]} · {FREQ(it)} · {mLabel(it.debut)} → {it.fin ? mLabel(it.fin) : 'sans fin'}{acc && k !== 'save' ? <> · <i className="dot" style={{ background: acc.couleur }} />{acc.nom}</> : null}</div>
                </div>
                <span className={'fx-st ' + stT}>{stT === 'ok' && <Check size={12} />}{stL}</span>
                <div className={'fx-a num ' + (k === 'in' ? 'pos' : k === 'save' ? '' : 'neg')}>{k === 'in' ? '+' : '−'}{it.variable ? `${short(it.min)}–${short(it.max)}` : fmt(it.montant)}</div>
                <div className="fx-act"><button className="ib" onClick={() => open('item', it)}><Pencil size={15} /></button><button className="ib" onClick={() => remove('items', it.id)}><Trash2 size={15} /></button></div>
              </div>);
          }) : <Empty title="Aucun flux" text="Ajoute tes revenus, charges et épargnes qui reviennent." action={<button className="btn p sm" onClick={() => open('item', f !== 'all' ? (f === 'evt' ? { kind: 'out', cat: 'evenement', label: '', fin: addMonths(cur, 1) } : { kind: f }) : null)}><Plus size={14} />Ajouter</button>} />}
        </div>
      </div>
    </>
  );
}

function Tontines({ st, open, remove, undoRef }) {
  const cur = mkey(new Date()); const today = todayISO();
  const info = st.tontines.map((t) => {
    const n = +t.participants; const months = Array.from({ length: n }, (_, i) => addMonths(t.debut, i));
    const paidN = months.filter((m) => st.done[`tc:${t.id}:${m}`]).length;
    const recvKey = months[+t.position - 1]; const recvRef = `tr:${t.id}:${recvKey}`;
    const nextM = months.find((m) => !st.done[`tc:${t.id}:${m}`]);
    return { t, n, months, paidN, recvKey, recvRef, nextM, pot: +t.cotisation * n, received: !!st.done[recvRef] };
  });
  const totCot = info.reduce((s, x) => s + x.paidN * x.t.cotisation, 0);
  const restant = info.reduce((s, x) => s + (x.n - x.paidN) * x.t.cotisation, 0);
  const nextC = info.filter((x) => x.nextM).map((x) => ({ x, date: dateIn(x.nextM, x.t.jour) })).sort((a, b) => a.date.localeCompare(b.date))[0];
  const nextP = info.filter((x) => !x.received).map((x) => ({ x, date: dateIn(x.recvKey, x.t.jour) })).sort((a, b) => a.date.localeCompare(b.date))[0];
  const occ = (t, m) => occurrences(st, m).find((o) => o.ref === `tc:${t.id}:${m}`);
  const occR = (x) => occurrences(st, x.recvKey).find((o) => o.ref === x.recvRef);
  return (
    <>
      <Top title="Tontines" sub="Cotisations et cagnottes"><button className="btn p" onClick={() => open('tontine')}><Plus size={16} />Nouvelle tontine</button></Top>
      <div className="content">
        {!st.tontines.length ? <div className="card"><Empty icon={Users} title="Aucune tontine" text="Ajoute une ristourne pour suivre tes cotisations et la date de ta cagnotte." action={<button className="btn p" onClick={() => open('tontine')}><Plus size={16} />Ajouter</button>} /></div> : <>
          <div className="pg-kpis">
            <div className="dk dk-hero"><div className="dk-top"><span>Prochaine cagnotte</span>{nextP && <span className="hero-pill up">dans {Math.max(0, daysBetween(today, nextP.date))} j</span>}</div>
              <div className="dk-v num">{nextP ? fmt(nextP.x.pot) : '—'}<small>FCFA</small></div>
              <div className="dk-f" style={{ color: '#D9DBFF' }}>{nextP ? <>{nextP.x.t.nom} · {dLabel(nextP.date)}{nextP.x.t.goalId && gname(st, nextP.x.t.goalId) ? ` → ${gname(st, nextP.x.t.goalId)}` : ''}</> : 'Toutes les cagnottes sont reçues'}</div>
              <svg className="dk-wave" viewBox="0 0 200 60" preserveAspectRatio="none"><path d="M0 45 C40 30 60 52 100 34 S160 18 200 26 L200 60 L0 60 Z" /></svg></div>
            <div className="dk"><div className="dk-top"><span className="dk-ic"><CalendarDays size={15} /></span><span>Prochaine cotisation</span></div><div className="dk-v num">{nextC ? fmt(nextC.x.t.cotisation) : '—'}</div><div className="dk-f">{nextC ? `${nextC.x.t.nom} · ${dLabel(nextC.date)}${nextC.date < today ? ' · en retard' : ''}` : 'Rien à payer'}</div></div>
            <div className="dk dk-g"><div className="dk-top"><span className="dk-ic"><Check size={15} /></span><span>Déjà cotisé</span></div><div className="dk-v num">{fmt(totCot)}</div><div className="dk-f">sur le cycle en cours</div></div>
            <div className="dk dk-r"><div className="dk-top"><span className="dk-ic"><Clock size={15} /></span><span>Reste à cotiser</span></div><div className="dk-v num">{fmt(restant)}</div><div className="dk-f">jusqu'à la fin des cycles</div></div>
          </div>
          <div className="tn-grid">{info.map((x) => {
            const { t, n, months, paidN, recvKey } = x; const pos = +t.position;
            const kind = pos === n ? 'Épargne forcée : tu reçois en dernier, sans risque d’avance.' : pos === 1 ? 'Avance : tu reçois en premier, puis tu rembourses par tes cotisations.' : pos <= n / 2 ? 'Plutôt une avance : tu reçois avant d’avoir tout cotisé.' : 'Plutôt de l’épargne : tu reçois après avoir cotisé l’essentiel.';
            const nextO = x.nextM && occ(t, x.nextM);
            return (
              <div className="card tn-card" key={t.id}>
                <div className="tn-h">
                  <Ring pct={paidN / n} color="var(--primary)" size={58} stroke={6} label={`${paidN}/${n}`} />
                  <div style={{ flex: 1, minWidth: 0 }}><div className="tn-n">{t.nom}{t.goalId && gname(st, t.goalId) && <span className="badge p"><Target size={11} />{gname(st, t.goalId)}</span>}</div>
                    <div className="muted" style={{ fontSize: 12.5 }}>{fmt(t.cotisation)} FCFA / mois · {n} participants · le {t.jour} du mois</div></div>
                  <div style={{ display: 'flex' }}><button className="ib" onClick={() => open('tontine', t)}><Pencil size={15} /></button><button className="ib" onClick={() => remove('tontines', t.id)}><Trash2 size={15} /></button></div>
                </div>
                <div className="tn-meta">
                  <div><span>Cagnotte</span><b className="num">{fmt(x.pot)}</b></div>
                  <div><span>Mon tour</span><b style={{ textTransform: 'capitalize' }}>{mLabel(recvKey, true)}</b></div>
                  <div><span>Cotisé</span><b className="num">{fmt(paidN * t.cotisation)}</b></div>
                </div>
                <div className="tn-tl">{months.map((m, i) => {
                  const ref = `tc:${t.id}:${m}`; const ok = !!st.done[ref]; const me = i === pos - 1; const late = !ok && dateIn(m, t.jour) < today;
                  return (
                    <div key={m} className={'tn-m' + (ok ? ' paid' : '') + (me ? ' me' : '') + (late ? ' late' : '') + (m === cur ? ' cur' : '')}>
                      <button title={ok ? 'Annuler le paiement' : 'Marquer la cotisation payée'} onClick={() => (ok ? undoRef(ref) : open('confirm', occ(t, m)))}>{me ? <Sparkles size={14} /> : ok ? <Check size={14} /> : i + 1}</button>
                      <span>{mLabel(m)}</span>
                    </div>);
                })}</div>
                <div className="tn-note"><Info size={14} />{kind}</div>
                <div className="tn-act">
                  {nextO ? <button className="btn p sm" onClick={() => open('confirm', nextO)}>Payer la cotisation de {mLabel(x.nextM)}</button> : <span className="badge ok">Cycle cotisé</span>}
                  {x.received ? <span className="badge ok"><Check size={11} />Cagnotte reçue</span> : recvKey <= cur ? <button className="btn s sm" onClick={() => { const o = occR(x); if (o) open('confirm', o); }}>Marquer la cagnotte reçue</button> : <span className="badge">Cagnotte en {mLabel(recvKey)}</span>}
                </div>
              </div>);
          })}</div></>}
      </div>
    </>
  );
}

function Creances({ st, open, remove, undoRef }) {
  const today = todayISO();
  const [f, setF] = useState('cours');
  const info = st.creances.map((c) => {
    const occ = creanceOccs(c); const paid = occ.filter((o) => st.done[o.ref]); const next = occ.find((o) => !st.done[o.ref]);
    const paidAmt = paid.reduce((s, o) => s + o.amount, 0);
    return { c, occ, paid, next, paidAmt, reste: c.montant - paidAmt, ok: !next, late: next && next.date < today };
  });
  const sumR = (s) => info.filter((x) => x.c.sens === s).reduce((a, x) => a + x.reste, 0);
  const onMe = sumR('in'), iOwe = sumR('out'); const lates = info.filter((x) => x.late);
  const sec = (sens, title) => {
    const list = info.filter((x) => x.c.sens === sens && (f === 'tous' || (f === 'cours' ? !x.ok : x.ok))).sort((a, b) => (a.ok - b.ok) || (a.next?.date || '').localeCompare(b.next?.date || ''));
    const tot = info.filter((x) => x.c.sens === sens && !x.ok).length;
    return (
      <div className="card cr-col">
        <div className="card-h"><div><h3>{title}</h3><div className="sub">{tot} en cours · {fmt(sens === 'in' ? onMe : iOwe)} FCFA restants</div></div><button className="btn s sm" onClick={() => open('creance', { sens })}><Plus size={14} />Ajouter</button></div>
        <div className="cr-list">
          {list.length ? list.map((x) => {
            const { c, occ, paid, next, paidAmt, ok, late } = x; const n = occ.length;
            const dd = next ? daysBetween(today, next.date) : 0;
            const t0 = c.initTx && st.transactions.find((y) => y.id === c.initTx);
            return (
              <div className={'cr-card' + (ok ? ' done' : '') + (late ? ' late' : '')} key={c.id}>
                <div className="cr-top">
                  <div className="cr-av" style={{ background: avCol(c.nom) }}>{initials(c.nom)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="cr-n">{c.nom}{n > 1 && <span className="badge">{paid.length}/{n}</span>}</div>
                    <div className="cr-s">{ok ? (sens === 'in' ? 'Remboursé' : 'Payé') : late ? <span className="neg">En retard de {-dd} j</span> : dd === 0 ? "Aujourd'hui" : `Dans ${dd} j · ${dLabel(next.date)}`}{t0 ? ` · ${sens === 'in' ? 'prêté' : 'reçu'} via ${accName(st, t0.accountId)}` : ''}{!ok && c.lastRelance ? ` · relancé le ${dLabel(c.lastRelance)}` : ''}</div>
                  </div>
                  <div className="cr-a"><b className={'num ' + (ok ? 'muted' : sens === 'in' ? 'pos' : 'neg')}>{fmt(ok ? c.montant : x.reste)}</b>{!ok && paidAmt > 0 && <span className="muted num">sur {fmt(c.montant)}</span>}</div>
                </div>
                {(n > 1 || paidAmt > 0) && <div className="cr-bar"><i style={{ width: (paidAmt / c.montant) * 100 + '%', background: sens === 'in' ? 'var(--pos)' : 'var(--primary)' }} /></div>}
                <div className="cr-act">
                  {ok ? <><span className="badge ok"><Check size={11} />{sens === 'in' ? 'Reçu' : 'Payé'}</span><button className="ib" title="Annuler la dernière échéance" onClick={() => undoRef(paid[paid.length - 1].ref)}><Undo2 size={15} /></button></>
                    : <>{sens === 'in' && <button className="btn s sm wa-btn" onClick={() => open('relance', c)}><MessageCircle size={14} />Relancer</button>}
                      <button className="btn p sm" onClick={() => open('confirm', next)}>{sens === 'in' ? 'Marquer reçu' : 'Marquer payé'}{n > 1 ? ` ${fmt(next.amount)}` : ''}</button></>}
                  <span style={{ flex: 1 }} />
                  <button className="ib" title="Modifier" onClick={() => open('creance', c)}><Pencil size={15} /></button>
                  <button className="ib" title="Supprimer" onClick={() => remove('creances', c.id)}><Trash2 size={15} /></button>
                </div>
              </div>);
          }) : <Empty title={f === 'soldes' ? 'Rien de soldé' : 'Rien à signaler'} text={sens === 'in' ? "Personne ne te doit d'argent." : 'Tu ne dois rien.'} />}
        </div>
      </div>);
  };
  const net = onMe - iOwe;
  return (
    <>
      <Top title="Créances & dettes" sub="Argent prêté et emprunté">
        <div className="seg">{[['cours', 'En cours'], ['soldes', 'Soldés'], ['tous', 'Tous']].map(([k, l]) => <button key={k} className={f === k ? 'on' : ''} onClick={() => setF(k)}>{l}</button>)}</div>
        <button className="btn p" onClick={() => open('creance')}><Plus size={16} />Ajouter</button>
      </Top>
      <div className="content">
        <div className="pg-kpis">
          <div className="dk dk-hero"><div className="dk-top"><span>Solde net</span><span className={'hero-pill ' + (net >= 0 ? 'up' : 'down')}>{net >= 0 ? 'en ta faveur' : 'tu dois plus'}</span></div>
            <div className="dk-v num">{net < 0 ? '−' : '+'}{fmt(Math.abs(net))}<small>FCFA</small></div>
            <div className="acc-split">{onMe + iOwe > 0 && <><i style={{ width: (onMe / (onMe + iOwe)) * 100 + '%', background: '#6EE7B7' }} /><i style={{ width: (iOwe / (onMe + iOwe)) * 100 + '%', background: '#FCA5A5' }} /></>}</div>
            <div className="acc-legend"><span><i style={{ background: '#6EE7B7' }} />On me doit <b>{fmt(onMe)}</b></span><span><i style={{ background: '#FCA5A5' }} />Je dois <b>{fmt(iOwe)}</b></span></div>
            <svg className="dk-wave" viewBox="0 0 200 60" preserveAspectRatio="none"><path d="M0 45 C40 30 60 52 100 34 S160 18 200 26 L200 60 L0 60 Z" /></svg></div>
          <div className="dk dk-g"><div className="dk-top"><span className="dk-ic"><ArrowDownLeft size={15} /></span><span>On me doit</span></div><div className="dk-v num pos">{fmt(onMe)}</div><div className="dk-f">{info.filter((x) => x.c.sens === 'in' && !x.ok).length} personne(s)</div></div>
          <div className="dk dk-r"><div className="dk-top"><span className="dk-ic"><ArrowUpRight size={15} /></span><span>Je dois</span></div><div className="dk-v num neg">{fmt(iOwe)}</div><div className="dk-f">{info.filter((x) => x.c.sens === 'out' && !x.ok).map((x) => x.c.nom).join(', ') || 'Rien'}</div></div>
          <div className={'dk' + (lates.length ? ' dk-r' : ' dk-g')}><div className="dk-top"><span className="dk-ic"><Clock size={15} /></span><span>En retard</span></div><div className="dk-v num">{lates.length}</div><div className="dk-f">{lates.length ? `${fmt(lates.reduce((s, x) => s + x.next.amount, 0))} FCFA attendus` : 'Tout est à jour'}</div></div>
        </div>
        <div className="grid g2" style={{ alignItems: 'start' }}>{sec('in', 'On me doit')}{sec('out', 'Je dois')}</div>
      </div>
    </>
  );
}

// ================= TONTINES =================

// ================= CRÉANCES =================

// ================= OPÉRATIONS =================
function Operations({ st, set, open, delTx, updateTx, doExcel, focusSearch, setToast }) {
  const sRef = React.useRef(null);
  useEffect(() => { if (focusSearch) setTimeout(() => sRef.current?.focus(), 50); }, [focusSearch]);
  const [f, setF] = useState('all');
  const [m, setM] = useState(mkey(new Date()));
  const [acc, setAcc] = useState('all');
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const [sel, setSel] = useState(() => new Set());
  const accOf = (t) => t.accountId || st.accounts[0]?.id;
  const accO = (id) => st.accounts.find((a) => a.id === id) || {};
  const norm = (x) => String(x || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const qq = norm(q.trim());
  const match = (t) => !qq || norm(`${t.label} ${CATS[t.cat] || ''} ${t.montant} ${fmt(t.montant)} ${accName(st, accOf(t))} ${t.goalId ? gname(st, t.goalId) : ''}`).includes(qq);
  const inM = st.transactions.filter((t) => (qq ? true : t.date.startsWith(m)) && (acc === 'all' || accOf(t) === acc || t.toAccountId === acc));
  const list = inM.filter((t) => f === 'all' || (f === 'in' ? t.kind === 'in' : f === 'out' ? t.kind === 'out' : f === 'move' ? t.kind === 'move' : t.kind === 'save' || t.kind === 'withdraw'))
    .filter((t) => cat === 'all' || t.cat === cat).filter(match).sort((a, b) => b.date.localeCompare(a.date));
  const catsHere = [...new Set(st.transactions.filter((t) => t.kind === 'in' || t.kind === 'out').map((t) => t.cat))].filter((c) => CATS[c]);
  const tot = list.reduce((s2, t) => s2 + (t.kind === 'in' ? t.montant : t.kind === 'out' ? -t.montant : 0), 0);
  const monthTx = st.transactions.filter((t) => t.date.startsWith(m) && (acc === 'all' || accOf(t) === acc || t.toAccountId === acc));
  const sum = (k) => monthTx.filter((t) => t.kind === k && !CATS_DEBT.includes(t.cat)).reduce((s, t) => s + t.montant, 0);
  const inS = sum('in'), outS = sum('out'); const net = inS - outS;
  const nDays = m === mkey(new Date()) ? new Date().getDate() : daysIn(m);
  // Groupement par jour
  const groups = []; for (const t of list) { const g = groups[groups.length - 1]; if (g && g.d === t.date) g.l.push(t); else groups.push({ d: t.date, l: [t] }); }
  const dayNet = (l) => l.reduce((s, t) => s + (t.kind === 'in' ? t.montant : t.kind === 'out' ? -t.montant : 0), 0);
  const dayTitle = (d) => { const t = todayISO(); const y = new Date(Date.now() - 864e5); const yi = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`; const s = new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }); return d === t ? `Aujourd'hui · ${s}` : d === yi ? `Hier · ${s}` : s.replace(/^./, (c) => c.toUpperCase()); };
  const toggle = (id) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selL = list.filter((t) => sel.has(t.id));
  const recat = (c) => { const ok = selL.filter((t) => t.kind === 'out'); setToast({ msg: `${ok.length} opération(s) déplacée(s) vers ${CATS[c]}`, prev: st }); ok.forEach((t) => updateTx(t.id, { cat: c, label: t.label === CATS[t.cat] ? CATS[c] : t.label })); setSel(new Set()); };
  const bulkDel = () => { const ids = new Set(selL.map((t) => t.id)); const done = { ...st.done }; for (const t of selL) if (t.ref) delete done[t.ref]; setToast({ msg: `${ids.size} opération(s) supprimée(s)`, prev: st }); set({ transactions: st.transactions.filter((t) => !ids.has(t.id)), done }); setSel(new Set()); };
  const filtersOn = [acc !== 'all' && ['acc', accName(st, acc), () => setAcc('all')], cat !== 'all' && ['cat', CATS[cat], () => setCat('all')], f !== 'all' && ['f', { in: 'Entrées', out: 'Dépenses', save: 'Épargne', move: 'Virements' }[f], () => setF('all')], qq && ['q', `« ${q} »`, () => setQ('')]].filter(Boolean);
  const KIc = (t) => (t.kind === 'move' ? ArrowLeftRight : t.kind === 'save' || t.kind === 'withdraw' ? PiggyBank : t.kind === 'in' ? ArrowDownLeft : catIcon(t.cat));
  return (
    <>
      <Top title="Opérations" sub="Tous tes mouvements · Ctrl+N pour saisir">
        <button className="btn s" onClick={() => open('sms', '')}><ClipboardPaste size={15} />Coller un SMS</button>
        <button className="btn s" onClick={doExcel}><FileSpreadsheet size={15} />Excel</button>
        <button className="btn p" onClick={() => open('tx')}><Plus size={16} />Nouvelle opération</button>
      </Top>
      <div className="content">
        <div className="pg-kpis">
          <div className="dk dk-hero"><div className="dk-top"><span>Solde du mois</span><span className="hero-pill up" style={{ textTransform: 'capitalize' }}>{mLabel(m, true)}</span></div>
            <div className="dk-v num">{net < 0 ? '−' : '+'}{fmt(Math.abs(net))}<small>FCFA</small></div>
            <div className="acc-split">{inS + outS > 0 && <><i style={{ width: (inS / (inS + outS)) * 100 + '%', background: '#6EE7B7' }} /><i style={{ width: (outS / (inS + outS)) * 100 + '%', background: '#FCA5A5' }} /></>}</div>
            <div className="acc-legend"><span><i style={{ background: '#6EE7B7' }} />Entrées <b>{fmt(inS)}</b></span><span><i style={{ background: '#FCA5A5' }} />Dépenses <b>{fmt(outS)}</b></span></div>
            <svg className="dk-wave" viewBox="0 0 200 60" preserveAspectRatio="none"><path d="M0 45 C40 30 60 52 100 34 S160 18 200 26 L200 60 L0 60 Z" /></svg></div>
          <div className="dk dk-g"><div className="dk-top"><span className="dk-ic"><ArrowDownLeft size={15} /></span><span>Entrées</span></div><div className="dk-v num pos">+{fmt(inS)}</div><div className="dk-f">{monthTx.filter((t) => t.kind === 'in').length} opération(s)</div></div>
          <div className="dk dk-r"><div className="dk-top"><span className="dk-ic"><ArrowUpRight size={15} /></span><span>Dépenses</span></div><div className="dk-v num neg">−{fmt(outS)}</div><div className="dk-f">≈ {fmt(outS / Math.max(1, nDays))} par jour</div></div>
          <div className="dk"><div className="dk-top"><span className="dk-ic"><List size={15} /></span><span>Opérations</span></div><div className="dk-v num">{monthTx.length}</div><div className="dk-f">{monthTx.filter((t) => t.kind === 'move').length} virement(s) · épargne nette {fmt(sum('save') - sum('withdraw'))}</div></div>
        </div>

        <div className="card ops-card">
          <div className="ops-bar">
            <div className="ops-month" style={{ opacity: qq ? 0.4 : 1 }}><button className="btn s sm" onClick={() => setM(addMonths(m, -1))}>‹</button><b>{qq ? 'Toute la période' : mLabel(m, true)}</b><button className="btn s sm" onClick={() => setM(addMonths(m, 1))}>›</button></div>
            <div className="search ops-search"><Search size={15} /><input ref={sRef} placeholder="Rechercher un libellé, un montant, un compte…" value={q} onChange={(e) => setQ(e.target.value)} />{q ? <button className="ib" onClick={() => setQ('')}><X size={13} /></button> : <kbd>Ctrl K</kbd>}</div>
            <Sel className="inp" style={{ width: 170 }} value={acc} onChange={(e) => setAcc(e.target.value)}><option value="all">Tous les comptes</option>{st.accounts.map((a) => <option key={a.id} value={a.id}>{a.nom}</option>)}</Sel>
            <Sel className="inp" style={{ width: 180 }} value={cat} onChange={(e) => setCat(e.target.value)}><option value="all">Toutes catégories</option>{catsHere.map((c) => <option key={c} value={c}>{CATS[c]}</option>)}</Sel>
          </div>
          <div className="ops-bar2">
            <div className="seg">{[['all', 'Tout'], ['in', 'Entrées'], ['out', 'Dépenses'], ['save', 'Épargne'], ['move', 'Virements']].map(([k, l]) => <button key={k} className={f === k ? 'on' : ''} onClick={() => setF(k)}>{l}</button>)}</div>
            {filtersOn.length > 0 && <div className="ops-chips">{filtersOn.map(([k, l, fn]) => <button key={k} onClick={fn}>{l}<X size={12} /></button>)}<button className="link" onClick={() => { setAcc('all'); setCat('all'); setF('all'); setQ(''); }}>Tout effacer</button></div>}
            <span className="ops-count">{list.length} opération{list.length > 1 ? 's' : ''} · <b className={'num ' + (tot >= 0 ? 'pos' : 'neg')}>{tot >= 0 ? '+' : '−'}{fmt(Math.abs(tot))}</b></span>
          </div>
          {selL.length > 0 && (
            <div className="ops-bulk"><b>{selL.length} sélectionnée{selL.length > 1 ? 's' : ''}</b>
              <Sel className="inp" style={{ width: 210 }} value="" onChange={(e) => e.target.value && recat(e.target.value)}><option value="">Changer de catégorie…</option>{CATS_OUT.map((c) => <option key={c} value={c}>{CATS[c]}</option>)}</Sel>
              <button className="btn d sm" onClick={bulkDel}><Trash2 size={14} />Supprimer</button>
              <button className="btn s sm" onClick={() => setSel(new Set())}>Annuler</button>
            </div>)}
          {groups.length ? groups.map((g) => (
            <div key={g.d} className="ops-day">
              <div className="ops-dh"><span>{dayTitle(g.d)}</span><span className={'num ' + (dayNet(g.l) >= 0 ? 'pos' : 'neg')}>{dayNet(g.l) >= 0 ? '+' : '−'}{fmt(Math.abs(dayNet(g.l)))}</span></div>
              {g.l.map((t) => {
                const a = accO(accOf(t)); const I = KIc(t); const isSel = sel.has(t.id);
                return (
                  <div key={t.id} className={'op-row k-' + t.kind + (isSel ? ' sel' : '')} onDoubleClick={() => open('tx', { ...t, editId: t.id, montant: String(t.montant) })}>
                    <button className={'op-chk' + (isSel ? ' on' : '')} onClick={() => toggle(t.id)} title="Sélectionner">{isSel ? <Check size={13} /> : null}</button>
                    <div className="op-ic"><I size={15} /></div>
                    <div className="op-main">
                      <div className="op-t">{t.label}{t.ref && <span className="badge">Échéance</span>}{t.partOf && <span className="badge">Partiel</span>}</div>
                      <div className="op-s">{t.kind === 'move' ? 'Virement' : t.goalId && (t.kind === 'save' || t.kind === 'withdraw' || t.ref?.startsWith('tr:')) ? gname(st, t.goalId) || 'Objectif supprimé' : CATS[t.cat]}
                        {t.kind !== 'save' && t.kind !== 'withdraw' && <> · <span className="acc-tag"><i style={{ background: a.couleur }} />{a.nom}{t.kind === 'move' && <> → <i style={{ background: accO(t.toAccountId).couleur }} />{accName(st, t.toAccountId)}</>}</span></>}</div>
                    </div>
                    <div className={'op-a num ' + tone(t.kind)}>{sign(t.kind)} {fmt(t.montant)}</div>
                    <div className="op-act"><button className="ib" title="Modifier" onClick={() => open('tx', { ...t, editId: t.id, montant: String(t.montant) })}><Pencil size={15} /></button><button className="ib" title={t.ref ? 'Annuler la validation' : 'Supprimer'} onClick={() => delTx(t.id)}>{t.ref ? <Undo2 size={15} /> : <Trash2 size={15} />}</button></div>
                  </div>);
              })}
            </div>)) : <Empty icon={qq ? Search : List} title={qq ? 'Aucun résultat' : 'Aucune opération'} text={qq ? 'Essaie un autre mot ou un montant.' : 'Valide tes échéances ou ajoute une opération.'} />}
        </div>
      </div>
    </>
  );
}

function Params({ st, set, setSettings, open, version, checkUpdate, lastBackup, doExcel, sendWeekly, makeReport }) {
  const [auto, setAuto] = useState(null); const [upd, setUpd] = useState(null); const [defDir, setDefDir] = useState('');
  const [sec, setSec] = useState('general');
  useEffect(() => { if (native) { native.getAutoLaunch().then(setAuto); native.backupDefaultDir().then(setDefDir); } }, []);
  const exp = async () => { const json = JSON.stringify(st, null, 2); const name = `kalis-sauvegarde-${todayISO()}.json`; if (native) native.saveFile(name, btoa(unescape(encodeURIComponent(json))), [{ name: 'Sauvegarde Kalis', extensions: ['json'] }]); else { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([json])); a.download = name; a.click(); } };
  const imp = (e) => { const file = e.target.files?.[0]; if (!file) return; file.text().then((t) => { try { const s = migrate(JSON.parse(t)); if (s) set(s); else alert('Fichier non reconnu'); } catch (err) { alert('Fichier invalide'); } }); };
  const S = st.settings;
  const Sw = ({ on, onChange, disabled }) => <button type="button" className={'sw-t' + (on ? ' on' : '')} disabled={disabled} onClick={() => onChange(!on)} role="switch" aria-checked={!!on}><i /></button>;
  const Row = ({ t, h, children }) => <div className="set-row"><div className="set-l"><b>{t}</b>{h && <span>{h}</span>}</div><div className="set-c">{children}</div></div>;
  const SECS = [['general', 'Général', Settings], ['apparence', 'Apparence', Palette], ['rappels', 'Rappels', Bell], ['securite', 'Sécurité', ShieldCheck], ['sauvegarde', 'Sauvegarde', FolderOpen], ['maj', 'Mises à jour', RefreshCw], ['donnees', 'Données', Database], ['clavier', 'Raccourcis', Keyboard], ['apropos', 'À propos', Info]];
  const go = (k) => { setSec(k); document.getElementById('set-' + k)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  const Head = ({ id, icon: I, t, s }) => <div className="set-h" id={'set-' + id}><span className="set-hi"><I size={17} /></span><div><h3>{t}</h3>{s && <div className="sub">{s}</div>}</div></div>;
  return (
    <>
      <Top title="Paramètres" sub={version ? `Kalis ${version}` : 'Kalis'} />
      <div className="content set-wrap">
        <nav className="set-nav">{SECS.map(([k, l, I]) => <button key={k} className={sec === k ? 'on' : ''} onClick={() => go(k)}><I size={15} />{l}</button>)}</nav>
        <div className="set-body">
          <div className="card set-card"><Head id="general" icon={Settings} t="Général" s="Point de départ et projection" />
            <Row t="Date de départ" h="Les soldes de départ des comptes sont ceux de cette date"><input className="inp" style={{ width: 180 }} type="date" value={st.dateInitiale} onChange={(e) => set({ dateInitiale: e.target.value })} /></Row>
            <Row t="Horizon de projection" h="Jusqu'où calculer la trajectoire"><input className="inp" style={{ width: 180 }} type="month" value={st.horizon} onChange={(e) => e.target.value && set({ horizon: e.target.value })} /></Row>
            <Row t="Hypothèse de revenus" h="Pour les revenus variables (min–max)"><div className="seg">{[['bas', 'Prudente'], ['moyen', 'Moyenne'], ['haut', 'Haute']].map(([k, l]) => <button key={k} className={(st.hypothese || 'bas') === k ? 'on' : ''} onClick={() => set({ hypothese: k })}>{l}</button>)}</div></Row>
            <Row t="Compter les revenus incertains" h="Dans la projection et le plan du mois"><Sw on={st.inclureIncertains !== false} onChange={(v) => set({ inclureIncertains: v })} /></Row>
          </div>
          <div className="card set-card"><Head id="apparence" icon={Palette} t="Apparence" s="« Automatique » suit le réglage de Windows" />
            <div className="theme-cards">{[['light', Sun, 'Clair'], ['dark', Moon, 'Sombre'], ['system', Monitor, 'Automatique']].map(([m, I, l]) => (
              <button key={m} className={'theme-card t-' + m + ((st.theme || 'light') === m ? ' on' : '')} onClick={() => set({ theme: m })}><span className="tc-prev"><i /><i /><i /></span><span className="tc-l"><I size={14} />{l}</span></button>))}</div>
          </div>
          <div className="card set-card"><Head id="rappels" icon={Bell} t="Rappels" s="Notifications Windows" />
            <Row t="Échéances du jour et du lendemain" h="Une notification par jour"><Sw on={S.notif !== false} onChange={(v) => setSettings({ notif: v })} /></Row>
            <Row t="Bilan de la semaine" h={<>Le dimanche soir · <a className="link" onClick={(e) => { e.preventDefault(); sendWeekly(true); }}>Voir maintenant</a></>}><Sw on={S.weekly !== false} onChange={(v) => setSettings({ weekly: v })} /></Row>
            <Row t="Rapport PDF du mois écoulé" h={<>Le 1er, dans {'Documents\\Kalis\\Rapports'} · <a className="link" onClick={(e) => { e.preventDefault(); makeReport(prevMonth()); }}>Générer {mLabel(prevMonth(), true)}</a>{native && <> · <a className="link" onClick={async (e) => { e.preventDefault(); native.openPath(await native.reportDir()); }}>Ouvrir le dossier</a></>}</>}><Sw on={S.report !== false} onChange={(v) => setSettings({ report: v })} /></Row>
            <Row t="Lancer Kalis au démarrage" h={native ? 'Démarre en réduit pour ne rater aucun rappel' : "Disponible dans l'application"}><Sw on={!!auto} disabled={!native} onChange={async (v) => native && setAuto(await native.setAutoLaunch(v))} /></Row>
          </div>
          <div className="card set-card"><Head id="securite" icon={ShieldCheck} t="Sécurité" s="Code PIN à l'ouverture · Ctrl+L pour verrouiller" />
            <Row t="Code PIN" h={S.pinHash ? 'Demandé à chaque ouverture' : 'Aucun code défini'}>
              {S.pinHash ? <div style={{ display: 'flex', gap: 8 }}><button className="btn s sm" onClick={() => open('pin')}><KeyRound size={14} />Changer</button><button className="btn d sm" onClick={() => setSettings({ pinHash: null })}>Désactiver</button></div> : <button className="btn p sm" onClick={() => open('pin')}><KeyRound size={14} />Définir</button>}
            </Row>
          </div>
          <div className="card set-card"><Head id="sauvegarde" icon={FolderOpen} t="Sauvegarde automatique" s="Une copie par jour, 30 jours conservés" />
            <Row t="Sauvegarde quotidienne" h={lastBackup ? `Dernière copie : ${lastBackup.split(/[\\/]/).pop()}` : 'Aucune copie dans cette session'}><Sw on={S.backup !== false} onChange={(v) => setSettings({ backup: v })} /></Row>
            <Row t="Dossier" h={<span style={{ wordBreak: 'break-all' }}>{S.backupDir || defDir || 'Documents\\Kalis\\Sauvegardes'}</span>}>
              <div style={{ display: 'flex', gap: 8 }}><button className="btn s sm" disabled={!native} onClick={async () => { const d = await native.chooseDir(); if (d) setSettings({ backupDir: d }); }}>Changer</button><button className="btn s sm" disabled={!native} onClick={() => native.openPath(S.backupDir || defDir)}>Ouvrir</button></div>
            </Row>
            <div className="set-tip"><Info size={14} />Choisis ton dossier Google Drive ou OneDrive pour avoir aussi une copie dans le cloud.</div>
          </div>
          <div className="card set-card"><Head id="maj" icon={RefreshCw} t="Mises à jour" s="Depuis GitHub (aurlin10/kalis)" />
            <Row t="Vérifier automatiquement" h="Au démarrage puis toutes les 6 heures"><Sw on={S.autoUpdate !== false} onChange={(v) => setSettings({ autoUpdate: v })} /></Row>
            <Row t={`Version installée : ${version || '—'}`} h={upd && upd !== 'loading' ? (upd.status === 'latest' ? 'Kalis est à jour' : upd.status === 'ready' ? `Version ${upd.version} prête, redémarre pour l'installer` : upd.message) : 'Dernière vérification inconnue'}>
              <button className="btn s sm" disabled={!native || upd === 'loading'} onClick={async () => { setUpd('loading'); setUpd(await checkUpdate()); }}><RefreshCw size={14} className={upd === 'loading' ? 'spin' : ''} />Vérifier</button>
            </Row>
          </div>
          <div className="card set-card"><Head id="donnees" icon={Database} t="Données" s="Tout est stocké sur ce PC" />
            <div className="data-acts">
              <button onClick={exp}><Download size={18} /><b>Exporter</b><span>Fichier JSON complet</span></button>
              <button onClick={doExcel}><FileSpreadsheet size={18} /><b>Excel</b><span>Opérations, flux, projection</span></button>
              <label><Upload size={18} /><b>Importer</b><span>Restaurer une sauvegarde</span><input type="file" accept=".json" hidden onChange={imp} /></label>
            </div>
            <div className="set-danger"><div><b>Réinitialiser Kalis</b><span>Efface toutes les données de ce PC. Pense à exporter avant.</span></div><button className="btn d sm" onClick={() => { if (window.confirm('Effacer toutes les données ?')) set(defaultState()); }}><RotateCcw size={14} />Réinitialiser</button></div>
          </div>
          <div className="card set-card"><Head id="clavier" icon={Keyboard} t="Raccourcis clavier" s="F1 affiche cette liste partout" /><KeysList /></div>
          <div className="card set-card about"><Head id="apropos" icon={Info} t="À propos" />
            <div className="about-b"><img src={logoUrl} alt="" /><div><b>Kalis {version || '2'}</b><span>Finances personnelles en FCFA · Wave, Orange Money, Djamo, Mixx by Yas</span><span className="muted">Données 100 % locales · Paul Aurlin Mikabissi</span></div></div>
          </div>
        </div>
      </div>
    </>
  );
}

// ================= PARAMÈTRES =================

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
  const [partialOff, setPartialOff] = useState(false);
  const [upd, setUpd] = useState(false);
  const verb = occ.kind === 'in' ? 'reçu' : occ.kind === 'save' ? 'épargné' : 'payé';
  const canPartial = occ.kind !== 'save' && +m > 0 && +m < occ.amount;
  const partial = canPartial && !partialOff;
  const canUpd = !!occ.src && !occ.src.variable && occ.kind !== 'save' && !occ.paid && +m > 0 && +m !== +occ.src.montant && !partial && occ.src.fin !== occ.src.debut;
  return (
    <Modal title={occ.label} onClose={onClose} footer={<><button className="btn s" onClick={onClose}>Annuler</button><button className="btn p" onClick={() => onOk(+m, d, skip, acc, { partial, updateItem: canUpd && upd })}><Check size={15} />{partial ? 'Valider le paiement partiel' : 'Valider'}</button></>}>
      <div className="muted" style={{ marginBottom: 16, fontSize: 13 }}>Prévu le {dLabel(occ.date)} : <b style={{ color: 'var(--ink)' }}>{fcfa(occ.total || occ.amount)}</b>{occ.paid ? <> · déjà {verb} <b style={{ color: 'var(--ink)' }}>{fmt(occ.paid)}</b>, reste <b style={{ color: 'var(--ink)' }}>{fmt(occ.amount)}</b></> : null}{occ.variable && ` (entre ${fmt(occ.min)} et ${fmt(occ.max)})`}</div>
      <div className="form f2">
        <Field label={`Montant ${verb} (FCFA)`}><input className="inp num" type="number" autoFocus value={m} disabled={skip} onChange={(e) => setM(e.target.value)} /></Field>
        <Field label="Date"><input className="inp" type="date" value={d} disabled={skip} onChange={(e) => setD(e.target.value)} /></Field>
        {occ.kind !== 'save' && <Field label={occ.kind === 'in' ? 'Reçu sur' : 'Payé depuis'} span><AccPicker st={st} value={acc} onChange={setAcc} disabled={skip} /></Field>}
      </div>
      {canPartial && !skip && <label className="switch" style={{ marginTop: 16 }}><input type="checkbox" checked={partial} onChange={(e) => setPartialOff(!e.target.checked)} />Paiement partiel : les {fmt(occ.amount - m)} FCFA restants resteront à {occ.kind === 'in' ? 'recevoir' : 'payer'}</label>}
      {canUpd && !skip && <label className="switch" style={{ marginTop: 12 }}><input type="checkbox" checked={upd} onChange={(e) => setUpd(e.target.checked)} />Utiliser {fmt(m)} FCFA comme montant prévu pour les prochains mois</label>}
      <label className="switch" style={{ marginTop: 12 }}><input type="checkbox" checked={skip} onChange={(e) => setSkip(e.target.checked)} />Déjà pris en compte dans mon solde courant</label>
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
        <Field label="De" hint={`Disponible : ${fcfa(solde(from))}`}><Sel className="inp" value={from} onChange={(e) => setFrom(e.target.value)}>{opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Sel></Field>
        <Field label="Vers" hint={`Solde : ${fcfa(solde(to))}`}><Sel className="inp" value={to} onChange={(e) => setTo(e.target.value)}>{opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Sel></Field>
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
  const fromAcc = st.accounts.find((a) => a.id === t.accountId) || {};
  const autoFee = +t.montant > 0 && (+fromAcc.feePct || +fromAcc.feeFix) ? Math.round(+t.montant * (+fromAcc.feePct || 0) / 100 + (+fromAcc.feeFix || 0)) : 0;
  const fraisVal = t.fraisManual ? t.frais : (autoFee ? String(autoFee) : '');
  const cats = t.kind === 'in' ? CATS_IN : CATS_OUT;
  const ok = +t.montant > 0 && (!isG || t.goalId) && (!isM || (t.toAccountId && t.toAccountId !== t.accountId));
  const favs = (st.favoris || []).filter((f) => f.kind === t.kind || (!isG && !isM && (f.kind === 'in' || f.kind === 'out')));
  const [cover, setCover] = useState(null);
  const orig = init?.editId ? st.transactions.find((x) => x.id === init.editId) : null;
  const before = (bal.accounts[t.accountId] || 0) + (orig && orig.accountId === t.accountId && (orig.kind === 'out' || orig.kind === 'move') ? orig.montant : 0) - (orig && orig.accountId === t.accountId && orig.kind === 'in' ? orig.montant : 0);
  const after = (t.kind === 'out' || isM) && +t.montant > 0 ? before - +t.montant - (isM ? +fraisVal || 0 : 0) : null;
  const deficit = after != null && after < 0 ? -after : 0;
  const coverFrom = st.accounts.filter((a) => a.id !== t.accountId && a.id !== (isM ? t.toAccountId : null) && (bal.accounts[a.id] || 0) >= deficit).sort((a, b) => (bal.accounts[b.id] || 0) - (bal.accounts[a.id] || 0));
  const withCover = (list) => (cover && deficit ? [{ date: t.date, label: `Virement ${accName(st, cover)} → ${accName(st, t.accountId)}`, kind: 'move', cat: 'virement', montant: deficit, accountId: cover, toAccountId: t.accountId }, ...list] : list);
  const submit = () => {
    if (!ok) return;
    const m = +t.montant;
    if (isM) {
      const list = [{ date: t.date, label: t.label || `Virement ${accName(st, t.accountId)} → ${accName(st, t.toAccountId)}`, kind: 'move', cat: 'virement', montant: m, accountId: t.accountId, toAccountId: t.toAccountId }];
      if (+fraisVal > 0) list.push({ date: t.date, label: `Frais · ${accName(st, t.accountId)} → ${accName(st, t.toAccountId)}`, kind: 'out', cat: 'frais', montant: +fraisVal, accountId: t.accountId });
      return onOk(withCover(list));
    }
    const label = t.label || (isG ? `${t.kind === 'save' ? 'Épargne' : 'Retrait'} ${goals.find((g) => g.id === t.goalId)?.nom}` : CATS[t.cat]);
    const tx = { date: t.date, label, kind: t.kind, cat: isG ? 'epargne' : t.cat, montant: m, goalId: isG ? t.goalId : undefined, accountId: isG ? undefined : t.accountId };
    onOk(init?.editId ? [tx] : withCover([tx]), fav ? { id: uid(), label, kind: t.kind, cat: tx.cat, montant: m, accountId: t.accountId, goalId: tx.goalId } : null);
  };
  return (
    <Modal title={init?.editId ? "Modifier l'opération" : isM ? 'Virement entre comptes' : 'Nouvelle opération'} onClose={onClose} onEnter={submit}
      footer={<><span className="muted" style={{ fontSize: 12, marginRight: 'auto' }}><Keyboard size={12} style={{ verticalAlign: -2 }} /> Entrée pour enregistrer</span><button className="btn s" onClick={onClose}>Annuler</button><button className="btn p" disabled={!ok} onClick={submit}>Enregistrer</button></>}>
      <div className="seg" style={{ display: 'flex', marginBottom: 14 }}>
        {[['out', 'Dépense', 'alimentation'], ['in', 'Entrée', 'salaire'], ['move', 'Virement'], ['save', 'Épargne'], ['withdraw', 'Retrait']].map(([k, l, c]) => <button key={k} style={{ flex: 1 }} className={t.kind === k ? 'on' : ''} onClick={() => u({ kind: k, cat: c || t.cat })}>{l}</button>)}
      </div>
      {favs.length > 0 && !isM && !init?.editId && (
        <div className="favs"><Star size={13} />{favs.map((f) => (
          <span key={f.id} className="fav"><button onClick={() => u({ kind: f.kind, cat: f.cat, label: f.label, montant: String(f.montant), accountId: f.accountId || t.accountId, goalId: f.goalId || t.goalId })}>{f.label} · {short(f.montant)}</button><button className="x" title="Retirer des favoris" onClick={() => onFav(st.favoris.filter((x) => x.id !== f.id))}><X size={11} /></button></span>))}</div>)}
      <div className="form f2">
        <Field label="Montant (FCFA)"><input className="inp num big" type="number" autoFocus value={t.montant} onChange={(e) => u({ montant: e.target.value })} /></Field>
        <Field label="Date"><input className="inp" type="date" value={t.date} onChange={(e) => u({ date: e.target.value })} /></Field>
        {isM ? (<>
          <Field label="Depuis" span hint={`Solde : ${fcfa(bal.accounts[t.accountId] || 0)}`}><AccPicker st={st} value={t.accountId} onChange={(v) => u({ accountId: v, toAccountId: v === t.toAccountId ? st.accounts.find((a) => a.id !== v)?.id : t.toAccountId })} /></Field>
          <Field label="Vers" span><AccPicker st={st} value={t.toAccountId} onChange={(v) => u({ toAccountId: v })} exclude={t.accountId} /></Field>
          <Field label="Frais (FCFA)" hint={!t.fraisManual && autoFee ? `Calculés : ${fromAcc.feePct ? `${fromAcc.feePct} %` : ''}${fromAcc.feePct && fromAcc.feeFix ? ' + ' : ''}${fromAcc.feeFix ? `${fmt(fromAcc.feeFix)} FCFA` : ''} (${fromAcc.nom})` : 'Facultatif · enregistrés comme dépense'}><input className="inp num" type="number" value={fraisVal} onChange={(e) => u({ frais: e.target.value, fraisManual: true })} /></Field>
          <Field label="Libellé"><input className="inp" placeholder="Facultatif" value={t.label} onChange={(e) => u({ label: e.target.value })} /></Field>
        </>) : (<>
          {isG ? <Field label="Objectif">{goals.length ? <Sel className="inp" value={t.goalId} onChange={(e) => u({ goalId: e.target.value })}>{goals.map((g) => <option key={g.id} value={g.id}>{g.nom}</option>)}</Sel> : <span className="hint">Crée d'abord un objectif.</span>}</Field>
            : <Field label="Catégorie"><Sel className="inp" value={t.cat} onChange={(e) => u({ cat: e.target.value })}>{cats.map((c) => <option key={c} value={c}>{CATS[c]}</option>)}</Sel></Field>}
          <Field label="Libellé"><input className="inp" placeholder="Facultatif" value={t.label} onChange={(e) => u({ label: e.target.value })} /></Field>
          {!isG && <Field label={t.kind === 'in' ? 'Reçu sur' : 'Payé depuis'} span><AccPicker st={st} value={t.accountId} onChange={(v) => u({ accountId: v })} /></Field>}
        </>)}
      </div>
      {deficit > 0 && (
        <div className="alert warn neg-warn">
          <div className="chip-ic"><AlertTriangle size={16} /></div>
          <div style={{ flex: 1 }}><b>{accName(st, t.accountId)}</b> passerait à <b className="neg">−{fmt(deficit)}</b> FCFA (solde actuel {fmt(before)}).
            {!init?.editId && coverFrom.length > 0 && <div className="cover-opts"><span className="muted">Virer d'abord {fmt(deficit)} depuis :</span>{coverFrom.slice(0, 4).map((a) => <button key={a.id} className={'chip-b' + (cover === a.id ? ' on' : '')} onClick={() => setCover(cover === a.id ? null : a.id)}><i style={{ background: a.couleur }} />{a.nom} · {short(bal.accounts[a.id] || 0)}</button>)}</div>}
            {!coverFrom.length && <div className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>Vérifie le solde réel du compte : une entrée a peut-être été oubliée.</div>}
          </div>
        </div>)}
      {!isM && !init?.editId && <label className="switch" style={{ marginTop: 14 }}><input type="checkbox" checked={fav} onChange={(e) => setFav(e.target.checked)} /><Star size={13} />Ajouter aux favoris pour la saisie rapide</label>}
    </Modal>
  );
}

function ItemModal({ item, goals, st, onClose, onOk }) {
  const cur = mkey(new Date());
  const [it, setIt] = useState(() => { const x = { id: uid(), label: '', kind: 'out', cat: 'factures', montant: '', jour: 1, debut: addMonths(cur, 1), fin: null, every: 1, accountId: st.accounts[0]?.id, ...(item || {}) }; if (x.cat === 'evenement' && !item?.id) x.fin = x.debut; if (x.kind === 'save' && !x.goalId && goals[0]) x.goalId = goals[0].id; if (!item?.id) { if (x.kind === 'in' && !CATS_IN.includes(x.cat)) x.cat = 'salaire'; if (x.kind === 'save') x.cat = 'epargne'; } return fixCat(x); });
  const u = (p) => setIt((x) => ({ ...x, ...p }));
  const once = it.fin && it.fin === it.debut;
  const freq = once ? 'once' : String(it.every || 1);
  const cats = it.kind === 'in' ? CATS_IN : CATS_OUT;
  const valid = it.label && (it.variable ? +it.min > 0 && +it.max >= +it.min : +it.montant > 0) && (it.kind !== 'save' || it.goalId);
  const isNew = !item?.id;
  return (
    <Modal title={isNew ? 'Nouveau flux' : 'Modifier le flux'} onClose={onClose} footer={<><button className="btn s" onClick={onClose}>Annuler</button><button className="btn p" disabled={!valid} onClick={() => onOk({ ...it, goalId: it.kind === 'save' ? it.goalId : undefined, montant: it.variable ? +it.min : +it.montant, min: it.variable ? +it.min : undefined, max: it.variable ? +it.max : undefined, jour: +it.jour || 1, every: +it.every || 1 })}>Enregistrer</button></>}>
      <div className="seg" style={{ display: 'flex', marginBottom: 18 }}>
        {[['in', 'Revenu', 'salaire'], ['out', 'Charge', 'factures'], ['save', 'Épargne']].map(([k, l, c]) => <button key={k} style={{ flex: 1 }} className={it.kind === k ? 'on' : ''} onClick={() => u({ kind: k, cat: c || 'epargne', variable: false, incertain: false })}>{l}</button>)}
      </div>
      {it.cat === 'evenement' && <div className="favs" style={{ marginTop: -4 }}><PartyPopper size={13} />{EVENT_PRESETS.map((p) => <span className="fav" key={p}><button onClick={() => u({ label: p })}>{p}</button></span>)}</div>}
      <div className="form f2">
        <Field label="Libellé" span><input className="inp" autoFocus value={it.label} placeholder={it.kind === 'in' ? 'ex. Salaire' : it.kind === 'out' ? 'ex. Loyer' : 'ex. Épargne mensuelle'} onChange={(e) => u({ label: e.target.value })} /></Field>
        {it.kind === 'save'
          ? <Field label="Objectif">{goals.length ? <Sel className="inp" value={it.goalId} onChange={(e) => u({ goalId: e.target.value })}>{goals.map((g) => <option key={g.id} value={g.id}>{g.nom}</option>)}</Sel> : <span className="hint">Crée d'abord un objectif.</span>}</Field>
          : <Field label="Catégorie"><Sel className="inp" value={it.cat} onChange={(e) => u({ cat: e.target.value })}>{cats.map((c) => <option key={c} value={c}>{CATS[c]}</option>)}</Sel></Field>}
        {it.variable ? (
          <Field label="Montant min – max (FCFA)"><div style={{ display: 'flex', gap: 8 }}><input className="inp num" type="number" placeholder="Min" value={it.min ?? ''} onChange={(e) => u({ min: e.target.value })} /><input className="inp num" type="number" placeholder="Max" value={it.max ?? ''} onChange={(e) => u({ max: e.target.value })} /></div></Field>
        ) : <Field label="Montant (FCFA)"><input className="inp num" type="number" value={it.montant} onChange={(e) => u({ montant: e.target.value })} /></Field>}
        <Field label="Fréquence"><Sel className="inp" value={freq} onChange={(e) => { const v = e.target.value; if (v === 'once') u({ fin: it.debut, every: 1 }); else u({ every: +v, fin: once ? null : it.fin }); }}>
          <option value="1">Mensuel</option><option value="2">Tous les 2 mois</option><option value="3">Trimestriel</option><option value="once">Ponctuel</option></Sel></Field>
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
        <Field label="Objectif lié" hint="La cagnotte sera versée directement sur cet objectif"><Sel className="inp" value={x.goalId || ''} onChange={(e) => u({ goalId: e.target.value || undefined })}><option value="">Aucun (solde disponible)</option>{goals.map((g) => <option key={g.id} value={g.id}>{g.nom}</option>)}</Sel></Field>
      </div>
    </Modal>
  );
}

function CreanceModal({ c, st, onClose, onOk }) {
  const [x, setX] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() + 1); return { id: uid(), sens: 'in', nom: '', tel: '', montant: '', date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`, n: 1, ...(c || {}) }; });
  const t0 = x.initTx && st.transactions.find((t) => t.id === x.initTx);
  const isNew = !c?.id;
  const [mv, setMv] = useState({ on: isNew || !!t0, accountId: t0?.accountId || st.accounts[0]?.id, date: t0?.date || todayISO() });
  const u = (p) => setX((s) => ({ ...s, ...p }));
  const lend = x.sens === 'in';
  return (
    <Modal title={c?.id ? 'Modifier' : lend ? 'Nouvelle créance' : 'Nouvelle dette'} onClose={onClose} footer={<><button className="btn s" onClick={onClose}>Annuler</button><button className="btn p" disabled={!x.nom || !(+x.montant > 0)} onClick={() => onOk({ ...x, montant: +x.montant, n: Math.max(1, +x.n || 1) }, mv)}>Enregistrer</button></>}>
      <div className="seg" style={{ display: 'flex', marginBottom: 18 }}>{[['in', 'On me doit'], ['out', 'Je dois']].map(([k, l]) => <button key={k} style={{ flex: 1 }} className={x.sens === k ? 'on' : ''} onClick={() => u({ sens: k })}>{l}</button>)}</div>
      <div className="form f2">
        <Field label="Personne"><input className="inp" autoFocus value={x.nom} onChange={(e) => u({ nom: e.target.value })} /></Field>
        <Field label="Téléphone" hint="Facultatif · pour la relance WhatsApp"><input className="inp num" inputMode="tel" placeholder="77 000 00 00" value={x.tel || ''} onChange={(e) => u({ tel: e.target.value })} /></Field>
        <Field label="Montant total (FCFA)"><input className="inp num" type="number" value={x.montant} onChange={(e) => u({ montant: e.target.value })} /></Field>
        <Field label="Nombre d'échéances" hint={+x.n > 1 && +x.montant > 0 ? `${fmt(Math.floor(x.montant / x.n))} FCFA par mois` : '1 = en une seule fois'}><input className="inp num" type="number" min={1} max={60} value={x.n} onChange={(e) => u({ n: e.target.value })} /></Field>
        <Field label={(lend ? 'Remboursement · ' : 'À rembourser · ') + (+x.n > 1 ? '1re échéance' : 'date prévue')} span><input className="inp" type="date" value={x.date} onChange={(e) => u({ date: e.target.value })} /></Field>
      </div>
      <div className="debt-move">
        <label className="switch"><input type="checkbox" checked={mv.on} onChange={(e) => setMv({ ...mv, on: e.target.checked })} />{lend ? "J'ai déjà prêté cet argent (il sort de mon compte)" : "J'ai déjà reçu cet argent (il entre sur mon compte)"}</label>
        {mv.on && <div className="form f2" style={{ marginTop: 12 }}>
          <Field label={lend ? 'Prêté depuis' : 'Reçu sur'} span><AccPicker st={st} value={mv.accountId} onChange={(v) => setMv({ ...mv, accountId: v })} /></Field>
          <Field label={lend ? 'Date du prêt' : "Date de réception"}><input className="inp" type="date" value={mv.date} onChange={(e) => setMv({ ...mv, date: e.target.value })} /></Field>
        </div>}
        {!mv.on && <div className="muted" style={{ fontSize: 12.5, marginTop: 8 }}>{t0 ? 'Le mouvement enregistré sera retiré du solde.' : 'Décoche si le prêt date d’avant ton suivi dans Kalis : le solde ne change pas.'}</div>}
      </div>
    </Modal>
  );
}

// =====================================================================
// ================= COMPTES (Wave, Orange Money, Djamo, Mixx) =========
// =====================================================================
function Comptes({ st, set, bal, open, upsert, remove }) {
  const now = new Date(); const cur = mkey(now); const today = todayISO();
  const def = st.accounts[0]?.id;
  const A = (id) => (st.accounts.some((a) => a.id === id) ? id : def);
  const delta = (t, id) => {
    const m = +t.montant || 0;
    if (t.kind === 'in' && A(t.accountId) === id) return m;
    if (t.kind === 'out' && A(t.accountId) === id) return -m;
    if (t.kind === 'move') return (A(t.toAccountId) === id ? m : 0) - (A(t.accountId) === id ? m : 0);
    return 0;
  };
  // Historique de solde sur 30 jours, par compte
  const days = Array.from({ length: 30 }, (_, i) => { const d = new Date(now); d.setDate(d.getDate() - 29 + i); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; });
  const hist = (id) => { const a = st.accounts.find((x) => x.id === id); let v = +a.initial || 0; const sorted = [...st.transactions].sort((x, y) => x.date.localeCompare(y.date)); let j = 0; return days.map((d) => { while (j < sorted.length && sorted[j].date <= d) { v += delta(sorted[j], id); j++; } return v; }); };
  const monthTx = st.transactions.filter((t) => t.date.startsWith(cur));
  const flux = (id) => { let inn = 0, out = 0; for (const t of monthTx) { const d = delta(t, id); if (d > 0) inn += d; else out -= d; } return { inn, out }; };
  const lastOps = (id) => st.transactions.filter((t) => delta(t, id) !== 0).sort((x, y) => y.date.localeCompare(x.date)).slice(0, 3);
  const pos = st.accounts.map((a) => ({ a, v: Math.max(0, bal.accounts[a.id] || 0) }));
  const totPos = pos.reduce((s, x) => s + x.v, 0) || 1;
  const fees = monthTx.filter((t) => t.kind === 'out' && t.cat === 'frais').reduce((s, t) => s + t.montant, 0);
  const moves = st.transactions.filter((t) => t.kind === 'move').sort((x, y) => y.date.localeCompare(x.date));
  const movesM = moves.filter((t) => t.date.startsWith(cur));
  const Spark = ({ vals, color }) => {
    const W = 220, H = 44, mn = Math.min(...vals), mx = Math.max(...vals), r = mx - mn || 1;
    const pts = vals.map((v, i) => `${(i / (vals.length - 1)) * W},${H - 4 - ((v - mn) / r) * (H - 8)}`).join(' ');
    return <svg className="acc-spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"><polyline points={`0,${H} ${pts} ${W},${H}`} fill={color} fillOpacity=".12" stroke="none" /><polyline points={pts} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" /></svg>;
  };
  return (
    <>
      <Top title="Comptes" sub="Où se trouve ton argent">
        <button className="btn s" onClick={() => open('sms', '')}><ClipboardPaste size={15} />Coller un SMS</button>
        <button className="btn s" onClick={() => open('adjust')}><Scale size={15} />Ajuster les soldes</button>
        <button className="btn s" onClick={() => open('tx', { kind: 'move' })}><ArrowLeftRight size={15} />Virement</button>
        <button className="btn p" onClick={() => open('account')}><Plus size={16} />Ajouter un compte</button>
      </Top>
      <div className="content">
        {st.migratedV3 && (
          <div className="alert info"><div className="chip-ic"><Info size={16} /></div>
            <div style={{ flex: 1 }}>Ton solde de départ a été placé sur <b>{st.accounts[0]?.nom}</b>. Indique le solde de départ réel de chaque compte avec le crayon.</div>
            <button className="btn s sm" onClick={() => set({ migratedV3: false })}>C'est fait</button></div>)}

        {/* ---- Synthèse ---- */}
        <div className="acc-sum">
          <div className="dk dk-hero acc-total">
            <div className="dk-top"><span>Total sur les comptes</span><span className="hero-pill up">{st.accounts.length} comptes</span></div>
            <div className="dk-v num">{fmt(bal.comptes)}<small>FCFA</small></div>
            <div className="acc-split">{pos.filter((x) => x.v > 0).map(({ a, v }) => <i key={a.id} title={`${a.nom} · ${fmt(v)} (${Math.round((v / totPos) * 100)} %)`} style={{ width: (v / totPos) * 100 + '%', background: a.couleur }} />)}</div>
            <div className="acc-legend">{pos.filter((x) => x.v > 0).sort((x, y) => y.v - x.v).map(({ a, v }) => <span key={a.id}><i style={{ background: a.couleur }} />{a.nom} <b>{Math.round((v / totPos) * 100)} %</b></span>)}</div>
            <svg className="dk-wave" viewBox="0 0 200 60" preserveAspectRatio="none"><path d="M0 45 C40 30 60 52 100 34 S160 18 200 26 L200 60 L0 60 Z" /></svg>
          </div>
          <div className="dk">
            <div className="dk-top"><span className="dk-ic"><Wallet size={15} /></span><span>Disponible</span></div>
            <div className="dk-v num">{fmt(bal.dispo)}<small>FCFA</small></div>
            <div className="dk-f">Comptes moins l'épargne réservée à tes objectifs ({fmt(bal.comptes - bal.dispo)})</div>
          </div>
          <div className="dk">
            <div className="dk-top"><span className="dk-ic"><ArrowLeftRight size={15} /></span><span>Virements <em className="dk-p">mois</em></span></div>
            <div className="dk-v num">{movesM.length}<small>{fmt(movesM.reduce((s, t) => s + t.montant, 0))} FCFA déplacés</small></div>
            <div className="dk-f">Frais de transfert ce mois : <b className="num">{fmt(fees)}</b> FCFA</div>
          </div>
        </div>

        {/* ---- Cartes de comptes ---- */}
        <div className="acc-grid">
          {st.accounts.map((a) => {
            const f = flux(a.id); const v = bal.accounts[a.id] || 0; const h = hist(a.id); const d30 = v - h[0];
            return (
              <div className={'card accB' + (v < 0 ? ' neg' : '')} key={a.id} style={{ '--acc': a.couleur }}>
                <div className="accB-h">
                  <div className="acc-badge" style={{ background: a.couleur }}>{a.nom.slice(0, 1)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}><div className="accB-n">{a.nom}</div><div className="muted" style={{ fontSize: 12 }}>{Math.round((Math.max(0, v) / totPos) * 100)} % de ton argent{+a.feePct || +a.feeFix ? ` · frais ${a.feePct ? a.feePct + ' %' : ''}${a.feePct && a.feeFix ? ' + ' : ''}${a.feeFix ? fmt(a.feeFix) : ''}` : ''}</div></div>
                  <button className="ib" title="Modifier" onClick={() => open('account', a)}><Pencil size={15} /></button>
                </div>
                <div className={'accB-v num' + (v < 0 ? ' neg' : '')}>{fmt(v)}<small>FCFA</small></div>
                <div className="accB-d"><span className={d30 >= 0 ? 'pos' : 'neg'}>{d30 >= 0 ? '↑' : '↓'} {fmt(Math.abs(d30))}</span><span className="muted">sur 30 jours</span></div>
                <Spark vals={h} color={a.couleur} />
                <div className="accB-f"><div><span className="muted">Entrées · mois</span><b className="num pos">+{fmt(f.inn)}</b></div><div><span className="muted">Sorties · mois</span><b className="num neg">−{fmt(f.out)}</b></div></div>
                <div className="accB-ops">{lastOps(a.id).map((t) => { const d = delta(t, a.id); return <div key={t.id}><span>{t.label}</span><b className={'num ' + (d > 0 ? 'pos' : '')}>{d > 0 ? '+' : '−'}{fmt(Math.abs(d))}</b></div>; })}{!lastOps(a.id).length && <div className="muted">Aucune opération</div>}</div>
                <div className="accB-act">
                  <button onClick={() => open('adjust', { accountId: a.id })}><Scale size={14} />Ajuster</button>
                  <button onClick={() => open('tx', { kind: 'move', accountId: a.id, toAccountId: st.accounts.find((x) => x.id !== a.id)?.id })}><ArrowUpRight size={14} />Envoyer</button>
                  <button onClick={() => open('tx', { kind: 'move', toAccountId: a.id, accountId: st.accounts.find((x) => x.id !== a.id)?.id })}><ArrowDownLeft size={14} />Recharger</button>
                </div>
              </div>);
          })}
          <button className="card accB add" onClick={() => open('account')}><Plus size={20} /><b>Ajouter un compte</b><span className="muted">Wave, Orange Money, Djamo, Mixx, Espèces…</span></button>
        </div>

        {/* ---- Virements ---- */}
        <Card title="Derniers virements" sub={moves.length ? `${moves.length} au total` : null} style={{ marginTop: 16 }} flush>
          {moves.slice(0, 8).map((t) => { const fa = st.accounts.find((x) => x.id === t.accountId) || {}; const ta = st.accounts.find((x) => x.id === t.toAccountId) || {}; return (
            <div className="row mv-row" key={t.id}><DChip iso={t.date} />
              <div className="mv-path"><span><i style={{ background: fa.couleur }} />{fa.nom}</span><ArrowLeftRight size={13} className="muted" /><span><i style={{ background: ta.couleur }} />{ta.nom}</span></div>
              <div className="s muted" style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.label}</div>
              <div className="a num">{fmt(t.montant)}</div></div>); })}
          {!moves.length && <Empty icon={ArrowLeftRight} title="Aucun virement" text="Transfère de l'argent entre Wave, Orange Money, Djamo et Mixx." />}
        </Card>
      </div>
    </>
  );
}

function AccountModal({ a, st, onClose, onOk, onDelete }) {
  const [x, setX] = useState({ id: uid(), nom: '', couleur: '#64748B', initial: 0, feePct: '', feeFix: '', ...(a || {}) });
  const clean = () => ({ ...x, initial: +x.initial || 0, feePct: +x.feePct || 0, feeFix: +x.feeFix || 0 });
  const used = a && st.transactions.some((t) => t.accountId === a.id || t.toAccountId === a.id);
  return (
    <Modal title={a ? `Modifier · ${a.nom}` : 'Nouveau compte'} onClose={onClose} onEnter={() => x.nom && onOk(clean())}
      footer={<>{a && st.accounts.length > 1 && <button className="btn d" style={{ marginRight: 'auto' }} disabled={used} title={used ? 'Ce compte a des opérations' : ''} onClick={() => onDelete(a.id)}><Trash2 size={14} />Supprimer</button>}
        <button className="btn s" onClick={onClose}>Annuler</button><button className="btn p" disabled={!x.nom} onClick={() => onOk(clean())}>Enregistrer</button></>}>
      <div className="form f2">
        <Field label="Nom"><input className="inp" autoFocus value={x.nom} onChange={(e) => setX({ ...x, nom: e.target.value })} /></Field>
        <Field label={`Solde au ${dLabel(st.dateInitiale)} (FCFA)`} hint="Solde de départ du compte"><input className="inp num" type="number" value={x.initial} onChange={(e) => setX({ ...x, initial: e.target.value })} /></Field>
        <Field label="Frais d'envoi (%)" hint="Appliqués aux virements depuis ce compte"><input className="inp num" type="number" step="0.1" placeholder="ex. 1" value={x.feePct} onChange={(e) => setX({ ...x, feePct: e.target.value })} /></Field>
        <Field label="Frais fixes (FCFA)" hint="Ajoutés à chaque virement"><input className="inp num" type="number" placeholder="0" value={x.feeFix} onChange={(e) => setX({ ...x, feeFix: e.target.value })} /></Field>
        <Field label="Couleur" span><div className="swatches">{['#1DC8FF', '#FF7900', '#7C3AED', '#E6B400', '#10B981', '#64748B', '#EC4899'].map((c) => <button key={c} className={'sw' + (x.couleur === c ? ' on' : '')} style={{ background: c }} onClick={() => setX({ ...x, couleur: c })} />)}</div></Field>
      </div>
    </Modal>
  );
}

// =====================================================================
// ================= BUDGETS ===========================================
// =====================================================================
function Budgets({ st, set, open, updateTx }) {
  const [m, setM] = useState(mkey(new Date()));
  const draft = st.budgets || {};
  const [saved, setSaved] = useState(false);
  const habM = habitsMonthly(st, m);
  const nVieAll = st.transactions.filter((t) => t.kind === 'out' && t.cat === 'vie' && t.date.startsWith(m)).length;
  useEffect(() => { if (!saved) return; const t = setTimeout(() => setSaved(false), 1500); return () => clearTimeout(t); }, [saved]);
  // Enregistrement immédiat : chaque modification est sauvegardée sans bouton
  const setBudget = (c, v) => { const nb = { ...st.budgets }; if (+v > 0) nb[c] = +v; else delete nb[c]; set({ budgets: nb }); setSaved(true); };
  const total = CATS_VIE.reduce((s, c) => s + (+draft[c] || 0), 0);
  const spent = spentVie(st, m);
  const d = new Date(); const isCur = m === mkey(d); const prog = isCur ? d.getDate() / daysIn(m) : 1;
  const dim = daysIn(m); const dayNow = isCur ? d.getDate() : dim; const daysLeft = isCur ? dim - d.getDate() + 1 : 0;
  const paceTot = Math.round(spent / dayNow * dim);
  const revPlan = monthPlan(st, m).entrees;
  const [detail, setDetail] = useState(null);
  const [showSugg, setSugg] = useState(false);
  // Suggestions : moyenne des mois complets précédents (jusqu'à 3) depuis la date de départ, sinon rythme du mois en cours
  const startK = (st.dateInitiale || '').slice(0, 7);
  const cur0 = mkey(d);
  const prevMonths = [1, 2, 3].map((i) => addMonths(cur0, -i)).filter((k) => k > startK);
  const histMonths = prevMonths.length;
  const sugg = useMemo(() => {
    const o = {};
    for (const c of CATS_VIE) {
      let v;
      if (histMonths) v = prevMonths.reduce((s2, k) => s2 + spentCat(st, k, c), 0) / histMonths;
      else { const dn = d.getDate(); v = spentCat(st, cur0, c) / dn * daysIn(cur0); }
      o[c] = v > 0 ? Math.ceil(v / 1000) * 1000 : 0;
    }
    return o;
  }, [st.transactions]);
  const [pick, setPick] = useState({});
  useEffect(() => { if (showSugg) setPick(Object.fromEntries(CATS_VIE.filter((c) => sugg[c] > 0 && !(+draft[c] > 0)).map((c) => [c, String(sugg[c])]))); }, [showSugg]);
  const offBudget = CATS_VIE.filter((c) => !(+draft[c] > 0) && spentCat(st, m, c) > 0);
  return (
    <>
      <Top title="Budgets" sub="Plafonds mensuels de tes dépenses variables">
        <button className="btn s" onClick={() => open('habits')}><Repeat size={15} />Mes habitudes</button>
        {nVieAll > 0 && <button className="btn s" onClick={() => open('tri')}><ListChecks size={15} />Trier Vie courante <span className="badge" style={{ marginLeft: 2 }}>{nVieAll}</span></button>}
        <span className={'save-ind' + (saved ? ' on' : '')}><Check size={14} />{saved ? 'Enregistré' : 'Enregistrement automatique'}</span>
      </Top>
      <div className="content">
        <div className="grid g3">
          <Kpi accent icon={Gauge} k="Budget mensuel total" v={<>{fmt(total)}<small>FCFA</small></>} f={revPlan > 0 ? `${Math.round((total / revPlan) * 100)} % de tes revenus prévus du mois` : 'Utilisé dans la projection'} />
          <Kpi icon={ArrowUpRight} tone={spent > total && total > 0 ? 'r' : 'o'} k={`Dépensé · ${mLabel(m, true)}`} v={<>{fmt(spent)}<small>FCFA</small></>} f={total ? `${Math.round((spent / total) * 100)} % du budget${isCur ? ` · à ce rythme ${fmt(paceTot)} en fin de mois` : ''}` : 'Aucun budget défini'} />
          <Kpi icon={Wallet} tone={total - spent < 0 ? 'r' : 'g'} k="Reste à dépenser" v={<span className={total - spent < 0 ? 'neg' : ''}>{fmt(total - spent)}</span>} f={isCur ? (daysLeft > 0 && total - spent > 0 ? `soit ${fmt((total - spent) / daysLeft)} FCFA par jour (${daysLeft} j)` : 'Budget du mois épuisé') : 'Mois terminé'} />
        </div>

        {offBudget.length > 0 && (
          <div className="alert warn mt" style={{ marginBottom: 0 }}>
            <div className="chip-ic"><AlertTriangle size={16} /></div>
            <div style={{ flex: 1 }}>Dépenses <b>hors budget</b> ce mois-ci : {offBudget.map((c) => `${CATS[c]} (${fmt(spentCat(st, m, c))})`).join(', ')}.</div>
            <button className="btn s sm" onClick={() => setSugg(true)}>Créer leurs budgets</button>
          </div>)}

        <div className="card mt tbl" style={{ overflow: 'hidden' }}>
          <div className="card-h">
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><button className="btn s sm" onClick={() => setM(addMonths(m, -1))}>‹</button><b style={{ minWidth: 120, textAlign: 'center', textTransform: 'capitalize' }}>{mLabel(m, true)}</b><button className="btn s sm" onClick={() => setM(addMonths(m, 1))}>›</button></div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <span className="muted" style={{ fontSize: 12.5 }}>Trait vertical = où tu devrais en être aujourd'hui</span>
              <button className="btn s sm" onClick={() => setSugg(true)}><Sparkles size={14} />Budgets suggérés</button>
            </div>
          </div>
          {CATS_VIE.map((c) => {
            const b = +draft[c] || 0; const sp = spentCat(st, m, c); const p = b ? sp / b : 0;
            const pace = isCur ? Math.round(sp / dayNow * dim) : sp;
            const col = p > 1 ? 'var(--neg)' : p > 0.85 ? 'var(--warn)' : 'var(--primary)';
            const nTx = st.transactions.filter((t) => t.kind === 'out' && t.cat === c && t.date.startsWith(m)).length;
            const off = !b && sp > 0;
            return (
              <div className={'row budget-row' + (off ? ' off-budget' : '')} key={c}>
                <button className="bud-name" onClick={() => setDetail(c)} title="Voir les opérations">
                  <span className="bud-ic">{React.createElement(catIcon(c), { size: 15 })}</span>
                  <span><b>{CATS[c]}</b><span className="muted">{nTx} opération{nTx > 1 ? 's' : ''}</span></span>
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="bar budget-bar" style={{ height: 10 }}><i style={{ width: b ? Math.min(100, p * 100) + '%' : sp > 0 ? '100%' : 0, background: off ? 'repeating-linear-gradient(45deg, var(--warn) 0 6px, transparent 6px 10px)' : col }} />{isCur && b > 0 && <em style={{ left: prog * 100 + '%' }} />}</div>
                  <div className="bud-meta">
                    <span><b className="num">{fmt(sp)}</b> dépensés{b ? ` · ${Math.round(p * 100)} %` : ''}</span>
                    {off && <span className="badge warn" style={{ marginLeft: 0 }}>Hors budget</span>}
                    {p > 1 && <span className="badge r" style={{ marginLeft: 0 }}>Dépassé de {fmt(sp - b)}</span>}
                    {p > 0.85 && p <= 1 && <span className="badge warn" style={{ marginLeft: 0 }}>Presque atteint</span>}
                    {isCur && sp > 0 && <span className={'pace ' + (b && pace > b ? 'neg' : '')}>À ce rythme : <b className="num">{fmt(pace)}</b></span>}
                    {isCur && b > 0 && sp < b && daysLeft > 0 && <span className="pace">≈ <b className="num">{fmt((b - sp) / daysLeft)}</b> / jour possible</span>}
                    {habM[c] > 0 && <span className={'pace' + (b && b < habM[c] ? ' neg' : '')} title="Coût de tes habitudes ce mois-ci">Habitudes : <b className="num">{fmt(habM[c])}</b>{b && b < habM[c] ? ' · budget trop bas' : ''}</span>}
                  </div>
                </div>
                {off ? <button className="btn s sm" onClick={() => setBudget(c, sugg[c] || Math.ceil(pace / 1000) * 1000)}><Plus size={13} />Budget {fmt(sugg[c] || Math.ceil(pace / 1000) * 1000)}</button> : null}
                <input className="inp num" style={{ width: 130, textAlign: 'right' }} type="number" placeholder="Budget" value={draft[c] ?? ''} onChange={(e) => setBudget(c, e.target.value)} />
              </div>);
          })}
        </div>

        {showSugg && (
          <Modal title="Budgets suggérés" onClose={() => setSugg(false)}
            footer={<><span className="muted" style={{ fontSize: 12.5, marginRight: 'auto' }}>Nouveau total : <b style={{ color: 'var(--ink)' }}>{fmt(CATS_VIE.reduce((s2, c) => s2 + (pick[c] ? +pick[c] : +draft[c] || 0), 0))}</b> FCFA</span><button className="btn s" onClick={() => setSugg(false)}>Annuler</button><button className="btn p" onClick={() => { const nb = { ...st.budgets }; for (const [c, v] of Object.entries(pick)) { if (+v > 0) nb[c] = +v; } set({ budgets: nb }); setSaved(true); setSugg(false); }}><Check size={15} />Appliquer</button></>}>
            <div className="muted" style={{ fontSize: 13, marginBottom: 12 }}>{histMonths ? `Calculés sur tes dépenses moyennes des ${histMonths} derniers mois, arrondies au millier.` : `Pas encore de mois complet : calculés sur ton rythme des ${new Date().getDate()} premiers jours, arrondis au millier. Ils deviendront plus fiables le mois prochain.`} Coche ce que tu veux appliquer.</div>
            <div className="bulk-list">
              {CATS_VIE.filter((c) => sugg[c] > 0 || +draft[c] > 0).map((c) => (
                <div className={'bulk-row' + (pick[c] ? '' : ' off')} key={c}>
                  <input type="checkbox" checked={!!pick[c]} onChange={(e) => setPick({ ...pick, [c]: e.target.checked ? String(sugg[c] || draft[c] || '') : undefined })} />
                  <span className="bud-ic">{React.createElement(catIcon(c), { size: 14 })}</span>
                  <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 600, fontSize: 13.5 }}>{CATS[c]}</div><div className="muted" style={{ fontSize: 12 }}>Actuel : {draft[c] ? fmt(draft[c]) : 'aucun'} · suggéré : {fmt(sugg[c] || 0)}</div></div>
                  <input className="inp num" style={{ width: 120, textAlign: 'right' }} type="number" disabled={!pick[c]} value={pick[c] ?? ''} onChange={(e) => setPick({ ...pick, [c]: e.target.value })} />
                </div>))}
            </div>
          </Modal>)}

        {detail && (
          <Modal title={`${CATS[detail]} · ${mLabel(m, true)}`} onClose={() => setDetail(null)} footer={<><span className="muted" style={{ fontSize: 12.5, marginRight: 'auto' }}>Total : <b style={{ color: 'var(--ink)' }}>{fmt(spentCat(st, m, detail))}</b> FCFA{+draft[detail] ? ` sur ${fmt(draft[detail])}` : ''}</span><button className="btn s" onClick={() => setDetail(null)}>Fermer</button></>}>
            <div className="bulk-list">
              {st.transactions.filter((t) => t.kind === 'out' && t.cat === detail && t.date.startsWith(m)).sort((a, b2) => b2.date.localeCompare(a.date)).map((t) => (
                <div className="bulk-row" key={t.id}>
                  <DChip iso={t.date} />
                  <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 550, fontSize: 13.5 }}>{t.label}</div><div className="muted" style={{ fontSize: 12 }}>{accName(st, t.accountId)}</div></div>
                  <Sel className="inp acc-sel" title="Changer de catégorie" value={t.cat} onChange={(e) => updateTx(t.id, { cat: e.target.value, label: t.label === CATS[t.cat] ? CATS[e.target.value] : t.label })}>{CATS_OUT.map((x) => <option key={x} value={x}>{CATS[x]}</option>)}</Sel>
                  <b className="neg num" style={{ minWidth: 70, textAlign: 'right' }}>−{fmt(t.montant)}</b>
                  <button className="ib" title="Modifier" onClick={() => open('tx', { ...t, editId: t.id, montant: String(t.montant) })}><Pencil size={14} /></button>
                </div>))}
              {!st.transactions.some((t) => t.kind === 'out' && t.cat === detail && t.date.startsWith(m)) && <div className="empty" style={{ padding: 20 }}>Aucune dépense dans cette catégorie ce mois-ci.</div>}
            </div>
          </Modal>)}

        <Card title="Mes catégories" sub="Catégories personnalisées, utilisables partout dans Kalis" style={{ marginTop: 16 }} action={<button className="btn s sm" onClick={() => open('cat')}><Plus size={14} />Nouvelle catégorie</button>} flush>
          {(st.customCats || []).length ? st.customCats.map((c) => (
            <div className="row" key={c.id}>
              <div className="chip-ic p" style={{ width: 30, height: 30 }}><Tag size={14} /></div>
              <div><div className="t">{c.nom}</div><div className="s">{c.kind === 'in' ? 'Entrée' : c.vie ? 'Dépense courante · suivie dans les budgets' : 'Dépense'} · {st.transactions.filter((t) => t.cat === c.id).length} opération(s)</div></div>
              <button className="ib" style={{ marginLeft: 'auto' }} title="Supprimer (les opérations passent en « Autre »)" onClick={() => { const b2 = { ...st.budgets }; delete b2[c.id]; set({ customCats: st.customCats.filter((x) => x.id !== c.id), budgets: b2, transactions: st.transactions.map((t) => (t.cat === c.id ? { ...t, cat: 'autre' } : t)), items: st.items.map((i) => (i.cat === c.id ? { ...i, cat: 'autre' } : i)) }); }}><Trash2 size={15} /></button>
            </div>)) : <Empty icon={Tag} title="Aucune catégorie personnalisée" text="Ex. Ndogou, Crédit téléphone, Coiffeur…" />}
        </Card>
        <div className="muted" style={{ fontSize: 12.5, marginTop: 10 }}>Les dépenses sont comptées à partir des opérations enregistrées dans ces catégories. Les charges fixes (loyer, factures…) se gèrent dans Flux récurrents.</div>
      </div>
    </>
  );
}

// =====================================================================
// ================= BILAN =============================================
// =====================================================================
function Bilan({ st, exportPDF, makeReport }) {
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
        <button className="btn s no-print" onClick={() => exportPDF(`Kalis-bilan-${m}.pdf`)}><FileText size={15} />PDF de l'écran</button>
        <button className="btn p no-print" onClick={() => makeReport(m)}><FileBarChart size={15} />Rapport du mois</button>
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
                    <Kpi icon={Target} tone="s" k="Objectifs" v={`${st.goals.filter(isGoalActive).filter((g) => { const r = goalReach(simRows, g); return r && monthDiff(g.echeance, r.key) <= 0; }).length} / ${st.goals.filter(isGoalActive).length}`} f="atteints à temps" />
                  </div>
                  <Card title="Solde disponible : actuel et scénario" style={{ marginTop: 16 }} action={<div className="legend"><span><i style={{ background: c.axis }} />Actuel</span><span><i style={{ background: 'var(--primary)' }} />{sc.nom}</span></div>}>
                    <div style={{ height: 300 }}><ResponsiveContainer><LineChart data={data} margin={{ top: 6, right: 24, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke={c.grid} strokeDasharray="3 4" vertical={false} /><XAxis dataKey="label" interval={data.length > 14 ? 1 : 0} {...axis} /><YAxis tickFormatter={short} width={56} {...axis} />
                      <Tooltip content={<Tip />} /><ReferenceLine y={0} stroke={c.zero} />
                      <Line type="monotone" dataKey="Actuel" stroke={c.axis} strokeWidth={2} strokeDasharray="6 4" dot={false} animationDuration={400} />
                      <Line type="monotone" dataKey="Scénario" name={sc.nom} stroke={c.primary} strokeWidth={2.6} dot={false} animationDuration={400} />
                    </LineChart></ResponsiveContainer></div>
                  </Card>
                  {st.goals.some(isGoalActive) && <Card title="Objectifs dans ce scénario" style={{ marginTop: 16 }} flush>
                    {st.goals.filter(isGoalActive).map((g) => { const a = goalReach(rows, g); const b = goalReach(simRows, g); return (
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
            {(adj.type === 'stop' || adj.type === 'change') && <Field label="Flux" span><Sel className="inp" value={adj.itemId} onChange={(e) => setAdj({ ...adj, itemId: e.target.value })}>{st.items.map((i) => <option key={i.id} value={i.id}>{i.label} · {fmt(i.montant)}</option>)}</Sel></Field>}
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

// =====================================================================
// ================= VALIDATION GROUPÉE DES ÉCHÉANCES ==================
// =====================================================================
function BulkModal({ list, st, onClose, onOk }) {
  const [rows, setRows] = useState(() => list.map((o) => ({ ...o, on: true, montant: String(Math.round(o.amount)), accountId: o.src?.accountId || st.accounts[0]?.id })));
  const u = (i, p) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const sel = rows.filter((r) => r.on && +r.montant > 0);
  const net = sel.reduce((s, r) => s + (r.kind === 'in' ? +r.montant : -r.montant), 0);
  return (
    <Modal title="Valider les échéances échues" onClose={onClose}
      footer={<><span className="muted" style={{ fontSize: 12.5, marginRight: 'auto' }}>{sel.length} sélectionnée{sel.length > 1 ? 's' : ''} · impact {net >= 0 ? '+' : '−'}{fmt(Math.abs(net))} FCFA</span><button className="btn s" onClick={onClose}>Annuler</button><button className="btn p" disabled={!sel.length} onClick={() => onOk(sel.map((r) => ({ ...r, due: r.amount, amount: +r.montant })))}><CheckCheck size={15} />Valider</button></>}>
      <div className="muted" style={{ fontSize: 13, marginBottom: 12 }}>Ajuste les montants réels si besoin, décoche ce qui n'a pas encore eu lieu.</div>
      <div className="bulk-list">
        {rows.map((r, i) => (
          <div className={'bulk-row' + (r.on ? '' : ' off')} key={r.ref}>
            <input type="checkbox" checked={r.on} onChange={(e) => u(i, { on: e.target.checked })} />
            <DChip iso={r.date} late={r.late} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="t" style={{ fontWeight: 550, fontSize: 13.5 }}>{r.label}</div>
              {r.kind !== 'save' && <Sel className="inp acc-sel" value={r.accountId} disabled={!r.on} onChange={(e) => u(i, { accountId: e.target.value })}>{st.accounts.map((a) => <option key={a.id} value={a.id}>{r.kind === 'in' ? 'Reçu sur ' : 'Payé depuis '}{a.nom}</option>)}</Sel>}
            </div>
            <span className={tone(r.kind)} style={{ fontWeight: 650 }}>{sign(r.kind)}</span>
            <input className="inp num" style={{ width: 120, textAlign: 'right' }} type="number" disabled={!r.on} value={r.montant} onChange={(e) => u(i, { montant: e.target.value })} />
          </div>))}
      </div>
    </Modal>
  );
}

// =====================================================================
// ================= OBJECTIF ATTEINT / ARCHIVÉ ========================
// =====================================================================
function GoalDoneModal({ g, st, bal, onClose, onOk }) {
  const v = Math.max(0, bal.goals[g.id] || 0);
  const archive = !!g.archive;
  const [spend, setSpend] = useState(!archive && v > 0);
  const [montant, setMontant] = useState(String(v));
  const [accountId, setAcc] = useState(st.accounts[0]?.id);
  const [cat, setCat] = useState('autre');
  const [label, setLabel] = useState(`Achat · ${g.nom}`);
  const [release, setRelease] = useState(v > 0);
  const rest = Math.max(0, v - (spend ? +montant || 0 : 0));
  const ok = !spend || (+montant > 0 && +montant <= v);
  return (
    <Modal title={archive ? `Archiver · ${g.nom}` : `Objectif atteint · ${g.nom}`} onClose={onClose}
      footer={<><button className="btn s" onClick={onClose}>Annuler</button><button className="btn p" disabled={!ok} onClick={() => onOk({ spend: !archive && spend, montant: +montant, accountId, cat, label, release: archive ? (release ? v : 0) : (spend && release ? rest : 0) })}>{archive ? <><Archive size={15} />Archiver</> : <><Trophy size={15} />Valider</>}</button></>}>
      {!archive && (
        <div className="goal-done-hero">
          <Trophy size={28} />
          <div><b>{fmt(v)} FCFA</b> épargnés sur {fmt(g.montant)} FCFA{v >= g.montant ? ' : objectif rempli.' : '.'}</div>
        </div>)}
      {archive ? (
        <>
          <div className="muted" style={{ fontSize: 13.5 }}>L'objectif disparaît du tableau de bord et de la projection, mais reste consultable dans « Atteints et archivés ».</div>
          {v > 0 && <label className="switch" style={{ marginTop: 16 }}><input type="checkbox" checked={release} onChange={(e) => setRelease(e.target.checked)} />Remettre les {fmt(v)} FCFA épargnés dans le solde disponible</label>}
        </>
      ) : (
        <>
          <div className="seg" style={{ display: 'flex', marginBottom: 16 }}>
            <button style={{ flex: 1 }} className={spend ? 'on' : ''} onClick={() => setSpend(true)} disabled={v <= 0}>J'ai utilisé l'argent</button>
            <button style={{ flex: 1 }} className={!spend ? 'on' : ''} onClick={() => setSpend(false)}>Je garde l'argent de côté</button>
          </div>
          {spend ? (
            <div className="form f2">
              <Field label="Montant dépensé (FCFA)" hint={+montant > v ? `Maximum ${fmt(v)}` : rest > 0 ? `${fmt(rest)} resteront sur l'objectif` : null}><input className="inp num" type="number" value={montant} onChange={(e) => setMontant(e.target.value)} /></Field>
              <Field label="Catégorie"><Sel className="inp" value={cat} onChange={(e) => setCat(e.target.value)}>{CATS_OUT.map((c) => <option key={c} value={c}>{CATS[c]}</option>)}</Sel></Field>
              <Field label="Libellé" span><input className="inp" value={label} onChange={(e) => setLabel(e.target.value)} /></Field>
              <Field label="Payé depuis" span><AccPicker st={st} value={accountId} onChange={setAcc} /></Field>
              {rest > 0 && <label className="switch" style={{ gridColumn: '1 / -1' }}><input type="checkbox" checked={release} onChange={(e) => setRelease(e.target.checked)} />Remettre le reste ({fmt(rest)} FCFA) dans le solde disponible</label>}
            </div>
          ) : <div className="muted" style={{ fontSize: 13.5 }}>L'objectif est marqué comme atteint. L'argent reste affecté à cet objectif tant que tu ne le retires pas.</div>}
        </>
      )}
    </Modal>
  );
}

function GoalHistoryModal({ g, st, bal, onClose }) {
  const tx = st.transactions.filter((t) => t.goalId === g.id).sort((a, b) => b.date.localeCompare(a.date));
  const lbl = { save: 'Versement', withdraw: 'Retrait', in: 'Cagnotte / entrée directe' };
  const plus = (t) => t.kind === 'save' || t.kind === 'in';
  const totIn = tx.filter(plus).reduce((s, t) => s + t.montant, 0); const totOut = tx.filter((t) => !plus(t)).reduce((s, t) => s + t.montant, 0);
  return (
    <Modal title={`Historique · ${g.nom}`} onClose={onClose} footer={<button className="btn s" onClick={onClose}>Fermer</button>}>
      <div className="meta" style={{ marginTop: 0, marginBottom: 14 }}>
        <div><div className="k">Versé</div><div className="v pos">+{fmt(totIn + (+g.initial || 0))}</div></div>
        <div><div className="k">Retiré</div><div className="v neg">−{fmt(totOut)}</div></div>
        <div><div className="k">Solde</div><div className="v">{fmt(bal.goals[g.id] || 0)}</div></div>
      </div>
      <div className="bulk-list">
        {+g.initial > 0 && <div className="bulk-row"><div className="chip-ic s" style={{ width: 30, height: 30 }}><PiggyBank size={14} /></div><div style={{ flex: 1 }}><div style={{ fontWeight: 550 }}>Déjà épargné à la création</div></div><b className="pos">+{fmt(g.initial)}</b></div>}
        {tx.map((t) => (
          <div className="bulk-row" key={t.id}>
            <DChip iso={t.date} />
            <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 550, fontSize: 13.5 }}>{t.label}</div><div className="muted" style={{ fontSize: 12 }}>{lbl[t.kind] || t.kind}</div></div>
            <b className={plus(t) ? 'pos' : 'neg'}>{plus(t) ? '+' : '−'}{fmt(t.montant)}</b>
          </div>))}
        {!tx.length && !(+g.initial > 0) && <div className="empty" style={{ padding: 20 }}>Aucun mouvement pour l'instant.</div>}
      </div>
    </Modal>
  );
}

// =====================================================================
// ================= 1.6.0 : saisie express, plan d'épargne, catégories =
// =====================================================================
const CAT_ICONS = { alimentation: UtensilsCrossed, transport: Bus, loisirs: Ticket, shopping: ShoppingBag, sante: HeartPulse, famille: Users, vie: Wallet };
const catIcon = (c) => CAT_ICONS[c] || Tag;

function QuickAdd({ st, addTx, setSettings, setToast, open, compact }) {
  const q = st.settings.quick || {};
  const [m, setM] = useState('');
  const [cat, setCat] = useState(q.cat && CATS_VIE.includes(q.cat) ? q.cat : 'alimentation');
  const [acc, setAcc] = useState(q.acc && st.accounts.some((a) => a.id === q.acc) ? q.acc : st.accounts[0]?.id);
  const ref = React.useRef(null);
  const add = () => {
    if (!(+m > 0)) { ref.current?.focus(); return; }
    addTx({ date: todayISO(), label: CATS[cat], kind: 'out', cat, montant: +m, accountId: acc });
    setSettings({ quick: { ...q, cat, acc } });
    const left = (balances(st).accounts[acc] || 0) - +m;
    setToast({ msg: `${fmt(+m)} FCFA · ${CATS[cat]} · ${accName(st, acc)}${left < 0 ? ` · attention, ${accName(st, acc)} passe à −${fmt(-left)}` : ''}`, prev: st });
    setM(''); ref.current?.focus();
  };
  const pick = (c) => { setCat(c); ref.current?.focus(); };
  // Habitudes du jour + ce que je peux encore dépenser aujourd'hui
  const habits = st.settings.habits || [];
  const logHabit = (h) => {
    addTx({ date: todayISO(), label: h.label, kind: 'out', cat: h.cat, montant: +h.montant, accountId: acc });
    setToast({ msg: `${h.label} · ${fmt(h.montant)} FCFA · ${accName(st, acc)}`, prev: st });
  };
  const today = todayISO(); const cur = today.slice(0, 7);
  const dimQ = new Date(+cur.slice(0, 4), +cur.slice(5, 7), 0).getDate(); const dayQ = +today.slice(8, 10);
  const bt = bTotal(st);
  const spentToday = st.transactions.filter((t) => t.kind === 'out' && t.date === today && CATS_VIE.includes(t.cat)).reduce((s2, t) => s2 + t.montant, 0);
  const spentBefore = spentVie(st, cur) - spentToday;
  const perDay = bt ? Math.max(0, (bt - spentBefore) / (dimQ - dayQ + 1)) : 0;
  const amount = (
    <div className="qa-amount">
      <input ref={ref} className="num" type="number" inputMode="numeric" placeholder="0" value={m} onChange={(e) => setM(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
      <span>FCFA</span>
    </div>
  );

  if (compact) return (
    <div className="card rail-card qbC">
      <div className="rc-h"><h3>Saisie express</h3>{bt > 0 && <span className={'qb-today' + (spentToday > perDay ? ' over' : '')} title="Dépensé aujourd'hui / possible aujourd'hui">Auj. {fmt(spentToday)} / {fmt(perDay)}</span>}</div>
      <div className="qb-habits">
        {habits.map((h) => { const done = habitLogged(st, h); const td = habitToday(h); return <button key={h.id} className={(done ? 'done ' : '') + (td ? '' : 'off')} title={`${CATS[h.cat]} · ${JOURS[h.jours] || ''}`} onClick={() => logHabit(h)}>{done ? <Check size={13} /> : React.createElement(catIcon(h.cat), { size: 13 })}{h.label}<b className="num">{fmt(h.montant)}</b></button>; })}
        <button className="qb-hset" onClick={() => open('habits')} title="Gérer mes habitudes"><Settings size={13} /></button>
      </div>
      <div className="qbC-row">
        <input ref={ref} className="inp num" type="number" inputMode="numeric" placeholder="Montant" value={m} onChange={(e) => setM(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
        <button className="btn p" onClick={add} title="Ajouter (Entrée)"><Plus size={16} /></button>
      </div>
      <div className="qbC-row">
        <label className="dsel"><span className="bud-ic">{React.createElement(catIcon(cat), { size: 13 })}</span><Sel value={cat} onChange={(e) => pick(e.target.value)}>{CATS_VIE.map((c) => <option key={c} value={c}>{CATS[c]}</option>)}</Sel><ChevronDown size={13} /></label>
        <label className="dsel"><i className="dot" style={{ background: (st.accounts.find((a) => a.id === acc) || {}).couleur }} /><Sel value={acc} onChange={(e) => setAcc(e.target.value)}>{st.accounts.map((a) => <option key={a.id} value={a.id}>{a.nom}</option>)}</Sel><ChevronDown size={13} /></label>
      </div>
    </div>
  );
  return (
    <div className="card qb mt">
      <div className="qb-head"><div><b>Saisie express</b><span className="muted"> · dépense d'aujourd'hui</span></div>
        {bt > 0 && <div className={'qb-today' + (spentToday > perDay ? ' over' : '')} title="Budgets du mois restants ÷ jours restants">Aujourd'hui <b className="num">{fmt(spentToday)}</b> / {fmt(perDay)} possibles</div>}
        <div className="qb-acc">{st.accounts.map((a) => <button key={a.id} className={acc === a.id ? 'on' : ''} onClick={() => setAcc(a.id)} title={a.nom}><i style={{ background: a.couleur }} />{a.nom}</button>)}</div></div>
      <div className="qb-habits">
        <span className="muted">Habitudes</span>
        {habits.map((h) => { const done = habitLogged(st, h); const td = habitToday(h); return <button key={h.id} className={(done ? 'done ' : '') + (td ? '' : 'off')} title={done ? 'Déjà saisi aujourd’hui · cliquer pour en ajouter un autre' : `${CATS[h.cat]} · ${JOURS[h.jours] || ''}`} onClick={() => logHabit(h)}>{done ? <Check size={13} /> : React.createElement(catIcon(h.cat), { size: 13 })}{h.label}<b className="num">{fmt(h.montant)}</b></button>; })}
        <button className="qb-hset" onClick={() => open('habits')} title="Gérer mes habitudes"><Settings size={13} />{habits.length ? '' : 'Ajouter mes habitudes'}</button>
      </div>
      <div className="qb-body">
        <div className="qb-tiles">{CATS_VIE.map((c) => { const I = catIcon(c); return <button key={c} className={cat === c ? 'on' : ''} onClick={() => pick(c)}><span className="qb-ic"><I size={18} /></span>{CATS[c]}</button>; })}</div>
        <div className="qb-input">{amount}
          <div className="qb-fast">{[200, 500, 1000, 2000].map((v) => <button key={v} onClick={() => { setM(String(v)); ref.current?.focus(); }}>{v >= 1000 ? `${v / 1000} k` : v}</button>)}</div>
          <button className="btn p" onClick={add}><CornerDownLeft size={15} />Ajouter</button></div>
      </div>
    </div>
  );
}

function PlanModal({ g, st, bal, onClose, onOk }) {
  const nk = addMonths(mkey(new Date()), 1);
  const v = bal.goals[g.id] || 0;
  const tons = st.tontines.filter((t) => t.goalId === g.id && !st.done[`tr:${t.id}:${addMonths(t.debut, t.position - 1)}`]).reduce((x, t) => x + t.cotisation * t.participants, 0);
  const reste = Math.max(0, g.montant - v - tons);
  const n = Math.max(1, monthDiff(nk, g.echeance) + 1);
  const existing = st.items.filter((i) => i.kind === 'save' && i.goalId === g.id);
  const [montant, setMontant] = useState(String(Math.ceil(reste / n / 500) * 500));
  const [jour, setJour] = useState(28);
  const [debut, setDebut] = useState(nk);
  const [replace, setReplace] = useState(existing.length > 0);
  const item = { id: uid(), label: `Épargne ${g.nom}`, kind: 'save', cat: 'epargne', goalId: g.id, montant: +montant, jour: +jour || 28, debut, fin: g.echeance, every: 1 };
  const sim = useMemo(() => {
    const items = (replace ? st.items.filter((i) => !(i.kind === 'save' && i.goalId === g.id)) : st.items).concat(+montant > 0 ? [item] : []);
    const rows = projection({ ...st, items });
    return { min: rows.reduce((a, r) => (r.dispo < a.dispo ? r : a), rows[0]), reach: goalReach(rows, g) };
  }, [montant, jour, debut, replace]);
  const ok = sim.reach && monthDiff(g.echeance, sim.reach.key) <= 0;
  return (
    <Modal title={`Planifier · ${g.nom}`} onClose={onClose}
      footer={<><button className="btn s" onClick={onClose}>Annuler</button><button className="btn p" disabled={!(+montant > 0)} onClick={() => onOk(item, replace)}><CalendarDays size={15} />Programmer</button></>}>
      <div className="meta" style={{ marginTop: 0, marginBottom: 16 }}>
        <div><div className="k">Reste à épargner</div><div className="v">{fmt(reste)}</div></div>
        <div><div className="k">Mois restants</div><div className="v">{n}</div></div>
        <div><div className="k">Cagnotte prévue</div><div className="v">{tons ? fmt(tons) : '—'}</div></div>
      </div>
      <div className="form f3">
        <Field label="Par mois (FCFA)"><input className="inp num big" type="number" autoFocus value={montant} onChange={(e) => setMontant(e.target.value)} /></Field>
        <Field label="Jour"><input className="inp num" type="number" min={1} max={31} value={jour} onChange={(e) => setJour(e.target.value)} /></Field>
        <Field label="À partir de"><input className="inp" type="month" value={debut} onChange={(e) => e.target.value && setDebut(e.target.value)} /></Field>
      </div>
      {existing.length > 0 && <label className="switch" style={{ marginTop: 14 }}><input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} />Remplacer l'épargne déjà programmée ({existing.map((i) => `${short(i.montant)}/mois`).join(', ')})</label>}
      <div className={'alert ' + (sim.min.dispo < 0 ? 'warn' : 'info')} style={{ marginTop: 16, marginBottom: 0 }}>
        <div className="chip-ic">{sim.min.dispo < 0 ? <AlertTriangle size={16} /> : <Check size={16} />}</div>
        <div>Objectif {ok ? <>atteint en <b>{mLabel(sim.reach.key, true)}</b></> : sim.reach ? <>atteint en <b>{mLabel(sim.reach.key, true)}</b>, après l'échéance</> : <b>non atteint</b>} · point bas du solde : <b className={sim.min.dispo < 0 ? 'neg' : ''}>{fmt(sim.min.dispo)}</b> en {mLabel(sim.min.key)}{sim.min.dispo < 0 ? '. Ton solde ne supporte pas ce rythme.' : '.'}</div>
      </div>
    </Modal>
  );
}

function CatModal({ onClose, onOk }) {
  const [x, setX] = useState({ id: `c_${uid()}`, nom: '', kind: 'out', vie: true });
  return (
    <Modal title="Nouvelle catégorie" onClose={onClose} footer={<><button className="btn s" onClick={onClose}>Annuler</button><button className="btn p" disabled={!x.nom.trim()} onClick={() => onOk({ ...x, nom: x.nom.trim() })}>Créer</button></>}>
      <div className="seg" style={{ display: 'flex', marginBottom: 16 }}>{[['out', 'Dépense'], ['in', 'Entrée']].map(([k, l]) => <button key={k} style={{ flex: 1 }} className={x.kind === k ? 'on' : ''} onClick={() => setX({ ...x, kind: k })}>{l}</button>)}</div>
      <div className="form">
        <Field label="Nom"><input className="inp" autoFocus placeholder={x.kind === 'out' ? 'ex. Ndogou, Crédit téléphone, Coiffeur' : 'ex. Prime, Vente'} value={x.nom} onChange={(e) => setX({ ...x, nom: e.target.value })} /></Field>
        {x.kind === 'out' && <label className="switch"><input type="checkbox" checked={x.vie} onChange={(e) => setX({ ...x, vie: e.target.checked })} />Dépense courante : suivie dans les budgets et la saisie express</label>}
      </div>
    </Modal>
  );
}

// =====================================================================
// ================= 1.9 : soldes réels, SMS, relances, tri ============
// =====================================================================
const AdjustModes = ({ mode, setMode }) => (
  <div className="adj-modes">
    {[['neutre', 'Simple correction', "Ne compte ni comme dépense ni comme entrée (bilan et budgets inchangés)"], ['oubli', 'Opérations oubliées', 'Écart négatif → dépense en Vie courante · écart positif → entrée « Autre »']].map(([k, l, h]) => (
      <label key={k} className={'adj-mode' + (mode === k ? ' on' : '')}><input type="radio" checked={mode === k} onChange={() => setMode(k)} /><span><b>{l}</b><span className="muted">{h}</span></span></label>))}
  </div>
);
const adjustTx = (st, accountId, ecart, mode, label = 'Ajustement de solde') => ({
  date: todayISO(), label: mode === 'oubli' ? (ecart < 0 ? 'Dépenses non notées' : 'Entrée non notée') : label,
  kind: ecart < 0 ? 'out' : 'in', cat: mode === 'oubli' ? (ecart < 0 ? 'vie' : 'autre') : 'ajust', montant: Math.abs(ecart), accountId,
});

function AdjustModal({ init, st, bal, onClose, onOk }) {
  const [real, setReal] = useState({});
  const [mode, setMode] = useState('neutre');
  const accs = init?.accountId ? [...st.accounts.filter((a) => a.id === init.accountId), ...st.accounts.filter((a) => a.id !== init.accountId)] : st.accounts;
  const rows = accs.map((a) => { const k = bal.accounts[a.id] || 0; const r = real[a.id]; const e = r === undefined || r === '' ? 0 : Math.round(+r - k); return { a, k, r, e }; });
  const list = rows.filter((x) => x.e !== 0).map((x) => adjustTx(st, x.a.id, x.e, mode));
  const submit = () => onOk(list);
  return (
    <Modal title="Ajuster sur les soldes réels" onClose={onClose} onEnter={submit}
      footer={<><span className="muted" style={{ fontSize: 12.5, marginRight: 'auto' }}>{list.length ? `${list.length} correction${list.length > 1 ? 's' : ''}` : 'Saisis seulement les comptes à corriger'}</span><button className="btn s" onClick={onClose}>Annuler</button><button className="btn p" disabled={!list.length} onClick={submit}><Check size={15} />Ajuster</button></>}>
      <div className="muted" style={{ fontSize: 13, marginBottom: 12 }}>Ouvre Wave, Orange Money… et tape le solde affiché. Kalis enregistre l'écart pour retomber juste.</div>
      <div className="bulk-list">
        {rows.map(({ a, k, r, e }, i) => (
          <div className="bulk-row adj-row" key={a.id}>
            <span className="acc-dot" style={{ background: a.couleur }} />
            <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 600, fontSize: 13.5 }}>{a.nom}</div><div className="muted" style={{ fontSize: 12 }}>Dans Kalis : <span className={k < 0 ? 'neg' : ''}>{fmt(k)}</span></div></div>
            {e !== 0 && <span className={'badge ' + (e < 0 ? 'r' : 'ok')} style={{ marginLeft: 0 }}>{e > 0 ? '+' : '−'}{fmt(Math.abs(e))}</span>}
            <input className="inp num" style={{ width: 140, textAlign: 'right' }} type="number" autoFocus={i === 0} placeholder="Solde réel" value={r ?? ''} onChange={(ev) => setReal({ ...real, [a.id]: ev.target.value })} />
          </div>))}
      </div>
      {list.length > 0 && <><div className="lbl" style={{ margin: '16px 0 8px' }}>Comment enregistrer l'écart ?</div><AdjustModes mode={mode} setMode={setMode} /></>}
    </Modal>
  );
}

function SmsModal({ text, st, bal, onClose, onOk }) {
  const [raw, setRaw] = useState(text || '');
  const [rows, setRows] = useState([]);
  const [adj, setAdj] = useState({});
  const [mode, setMode] = useState('neutre');
  const parse = (txt) => {
    const p = parseSMS(txt, st.accounts).map((x, i) => {
      const accountId = x.accountId || st.accounts[0]?.id;
      const dup = st.transactions.some((t) => t.montant === x.montant && t.date === x.date && (t.accountId || st.accounts[0]?.id) === accountId && t.kind === x.kind);
      return { ...x, i, accountId, guessed: !x.accountId, dup, on: !dup, montant: String(x.montant), frais: x.frais ? String(x.frais) : '' };
    });
    setRows(p); setAdj({});
  };
  useEffect(() => { if (text) parse(text); }, []);
  const u = (i, p) => setRows(rows.map((r) => (r.i === i ? { ...r, ...p } : r)));
  const sel = rows.filter((r) => r.on && +r.montant > 0);
  // Contrôle des soldes : dernier solde lu par compte vs solde Kalis après import
  const checks = st.accounts.map((a) => {
    const withSolde = rows.filter((r) => r.accountId === a.id && r.solde > 0);
    if (!withSolde.length) return null;
    const last = withSolde[withSolde.length - 1];
    const k = (bal.accounts[a.id] || 0) + sel.filter((r) => r.accountId === a.id).reduce((s, r) => s + (r.kind === 'in' ? +r.montant : -(+r.montant) - (+r.frais || 0)), 0);
    const e = Math.round(last.solde - k);
    return e ? { a, sms: last.solde, k, e } : null;
  }).filter(Boolean);
  const submit = () => {
    const list = [];
    for (const r of sel) {
      list.push({ date: r.date, label: r.label || CATS[r.cat], kind: r.kind, cat: r.cat, montant: +r.montant, accountId: r.accountId });
      if (+r.frais > 0 && r.kind === 'out') list.push({ date: r.date, label: `Frais · ${r.label || CATS[r.cat]}`, kind: 'out', cat: 'frais', montant: +r.frais, accountId: r.accountId });
    }
    for (const c of checks) if (adj[c.a.id] !== false) list.push(adjustTx(st, c.a.id, c.e, mode, 'Ajustement · solde du SMS'));
    onOk(list);
  };
  return (
    <Modal title="Importer des SMS" onClose={onClose}
      footer={<><span className="muted" style={{ fontSize: 12.5, marginRight: 'auto' }}>{rows.length ? `${sel.length} opération${sel.length > 1 ? 's' : ''} sélectionnée${sel.length > 1 ? 's' : ''}` : 'Astuce : Ctrl+V n’importe où dans Kalis ouvre cette fenêtre'}</span><button className="btn s" onClick={onClose}>Annuler</button><button className="btn p" disabled={!sel.length} onClick={submit}><Check size={15} />Importer</button></>}>
      <textarea className="inp sms-area" rows={rows.length ? 3 : 7} autoFocus={!text} placeholder={"Colle ici un ou plusieurs SMS de Wave, Orange Money, Djamo ou Mixx by Yas.\nSépare plusieurs SMS par une ligne vide."} value={raw} onChange={(e) => { setRaw(e.target.value); parse(e.target.value); }} />
      {raw && !rows.length && <div className="muted" style={{ fontSize: 13, marginTop: 10 }}>Aucun montant reconnu. Le SMS doit contenir un montant suivi de F ou FCFA.</div>}
      {rows.length > 0 && <div className="bulk-list" style={{ marginTop: 12 }}>
        {rows.map((r) => (
          <div className={'sms-row' + (r.on ? '' : ' off')} key={r.i}>
            <div className="sms-l1">
              <input type="checkbox" checked={r.on} onChange={(e) => u(r.i, { on: e.target.checked })} />
              <div className="seg sm">{[['out', 'Sortie'], ['in', 'Entrée']].map(([k, l]) => <button key={k} className={r.kind === k ? 'on' : ''} disabled={!r.on} onClick={() => u(r.i, { kind: k, cat: k === 'in' ? 'autre' : 'vie' })}>{l}</button>)}</div>
              <input className="inp" style={{ flex: 1, minWidth: 120 }} disabled={!r.on} value={r.label} onChange={(e) => u(r.i, { label: e.target.value })} />
              <input className="inp num" style={{ width: 110, textAlign: 'right' }} type="number" disabled={!r.on} value={r.montant} onChange={(e) => u(r.i, { montant: e.target.value })} />
            </div>
            <div className="sms-l2">
              <input className="inp" type="date" disabled={!r.on} value={r.date} onChange={(e) => u(r.i, { date: e.target.value })} />
              <Sel className="inp" disabled={!r.on} value={r.cat} onChange={(e) => u(r.i, { cat: e.target.value })}>{(r.kind === 'in' ? CATS_IN : CATS_OUT).map((c) => <option key={c} value={c}>{CATS[c]}</option>)}</Sel>
              <Sel className={'inp' + (r.guessed ? ' guess' : '')} title={r.guessed ? 'Compte non reconnu dans le SMS : vérifie' : ''} disabled={!r.on} value={r.accountId} onChange={(e) => u(r.i, { accountId: e.target.value, guessed: false })}>{st.accounts.map((a) => <option key={a.id} value={a.id}>{a.nom}</option>)}</Sel>
              {r.kind === 'out' && <label className="sms-fee">Frais <input className="inp num" type="number" disabled={!r.on} value={r.frais} placeholder="0" onChange={(e) => u(r.i, { frais: e.target.value })} /></label>}
              {r.dup && <span className="badge warn" style={{ marginLeft: 0 }}>Déjà saisie ?</span>}
              {r.guessed && <span className="badge warn" style={{ marginLeft: 0 }}>Compte à vérifier</span>}
            </div>
            <div className="sms-src">{r.sms}</div>
          </div>))}
      </div>}
      {checks.length > 0 && <div className="sms-checks">
        <div className="lbl" style={{ marginBottom: 8 }}>Soldes indiqués par les SMS</div>
        {checks.map((c) => (
          <label className="switch" key={c.a.id} style={{ display: 'flex', marginBottom: 8 }}><input type="checkbox" checked={adj[c.a.id] !== false} onChange={(e) => setAdj({ ...adj, [c.a.id]: e.target.checked })} />
            <span>Mettre <b>{c.a.nom}</b> à {fmt(c.sms)} FCFA <span className="muted">(Kalis après import : {fmt(c.k)}, écart {c.e > 0 ? '+' : '−'}{fmt(Math.abs(c.e))})</span></span></label>))}
        {checks.some((c) => adj[c.a.id] !== false) && <AdjustModes mode={mode} setMode={setMode} />}
      </div>}
    </Modal>
  );
}

const waPhone = (t) => { let d = String(t || '').replace(/\D/g, ''); if (d.startsWith('00')) d = d.slice(2); if (d.length === 9 && /^[37]/.test(d)) d = '221' + d; return d; };
function RelanceModal({ c, st, onClose, onSent }) {
  const occ = creanceOccs(c); const next = occ.find((o) => !st.done[o.ref]);
  const reste = occ.filter((o) => !st.done[o.ref]).reduce((s, o) => s + o.amount, 0);
  const multi = occ.length > 1;
  const late = next && next.date < todayISO();
  const prenom = c.nom.split(' ')[0];
  const dLong = (d) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  const delai = dLong(new Date(Date.now() + 3 * 864e5));
  const quoi = multi ? `l'échéance de ${fmt(next.amount)} FCFA (il reste ${fmt(reste)} FCFA au total)` : `les ${fmt(reste)} FCFA que je t'ai prêtés`;
  const quand = next ? dLong(new Date(next.date + 'T12:00:00')) : '';
  const TONES = {
    doux: `Salut ${prenom}, j'espère que tu vas bien. Je reviens vers toi pour ${quoi}${quand ? ` (remboursement prévu le ${quand})` : ''}. Tu penses pouvoir me faire le transfert quand ? Merci d'avance.`,
    ferme: `Bonjour ${prenom}, ${multi ? `l'échéance de ${fmt(next.amount)} FCFA` : `le remboursement des ${fmt(reste)} FCFA`} ${late ? 'était' : 'est'} prévu${multi ? 'e' : ''} le ${quand}. Merci de me faire le transfert par Wave ou Orange Money d'ici le ${delai}.`,
  };
  const [tone, setTone] = useState('doux');
  const [msg, setMsg] = useState(TONES.doux);
  const [tel, setTel] = useState(c.tel || '');
  const [copied, setCopied] = useState(false);
  const pick = (k) => { setTone(k); setMsg(TONES[k]); };
  const send = () => { const ph = waPhone(tel); window.open(`https://wa.me/${ph}?text=${encodeURIComponent(msg)}`, '_blank'); onSent(tel); };
  const copy = async () => { try { await navigator.clipboard.writeText(msg); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch (e) {} };
  return (
    <Modal title={`Relancer ${c.nom}`} onClose={onClose}
      footer={<><button className="btn s" style={{ marginRight: 'auto' }} onClick={copy}>{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? 'Copié' : 'Copier'}</button><button className="btn s" onClick={onClose}>Annuler</button><button className="btn p" onClick={send}><Send size={15} />Ouvrir WhatsApp</button></>}>
      <div className="seg" style={{ display: 'flex', marginBottom: 14 }}>{[['doux', 'Diplomate'], ['ferme', 'Ferme']].map(([k, l]) => <button key={k} style={{ flex: 1 }} className={tone === k ? 'on' : ''} onClick={() => pick(k)}>{l}</button>)}</div>
      <div className="form f2">
        <Field label="Message" span><textarea className="inp" rows={5} value={msg} onChange={(e) => setMsg(e.target.value)} /></Field>
        <Field label="Téléphone WhatsApp" span hint={tel ? `Envoi au +${waPhone(tel)}` : 'Vide : WhatsApp te laissera choisir le contact'}><input className="inp num" inputMode="tel" placeholder="77 000 00 00" value={tel} onChange={(e) => setTel(e.target.value)} /></Field>
      </div>
      {c.lastRelance && <div className="muted" style={{ fontSize: 12.5, marginTop: 10 }}>Dernière relance le {dLabel(c.lastRelance)}.</div>}
    </Modal>
  );
}

function TriModal({ st, updateTx, onClose }) {
  const [m, setM] = useState(mkey(new Date()));
  const [same, setSame] = useState(true);
  const list = st.transactions.filter((t) => t.kind === 'out' && t.cat === 'vie' && t.date.startsWith(m)).sort((a, b) => b.date.localeCompare(a.date));
  const others = CATS_VIE.filter((c) => c !== 'vie');
  const moveTo = (t, c) => {
    const targets = same && t.label && t.label !== CATS.vie ? list.filter((x) => x.label === t.label) : [t];
    for (const x of targets) updateTx(x.id, { cat: c, label: x.label === CATS.vie ? CATS[c] : x.label });
  };
  const total = list.reduce((s, t) => s + t.montant, 0);
  return (
    <Modal title="Trier la Vie courante" onClose={onClose}
      footer={<><label className="switch" style={{ marginRight: 'auto' }}><input type="checkbox" checked={same} onChange={(e) => setSame(e.target.checked)} />Appliquer aux libellés identiques</label><button className="btn p" onClick={onClose}>Terminé</button></>}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
        <button className="btn s sm" onClick={() => setM(addMonths(m, -1))}>‹</button><b style={{ minWidth: 120, textAlign: 'center', textTransform: 'capitalize' }}>{mLabel(m, true)}</b><button className="btn s sm" disabled={m >= mkey(new Date())} onClick={() => setM(addMonths(m, 1))}>›</button>
        <span className="muted" style={{ marginLeft: 'auto', fontSize: 12.5 }}>{list.length} à trier · {fmt(total)} FCFA</span>
      </div>
      <div className="bulk-list">
        {list.map((t) => (
          <div className="tri-row" key={t.id}>
            <DChip iso={t.date} />
            <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 550, fontSize: 13.5 }}>{t.label}</div><div className="muted" style={{ fontSize: 12 }}>{accName(st, t.accountId)} · <b className="num" style={{ color: 'var(--ink)' }}>{fmt(t.montant)}</b></div></div>
            <div className="tri-tiles">{others.map((c) => <button key={c} title={CATS[c]} onClick={() => moveTo(t, c)}>{React.createElement(catIcon(c), { size: 15 })}<span>{CATS[c].split(' ')[0]}</span></button>)}
              <Sel className="inp acc-sel" value="" title="Autre catégorie" onChange={(e) => e.target.value && moveTo(t, e.target.value)}><option value="">Autre…</option>{CATS_OUT.filter((c) => !CATS_VIE.includes(c)).map((c) => <option key={c} value={c}>{CATS[c]}</option>)}</Sel></div>
          </div>))}
        {!list.length && <div className="empty" style={{ padding: 28 }}><CheckCheck size={20} style={{ color: 'var(--pos)' }} /><div style={{ marginTop: 6 }}>Tout est trié pour {mLabel(m, true)}.</div></div>}
      </div>
    </Modal>
  );
}

const KEYS = [
  [['Ctrl', 'N'], 'Nouvelle opération'], [['Ctrl', 'B'], 'Virement entre comptes'], [['Ctrl', 'M'], 'Coller / importer un SMS'], [['Ctrl', 'J'], 'Ajuster les soldes réels'],
  [['Ctrl', 'K'], 'Rechercher une opération'], [['Ctrl', '1…9'], 'Changer de page'], [['Ctrl', '0'], 'Opérations'], [['Ctrl', 'V'], 'Coller un SMS (hors champ)'],
  [['Ctrl', 'L'], 'Verrouiller'], [['F1'], 'Cette aide'], [['Entrée'], 'Valider une fenêtre'], [['Échap'], 'Fermer'],
];
const KeysList = () => <div className="kbd-list">{KEYS.map(([k, l]) => <span key={l}>{k.map((x, i) => <React.Fragment key={x}>{i > 0 && '+'}<kbd>{x}</kbd></React.Fragment>)} {l}</span>)}</div>;
function KeysModal({ onClose }) {
  return <Modal title="Raccourcis clavier" onClose={onClose} footer={<button className="btn p" onClick={onClose}>Fermer</button>}><KeysList /><div className="muted" style={{ fontSize: 12.5, marginTop: 14 }}>Ctrl+1 Vue d'ensemble · 2 Bilan · 3 Projection · 4 Scénarios · 5 Objectifs · 6 Comptes · 7 Budgets · 8 Flux · 9 Tontines</div></Modal>;
}

function HabitsModal({ st, onClose, onOk }) {
  const [list, setList] = useState(() => (st.settings.habits || []).map((h) => ({ ...h, montant: String(h.montant) })));
  const [extra, setExtra] = useState({});
  const key = mkey(new Date());
  const u = (i, p) => setList(list.map((h, j) => (j === i ? { ...h, ...p } : h)));
  const clean = list.filter((h) => h.label.trim() && +h.montant > 0).map((h) => ({ ...h, label: h.label.trim(), montant: +h.montant }));
  const monthly = habitsMonthly({ settings: { habits: clean } }, key);
  const cats = [...new Set([...Object.keys(monthly), ...Object.keys(extra).filter((c) => +extra[c] > 0)])];
  const proposal = Object.fromEntries(cats.map((c) => [c, Math.ceil(((monthly[c] || 0) + (+extra[c] || 0)) / 1000) * 1000]));
  const total = Object.values(monthly).reduce((s, v) => s + v, 0);
  return (
    <Modal title="Mes habitudes" onClose={onClose}
      footer={<><span className="muted" style={{ fontSize: 12.5, marginRight: 'auto', whiteSpace: 'nowrap' }}>≈ <b style={{ color: 'var(--ink)' }}>{fmt(total)}</b> / mois</span><button className="btn s" onClick={onClose}>Annuler</button><button className="btn s" onClick={() => onOk(clean, null)}>Enregistrer</button><button className="btn p" onClick={() => onOk(clean, proposal)}><Check size={15} />Ajuster les budgets</button></>}>
      <div className="muted" style={{ fontSize: 13, marginBottom: 12 }}>Tes dépenses qui reviennent (repas, transport, sorties). Elles apparaissent en boutons dans la saisie express : un clic = une dépense, sans fourre-tout « Vie courante ».</div>
      <div className="bulk-list">
        {list.map((h, i) => (
          <div className="bulk-row hab-row" key={h.id}>
            <input className="inp" style={{ flex: 1, minWidth: 110 }} placeholder="ex. Petit-déj" value={h.label} onChange={(e) => u(i, { label: e.target.value })} />
            <input className="inp num" style={{ width: 90, textAlign: 'right' }} type="number" value={h.montant} onChange={(e) => u(i, { montant: e.target.value })} />
            <Sel className="inp acc-sel" value={h.cat} onChange={(e) => u(i, { cat: e.target.value })}>{CATS_VIE.map((c) => <option key={c} value={c}>{CATS[c]}</option>)}</Sel>
            <Sel className="inp acc-sel" value={h.jours || 'tous'} onChange={(e) => u(i, { jours: e.target.value })}>{Object.entries(JOURS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Sel>
            <button className="ib" title="Supprimer" onClick={() => setList(list.filter((_, j) => j !== i))}><Trash2 size={14} /></button>
          </div>))}
      </div>
      <button className="btn s sm" style={{ marginTop: 10 }} onClick={() => setList([...list, { id: uid(), label: '', montant: '', cat: 'alimentation', jours: 'tous' }])}><Plus size={13} />Ajouter une habitude</button>
      <div className="lbl" style={{ margin: '18px 0 8px' }}>Budget proposé pour {mLabel(key, true)}</div>
      <div className="hab-bud">
        {CATS_VIE.map((c) => (
          <div key={c} className="hab-bud-row">
            <span>{CATS[c]}</span>
            <span className="muted num">{monthly[c] ? `${fmt(monthly[c])} habitudes` : '—'}</span>
            <label className="muted">+ autre <input className="inp num" type="number" placeholder="0" value={extra[c] ?? ''} onChange={(e) => setExtra({ ...extra, [c]: e.target.value })} /></label>
            <b className="num">{proposal[c] ? fmt(proposal[c]) : <span className="muted">{st.budgets[c] ? `garde ${fmt(st.budgets[c])}` : '—'}</span>}</b>
          </div>))}
      </div>
      <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>« + autre » = ce qui n'est pas une habitude (provisions, marché, imprévus). Seules les catégories avec un montant sont modifiées.</div>
    </Modal>
  );
}
