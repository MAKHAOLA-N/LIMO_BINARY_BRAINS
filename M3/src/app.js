// Page logic: buttons → assembler / simulator → redraw every panel.

const $ = (id) => document.getElementById(id);

let assembled = null;            // result of LIMO.assemble: { program, labels, data }
let state = null;                // the simulator (see pipeline.js)
let history = [];                // saved copies of the state, for Step back
let timer = null;                // the Run timer
const breakpoints = new Set();   // PCs where Run pauses

// ---------- B1: editor ----------
for (const name in EXAMPLES) $('examples').add(new Option(name, name));
$('examples').onchange = () => { $('source').value = EXAMPLES[$('examples').value]; runAssembler(); };

$('file').onchange = async (e) => {
  const f = e.target.files[0];
  if (f) { $('source').value = await f.text(); runAssembler(); }
};

$('assemble').onclick = runAssembler;

function runAssembler() {
  const msg = $('message');
  try {
    assembled = LIMO.assemble($('source').value);
    breakpoints.clear();
    msg.textContent = `Assembled ${assembled.program.length} instructions with no errors. Press Step or Run.`;
    msg.className = 'message ok';
  } catch (err) {
    assembled = null;
    msg.textContent = err.message;            // e.g. Line 3: "r16" is not a register…
    msg.className = 'message error';
  }
  resetSim();
}

// ---------- B2: Step, Run, Pause, Step back, Reset ----------
function resetSim() {
  pause();
  history = [];
  state = assembled ? Pipeline.createState(assembled.program, assembled.data, $('forward').checked) : null;
  render();
}

function stepOnce() {
  if (!state || state.done) return;
  history.push(structuredClone(state));      // remember this cycle so Step back can return to it
  if (history.length > 2000) history.shift();
  Pipeline.step(state);
}

function pause() { clearInterval(timer); timer = null; }

$('step').onclick = () => { pause(); stepOnce(); render(); };
$('back').onclick = () => { pause(); if (history.length) { state = history.pop(); render(); } };
$('reset').onclick = resetSim;
$('pause').onclick = () => { pause(); render(); };
$('forward').onchange = resetSim;           // compare cycle counts with forwarding ON / OFF

$('run').onclick = () => {
  if (timer || !state || state.done) return;
  timer = setInterval(() => {
    stepOnce();
    const f = state.last && state.last.IF;
    if (state.done || (f && breakpoints.has(f.pc) && !f.stalled && !f.flushed)) pause();   // stop at the end or a breakpoint
    render();
  }, Number($('speed').value));
  render();
};

// Breakpoint tick boxes in the machine-code table
$('machine').onchange = (e) => {
  const pc = Number(e.target.dataset.pc);
  if (e.target.checked) breakpoints.add(pc); else breakpoints.delete(pc);
};

// ---------- Drawing ----------
function render() {
  renderMachine();
  updateDatapath(state);
  renderAllViews(state);

  let status = 'Assemble a program first.';
  if (state) {
    status = state.done ? `Finished after ${state.cycle} cycles.` : `Cycle ${state.cycle}` + (timer ? ' · running…' : '');
    const f = state.last && state.last.IF;
    if (!timer && !state.done && f && breakpoints.has(f.pc)) status += ` · paused at breakpoint (PC ${f.pc})`;
  }
  $('status').textContent = status;
  for (const id of ['step', 'run', 'back', 'reset', 'pause']) $(id).disabled = !state;
}

// Machine-code table: fields split and coloured (colour is never the only cue:
// fields are also separated by spaces and named on hover), breakpoints, and the stage each line is in now.
function renderMachine() {
  if (!assembled) { $('machine').innerHTML = ''; return; }
  const where = {};
  if (state && state.last) {
    for (const st of ['IF', 'ID', 'EX', 'MEM', 'WB']) {
      const info = state.last[st];
      if (info) (where[info.pc] = where[info.pc] || []).push(st);
    }
  }
  $('machine').innerHTML = assembled.program.map((ins) => {
    let pos = 0;
    const bits = LIMO.LAYOUT[ins.format].map(([name, width]) => {
      const part = ins.binary.slice(pos, pos + width);
      pos += width;
      return `<span class="f-${name === 'disp' ? 'imm' : name}" title="${name} (${width} bits)">${part}</span>`;
    }).join(' ');
    const now = (where[ins.pc] || []).join(', ');
    return `<tr class="${now ? 'busy' : ''}">
      <td><input type="checkbox" data-pc="${ins.pc}" ${breakpoints.has(ins.pc) ? 'checked' : ''} aria-label="Breakpoint at PC ${ins.pc}"></td>
      <td>${ins.pc}</td><td><code>${esc(ins.source)}</code></td><td>${ins.format}</td>
      <td class="bits">${bits}</td><td><code>${ins.hex}</code></td><td><b>${now}</b></td></tr>`;
  }).join('');
}

// ---------- Start ----------
mountDatapath($('datapath'));
$('source').value = EXAMPLES[Object.keys(EXAMPLES)[0]];
runAssembler();
