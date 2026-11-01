// Draws the panels from the simulator state (B4–B7 and the pipeline-register table).
// Nothing in this file changes the state — it only reads it and writes HTML.

const SESOTHO_REG = { 0: 'lefela (zero)', 14: 'mokokotlo (sp)', 15: 'aterese ea khutlo (ra)' };
const hex8 = (n) => '0x' + (n >>> 0).toString(16).toUpperCase().padStart(8, '0');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const el = (id) => document.getElementById(id);

// ---------------------------------------------------------------- B4 control view
const SIGNALS = [
  ['RegWrite', '1 = write the result into register rd (happens in WB)'],
  ['ALUSrc',   '1 = ALU input B is the immediate; 0 = register rs2'],
  ['ALUOp',    'Which operation the ALU does (ALU control)'],
  ['MemRead',  '1 = read data memory (jarisa)'],
  ['MemWrite', '1 = write data memory (ngola)'],
  ['MemtoReg', '1 = write back the value from memory; 0 = the ALU result'],
  ['Branch',   '1 = this is a branch (lekana / fapane)'],
  ['PCSrc',    '1 = branch taken, next PC = branch target (decided in EX)'],
];

function renderControl(s) {
  const cols = s ? [['ID/EX', s.IDEX], ['EX/MEM', s.EXMEM], ['MEM/WB', s.MEMWB]] : [];
  const head = cols.map(([n, r]) => `<th>${n}<br><small>${r.bubble ? 'bubble' : esc(r.text)}</small></th>`).join('');
  const rows = SIGNALS.map(([sig, meaning]) => {
    const cells = cols.map(([, r]) => {
      if (r.bubble) return '<td class="dim">–</td>';
      const val = r.control[sig];
      if (sig === 'PCSrc' && r === s.IDEX) return '<td class="dim">(EX)</td>';
      return `<td class="${val ? 'one' : ''}">${val}</td>`;
    }).join('');
    return `<tr><th>${sig}</th>${cells}<td class="meaning">${meaning}</td></tr>`;
  }).join('');
  el('controls').innerHTML = s
    ? `<table><thead><tr><th>Signal</th>${head}<th>Meaning</th></tr></thead><tbody>${rows}</tbody></table>`
    : '<p class="message">Assemble a program to see control signals.</p>';
}

// ---------------------------------------------------------------- B5 hazards
function renderHazards(s) {
  const v = s && s.last;
  let html = '';
  if (!v) html = '<p class="message">No cycle executed yet.</p>';
  else if (!v.hazards.length) html = `<p class="message">Cycle ${v.cycle}: no hazards.</p>`;
  else html = '<ul class="hazards">' + v.hazards.map((h) => `<li class="hz-${h.type}"><b>${h.type.toUpperCase()}</b> ${esc(h.text)}</li>`).join('') + '</ul>';
  if (v && v.EX) {
    const name = { '00': 'register file', '10': 'EX/MEM', '01': 'MEM/WB' };
    html += `<p class="fwd">ForwardA = <b>${v.EX.fA}</b> (${name[v.EX.fA]}) · ForwardB = <b>${v.EX.fB}</b> (${name[v.EX.fB]})</p>`;
  }
  if (s) html += `<p class="message">Forwarding is <b>${s.forwarding ? 'ON' : 'OFF'}</b>. So far: ${s.stats.stalls} stall(s), ${s.stats.flushes} flushed instruction(s). Switch forwarding and run again to compare the cycle count.</p>`;
  el('hazards').innerHTML = html;
}

// ---------------------------------------------------------------- B7 narration (English + Sesotho)
const OP_SYMBOL = { add: '+', sub: '−', and: 'AND', or: 'OR', xor: 'XOR', sll: '<<', srl: '>>', slt: '<' };

function narrate(stage, i) {
  if (!i) return { en: 'Empty (bubble) — no instruction this cycle.', st: 'Ha ho taelo (bubble) potolohong ena.' };
  let en = '', st = '';
  const q = `"${i.text}"`;
  if (stage === 'IF') {
    en = `Fetched ${q} from address ${i.pc}. Next PC = ${i.pcPlus4}.`;
    st = `E lata taelo ${q} atereseng ${i.pc}. PC e latelang = ${i.pcPlus4}.`;
  } else if (stage === 'ID') {
    const r2 = i.readsRs2 ? ` and r${i.rs2} = ${i.d2}` : `, immediate = ${i.imm}`;
    const r2s = i.readsRs2 ? ` le r${i.rs2} = ${i.d2}` : `, imm = ${i.imm}`;
    en = `Decoded ${q}: read r${i.rs1} = ${i.d1}${r2}; control signals made.`;
    st = `E hlalosa ${q}: e bala r${i.rs1} = ${i.d1}${r2s}; e etsa matšoao a taolo.`;
  } else if (stage === 'EX') {
    if (i.branch) {
      en = `Compared ${i.a} and ${i.b}: branch ${i.taken ? `TAKEN, next PC = ${i.target}` : 'not taken'}.`;
      st = `E bapisa ${i.a} le ${i.b}: branch ${i.taken ? `e nkuoa, PC e latelang = ${i.target}` : 'ha e nkuoe'}.`;
    } else if (i.isMemory) {
      en = `Computed the memory address ${i.a} + ${i.b} = ${i.result}.`;
      st = `E bala aterese ea mohopolo ${i.a} + ${i.b} = ${i.result}.`;
    } else {
      en = `ALU: ${i.a} ${OP_SYMBOL[i.op]} ${i.b} = ${i.result}.`;
      st = `ALU e bala: ${i.a} ${OP_SYMBOL[i.op]} ${i.b} = ${i.result}.`;
    }
    if (i.fA !== '00' || i.fB !== '00') { en += ' Used forwarding.'; st += ' E sebelisitse forwarding.'; }
  } else if (stage === 'MEM') {
    if (i.action === 'read') { en = `Read ${i.value} from data memory address ${i.addr}.`; st = `E balile ${i.value} mohopolong atereseng ${i.addr}.`; }
    else if (i.action === 'write') { en = `Wrote ${i.value} to data memory address ${i.addr}.`; st = `E ngotse ${i.value} mohopolong atereseng ${i.addr}.`; }
    else { en = `${q} does not use memory; its value passes through.`; st = `${q} ha e sebelise mohopolo; boleng bo feta feela.`; }
  } else if (stage === 'WB') {
    if (i.write) {
      en = i.rd === 0 ? 'Result goes to r0, which always stays 0.' : `Wrote ${i.value} into r${i.rd}.`;
      st = i.rd === 0 ? 'Sephetho se ea ho r0, e lulang e le 0.' : `E ngotse ${i.value} ho r${i.rd}.`;
    } else { en = `${q} has nothing to write back (store or branch).`; st = `${q} ha e na letho leo e le ngolang (ngola kapa branch).`; }
  }
  if (i.stalled) { en += ' It waits here this cycle (stall).'; st += ' E ema mona potolohong ena (stall).'; }
  if (i.flushed) { en += ' Wrong path — thrown away (flush).'; st += ' Tsela e fosahetseng — ea lahloa (flush).'; }
  return { en, st };
}

function renderNarration(s) {
  const v = s && s.last;
  if (!v) { el('narration').innerHTML = '<p class="message">Press Step to go one clock cycle at a time.</p>'; return; }
  el('narration').innerHTML = `<p class="message">Cycle ${v.cycle}</p><table><thead><tr><th>Stage</th><th>English</th><th>Sesotho</th></tr></thead><tbody>` +
    ['IF', 'ID', 'EX', 'MEM', 'WB'].map((st) => {
      const n = narrate(st, v[st]);
      return `<tr><th>${st}</th><td>${esc(n.en)}</td><td>${esc(n.st)}</td></tr>`;
    }).join('') + '</tbody></table>';
}

// ---------------------------------------------------------------- B6 statistics and chart
function renderStats(s) {
  if (!s) { el('stats').innerHTML = ''; el('chart').innerHTML = ''; return; }
  const n = s.stats.instructions;
  const cpi = n ? (s.cycle / n).toFixed(2) : '–';
  const tile = (label, value) => `<div class="tile"><small>${label}</small><b>${value}</b></div>`;
  el('stats').innerHTML = tile('Cycles', s.cycle) + tile('Instructions done', n) + tile('CPI', cpi) +
    tile('Stalls', s.stats.stalls) + tile('Flushed', s.stats.flushes) + tile('Forwarding', s.forwarding ? 'ON' : 'OFF');

  const cycles = Array.from({ length: s.cycle }, (_, i) => i + 1);
  const head = '<tr><th>Instruction</th>' + cycles.map((c) => `<th>${c}</th>`).join('') + '</tr>';
  const body = s.chart.map((row) => '<tr><th>' + esc(row.text) + '</th>' + cycles.map((c) => {
    const cell = row.cells[c] || '';
    const cls = cell.includes('*') ? 'stall' : cell.includes('✕') ? 'flush' : cell ? 'c-' + cell : '';
    return `<td class="${cls}">${cell}</td>`;
  }).join('') + '</tr>').join('');
  el('chart').innerHTML = `<table class="chart"><thead>${head}</thead><tbody>${body}</tbody></table>`;
}

// ---------------------------------------------------------------- B6 registers and memory
function renderRegisters(s) {
  const changed = new Set(s && s.last ? s.last.changedRegs : []);
  el('registers').innerHTML = Array.from({ length: 16 }, (_, i) => {
    const val = s ? s.regs[i] : 0;
    const c = changed.has(i);
    return `<tr class="${c ? 'changed' : ''}"><td>r${i}</td><td>${SESOTHO_REG[i] || 'n' + i}</td><td>${val}${c ? ' ◀' : ''}</td><td><code>${hex8(val)}</code></td></tr>`;
  }).join('');
}

function renderMemory(s) {
  const changed = new Set(s && s.last ? s.last.changedMem : []);
  const rows = [];
  for (let a = 0; a < 256; a += 4) {
    const val = s ? Pipeline.readWord(s.mem, a) : 0;
    const c = changed.has(a);
    rows.push(`<tr class="${c ? 'changed' : ''}"><td>${a}</td><td>${val}${c ? ' ◀' : ''}</td><td><code>${hex8(val)}</code></td></tr>`);
  }
  el('memory').innerHTML = rows.join('');
}

// ---------------------------------------------------------------- B3 contents of every pipeline register
function renderPipelineRegs(s) {
  if (!s) { el('pregs').innerHTML = ''; return; }
  const skip = new Set(['bubble', 'id', 'text', 'name', 'control']);
  const cell = (r) => {
    if (r.bubble) return '<td class="dim">bubble (empty)</td>';
    const lines = Object.entries(r).filter(([k]) => !skip.has(k)).map(([k, val]) =>
      `${k} = ${k === 'instruction' ? hex8(val) : esc(val)}`);
    const on = Object.entries(r.control || {}).filter(([k, val]) => val && k !== 'ALUOp').map(([k]) => k);
    if (r.control) lines.push(`control: ${on.join(', ') || 'all 0'}${r.control.ALUOp !== 'none' ? ', ALUOp ' + r.control.ALUOp : ''}`);
    return `<td><b>${esc(r.text)}</b><br>${lines.join('<br>')}</td>`;
  };
  el('pregs').innerHTML = `<table class="pregs"><thead><tr><th>IF/ID</th><th>ID/EX</th><th>EX/MEM</th><th>MEM/WB</th></tr></thead>
    <tbody><tr>${cell(s.IFID)}${cell(s.IDEX)}${cell(s.EXMEM)}${cell(s.MEMWB)}</tr></tbody></table>
    <p class="message">Values saved at the end of cycle ${s.cycle} (the clock edge).</p>`;
}

function renderAllViews(s) {
  renderControl(s); renderHazards(s); renderNarration(s); renderStats(s);
  renderRegisters(s); renderMemory(s); renderPipelineRegs(s);
}
