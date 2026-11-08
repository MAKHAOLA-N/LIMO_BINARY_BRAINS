// The 8 LIMO test programs (B8 ii), each run with forwarding ON and OFF.
// Every expected value below was worked out BY HAND first (see docs/test-report.md).
//
// Cycle formula: cycles = instructions executed + 4 + stalls + 2 × taken branches
//   (+4 = filling the 5-stage pipeline; a taken branch flushes 2 slots)
const fs = require('fs');
const path = require('path');
const { assemble } = require('../src/assembler.js');
const P = require('../src/pipeline.js');
const EXAMPLES = require('../src/examples.js');
const { check, section } = require('./check.js');

const EXPECTED = {
  '0-hazard-free': {
    regs: { 1: 7, 2: 5, 3: 12, 4: 2, 5: 1, 6: 9, 7: 1, 8: 3 }, mem: { 0: 9, 8: 12 },
    on:  { cycles: 14, stalls: 0, flushes: 0 },   // 10 + 4: the ideal pipeline
    off: { cycles: 14, stalls: 0 },               // identical: nothing needs forwarding
  },
  '1-arithmetic': {
    regs: { 1: 7, 2: 5, 3: 12, 4: 2 }, mem: {},
    on:  { cycles: 8,  stalls: 0, flushes: 0 },   // 4 + 4
    off: { cycles: 10, stalls: 2 },               // eketsa r3 waits 2 cycles for r2
  },
  '2-logic': {
    regs: { 1: 10, 2: 3, 3: 2, 4: 11, 5: 9, 6: 24, 7: 1 }, mem: {},
    on:  { cycles: 11, stalls: 0, flushes: 0 },   // 7 + 4
    off: { cycles: 13, stalls: 2 },               // kopanya waits 2 for r2
  },
  '3-immediate-compare': {
    regs: { 1: -6, 2: 10, 3: 48, 4: 1, 5: 0 }, mem: {},
    on:  { cycles: 9,  stalls: 0, flushes: 0 },   // 5 + 4
    off: { cycles: 12, stalls: 3 },               // kopanyaI waits 2 for r1, nyane r4 waits 1 for r2
  },
  '4-load-store': {
    regs: { 1: 0, 2: 11, 3: 22 }, mem: { 0: 11, 4: 22, 8: 22, 12: 11 },
    on:  { cycles: 10, stalls: 1, flushes: 0 },   // 5 + 4 + 1 (ngola r3 right after jarisa r3)
    off: { cycles: 13, stalls: 4 },               // jarisa r2 waits 2 for r1, ngola r3 waits 2 for r3
  },
  '5-raw-forwarding': {
    regs: { 1: 3, 2: 6, 3: 9, 4: 3 }, mem: {},
    on:  { cycles: 8,  stalls: 0, flushes: 0 },   // every RAW is forwarded
    off: { cycles: 14, stalls: 6 },               // 3 back-to-back dependencies × 2 stalls
  },
  '6-load-use': {
    regs: { 1: 0, 2: 2, 3: 40, 4: 42 }, mem: { 0: 40 },
    on:  { cycles: 9,  stalls: 1, flushes: 0 },   // 4 + 4 + 1 load-use stall
    off: { cycles: 11, stalls: 3 },               // jarisa waits 1 for r1, eketsa waits 2 for r3
  },
  '7-branch': {
    regs: { 1: 1, 2: 2, 3: 0, 4: 42 }, mem: {},
    on:  { cycles: 11, stalls: 0, flushes: 2 },   // 5 executed + 4 + 2 (one taken branch)
    off: { cycles: 13, stalls: 2 },               // lekana waits 2 for r2
  },
  '8-array-loop': {
    regs: { 1: 12, 2: 3, 3: 3, 4: 9, 5: 7 }, mem: { 0: 4, 4: -2, 8: 7, 12: 9 },
    on:  { cycles: 39, stalls: 3, flushes: 5 },   // 24 executed + 4 + 3 load-use + 2×4 taken branches
    off: { cycles: 43, stalls: 7 },               // first lekana waits 1, each eketsa r4 waits 2 (×3)
  },
};

function run(source, forwarding) {
  const a = assemble(source);
  return P.runToEnd(P.createState(a.program, a.data, forwarding));
}

for (const [name, exp] of Object.entries(EXPECTED)) {
  const file = path.join(__dirname, '..', 'examples', name + '.limo');
  const source = fs.readFileSync(file, 'utf8');
  section(`T. ${name}.limo`);
  check('file matches the built-in example', source.trim() === EXAMPLES[name].trim());

  for (const mode of ['on', 'off']) {
    const s = run(source, mode === 'on');
    const label = mode === 'on' ? 'forwarding ON ' : 'forwarding OFF';
    const badRegs = Object.entries(exp.regs).filter(([r, val]) => s.regs[r] !== val);
    const badMem = Object.entries(exp.mem).filter(([addr, val]) => P.readWord(s.mem, Number(addr)) !== val);
    check(`${label}: registers ${Object.entries(exp.regs).map(([r, x]) => `r${r}=${x}`).join(' ')}`,
      badRegs.length === 0, badRegs.map(([r]) => `r${r} is ${s.regs[r]}`).join(', '));
    if (Object.keys(exp.mem).length) {
      check(`${label}: memory ${Object.entries(exp.mem).map(([a, x]) => `[${a}]=${x}`).join(' ')}`,
        badMem.length === 0, badMem.map(([a]) => `[${a}] is ${P.readWord(s.mem, Number(a))}`).join(', '));
    }
    const e = exp[mode];
    check(`${label}: ${e.cycles} cycles, ${e.stalls} stalls` + (e.flushes !== undefined ? `, ${e.flushes} flushed` : ''),
      s.cycle === e.cycles && s.stats.stalls === e.stalls && (e.flushes === undefined || s.stats.flushes === e.flushes),
      `got ${s.cycle} cycles, ${s.stats.stalls} stalls, ${s.stats.flushes} flushed`);
  }
}

// M3: the hazard-free program must never raise a hazard of any kind (no forwarding, stall or flush).
section('T. 0-hazard-free: no hazard in any cycle');
{
  const a = assemble(EXAMPLES['0-hazard-free']);
  const s = P.createState(a.program, a.data, true);
  let hazards = 0;
  while (!s.done) { P.step(s); hazards += s.last.hazards.length; }
  check('0 hazards reported over all 14 cycles', hazards === 0, `${hazards} reported`);
}

module.exports = { EXPECTED };
