// Pipeline unit tests (B8 i): decoder, control decoder, ALU, hazard/forwarding unit, memory.
const { assemble } = require('../src/assembler.js');
const P = require('../src/pipeline.js');
const PM = require('../src/pipeline-model.js');
const { check, section } = require('./check.js');

const wordOf = (src) => assemble(src).program[0].word;

// ---------------------------------------------------------------------
section('P1. Decoder: 32-bit word -> fields');
let d = P.decode(wordOf('eketsa r3, r1, r2'));
check('R-type: eketsa rd=3 rs1=1 rs2=2', d.name === 'eketsa' && d.rd === 3 && d.rs1 === 1 && d.rs2 === 2 && d.readsRs2);
d = P.decode(wordOf('eketsaI r1, r0, -1'));
check('I-type: negative immediate sign-extends to -1', d.name === 'eketsaI' && d.rd === 1 && d.imm === -1 && !d.readsRs2);
d = P.decode(wordOf('ngola r2, 8(r1)'));
check('S-type: ngola base rs1=1, data rs2=2, offset 8, no rd', d.rs1 === 1 && d.rs2 === 2 && d.imm === 8 && d.rd === 0);
d = P.decode(assemble('x: eketsa r1,r1,r1\nfapane r4, r5, x').program[1].word);
check('B-type: fapane rs1=4 rs2=5 disp=-2', d.name === 'fapane' && d.rs1 === 4 && d.rs2 === 5 && d.imm === -2);

// ---------------------------------------------------------------------
section('P2. Control decoder: signals for every instruction');
// RegWrite ALUSrc ALUOp MemRead MemWrite MemtoReg Branch   (same table as docs/M2-design.md)
const CONTROL_TABLE = {
  eketsa: '1 0 add 0 0 0 0', fokotsa: '1 0 sub 0 0 0 0', kopanya: '1 0 and 0 0 0 0', kapa: '1 0 or 0 0 0 0',
  fapana: '1 0 xor 0 0 0 0', suthisa: '1 0 sll 0 0 0 0', khutlisetsa: '1 0 srl 0 0 0 0', nyane: '1 0 slt 0 0 0 0',
  eketsaI: '1 1 add 0 0 0 0', kopanyaI: '1 1 and 0 0 0 0', kapaI: '1 1 or 0 0 0 0',
  jarisa: '1 1 add 1 0 1 0', ngola: '0 1 add 0 1 0 0', lekana: '0 0 sub 0 0 0 1', fapane: '0 0 sub 0 0 0 1',
};
for (const [name, expected] of Object.entries(CONTROL_TABLE)) {
  const c = P.controlSignals(name);
  const got = [c.RegWrite, c.ALUSrc, c.ALUOp, c.MemRead, c.MemWrite, c.MemtoReg, c.Branch].join(' ');
  check(`${name.padEnd(11)} ${expected}`, got === expected, got);
}

// ---------------------------------------------------------------------
section('P3. ALU');
check('add wraps: 2147483647 + 1 = -2147483648', P.alu('add', 2147483647, 1) === -2147483648);
check('sub: 7 - 5 = 2', P.alu('sub', 7, 5) === 2);
check('and / or / xor: 10,3 -> 2, 11, 9', P.alu('and', 10, 3) === 2 && P.alu('or', 10, 3) === 11 && P.alu('xor', 10, 3) === 9);
check('sll uses low 5 bits: 1 << 33 = 2', P.alu('sll', 1, 33) === 2);
check('srl is logical: -8 >> 1 = 0x7FFFFFFC', P.alu('srl', -8, 1) === 0x7FFFFFFC);
check('slt is signed: -1 < 1 -> 1', P.alu('slt', -1, 1) === 1 && P.alu('slt', 1, -1) === 0);

// ---------------------------------------------------------------------
section('P4. Forwarding unit (ForwardA / ForwardB)');
// Helper: a pipeline register holding an instruction that writes register rd
const writer = (rd, extra = {}) => ({ ...PM.emptyEXMEM(), bubble: false, rd, control: { ...PM.noControl(), RegWrite: 1, ...extra } });
const empty = PM.emptyEXMEM();
check('value in EX/MEM -> 10', P.forwardSelect(3, writer(3), empty) === '10');
check('value in MEM/WB -> 01', P.forwardSelect(3, empty, writer(3)) === '01');
check('both have it -> EX/MEM wins (newest) -> 10', P.forwardSelect(3, writer(3), writer(3)) === '10');
check('no match -> 00 (use register file)', P.forwardSelect(3, writer(4), writer(5)) === '00');
check('r0 is never forwarded -> 00', P.forwardSelect(0, writer(0), writer(0)) === '00');
check('a store (RegWrite 0) is not forwarded -> 00', P.forwardSelect(3, { ...writer(3), control: PM.noControl() }, empty) === '00');
check('MEM/WB load forwards the loaded value', P.forwardedValue('01', 0, empty, { ...writer(3, { MemtoReg: 1 }), memData: 40, aluResult: 0 }) === 40);

// ---------------------------------------------------------------------
section('P5. Hazard detection (stalls)');
const load = (rd) => writer(rd, { MemRead: 1, MemtoReg: 1 });
const user = P.decode(wordOf('eketsa r4, r3, r2'));      // reads r3 and r2
check('ON: load r3 then use r3 -> load-use stall', (P.hazardCheck(user, load(3), empty, true) || {}).kind === 'load-use');
check('ON: ALU result r3 then use r3 -> no stall (forwarded)', P.hazardCheck(user, writer(3), empty, true) === null);
check('ON: load r5, unrelated -> no stall', P.hazardCheck(user, load(5), empty, true) === null);
check('OFF: producer in EX -> stall', (P.hazardCheck(user, writer(3), empty, false) || {}).kind === 'raw');
check('OFF: producer in MEM -> stall', (P.hazardCheck(user, empty, writer(2), false) || {}).kind === 'raw');
check('OFF: producer already in WB -> no stall', P.hazardCheck(user, empty, empty, false) === null);
const immUser = P.decode(wordOf('eketsaI r4, r3, 1'));    // reads only r3 (rs2 field unused)
check('I-type does not stall on its unused rs2 field', P.hazardCheck(immUser, load(0), empty, true) === null);

// ---------------------------------------------------------------------
section('P6. Data memory: little-endian words, aligned');
const mem = new Array(256).fill(0);
P.writeWord(mem, 4, 0x11223344);
check('lowest byte stored first: mem[4] = 0x44', mem[4] === 0x44 && mem[7] === 0x11);
check('misaligned address 6 rounds down to 4', P.readWord(mem, 6) === 0x11223344);
P.writeWord(mem, 8, -2);
check('negative value reads back as -2', P.readWord(mem, 8) === -2);
