// Pipeline-register data model (M2 design — the pipeline itself is built in M3).
// Each pipeline register is a plain object. Every clock cycle, each stage
// reads the register on its LEFT and writes the register on its RIGHT:
//
//   IF --[IF/ID]--> ID --[ID/EX]--> EX --[EX/MEM]--> MEM --[MEM/WB]--> WB
//
// "bubble: true" means the register holds a do-nothing instruction (a stall or flush).

function emptyIFID() {
  return { bubble: true, pc: 0, pcPlus4: 0, instruction: 0 };
}

function emptyIDEX() {
  return {
    bubble: true, pc: 0, pcPlus4: 0,
    rs1: 0, rs2: 0, rd: 0,          // register numbers (for hazard checks)
    readData1: 0, readData2: 0,     // values read from the register file
    imm: 0,                         // sign-extended immediate / displacement
    control: noControl(),
  };
}

function emptyEXMEM() {
  return {
    bubble: true, rd: 0,
    aluResult: 0,                   // result, or memory address for jarisa/ngola
    storeData: 0,                   // value ngola will write
    branchTarget: 0, branchTaken: false,
    control: noControl(),
  };
}

function emptyMEMWB() {
  return {
    bubble: true, rd: 0,
    aluResult: 0, memData: 0,       // WB picks one of these using MemtoReg
    control: noControl(),
  };
}

// Control signals made in ID (handout B4)
function noControl() {
  return { RegWrite: 0, ALUSrc: 0, ALUOp: 'none', MemRead: 0, MemWrite: 0, MemtoReg: 0, Branch: 0 };
}

const PipelineModel = { emptyIFID, emptyIDEX, emptyEXMEM, emptyMEMWB, noControl };
if (typeof module !== 'undefined') module.exports = PipelineModel;
else window.PipelineModel = PipelineModel;
