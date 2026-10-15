/**
 * Printable Weekly Owner Report document (§113).
 *
 * Builds a complete, self-contained HTML page for the executive digest —
 * opened in a new browser tab from the CEO Command Center's 1-click
 * generator, where Print → "Save as PDF" produces the owner-facing file.
 * Same Evolex palette as the Report workspace documents.
 */

import { OwnerReportView } from './owner-report.models';
import { formatCount, formatGhs } from './owner-report.insights';

const DOC_CSS = `
:root{--forest:#2f4a32;--forest-deep:#1c2e1f;--gold:#c4a35a;--paper:#f4efe4;--line:#d9d0bf;--ink:#1b2416;--soft:#3d4a36;--red:#b3261e}
*{box-sizing:border-box;margin:0;padding:0}
body{background:#e8e1cf;font-family:"Segoe UI",Arial,Helvetica,sans-serif;color:var(--ink)}
.toolbar{position:sticky;top:0;z-index:10;display:flex;gap:8px;align-items:center;padding:9px 14px;background:linear-gradient(180deg,#38553c,#2f4a32);color:#f4efe4;font-size:12.5px}
.toolbar button{background:rgba(255,255,255,.08);color:#f4efe4;border:1px solid rgba(255,255,255,.2);border-radius:6px;padding:6px 12px;font-size:12px;cursor:pointer}
.toolbar button:hover{background:rgba(255,255,255,.18)}
.toolbar .flex{flex:1}
.viewport{padding:22px 16px 60px;display:flex;justify-content:center}
.sheet{width:min(920px,100%);background:#fff;border:1px solid var(--line);box-shadow:0 14px 40px rgba(28,46,31,.18);padding:32px 36px 28px}
.head{display:flex;justify-content:space-between;gap:20px;border-bottom:3px solid var(--forest);padding-bottom:12px;margin-bottom:6px}
.head h1{font-size:20px;font-weight:800;color:var(--forest)}
.head h2{font-size:17px;font-weight:800;text-align:right}
.meta{font-size:10.5px;color:var(--soft);margin-top:5px;line-height:1.5}
section{padding:14px 0 6px;border-bottom:1px solid var(--line)}
section:last-of-type{border-bottom:none}
.sec-head{display:flex;align-items:baseline;gap:9px;margin-bottom:9px}
.sec-no{background:var(--forest);color:#f4efe4;font-size:10px;font-weight:800;border-radius:999px;padding:2px 8px;letter-spacing:.05em}
.sec-head h3{font-size:14.5px;font-weight:800;color:var(--forest-deep)}
.headline{font-size:13px;font-weight:700;margin-bottom:7px}
ul.dev{margin:0 0 4px 17px;font-size:12px;line-height:1.65;color:var(--soft)}
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:10px 0 4px}
.kpi{background:var(--paper);border:1px solid var(--line);border-radius:9px;padding:9px 11px}
.kpi .k-label{font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:var(--soft)}
.kpi .k-value{font-size:16px;font-weight:800;color:var(--forest-deep);margin-top:2px}
.equation{display:flex;align-items:stretch;gap:6px;flex-wrap:wrap;margin:8px 0}
.eq-term{flex:1;min-width:92px;text-align:center;background:#eef3ea;border:1px solid var(--line);border-radius:9px;padding:8px 4px}
.eq-term .t-label{font-size:9px;text-transform:uppercase;letter-spacing:.05em;color:var(--soft)}
.eq-term .t-value{font-size:17px;font-weight:800}
.eq-op{align-self:center;font-size:16px;font-weight:800;color:var(--soft)}
.eq-term.eq-result{background:var(--forest);color:#f4efe4}
.eq-term.eq-result .t-label{color:#cfdcc9}
.eq-note{font-size:11px;color:var(--soft)}
.eq-note.bad{color:var(--red);font-weight:700}
table{width:100%;border-collapse:collapse;font-size:11.5px;margin:6px 0 4px}
th{font-size:9.5px;text-transform:uppercase;letter-spacing:.05em;color:var(--soft);border-bottom:1.5px solid var(--ink);padding:6px 7px;text-align:left}
td{padding:5px 7px;border-bottom:1px solid #efe9db}
td.num,th.num{text-align:right;white-space:nowrap}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:4px 26px}
.stat{display:flex;justify-content:space-between;font-size:12px;padding:4.5px 0;border-bottom:1px dashed #efe9db;color:var(--soft)}
.stat strong{color:var(--ink)}
.empty{font-size:11.5px;color:var(--soft);font-style:italic}
.sev-critical,.sev-high{color:var(--red);font-weight:700}
.foot{display:flex;justify-content:space-between;margin-top:16px;padding-top:8px;border-top:1px solid var(--line);font-size:9.5px;color:#8a8578}
@media print{body{background:#fff}.toolbar{display:none!important}.viewport{padding:0}.sheet{width:100%;box-shadow:none;border:none;padding:10mm 6mm}@page{size:A4 portrait;margin:9mm}}
`;

function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function stat(label: string, value: string): string {
  return `<div class="stat"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`;
}

function section(number: number, title: string, body: string): string {
  return `<section><div class="sec-head"><span class="sec-no">${number}</span><h3>${esc(title)}</h3></div>${body}</section>`;
}

/** Render the eight-section Weekly Owner Report as a printable document. */
export function buildOwnerReportDocument(view: OwnerReportView, generatedLabel: string): string {
  const r = view.livestock.reconciliation;
  const keys = view.executive.keyNumbers;

  const equation = `
    <div class="equation">
      <div class="eq-term"><div class="t-label">Opening herd</div><div class="t-value">${formatCount(r.opening_herd)}</div></div>
      <span class="eq-op">+</span>
      <div class="eq-term"><div class="t-label">Births</div><div class="t-value">${formatCount(r.births)}</div></div>
      <span class="eq-op">+</span>
      <div class="eq-term"><div class="t-label">Purchases</div><div class="t-value">${formatCount(r.purchases)}</div></div>
      <span class="eq-op">−</span>
      <div class="eq-term"><div class="t-label">Deaths</div><div class="t-value">${formatCount(r.deaths)}</div></div>
      <span class="eq-op">−</span>
      <div class="eq-term"><div class="t-label">Sales</div><div class="t-value">${formatCount(r.sales)}</div></div>
      <span class="eq-op">=</span>
      <div class="eq-term eq-result"><div class="t-label">Closing herd</div><div class="t-value">${formatCount(r.closing_herd)}</div></div>
    </div>
    <p class="eq-note ${r.reconciles ? '' : 'bad'}">${esc(r.equation)}: ${esc(r.equation_display)}${
      r.reconciles ? ' — reconciles with the Livestock Master.' : ` — variance of ${formatCount(r.variance)} against the Livestock Master needs investigation.`
    }</p>`;

  const criticalStock = view.feedInventory.criticalStock.length
    ? `<table><thead><tr><th>Critical stock</th><th>Category</th><th class="num">On hand</th><th class="num">Reorder level</th></tr></thead><tbody>${view.feedInventory.criticalStock
        .map((i) => `<tr><td>${esc(i.name)}</td><td>${esc(i.category ?? '')}</td><td class="num">${formatCount(i.quantity_on_hand)} ${esc(i.unit ?? '')}</td><td class="num">${formatCount(i.reorder_level)}</td></tr>`)
        .join('')}</tbody></table>`
    : '<p class="empty">No stock item is at or below its reorder level.</p>';

  const executiveApprovals = view.procurementSpend.pendingExecutive.length
    ? `<table><thead><tr><th>Awaiting Executive approval (&gt; GH₵${formatCount(view.procurementSpend.threshold)})</th><th class="num">Estimated cost</th><th>Priority</th></tr></thead><tbody>${view.procurementSpend.pendingExecutive
        .map((p) => `<tr><td>${esc(p.request_number)} · ${esc(p.item_name)}</td><td class="num">${formatGhs(p.estimated_cost)}</td><td>${esc(p.priority ?? 'normal')}</td></tr>`)
        .join('')}</tbody></table>`
    : '';

  const problems = view.operationsPeople.problems.length
    ? `<table><thead><tr><th>Open problem</th><th>Priority</th><th>Status</th></tr></thead><tbody>${view.operationsPeople.problems
        .map((p) => `<tr><td>${esc(p.ticket_number)} · ${esc(p.title)}</td><td>${esc(p.priority)}</td><td>${esc(p.status)}</td></tr>`)
        .join('')}</tbody></table>`
    : '';

  const risks = view.risks.openRisks.length
    ? `<table><thead><tr><th>Risk</th><th>Category</th><th>Severity</th></tr></thead><tbody>${view.risks.openRisks
        .map((risk) => `<tr><td>${esc(risk.title)}</td><td>${esc(risk.category ?? '')}</td><td class="sev-${esc(String(risk.severity ?? '').toLowerCase())}">${esc(risk.severity ?? '')}</td></tr>`)
        .join('')}</tbody></table>`
    : '<p class="empty">No open risks recorded.</p>';

  const alerts = view.risks.unreadAlerts.length
    ? `<table><thead><tr><th>Unread alert</th><th>Severity</th></tr></thead><tbody>${view.risks.unreadAlerts
        .map((a) => `<tr><td>${esc(a.title)}${a.message ? ` — ${esc(a.message)}` : ''}</td><td>${esc(a.severity ?? '')}</td></tr>`)
        .join('')}</tbody></table>`
    : '';

  const decisions = view.decisions.decisions.length
    ? `<table><thead><tr><th>Decision required</th><th>Due</th></tr></thead><tbody>${view.decisions.decisions
        .map((d) => `<tr><td>${esc(d.title)}${d.description ? ` — ${esc(d.description)}` : ''}</td><td>${esc(d.due_date ?? '—')}</td></tr>`)
        .join('')}</tbody></table>`
    : '<p class="empty">No owner decisions are outstanding.</p>';

  const expected = view.livestock.expectedBirths;
  const body = [
    section(1, 'Executive Summary', `
      <p class="headline">${esc(view.executive.headline)}</p>
      ${view.executive.majorDevelopments.length ? `<ul class="dev">${view.executive.majorDevelopments.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>` : '<p class="empty">No major developments recorded this week.</p>'}
      <div class="kpis">
        <div class="kpi"><div class="k-label">Closing herd</div><div class="k-value">${formatCount(keys['closing_herd'] ?? r.closing_herd)}</div></div>
        <div class="kpi"><div class="k-label">Feed days remaining</div><div class="k-value">${keys['feed_days_remaining'] ?? view.feedInventory.feedDaysRemaining ?? '—'}</div></div>
        <div class="kpi"><div class="k-label">Spend · week to date</div><div class="k-value">${formatGhs(view.procurementSpend.spend.week_to_date.total)}</div></div>
        <div class="kpi"><div class="k-label">Spend · month to date</div><div class="k-value">${formatGhs(view.procurementSpend.spend.month_to_date.total)}</div></div>
      </div>`),
    section(2, 'Livestock', `
      ${equation}
      <div class="grid2">
        ${stat('Pregnancies (active)', formatCount(view.livestock.pregnancies))}
        ${stat('Expected births · next 7 days', formatCount(expected['next_7']))}
        ${stat('Expected births · next 30 days', formatCount(expected['next_30']))}
        ${stat('Expected births · next 90 days', formatCount(expected['next_90']))}
        ${stat('Health issues (open)', formatCount(view.livestock.healthIssues))}
        ${stat('Under treatment', formatCount(view.livestock.underTreatment))}
        ${stat('Mortality rate (period)', `${view.livestock.mortalityRate}%`)}
      </div>`),
    section(3, 'Operations & People', `
      <div class="grid2">
        ${stat('Completed work', formatCount(view.operationsPeople.completedWork))}
        ${stat('Outstanding work', formatCount(view.operationsPeople.outstandingWork))}
        ${stat('Overdue work', formatCount(view.operationsPeople.overdueWork))}
        ${stat('Active staff', formatCount(view.operationsPeople.staffing))}
        ${stat('Attendance · present', formatCount(view.operationsPeople.attendance.present))}
        ${stat('Attendance · absent / leave', `${formatCount(view.operationsPeople.attendance.absent)} / ${formatCount(view.operationsPeople.attendance.leave)}`)}
      </div>
      <p class="eq-note">${esc(view.operationsPeople.performanceConcerns)}</p>${problems}`),
    section(4, 'Feed & Inventory', `
      <div class="grid2">
        ${stat('Feed on hand', `${formatCount(view.feedInventory.feedOnHandKg)} kg`)}
        ${stat('Daily consumption', `${formatCount(view.feedInventory.dailyConsumptionKg)} kg`)}
        ${stat('Feed days remaining', view.feedInventory.feedDaysRemaining === null ? '—' : `${view.feedInventory.feedDaysRemaining} days`)}
        ${stat('Medicines available (lines)', formatCount(view.feedInventory.medicinesAvailable))}
      </div>${criticalStock}`),
    section(5, 'Procurement & Financial Operations', `
      <div class="grid2">
        ${stat('Requests this week', formatCount(view.procurementSpend.requestsInPeriod))}
        ${stat('Pending Supervisor approvals (Tier 1)', formatCount(view.procurementSpend.pendingSupervisor))}
        ${stat('Purchases (POs) this week', formatCount(view.procurementSpend.purchasesInPeriod))}
        ${stat('Open purchase orders', formatCount(view.procurementSpend.openOrders))}
        ${stat('Spend · this week', formatGhs(view.procurementSpend.spend.period.total))}
        ${stat('Spend · week to date', formatGhs(view.procurementSpend.spend.week_to_date.total))}
        ${stat('Spend · month to date', formatGhs(view.procurementSpend.spend.month_to_date.total))}
      </div>${executiveApprovals}`),
    section(6, 'Sales & Marketing', `
      <div class="grid2">
        ${stat('Prospects', formatCount(view.salesMarketing.prospects))}
        ${stat('Open opportunities', formatCount(view.salesMarketing.opportunities))}
        ${stat('Pipeline value', formatGhs(view.salesMarketing.pipelineValue))}
        ${stat('Sales / culls this week', formatCount(view.salesMarketing.salesInPeriod))}
        ${stat('Content produced', formatCount(view.salesMarketing.contentProduced))}
        ${stat('Reach / views / leads', `${formatCount(view.salesMarketing.reach)} / ${formatCount(view.salesMarketing.views)} / ${formatCount(view.salesMarketing.leads)}`)}
      </div>`),
    section(7, 'Risks', `${risks}${alerts}`),
    section(8, 'Owner Decisions Required', `
      <p class="eq-note">${esc(view.decisions.note)}</p>
      ${view.decisions.executiveProcurementAwaiting ? `<p class="eq-note"><strong>${formatCount(view.decisions.executiveProcurementAwaiting)}</strong> purchase(s) above GH₵${formatCount(view.procurementSpend.threshold)} also await Executive approval in Procurement.</p>` : ''}
      ${decisions}`)
  ].join('');

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Weekly Owner Report — ${esc(view.period.label)}</title><style>${DOC_CSS}</style></head>
<body>
<div class="toolbar"><strong>Weekly Owner Report</strong><span>${esc(view.period.label)}</span><span class="flex"></span>
<button type="button" onclick="window.print()">Print / Save as PDF</button></div>
<div class="viewport"><article class="sheet">
  <header class="head">
    <div><h1>Evolex Foods</h1><p class="meta">Evolex Hub · CEO Command Center<br>Manual reference §113 · Generated ${esc(generatedLabel)}</p></div>
    <div><h2>Weekly Owner Report</h2><p class="meta">${esc(view.period.from)} to ${esc(view.period.to)}</p></div>
  </header>
  ${body}
  <footer class="foot"><span>Compiled automatically from Evolex Hub records — one standardised weekly report.</span><span>§113</span></footer>
</article></div>
</body></html>`;
}
