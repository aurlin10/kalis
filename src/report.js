// Rapport mensuel PDF : document HTML autonome, sobre, imprimé par Electron dans une fenêtre cachée.
import { CATS, CATS_VIE, CATS_DEBT, monthStats, balances, spentCat, budgetTotal, occurrences, creanceOccs, mLabel, dLabel, fmt, addMonths, isGoalActive, accName } from './data.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function reportHTML(st, key) {
  const [y, m] = key.split('-').map(Number);
  const end = `${key}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`;
  const ms = monthStats(st, key);
  const prev = monthStats(st, addMonths(key, -1));
  const bal = balances({ ...st, transactions: st.transactions.filter((t) => t.date <= end) });
  const delta = (a, b) => (b ? `${a >= b ? '+' : '−'}${fmt(Math.abs(a - b))} vs ${mLabel(addMonths(key, -1))}` : '');

  const cats = Object.entries(ms.byCat).sort((a, b) => b[1] - a[1]);
  const maxCat = cats[0]?.[1] || 1;
  const bt = budgetTotal(st);
  const budRows = CATS_VIE.filter((c) => +st.budgets[c] || spentCat(st, key, c)).map((c) => {
    const b = +st.budgets[c] || 0; const sp = spentCat(st, key, c); const p = b ? sp / b : 0;
    return `<tr><td>${esc(CATS[c])}</td><td class="r">${fmt(sp)}</td><td class="r">${b ? fmt(b) : '—'}</td><td class="r ${p > 1 ? 'neg' : ''}">${b ? Math.round(p * 100) + ' %' : 'hors budget'}</td></tr>`;
  }).join('');
  const top = st.transactions.filter((t) => t.kind === 'out' && t.date.startsWith(key) && !CATS_DEBT.includes(t.cat)).sort((a, b) => b.montant - a.montant).slice(0, 8);
  const goals = st.goals.filter(isGoalActive);
  const nextKey = addMonths(key, 1);
  const next = occurrences(st, nextKey).filter((o) => o.kind !== 'save').sort((a, b) => a.date.localeCompare(b.date));
  const cr = st.creances.map((c) => ({ c, reste: creanceOccs(c).filter((o) => !st.done[o.ref]).reduce((s, o) => s + o.amount, 0) })).filter((x) => x.reste > 0);

  const kpi = (k, v, f, cls = '') => `<div class="kpi"><div class="k">${k}</div><div class="v ${cls}">${v}</div><div class="f">${f || ''}</div></div>`;
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Kalis · ${esc(mLabel(key, true))}</title><style>
  @page { size: A4; }
  * { box-sizing: border-box; } body { font-family: 'Segoe UI', Inter, Arial, sans-serif; color: #1a1d29; font-size: 10.5pt; margin: 0; }
  header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #1a1d29; padding-bottom: 8px; margin-bottom: 16px; }
  h1 { font-size: 19pt; margin: 0; letter-spacing: -.3px; } .brand { font-weight: 700; color: #4F46E5; font-size: 10pt; letter-spacing: .5px; text-transform: uppercase; }
  .muted, .f { color: #6b7080; } h2 { font-size: 11pt; text-transform: uppercase; letter-spacing: .6px; color: #4b5060; margin: 20px 0 8px; border-bottom: 1px solid #e3e5ec; padding-bottom: 4px; }
  .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; } .kpi { border: 1px solid #e3e5ec; border-radius: 6px; padding: 9px 11px; }
  .kpi .k { font-size: 8.5pt; color: #6b7080; text-transform: uppercase; letter-spacing: .4px; } .kpi .v { font-size: 14pt; font-weight: 700; margin: 3px 0 1px; } .kpi .f { font-size: 8pt; }
  table { width: 100%; border-collapse: collapse; } td, th { padding: 5px 4px; border-bottom: 1px solid #eef0f4; text-align: left; } th { font-size: 8.5pt; color: #6b7080; font-weight: 600; text-transform: uppercase; }
  .r { text-align: right; font-variant-numeric: tabular-nums; } .neg { color: #c2273a; } .pos { color: #0f7a55; }
  .bar { height: 7px; background: #eef0f4; border-radius: 4px; overflow: hidden; } .bar i { display: block; height: 100%; background: #4F46E5; }
  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; } .avoid { break-inside: avoid; }
  footer { margin-top: 22px; font-size: 8pt; color: #9a9eab; border-top: 1px solid #e3e5ec; padding-top: 6px; }
  </style></head><body>
  <header><div><div class="brand">Kalis</div><h1>Rapport · ${esc(mLabel(key, true))}</h1></div><div class="muted">Généré le ${dLabel(new Date().toISOString().slice(0, 10))}</div></header>
  <div class="kpis">
    ${kpi('Entrées', fmt(ms.entrees), delta(ms.entrees, prev.entrees))}
    ${kpi('Sorties', fmt(ms.sorties), delta(ms.sorties, prev.sorties))}
    ${kpi('Solde du mois', (ms.solde >= 0 ? '+' : '−') + fmt(Math.abs(ms.solde)), ms.taux != null ? `Taux d'épargne ${Math.round(ms.taux * 100)} %` : '', ms.solde < 0 ? 'neg' : 'pos')}
    ${kpi('Patrimoine fin de mois', fmt(bal.total), `dont ${fmt(bal.epargne)} sur objectifs`)}
  </div>
  <div class="cols">
    <div class="avoid"><h2>Soldes au ${dLabel(end)}</h2><table>${st.accounts.map((a) => `<tr><td>${esc(a.nom)}</td><td class="r ${(bal.accounts[a.id] || 0) < 0 ? 'neg' : ''}">${fmt(bal.accounts[a.id] || 0)}</td></tr>`).join('')}<tr><th>Total comptes</th><th class="r">${fmt(bal.comptes)}</th></tr></table></div>
    <div class="avoid"><h2>Sorties par catégorie</h2><table>${cats.map(([c, v]) => `<tr><td style="width:38%">${esc(CATS[c] || c)}</td><td><div class="bar"><i style="width:${(v / maxCat) * 100}%"></i></div></td><td class="r" style="width:22%">${fmt(v)}</td></tr>`).join('') || '<tr><td class="muted">Aucune sortie</td></tr>'}</table></div>
  </div>
  <div class="avoid"><h2>Budgets · ${fmt(ms.vie)} dépensés sur ${fmt(bt)}</h2><table><tr><th>Catégorie</th><th class="r">Dépensé</th><th class="r">Budget</th><th class="r">Utilisé</th></tr>${budRows || '<tr><td class="muted" colspan="4">Aucun budget</td></tr>'}</table></div>
  <div class="cols">
    <div class="avoid"><h2>Plus grosses dépenses</h2><table>${top.map((t) => `<tr><td class="muted" style="width:62px">${t.date.slice(8, 10)}/${t.date.slice(5, 7)}</td><td>${esc(t.label)}<div class="f">${esc(CATS[t.cat] || '')} · ${esc(accName(st, t.accountId))}</div></td><td class="r">${fmt(t.montant)}</td></tr>`).join('') || '<tr><td class="muted">—</td></tr>'}</table></div>
    <div class="avoid"><h2>Objectifs</h2><table>${goals.map((g) => { const v = bal.goals[g.id] || 0; const p = +g.montant ? Math.min(1, v / g.montant) : 0; return `<tr><td>${esc(g.nom)}<div class="bar" style="margin-top:4px"><i style="width:${p * 100}%"></i></div></td><td class="r" style="width:40%">${fmt(v)} / ${fmt(g.montant)}<div class="f">${Math.round(p * 100)} %</div></td></tr>`; }).join('') || '<tr><td class="muted">Aucun objectif actif</td></tr>'}</table>
      ${cr.length ? `<h2>Créances & dettes en cours</h2><table>${cr.map(({ c, reste }) => `<tr><td>${c.sens === 'in' ? 'On me doit' : 'Je dois'} · ${esc(c.nom)}</td><td class="r ${c.sens === 'in' ? 'pos' : 'neg'}">${fmt(reste)}</td></tr>`).join('')}</table>` : ''}</div>
  </div>
  <div class="avoid"><h2>À venir · ${esc(mLabel(nextKey, true))}</h2><table>${next.slice(0, 14).map((o) => `<tr><td class="muted" style="width:62px">${o.date.slice(8, 10)}/${o.date.slice(5, 7)}</td><td>${esc(o.label)}</td><td class="r ${o.kind === 'in' ? 'pos' : ''}">${o.kind === 'in' ? '+' : '−'}${fmt(o.amount)}</td></tr>`).join('') || '<tr><td class="muted">Aucune échéance prévue</td></tr>'}</table></div>
  <footer>Montants en FCFA · Prêts, emprunts et ajustements de solde ne sont pas comptés comme entrées ou sorties.</footer>
  </body></html>`;
}
