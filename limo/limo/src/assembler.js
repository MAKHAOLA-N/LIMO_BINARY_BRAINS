// LIMO assembler — turns LIMO source text into 32-bit machine words.
// Works in the browser (window.LIMO) and in Node (require).
//
// Two passes:
//   Pass 1: find every label and remember its byte address (PC).
//   Pass 2: turn each instruction into fields and pack them into 32 bits.

// ---------- ISA tables (copied from the M1 specification) ----------

// R-type: opcode 000000, operation chosen by funct
const FUNCT = {
  eketsa: 1, fokotsa: 2, kopanya: 3, kapa: 4,
  fapana: 5, suthisa: 6, khutlisetsa: 7, nyane: 8,
};

// I, S, B types: each has its own opcode
const OPCODE = {
  eketsai: 1, kopanyai: 2, kapai: 3, // I arithmetic/logic
  jarisa: 4,                         // I load
  ngola: 5,                          // S store
  lekana: 6, fapane: 7,              // B branches
};

// Register names -> number (0..15)
const REGISTERS = { lefela: 0, sp: 14, mokokotlo: 14, ra: 15 };
for (let i = 0; i <= 15; i++) REGISTERS['r' + i] = i;
for (let i = 1; i <= 13; i++) REGISTERS['n' + i] = i;

const IMM_MIN = -8192, IMM_MAX = 8191; // signed 14-bit

// ---------- Helpers ----------

class AsmError extends Error {
  constructor(line, message) {
    super(`Line ${line}: ${message}`);
    this.line = line;
  }
}

function parseRegister(text, line) {
  const r = REGISTERS[text.toLowerCase()];
  if (r === undefined) throw new AsmError(line, `"${text}" is not a register. Use r0–r15 (or lefela, sp, ra).`);
  return r;
}

function parseNumber(text, line) {
  if (!/^-?(0x[0-9a-f]+|\d+)$/i.test(text)) {
    throw new AsmError(line, `"${text}" is not a number. Use decimal (12) or hex (0xC).`);
  }
  const neg = text.startsWith('-');
  const value = parseInt(neg ? text.slice(1) : text); // parseInt understands 0x
  return neg ? -value : value;
}

function checkRange(value, line, what) {
  if (value < IMM_MIN || value > IMM_MAX) {
    throw new AsmError(line, `${what} ${value} is out of range (${IMM_MIN} to ${IMM_MAX}).`);
  }
}

// "8(r1)" -> { offset: 8, base: 1 }
function parseMemory(text, line) {
  const m = text.match(/^(.*)\((.+)\)$/);
  if (!m) throw new AsmError(line, `"${text}" should look like offset(register), e.g. 8(r1).`);
  const offset = m[1].trim() === '' ? 0 : parseNumber(m[1].trim(), line);
  checkRange(offset, line, 'Offset');
  return { offset, base: parseRegister(m[2].trim(), line) };
}

function expectOperands(ops, count, line, example) {
  if (ops.length !== count) {
    throw new AsmError(line, `Expected ${count} operands, got ${ops.length}. Example: ${example}`);
  }
}

// Remove comment, split off an optional label.  Returns { label, text }.
function splitLine(raw, line) {
  if (/[\u2018\u2019\u201B\u02BC]/.test(raw)) {
    throw new AsmError(line, 'Curly apostrophe found. Use the plain keyboard apostrophe (\').');
  }
  let text = raw.replace(/[#;].*$/, '').trim();
  let label = null;
  const m = text.match(/^([A-Za-z_][A-Za-z0-9_']*)\s*:(.*)$/);
  if (m) { label = m[1]; text = m[2].trim(); }
  return { label, text };
}

// ---------- Encoding: pack fields into one 32-bit word ----------

const imm14 = (v) => v & 0x3FFF; // keep the low 14 bits (two's complement)

function encodeR(rd, rs1, rs2, funct) {
  return ((0 << 26) | (rd << 22) | (rs1 << 18) | (rs2 << 14) | (funct << 6)) >>> 0;
}
// I, S and B share one layout: opcode | regA | regB | imm14 | 0000
function encodeISB(op, a, b, imm) {
  return ((op << 26) | (a << 22) | (b << 18) | (imm14(imm) << 4)) >>> 0;
}

// ---------- The assembler ----------

function assemble(source) {
  const lines = source.split(/\r?\n/);
  const labels = {};
  const pending = []; // { line, source, mnemonic, ops, pc }

  // Pass 1: labels and instruction addresses
  let pc = 0;
  lines.forEach((raw, i) => {
    const line = i + 1;
    const { label, text } = splitLine(raw, line);
    if (label) {
      if (label in labels) throw new AsmError(line, `Label "${label}" is defined twice.`);
      labels[label] = pc;
    }
    if (text === '') return;
    const space = text.search(/\s/);
    const mnemonic = (space === -1 ? text : text.slice(0, space)).toLowerCase();
    const rest = space === -1 ? '' : text.slice(space).trim();
    const ops = rest === '' ? [] : rest.split(',').map((s) => s.trim());
    pending.push({ line, source: text, mnemonic, ops, pc });
    pc += 4;
  });

  // Pass 2: encode
  const program = pending.map((ins) => {
    const { line, mnemonic: m, ops, pc } = ins;
    let word, format, fields;

    if (m in FUNCT) {
      expectOperands(ops, 3, line, `${m} r3, r1, r2`);
      const rd = parseRegister(ops[0], line), rs1 = parseRegister(ops[1], line), rs2 = parseRegister(ops[2], line);
      word = encodeR(rd, rs1, rs2, FUNCT[m]);
      format = 'R';
      fields = { opcode: 0, rd, rs1, rs2, funct: FUNCT[m] };

    } else if (m === 'eketsai' || m === 'kopanyai' || m === 'kapai') {
      expectOperands(ops, 3, line, `${m} r1, r0, 5`);
      const rd = parseRegister(ops[0], line), rs1 = parseRegister(ops[1], line);
      const imm = parseNumber(ops[2], line);
      checkRange(imm, line, 'Immediate');
      word = encodeISB(OPCODE[m], rd, rs1, imm);
      format = 'I';
      fields = { opcode: OPCODE[m], rd, rs1, imm };

    } else if (m === 'jarisa') {
      expectOperands(ops, 2, line, 'jarisa r3, 0(r1)');
      const rd = parseRegister(ops[0], line);
      const { offset, base } = parseMemory(ops[1], line);
      word = encodeISB(OPCODE.jarisa, rd, base, offset);
      format = 'I';
      fields = { opcode: OPCODE.jarisa, rd, rs1: base, imm: offset };

    } else if (m === 'ngola') {
      expectOperands(ops, 2, line, 'ngola r2, 8(r1)');
      const rs2 = parseRegister(ops[0], line);
      const { offset, base } = parseMemory(ops[1], line);
      word = encodeISB(OPCODE.ngola, base, rs2, offset); // S: rs1 at [25:22], rs2 at [21:18]
      format = 'S';
      fields = { opcode: OPCODE.ngola, rs1: base, rs2, imm: offset };

    } else if (m === 'lekana' || m === 'fapane') {
      expectOperands(ops, 3, line, `${m} r1, r2, label`);
      const rs1 = parseRegister(ops[0], line), rs2 = parseRegister(ops[1], line);
      if (!(ops[2] in labels)) throw new AsmError(line, `Label "${ops[2]}" is not defined.`);
      const disp = (labels[ops[2]] - (pc + 4)) / 4; // words from PC+4
      checkRange(disp, line, 'Branch displacement');
      word = encodeISB(OPCODE[m], rs1, rs2, disp);
      format = 'B';
      fields = { opcode: OPCODE[m], rs1, rs2, disp };

    } else {
      throw new AsmError(line, `Unknown instruction "${ins.mnemonic}".`);
    }

    return { pc, line, source: ins.source, mnemonic: m, format, fields, word,
             hex: toHex(word), binary: toBinary(word) };
  });

  return { program, labels };
}

const toHex = (w) => '0x' + (w >>> 0).toString(16).toUpperCase().padStart(8, '0');
const toBinary = (w) => (w >>> 0).toString(2).padStart(32, '0');

// Bit ranges per format, used by the page to colour-code fields.
const LAYOUT = {
  R: [['opcode', 6], ['rd', 4], ['rs1', 4], ['rs2', 4], ['funct', 8], ['zero', 6]],
  I: [['opcode', 6], ['rd', 4], ['rs1', 4], ['imm', 14], ['zero', 4]],
  S: [['opcode', 6], ['rs1', 4], ['rs2', 4], ['imm', 14], ['zero', 4]],
  B: [['opcode', 6], ['rs1', 4], ['rs2', 4], ['disp', 14], ['zero', 4]],
};

const LIMO = { assemble, AsmError, toHex, toBinary, LAYOUT, FUNCT, OPCODE, REGISTERS };
if (typeof module !== 'undefined') module.exports = LIMO;
else window.LIMO = LIMO;
