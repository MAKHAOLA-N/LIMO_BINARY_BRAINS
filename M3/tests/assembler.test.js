// Assembler unit tests (B8 i). Run all tests with:  node tests/run.js
const { assemble } = require('../src/assembler.js');
const { check, section } = require('./check.js');

// Assemble one line and return its hex word
const hexOf = (src) => assemble(src).program[0].hex;

// Expect assembling `src` to throw an error mentioning `text` on line `line`
function expectError(name, src, text, line) {
  try { assemble(src); check(name, false, 'no error was thrown'); }
  catch (e) { check(name, e.message.includes(text) && e.line === line, e.message); }
}

section('A1. Worked examples from the M1 specification (section 2.5)');
check('eketsa r3,r1,r2  = 0x00C48040', hexOf('eketsa r3, r1, r2') === '0x00C48040');
check('fokotsa r5,r4,r3 = 0x0150C080', hexOf('fokotsa r5, r4, r3') === '0x0150C080');
check('eketsaI r4,r0,12 = 0x050000C0', hexOf('eketsaI r4, r0, 12') === '0x050000C0');
check('jarisa r3,0(r1)  = 0x10C40000', hexOf('jarisa r3, 0(r1)') === '0x10C40000');
check('ngola r2,8(r1)   = 0x14480080', hexOf('ngola r2, 8(r1)') === '0x14480080');
const br = assemble('lekana r1, r2, fela\neketsa r0,r0,r0\neketsa r0,r0,r0\neketsa r0,r0,r0\nfela: eketsa r0,r0,r0');
check('lekana r1,r2,fela (16 bytes ahead) = 0x18480030', br.program[0].hex === '0x18480030');

section('A2. Every instruction encodes with the right opcode / funct');
const rOps = ['eketsa', 'fokotsa', 'kopanya', 'kapa', 'fapana', 'suthisa', 'khutlisetsa', 'nyane'];
rOps.forEach((m, i) => {
  const ins = assemble(`${m} r1, r2, r3`).program[0];
  check(`${m} funct = ${i + 1}`, ins.fields.funct === i + 1 && (ins.word >>> 26) === 0);
});
[['kopanyaI r1, r2, 5', 2], ['kapaI r2, r1, 5', 3], ['fapane r1, r2, x\nx:', 7]].forEach(([src, op]) => {
  check(`${src.split(/\s/)[0]} opcode = ${op}`, (assemble(src).program[0].word >>> 26) === op);
});
check('kapaI r2,r1,5 = 0x0C840050', hexOf('kapaI r2, r1, 5') === '0x0C840050');

section('A3. Immediates: negative, hex, limits, backward branch');
check('eketsaI r1,r0,-1 -> imm field all ones', hexOf('eketsaI r1, r0, -1') === '0x0443FFF0');
check('hex immediate 0xC == 12', hexOf('eketsaI r4, r0, 0xC') === '0x050000C0');
check('max immediate 8191 accepted', hexOf('eketsaI r1, r0, 8191') === '0x0441FFF0');
check('min immediate -8192 accepted', hexOf('eketsaI r1, r0, -8192') === '0x04420000');
const back = assemble('loop: eketsaI r1, r1, 1\nfapane r1, r2, loop');
check('backward branch disp = -2', back.program[1].fields.disp === -2);
check('aliases: sp=r14, ra=r15, lefela=r0', assemble('eketsa sp, ra, lefela').program[0].fields.rd === 14);

section('A4. Labels, comments and blank lines');
const arr = assemble(`
  eketsaI r1,r0,0   # base address
  eketsaI r2,r0,3
  eketsaI r3,r0,0
  eketsaI r4,r0,0
loop: lekana r3,r2,done
  jarisa r5,0(r1)
  eketsa r4,r4,r5
  eketsaI r1,r1,4
  eketsaI r3,r3,1
  lekana r0,r0,loop ; unconditional
done: ngola r4,12(r0)`);
check('array program has 11 instructions', arr.program.length === 11);
check('label loop = 16, done = 40', arr.labels.loop === 16 && arr.labels.done === 40);
check('lekana r3,r2,done disp = 5', arr.program[4].fields.disp === 5);
check('lekana r0,r0,loop disp = -6', arr.program[9].fields.disp === -6);
check('label with apostrophe allowed', assemble("ts'ela: eketsa r1,r1,r1").labels["ts'ela"] === 0);

section('A5. Errors are plain language with line numbers');
expectError('unknown instruction', 'eketsa r1,r1,r1\nadd r1,r2,r3', 'Unknown instruction', 2);
expectError('bad register', 'eketsa r1, r2, r16', 'not a register', 1);
expectError('wrong operand count', 'eketsa r1, r2', 'Expected 3 operands', 1);
expectError('immediate too big', 'eketsaI r1, r0, 9000', 'out of range', 1);
expectError('undefined label', '\nlekana r1, r2, nowhere', 'not defined', 2);
expectError('duplicate label', 'a: eketsa r1,r1,r1\na: eketsa r1,r1,r1', 'defined twice', 2);
expectError('bad memory syntax', 'jarisa r3, r1', 'offset(register)', 1);
expectError('curly apostrophe', 'ts’ela: eketsa r1,r1,r1', 'Curly apostrophe', 1);


section('A6. .data lines (initial data memory)');
const d = assemble('.data 8  5, -1\neketsa r1, r1, r1');
check('.data gives two words at 8 and 12', d.data.length === 2 && d.data[0].addr === 8 && d.data[1].addr === 12 && d.data[1].value === -1);
check('.data does not move the PC', d.program[0].pc === 0);
expectError('.data address must be a multiple of 4', '.data 2  1', 'multiple of 4', 1);
expectError('.data outside memory', '.data 252  1, 2', 'outside', 1);
