// Pipeline-register data model.
// Each pipeline register is a plain object. Every clock cycle, each stage
// reads the register on its LEFT and writes the register on its RIGHT:
//
//   IF --[IF/ID]--> ID --[ID/EX]--> EX --[EX/MEM]--> MEM --[MEM/WB]--> WB
//
// "bubble: true" means the register holds a do-nothing slot (empty, a stall or a flush).
// id / pc / text / name identify which instruction is inside (for the views).

function pipelineBase() {
  return { bubble: true, id: 0, pc: 0, text: '', name: '' };
}

function emptyIFID() {
  return { ...pipelineBase(), pcPlus4: 0, instruction: 0 };
}

function emptyIDEX() {
  return {
    ...pipelineBase(), pcPlus4: 0,
    rs1: 0, rs2: 0, readsRs2: false, rd: 0,   // register numbers (for the hazard unit)
    readData1: 0, readData2: 0,               // values read from the register file
    imm: 0,                                   // sign-extended immediate / displacement
    control: noControl(),
  };
}

function emptyEXMEM() {
  return {
    ...pipelineBase(), rd: 0,
    aluResult: 0,                             // result, or memory address for jarisa/ngola
    storeData: 0,                             // value ngola will write
    branchTarget: 0, branchTaken: false,
    control: noControl(),
  };
}

function emptyMEMWB() {
  return {
    ...pipelineBase(), rd: 0,
    aluResult: 0, memData: 0,                 // WB picks one of these using MemtoReg
    control: noControl(),
  };
}

// Control signals made in ID (handout B4). PCSrc is filled in by EX.
function noControl() {
  return { RegWrite: 0, ALUSrc: 0, ALUOp: 'none', MemRead: 0, MemWrite: 0, MemtoReg: 0, Branch: 0, PCSrc: 0 };
}

const PipelineModel = { emptyIFID, emptyIDEX, emptyEXMEM, emptyMEMWB, noControl };
if (typeof module !== 'undefined') module.exports = PipelineModel;
else window.PipelineModel = PipelineModel;
