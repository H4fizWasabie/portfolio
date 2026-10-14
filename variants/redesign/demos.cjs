// Playable demos with fictional sample data, one per project (MAP shows its real screens).
// Markup here; behaviour in demos.js. Used by the Workflow and Workshop previews.
const B = require('./blocks.cjs');

const tag = '<span class="tag">Sample data</span>';
const sheetHead = (title, hint) => `<div class="sheet-head"><h4>${title}</h4>${tag}</div><p class="hint">${hint}</p>`;
const stamp = '<div class="stamp" aria-hidden="true"></div><p class="sr-only" aria-live="polite" data-status></p>';

const stock = [
  ['Nitrile gloves, M (box)', 26, 20, 'Meridian Medical'],
  ['Syringes 3 ml (box)', 7, 6, 'Meridian Medical'],
  ['Gauze swabs (pack)', 41, 50, 'Tanjung Clinical'],
  ['Surgical masks (box)', 55, 40, 'Tanjung Clinical']
];

const demos = {
  procura: () => `<div class="sheet" data-demo="procura">${sheetHead('Reorder check', 'Lower a count below its reorder point, then draft the order.')}
<table><thead><tr><th scope="col">Item</th><th scope="col">On hand</th><th scope="col">Reorder at</th><th scope="col" class="wide-only">Supplier</th></tr></thead><tbody>
${stock.map(([item, have, at, sup]) => `<tr data-item data-reorder="${at}" data-supplier="${sup}"${have < at ? ' class="is-low"' : ''}><th scope="row">${item}</th>
<td><div class="stepper"><button type="button" data-step="-1" aria-label="One fewer ${item}">−</button><output>${have}</output><button type="button" data-step="1" aria-label="One more ${item}">+</button></div></td>
<td>${at}</td><td class="wide-only">${sup}</td></tr>`).join('')}
</tbody></table>
<div class="sheet-foot"><button type="button" class="button" data-action="draft">Draft purchase orders</button></div>
<div class="result" data-result hidden></div>${stamp}</div>`,

  pims: () => `<div class="sheet" data-demo="pims">${sheetHead('Indent IND-0412', 'Surgery needs 12 boxes of nitrile gloves. Move the request through each department.')}
<ol class="track">${['Requested', 'Approved', 'Ordered', 'Received'].map((s, i) => `<li${i === 0 ? ' class="is-done"' : ''}>${s}</li>`).join('')}</ol>
<div class="sheet-foot"><button type="button" class="button" data-action="advance">Approve request</button> <button type="button" class="link-button" data-action="reset" hidden>Start again</button></div>
<ul class="log" data-log><li>Surgery raised the request.</li></ul>${stamp}</div>`,

  'dd-drugs-register': () => `<div class="sheet" data-demo="dd">${sheetHead('Daily count', 'The system expects 14 vials. Enter what is on the shelf.')}
<form class="count" data-count novalidate>
<label for="dd-count">Physical count of Vial A</label>
<div class="field-row"><input id="dd-count" name="count" type="number" inputmode="numeric" min="0" max="99" value="12" required><button class="button">Submit count</button></div>
<p class="field-error" data-error hidden></p>
<div class="reason" data-reason hidden><label for="dd-reason">Reason for the difference</label>
<select id="dd-reason"><option>Breakage recorded on the ward</option><option>Recount: counting error</option><option>Dispensing not yet entered</option></select>
<button type="button" class="button" data-action="correct">Record correction</button></div>
</form>
<table class="ledger"><caption>Register</caption><thead><tr><th scope="col">Entry</th><th scope="col">Count</th><th scope="col">Note</th></tr></thead><tbody data-ledger><tr><td>Yesterday</td><td>14</td><td>Balanced</td></tr></tbody></table>${stamp}</div>`,

  theoses: () => `<div class="sheet" data-demo="theoses">${sheetHead('Task: draft this week’s stock report', 'Theoses does the groundwork, then stops for your review. This is a staged demo; nothing is sent.')}
<ol class="agent-steps" data-steps><li>Read the inventory export</li><li>Compare with last week</li><li>Draft the report</li></ol>
<div class="draft" data-draft hidden><p class="draft-label">Draft for review</p><p data-draft-text>Gauze swabs dropped below the reorder point on Tuesday. Two purchase orders are ready for Tanjung Clinical and Meridian Medical. Glove use is up on last week.</p></div>
<div class="sheet-foot"><button type="button" class="button" data-action="run">Run task</button>
<span data-review hidden><button type="button" class="button" data-action="approve">Approve</button> <button type="button" class="link-button" data-action="revise">Ask for changes</button></span></div>${stamp}</div>`,

  '89lab': () => `<div class="sheet" data-demo="lab">${sheetHead('Daily content pipeline', 'Pick a channel and run it. Run it again to see repeats skipped, or turn on the upload limit to see the hand-off.')}
<div class="channels" role="group" aria-label="Channel">${[['news', 'AI news'], ['repo', 'GitHub repo'], ['concept', 'AI concept']].map(([k, c], i) => `<button type="button" aria-pressed="${i === 0}" data-lane="${k}">${c}</button>`).join('')}</div>
<ol class="pipeline" data-pipeline>${['Pick topic', 'Check sources', 'Write script', 'Voiceover', 'Captions', 'Render', 'Publish', 'Record'].map(s => `<li>${s}</li>`).join('')}</ol>
<div class="sheet-foot"><button type="button" class="button" data-action="run">Run pipeline</button>
<label class="check"><input type="checkbox" data-quota> Daily upload limit reached</label></div>
<ul class="log" data-log></ul>${stamp}</div>`,

  map: (root, p) => `<div class="sheet sheet-phone" data-gallery>
<div class="gallery-tabs" role="tablist" aria-label="MAP screens">${p.scenes.map((s, i) => `<button role="tab" id="map-t${i}" aria-controls="map-p${i}" aria-selected="${i === 0}" tabindex="${i ? -1 : 0}">${s[0]}</button>`).join('')}</div>
${p.scenes.map((s, i) => `<div role="tabpanel" id="map-p${i}" aria-labelledby="map-t${i}" class="phone-panel"${i ? ' hidden' : ''}>${B.img(root, s[1], `MAP ${s[0]} screen. ${s[2]}`, 'loading="lazy"')}</div>`).join('')}
<p class="hint">Real app screens with fictional text.</p></div>`,

  yen: () => `<div class="sheet" data-demo="yen">${sheetHead('One conversation, three channels', 'Switch channel and keep talking. The conversation stays the same. Architecture demo, not a running agent.')}
<div class="channels" role="group" aria-label="Channel">${['Terminal', 'Telegram', 'Browser'].map((c, i) => `<button type="button" aria-pressed="${i === 0}" data-channel="${c}">${c}</button>`).join('')}</div>
<p class="conv">Conversation <strong>c-7f3a</strong>, memory shared</p>
<ul class="thread" data-thread><li><span>Terminal</span>Remind me to check the gauze order on Friday.</li><li class="is-agent"><span>Yen</span>Noted for Friday.</li></ul>
<form class="field-row" data-say><label class="sr-only" for="yen-say">Message</label><input id="yen-say" value="Did the gauze order go out?"><button class="button">Send</button></form></div>`
};

module.exports = { demos };
