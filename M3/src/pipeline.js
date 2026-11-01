// LIMO pipeline simulator — five stages: IF, ID, EX, MEM, WB.
// One call to step(state) = one clock cycle.
//
// Inside one cycle we run the stages in the order WB, MEM, EX, ID, IF.
// Each stage reads the OLD pipeline register on its left and builds a NEW one
// on its right. At the end, all four new registers are saved at once — that is
// the clock edge. WB runs first so the register file is written before ID reads
// it (real hardware writes in the first half of the cycle, reads in the second).

const PM = typeof module !== 'undefined' ? require('./pipeline-model.js') : PipelineModel;

const MEM_BYTES = 256;    // data memory size in bytes (64 words)
const MAX_CYCLES = 2000;  // safety stop, in case a program loops forever

const FUNCT_NAMES = { 1: 'eketsa', 2: 'fokotsa', 3: 'kopanya', 4: 'kapa', 5: 'fapana', 6: 'suthisa', 7: 'khutlisetsa', 8: 'nyane' };
const OPCODE_NAMES = { 1: 'eketsaI', 2: 'kopanyaI', 3: 'kapaI', 4: 'jarisa', 5: 'ngola', 6: 'lekana', 7: 'fapane' };

// =====================================================================
// ID stage, part 1: the decoder — split the 32-bit word into its fields
// =====================================================================
function decode(word) {
  const opcode = word >>> 26;                          // bits 31:26
  const f1 = (word >>> 22) & 0xF;                      // bits 25:22
  const f2 = (word >>> 18) & 0xF;                      // bits 21:18
  const imm = (((word >>> 4) & 0x3FFF) << 18) >> 18;   // bits 17:4, sign-extended 14 → 32 bits

  if (opcode === 0) {                                  // R-type: the funct field picks the operation
    const name = FUNCT_NAMES[(word >>> 6) & 0xFF];
    if (!name) throw new Error('Unknown funct in word 0x' + (word >>> 0).toString(16));
    return { name, rd: f1, rs1: f2, rs2: (word >>> 14) & 0xF, readsRs2: true, imm: 0 };
  }
  const name = OPCODE_NAMES[opcode];
  if (!name) throw new Error('Unknown opcode in word 0x' + (word >>> 0).toString(16));
  if (name === 'ngola' || name === 'lekana' || name === 'fapane') {
    return { name, rd: 0, rs1: f1, rs2: f2, readsRs2: true, imm };   // S and B: two source registers
  }
  return { name, rd: f1, rs1: f2, rs2: 0, readsRs2: false, imm };    // I: one source register
}

// =====================================================================
// ID stage, part 2: the control unit — which signals are 1 for this instruction
// =====================================================================
const ALU_OPS = { eketsa: 'add', fokotsa: 'sub', kopanya: 'and', kapa: 'or', fapana: 'xor', suthisa: 'sll', khutlisetsa: 'srl', nyane: 'slt' };

function controlSignals(name) {
  const c = PM.noControl();
  if (name in ALU_OPS) { c.RegWrite = 1; c.ALUOp = ALU_OPS[name]; return c; }   // all R-type
  switch (name) {
    case 'eketsaI':  c.RegWrite = 1; c.ALUSrc = 1; c.ALUOp = 'add'; break;
    case 'kopanyaI': c.RegWrite = 1; c.ALUSrc = 1; c.ALUOp = 'and'; break;
    case 'kapaI':    c.RegWrite = 1; c.ALUSrc = 1; c.ALUOp = 'or'; break;
    case 'jarisa':   c.RegWrite = 1; c.ALUSrc = 1; c.ALUOp = 'add'; c.MemRead = 1; c.MemtoReg = 1; break;
    case 'ngola':    c.ALUSrc = 1; c.ALUOp = 'add'; c.MemWrite = 1; break;
    case 'lekana':
    case 'fapane':   c.ALUOp = 'sub'; c.Branch = 1; break;   // compare by subtracting: equal ⇔ result 0
    default: throw new Error(`Unknown instruction "${name}"`);
  }
  return c;
}

// =====================================================================
// EX stage: the ALU (all values are signed 32-bit; "| 0" wraps like hardware)
// =====================================================================
function alu(op, a, b) {
  switch (op) {
    case 'add': return (a + b) | 0;
    case 'sub': return (a - b) | 0;
    case 'and': return a & b;
    case 'or':  return a | b;
    case 'xor': return a ^ b;
    case 'sll': return a << (b & 31);              // only the low 5 bits of rs2 count
    case 'srl': return (a >>> (b & 31)) | 0;       // logical: fills with zeros
    case 'slt': return a < b ? 1 : 0;              // signed compare
    default: return 0;
  }
}

// =====================================================================
// Hazard unit
// =====================================================================

// Forwarding unit: where should an ALU operand come from?
//   '00' = the value read from the register file in ID (no hazard)
//   '10' = EX/MEM  (the instruction one ahead just computed it)
//   '01' = MEM/WB  (the instruction two ahead has it)
// EX/MEM is checked first because it holds the newest value.
function forwardSelect(reg, exmem, memwb) {
  if (reg === 0) return '00';                                            // r0 is always 0
  if (!exmem.bubble && exmem.control.RegWrite && exmem.rd === reg) return '10';
  if (!memwb.bubble && memwb.control.RegWrite && memwb.rd === reg) return '01';
  return '00';
}

function forwardedValue(sel, registerValue, exmem, memwb) {
  if (sel === '10') return exmem.aluResult;
  if (sel === '01') return memwb.control.MemtoReg ? memwb.memData : memwb.aluResult;
  return registerValue;
}

// Must the instruction in ID wait (stall)?
//   idex  = the instruction now in EX,  exmem = the instruction now in MEM.
// Forwarding ON : only a load followed by a user of its result (load-use) stalls,
//                 because the loaded value exists only after MEM.
// Forwarding OFF: wait until the producer has written back (it is no longer in EX or MEM).
function hazardCheck(ins, idex, exmem, forwarding) {
  const reads = ins.readsRs2 ? [ins.rs1, ins.rs2] : [ins.rs1];
  const producerOf = (p) => !p.bubble && p.control.RegWrite && p.rd !== 0 && reads.includes(p.rd);
  if (forwarding) {
    if (producerOf(idex) && idex.control.MemRead) return { kind: 'load-use', reg: idex.rd, producer: idex.text };
    return null;
  }
  if (producerOf(idex)) return { kind: 'raw', reg: idex.rd, producer: idex.text };
  if (producerOf(exmem)) return { kind: 'raw', reg: exmem.rd, producer: exmem.text };
  return null;
}

// =====================================================================
// Data memory: 256 bytes, little-endian, word access.
// Addresses are rounded down to a multiple of 4 and wrap inside the 256 bytes.
// =====================================================================
function wordAddress(addr) { return addr & (MEM_BYTES - 4); }   // & 0xFC

function readWord(mem, addr) {
  const a = wordAddress(addr);
  return mem[a] | (mem[a + 1] << 8) | (mem[a + 2] << 16) | (mem[a + 3] << 24);
}

function writeWord(mem, addr, value) {
  const a = wordAddress(addr);
  for (let i = 0; i < 4; i++) mem[a + i] = (value >>> (8 * i)) & 0xFF;   // lowest byte first
}

// =====================================================================
// The whole machine
// =====================================================================
function createState(program, data = [], forwarding = true) {
  const s = {
    program,                 // from the assembler: [{ pc, word, source, ... }] = instruction memory
    forwarding,
    pc: 0, cycle: 0, done: program.length === 0,
    regs: new Array(16).fill(0),
    mem: new Array(MEM_BYTES).fill(0),
    IFID: PM.emptyIFID(), IDEX: PM.emptyIDEX(), EXMEM: PM.emptyEXMEM(), MEMWB: PM.emptyMEMWB(),
    stats: { instructions: 0, stalls: 0, flushes: 0, takenBranches: 0 },
    chart: [],               // pipeline chart rows: { id, text, cells: { cycle: 'IF' | 'ID*' | ... } }
    nextId: 1,               // every fetched instruction gets a number (a row in the chart)
    pending: null,           // instruction fetched during a stall keeps its number
    last: null,              // what happened in the latest cycle (used by the views)
  };
  data.forEach(({ addr, value }) => writeWord(s.mem, addr, value));
  return s;
}

function copyIdentity(to, from) {
  to.bubble = false; to.id = from.id; to.pc = from.pc; to.text = from.text; to.name = from.name;
}

function step(s) {
  if (s.done) return s;
  s.cycle++;
  const { IFID, IDEX, EXMEM, MEMWB } = s;   // OLD registers = start of this cycle
  // v records what each stage did this cycle, for the datapath, narration and hazard views
  const v = { cycle: s.cycle, IF: null, ID: null, EX: null, MEM: null, WB: null, hazards: [], changedRegs: [], changedMem: [] };

  // ---------- WB: write the result into register rd ----------
  if (!MEMWB.bubble) {
    s.stats.instructions++;                                   // an instruction finishes here
    v.WB = { id: MEMWB.id, pc: MEMWB.pc, text: MEMWB.text, rd: MEMWB.rd, write: false, value: 0 };
    if (MEMWB.control.RegWrite) {
      const value = MEMWB.control.MemtoReg ? MEMWB.memData : MEMWB.aluResult;   // MemtoReg mux
      v.WB.write = true; v.WB.value = value;
      if (MEMWB.rd !== 0) { s.regs[MEMWB.rd] = value; v.changedRegs.push(MEMWB.rd); }   // r0 stays 0
    }
  }

  // ---------- MEM: jarisa reads data memory, ngola writes it ----------
  const newMEMWB = PM.emptyMEMWB();
  if (!EXMEM.bubble) {
    copyIdentity(newMEMWB, EXMEM);
    newMEMWB.rd = EXMEM.rd; newMEMWB.aluResult = EXMEM.aluResult; newMEMWB.control = EXMEM.control;
    v.MEM = { id: EXMEM.id, pc: EXMEM.pc, text: EXMEM.text, action: 'none', addr: wordAddress(EXMEM.aluResult), value: 0 };
    if (EXMEM.control.MemRead) {
      newMEMWB.memData = readWord(s.mem, EXMEM.aluResult);
      v.MEM.action = 'read'; v.MEM.value = newMEMWB.memData;
    }
    if (EXMEM.control.MemWrite) {
      writeWord(s.mem, EXMEM.aluResult, EXMEM.storeData);
      v.MEM.action = 'write'; v.MEM.value = EXMEM.storeData; v.changedMem.push(v.MEM.addr);
    }
  }

  // ---------- EX: forwarding, ALU, branch decision ----------
  const newEXMEM = PM.emptyEXMEM();
  let taken = false;
  if (!IDEX.bubble) {
    const fA = s.forwarding ? forwardSelect(IDEX.rs1, EXMEM, MEMWB) : '00';
    const fB = s.forwarding && IDEX.readsRs2 ? forwardSelect(IDEX.rs2, EXMEM, MEMWB) : '00';
    const a = forwardedValue(fA, IDEX.readData1, EXMEM, MEMWB);
    const rs2Value = forwardedValue(fB, IDEX.readData2, EXMEM, MEMWB);
    const b = IDEX.control.ALUSrc ? IDEX.imm : rs2Value;            // ALUSrc mux
    const result = alu(IDEX.control.ALUOp, a, b);
    const target = (IDEX.pcPlus4 + (IDEX.imm << 2)) | 0;            // branch adder: PC+4 + disp×4
    if (IDEX.control.Branch) taken = IDEX.name === 'lekana' ? result === 0 : result !== 0;

    copyIdentity(newEXMEM, IDEX);
    newEXMEM.rd = IDEX.rd; newEXMEM.aluResult = result; newEXMEM.storeData = rs2Value;
    newEXMEM.branchTarget = target; newEXMEM.branchTaken = taken;
    newEXMEM.control = { ...IDEX.control, PCSrc: taken ? 1 : 0 };

    v.EX = { id: IDEX.id, pc: IDEX.pc, text: IDEX.text, a, b, result, op: IDEX.control.ALUOp,
             branch: !!IDEX.control.Branch, taken, target, fA, fB, isMemory: !!(IDEX.control.MemRead || IDEX.control.MemWrite) };
    const from = (sel) => (sel === '10' ? 'EX/MEM' : 'MEM/WB');
    if (fA !== '00') v.hazards.push({ type: 'raw', text: `RAW hazard: "${IDEX.text}" needs r${IDEX.rs1} before it is written back. Forwarded from ${from(fA)} (ForwardA = ${fA}).` });
    if (fB !== '00') v.hazards.push({ type: 'raw', text: `RAW hazard: "${IDEX.text}" needs r${IDEX.rs2} before it is written back. Forwarded from ${from(fB)} (ForwardB = ${fB}).` });
  }

  // ---------- ID: decode, read registers, make control signals, check for hazards ----------
  let newIDEX = PM.emptyIDEX();
  let stall = null;
  if (!IFID.bubble) {
    const ins = decode(IFID.instruction);
    const control = controlSignals(ins.name);
    copyIdentity(newIDEX, IFID);
    newIDEX.name = ins.name; newIDEX.pcPlus4 = IFID.pcPlus4;
    newIDEX.rs1 = ins.rs1; newIDEX.rs2 = ins.rs2; newIDEX.readsRs2 = ins.readsRs2; newIDEX.rd = ins.rd;
    newIDEX.readData1 = s.regs[ins.rs1]; newIDEX.readData2 = s.regs[ins.rs2];
    newIDEX.imm = ins.imm; newIDEX.control = control;
    stall = hazardCheck(ins, IDEX, EXMEM, s.forwarding);
    v.ID = { id: IFID.id, pc: IFID.pc, text: IFID.text, name: ins.name, rs1: ins.rs1, rs2: ins.rs2, readsRs2: ins.readsRs2,
             d1: newIDEX.readData1, d2: newIDEX.readData2, imm: ins.imm, rd: ins.rd, control, stalled: false, flushed: false };
  }

  // ---------- IF: fetch the instruction at PC ----------
  let fetched = null;
  const index = s.pc / 4;
  if (index >= 0 && index < s.program.length) {
    const p = s.program[index];
    const id = s.pending && s.pending.pc === s.pc ? s.pending.id : s.nextId++;
    s.pending = { pc: s.pc, id };
    fetched = { ...PM.emptyIFID(), bubble: false, id, pc: s.pc, text: p.source, pcPlus4: s.pc + 4, instruction: p.word };
    v.IF = { id, pc: s.pc, text: p.source, word: p.word, pcPlus4: s.pc + 4, stalled: false, flushed: false };
  }
  let newIFID = fetched || PM.emptyIFID();
  let nextPC = fetched ? s.pc + 4 : s.pc;

  // ---------- Hazards decided this cycle ----------
  if (taken) {
    // Control hazard: the instructions in IF and ID came from the wrong path → flush them.
    let n = 0;
    if (v.IF) { v.IF.flushed = true; n++; }
    if (v.ID) { v.ID.flushed = true; n++; }
    s.stats.flushes += n; s.stats.takenBranches++;
    newIFID = PM.emptyIFID(); newIDEX = PM.emptyIDEX();
    nextPC = newEXMEM.branchTarget; s.pending = null;
    v.hazards.push({ type: 'control', text: `Control hazard: "${IDEX.text}" is taken, so the next PC is ${nextPC}. ${n} wrong-path instruction(s) flushed (2-cycle penalty).` });
  } else if (stall) {
    s.stats.stalls++;
    v.ID.stalled = true; if (v.IF) v.IF.stalled = true;
    newIDEX = PM.emptyIDEX();      // a bubble goes into EX
    newIFID = IFID;                // ID keeps its instruction
    nextPC = s.pc;                 // IF fetches the same instruction again
    v.hazards.push(stall.kind === 'load-use'
      ? { type: 'load-use', text: `Load-use hazard: "${v.ID.text}" needs r${stall.reg} from the load "${stall.producer}". The value only exists after MEM, so the pipeline stalls 1 cycle: PC and IF/ID hold, a bubble goes into ID/EX.` }
      : { type: 'raw-stall', text: `RAW hazard (forwarding OFF): "${v.ID.text}" needs r${stall.reg} from "${stall.producer}", which has not written back yet. Stall 1 cycle; a bubble goes into ID/EX.` });
  } else {
    s.pending = null;
  }

  // ---------- Pipeline chart: which instruction was in which stage this cycle ----------
  for (const stage of ['IF', 'ID', 'EX', 'MEM', 'WB']) {
    const info = v[stage];
    if (!info) continue;
    let row = s.chart.find((r) => r.id === info.id);
    if (!row) { row = { id: info.id, text: info.text, cells: {} }; s.chart.push(row); }
    row.cells[s.cycle] = stage + (info.stalled ? '*' : '') + (info.flushed ? '✕' : '');
  }

  // ---------- Clock edge: save the new pipeline registers and PC ----------
  s.IFID = newIFID; s.IDEX = newIDEX; s.EXMEM = newEXMEM; s.MEMWB = newMEMWB; s.pc = nextPC;
  s.last = v;

  const empty = newIFID.bubble && newIDEX.bubble && newEXMEM.bubble && newMEMWB.bubble;
  const nothingToFetch = !(s.pc >= 0 && s.pc / 4 < s.program.length);
  if (empty && nothingToFetch) s.done = true;
  else if (s.cycle >= MAX_CYCLES) {
    s.done = true;
    v.hazards.push({ type: 'stop', text: `Stopped after ${MAX_CYCLES} cycles — the program may loop forever.` });
  }
  return s;
}

function runToEnd(s) {
  while (!s.done) step(s);
  return s;
}

const Pipeline = { decode, controlSignals, alu, forwardSelect, forwardedValue, hazardCheck,
                   readWord, writeWord, createState, step, runToEnd, MEM_BYTES };
if (typeof module !== 'undefined') module.exports = Pipeline;
else window.Pipeline = Pipeline;
