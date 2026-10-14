/**
 * Report document builder — renders the printable sheet that opens in a new
 * browser tab, in the Evolex palette.
 */

/** Palette — the Evolex farm identity carried into the printed sheet. */
const DOC_CSS = `
:root{
  --rp-forest:#2f4a32; --rp-forest-deep:#1c2e1f; --rp-gold:#c4a35a;
  --rp-paper:#f4efe4; --rp-line:#d9d0bf; --rp-ink:#1b2416; --rp-ink-soft:#3d4a36;
}
*{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%}
body{background:#e8e1cf;font-family:"Segoe UI",Arial,Helvetica,sans-serif;color:var(--rp-ink)}
.rp-toolbar{position:sticky;top:0;z-index:10;display:flex;align-items:center;gap:6px;padding:8px 14px;
  background:linear-gradient(180deg,#38553c,#2f4a32);color:#f4efe4;box-shadow:0 2px 10px rgba(28,46,31,.35);
  font-size:12.5px}
.rp-toolbar button{display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,.08);color:#f4efe4;
  border:1px solid rgba(255,255,255,.18);border-radius:6px;padding:5px 10px;font-size:12px;cursor:pointer}
.rp-toolbar button:hover{background:rgba(255,255,255,.18)}
.rp-toolbar select{background:rgba(255,255,255,.08);color:#f4efe4;border:1px solid rgba(255,255,255,.18);
  border-radius:6px;padding:5px 8px;font-size:12px}
.rp-toolbar select option{color:#1b2416}
.rp-tb-div{width:1px;height:22px;background:rgba(255,255,255,.2);margin:0 4px}
.rp-tb-flex{flex:1}
.rp-zoom-label{min-width:44px;text-align:center;font-size:11.5px;opacity:.85}
.rp-page-box{display:inline-flex;align-items:center;gap:6px;font-size:11.5px}
.rp-page-box input{width:38px;text-align:center;border-radius:4px;border:1px solid rgba(255,255,255,.25);
  background:rgba(255,255,255,.1);color:#f4efe4;padding:3px 4px;font-size:11.5px}
.rp-viewport{padding:22px 16px 60px;display:flex;justify-content:center}
.rp-sheet{width:min(1120px,100%);background:#fff;border:1px solid var(--rp-line);box-shadow:0 14px 40px rgba(28,46,31,.18);
  padding:30px 34px 26px;transform-origin:top center;transition:transform .12s ease}
body.single .rp-sheet{height:1400px;overflow:hidden}
body.continuous .rp-sheet{height:auto;overflow:visible}
.rp-head{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;
  border-bottom:3px solid var(--rp-forest);padding-bottom:12px;margin-bottom:14px}
.rp-head h1{font-size:19px;font-weight:800;color:var(--rp-forest);letter-spacing:-.01em}
.rp-head h2{font-size:16px;font-weight:800;color:var(--rp-ink);text-align:right}
.rp-meta{font-size:10.5px;color:var(--rp-ink-soft);margin-top:5px;line-height:1.5}
.rp-filters{color:#6b7a63}
.rp-table{width:100%;border-collapse:collapse;font-size:11.5px}
.rp-table thead th{font-size:9.5px;text-transform:uppercase;letter-spacing:.05em;color:var(--rp-ink-soft);
  border-bottom:1.5px solid var(--rp-ink);padding:7px 8px;font-weight:700}
.rp-table thead th.rp-first{width:230px}
.rp-table td{padding:5px 8px;border-bottom:1px solid #efe9db;font-size:11.5px}
.rp-table .rp-num{white-space:nowrap}
tr.rp-group td{background:var(--rp-paper);font-weight:800;font-size:11px;text-transform:uppercase;
  letter-spacing:.06em;color:var(--rp-forest-deep);border-bottom:1px solid var(--rp-line)}
tr.rp-subtotal td{font-weight:700;background:#fbf7ee;border-bottom:1px solid var(--rp-line)}
tr.rp-subtotal td.rp-label{color:var(--rp-ink-soft);font-size:10.5px}
tr.rp-grand td{font-weight:800;background:#eef3ea;border-top:2px solid var(--rp-forest);
  border-bottom:2px solid var(--rp-forest);font-size:12px}
tr.rp-empty td{padding:36px;text-align:center;color:var(--rp-ink-soft);font-size:12px}
.rp-foot{display:flex;justify-content:space-between;margin-top:16px;padding-top:8px;
  border-top:1px solid var(--rp-line);font-size:9.5px;color:#8a8578}
@media print{
  body{background:#fff}
  .rp-toolbar{display:none!important}
  .rp-viewport{padding:0}
  .rp-sheet{width:100%;box-shadow:none;border:none;padding:12mm 8mm;transform:none!important;height:auto!important;overflow:visible!important}
  @page{size:A4 portrait;margin:10mm}
}
`;


export interface ReportDocumentColumn {
  label: string;
  align: 'left' | 'right' | 'center';
}

export interface ReportDocumentGroup {
  label: string;
  rows: { cells: string[] }[];
  subtotal: (string | null)[];
}

export interface ReportDocumentModel {
  businessName: string;
  title: string;
  templateName: string;
  dateFrom: string;
  dateTo: string;
  locationLabel: string;
  filterSummary: string;
  generatedAt: string;
  columns: ReportDocumentColumn[];
  groups: ReportDocumentGroup[];
  grandTotal: (string | null)[];
  emptyHint: string;
  hasData: boolean;
}

function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Builds a complete, self-contained HTML document for the generated report.
 * The document is written into a new browser tab and carries its own styles,
 * print rules, CSV export, zoom and paging — no assets from the app required.
 */
export function buildReportDocument(model: ReportDocumentModel): string {
  const body = model.hasData
    ? model.groups.map((group) => `
      <tr class="rp-group"><td colspan="${model.columns.length + 1}">${esc(group.label)}</td></tr>
      ${group.rows
        .map(
          (row) => `<tr class="rp-detail"><td class="rp-label">${esc(row.cells[0])}</td>${row.cells
            .slice(1)
            .map((cell, i) => `<td class="rp-num" style="text-align:${model.columns[i + 1].align}">${esc(cell)}</td>`)
            .join('')}</tr>`
        )
        .join('')}
      <tr class="rp-subtotal"><td class="rp-label">Subtotal — ${esc(group.label)}</td>${group.subtotal
        .map((cell, i) => `<td class="rp-num" style="text-align:${model.columns[i + 1].align}">${esc(cell ?? '')}</td>`)
        .join('')}</tr>`).join('') + `
      <tr class="rp-grand">
        <td class="rp-label">Grand Total${model.groups.length > 1 ? ` — ${model.groups.length} groups` : ''}</td>${model.grandTotal
        .map((cell, i) => `<td class="rp-num" style="text-align:${model.columns[i + 1].align}">${esc(cell ?? '')}</td>`)
        .join('')}
      </tr>`
    : `<tr class="rp-empty"><td colspan="${model.columns.length + 1}">${esc(model.emptyHint)}</td></tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(model.title)} — ${esc(model.templateName)}</title>
<style>${DOC_CSS}</style>
</head>
<body>
<div class="rp-toolbar" role="toolbar" aria-label="Report actions">
  <button type="button" onclick="reportPrint()" title="Print"><span class="rp-ico">&#128424;</span>Print</button>
  <button type="button" onclick="reportSave()" title="Save as CSV"><span class="rp-ico">&#128190;</span>Save &#9662;</button>
  <span class="rp-tb-div"></span>
  <button type="button" onclick="reportZoom(-1)" title="Zoom out">&#128269;&#8722;</button>
  <button type="button" onclick="reportZoom(0)" title="Reset zoom">&#128269;</button>
  <button type="button" onclick="reportZoom(1)" title="Zoom in">&#128269;+</button>
  <span class="rp-zoom-label" id="zoomLabel">100%</span>
  <span class="rp-tb-flex"></span>
  <button type="button" onclick="reportPage(-1)" title="Previous page">&#9664;</button>
  <span class="rp-page-box"><span>Page</span><input id="pageNo" type="text" value="1" onchange="reportGo(this.value)"><span id="pageTotal">of 1</span></span>
  <button type="button" onclick="reportPage(1)" title="Next page">&#9654;</button>
  <select id="pageMode" onchange="reportMode(this.value)">
    <option value="single">Single Page</option>
    <option value="continuous">Continuous</option>
  </select>
</div>
<div class="rp-viewport">
  <section class="rp-sheet" id="sheet">
    <header class="rp-head">
      <div class="rp-head-left">
        <h1>${esc(model.businessName)}</h1>
        <p class="rp-meta">Date: ${esc(model.dateFrom)} To ${esc(model.dateTo)} &nbsp;&middot;&nbsp; Location: ${esc(model.locationLabel)}</p>
        ${model.filterSummary ? `<p class="rp-meta rp-filters">Filters: ${esc(model.filterSummary)}</p>` : ''}
      </div>
      <div class="rp-head-right">
        <h2>${esc(model.title)}-${esc(model.templateName)}</h2>
      </div>
    </header>
    <table class="rp-table">
      <thead>
        <tr>
          <th class="rp-first">${esc(model.columns[0].label)}</th>
          ${model.columns.slice(1).map((col) => `<th style="text-align:${col.align}">${esc(col.label)}</th>`).join('')}
        </tr>
      </thead>
      <tbody>${body}</tbody>
    </table>
    <footer class="rp-foot">
      <span>Generated ${esc(model.generatedAt)}</span>
      <span class="rp-foot-page" id="footPage">Page 1</span>
    </footer>
  </section>
</div>
<script type="application/json" id="reportModel">${esc(JSON.stringify(model))}</script>
<script>${DOC_JS}</script>
</body>
</html>`;
}

/** In-tab behaviour: print, CSV export, zoom and paging. */
const DOC_JS = `
var MODEL = JSON.parse(document.getElementById('reportModel').textContent);
var sheet = document.getElementById('sheet');
var zoomLevel = 1;
function reportPrint(){ window.print(); }
function reportZoom(step){
  zoomLevel = step === 0 ? 1 : Math.min(2, Math.max(0.5, zoomLevel + step * 0.1));
  sheet.style.transform = 'scale(' + zoomLevel + ')';
  document.getElementById('zoomLabel').textContent = Math.round(zoomLevel * 100) + '%';
}
function toCsvValue(v){ return '"' + String(v === null || v === undefined ? '' : v).replace(/"/g, '""') + '"'; }
function reportSave(){
  var lines = [];
  var head = [MODEL.businessName, MODEL.title + '-' + MODEL.templateName];
  var meta = ['Date: ' + MODEL.dateFrom + ' To ' + MODEL.dateTo, 'Location: ' + MODEL.locationLabel];
  if (MODEL.filterSummary) meta.push('Filters: ' + MODEL.filterSummary);
  lines = lines.concat(head, meta, [''], [MODEL.columns.map(function(c){ return toCsvValue(c.label); }).join(',')]);
  MODEL.groups.forEach(function(g){
    lines.push(toCsvValue(g.label));
    g.rows.forEach(function(r){ lines.push(r.cells.map(toCsvValue).join(',')); });
    lines.push(['Subtotal - ' + g.label].concat(g.subtotal.map(toCsvValue)).join(','));
  });
  lines.push(['Grand Total'].concat(MODEL.grandTotal.map(toCsvValue)).join(','));
  var blob = new Blob([lines.join('\\r\\n')], { type: 'text/csv;charset=utf-8' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = (MODEL.title || 'report').replace(/[^a-z0-9]+/gi, '-').toLowerCase() + '.csv';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}
function pageHeight(){ return sheet.getBoundingClientRect().height / zoomLevel + 60; }
function totalPages(){
  if (document.body.classList.contains('continuous')) return 1;
  return Math.max(1, Math.ceil(sheet.scrollHeight / pageHeight()));
}
function refreshPages(){
  document.getElementById('pageTotal').textContent = 'of ' + totalPages();
  var no = document.getElementById('pageNo');
  var current = Math.min(parseInt(no.value, 10) || 1, totalPages());
  no.value = current;
  if (document.body.classList.contains('continuous')) return;
  window.scrollTo({ top: (current - 1) * pageHeight(), behavior: 'smooth' });
  document.getElementById('footPage').textContent = 'Page ' + current;
}
function reportPage(step){
  var no = document.getElementById('pageNo');
  no.value = Math.min(totalPages(), Math.max(1, (parseInt(no.value, 10) || 1) + step));
  refreshPages();
}
function reportGo(value){
  document.getElementById('pageNo').value = Math.min(totalPages(), Math.max(1, parseInt(value, 10) || 1));
  refreshPages();
}
function reportMode(mode){
  document.body.classList.toggle('single', mode === 'single');
  document.body.classList.toggle('continuous', mode === 'continuous');
  document.getElementById('pageNo').value = 1;
  refreshPages();
}
document.body.classList.add('single');
window.addEventListener('resize', refreshPages);
window.addEventListener('load', function(){ setTimeout(refreshPages, 60); });
setTimeout(refreshPages, 120);
`;

