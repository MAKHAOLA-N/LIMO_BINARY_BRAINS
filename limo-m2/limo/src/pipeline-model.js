// Pipeline-register data model (M2 design — the pipeline itself is built in M3).
// Each pipeline register is a plain object. Every clock cycle, each stage
// reads the register on its LEFT and writes the register on its RIGHT:
//
//   IF --[IF/ID]--> ID --[ID/EX]--> EX --[EX/MEM]--> MEM --[MEM/WB]--> WB
//
// "bubble: true" means the register holds a do-nothing instruction (a stall or flush).
// "text" carries the source line of the instruction so the pipeline chart and
// narration can name it in every stage (display only; hardware would not have it).

function emptyIFID() {
  return { bubble: true, text: '', pc: 0, pcPlus4: 0, instruction: 0 };
}

function emptyIDEX() {
  return {
    bubble: true, text: '', pc: 0, pcPlus4: 0,
    rs1: 0, rs2: 0, rd: 0,          // register numbers (hazard + forwarding units compare these)
    usesRs1: false, usesRs2: false, // which source fields this instruction really reads
    readData1: 0, readData2: 0,     // values read from the register file
    imm: 0,                         // sign-extended immediate / displacement (in words for branches)
    control: noControl(),
  };
}

function emptyEXMEM() {
  return {
    bubble: true, text: '', rd: 0,
    aluResult: 0,                   // result, or memory address for jarisa/ngola
    storeData: 0,                   // value ngola will write (after forwarding)
    branchTarget: 0, branchTaken: false,
    control: noControl(),
  };
}

function emptyMEMWB() {
  return {
    bubble: true, text: '', rd: 0,
    aluResult: 0, memData: 0,       // WB picks one of these using MemtoReg
    control: noControl(),
  };
}

// Control signals made in ID (handout B4).
// ALUOp: 'add' | 'sub' | 'and' | 'or' | 'xor' | 'sll' | 'srl' | 'slt' | 'beq' | 'bne' | 'none'
// (funct 7 khutlisetsa = srl, funct 8 nyane = slt, as in the M1 glossary)
// PCSrc starts at 0 in ID and is set in EX: PCSrc = Branch AND the compare result.
function noControl() {
  return { RegWrite: 0, ALUSrc: 0, ALUOp: 'none', MemRead: 0, MemWrite: 0, MemtoReg: 0, Branch: 0, PCSrc: 0 };
}

const PipelineModel = { emptyIFID, emptyIDEX, emptyEXMEM, emptyMEMWB, noControl };
if (typeof module !== 'undefined') module.exports = PipelineModel;
else window.PipelineModel = PipelineModel;
