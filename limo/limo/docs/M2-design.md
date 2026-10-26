# LIMO — Milestone M2: Simulator Design

Team Binary Brains · CS3520 · AY 2026/2027

## 1. ISA frozen

The ISA is unchanged from M1: 16 registers, formats R/I/S/B, 15 instructions, 14-bit immediates,
32-bit fixed-width instructions, byte-addressed, little-endian.
The six worked encodings in the M1 specification are reproduced exactly by the assembler and
checked by automated tests (`node tests/run.js`).

| Format | Bits 31–0 (left to right) |
| --- | --- |
| R | opcode 6 · rd 4 · rs1 4 · rs2 4 · funct 8 · unused 6 |
| I | opcode 6 · rd 4 · rs1 4 · imm 14 · unused 4 |
| S | opcode 6 · rs1 (base) 4 · rs2 (data) 4 · imm 14 · unused 4 |
| B | opcode 6 · rs1 4 · rs2 4 · disp 14 (words from PC+4) · unused 4 |

**D1 feedback applied:** TODO (team) — one row per comment the examiner made at Defence 1.

| # | D1 comment | What we changed (or why we kept it) | Where |
| --- | --- | --- | --- |
| 1 | | | |
| 2 | | | |

## 2. Architecture

The simulator is a static web page. There is no server: everything runs in the browser.

| File | Job |
| --- | --- |
| `index.html` | The page layout (panels and buttons) |
| `src/style.css` | Colours and layout |
| `src/assembler.js` | Text → 32-bit machine words (two passes) |
| `src/examples.js` | Built-in example programs |
| `src/pipeline-model.js` | The four pipeline registers and control signals as data (used from M3) |
| `src/app.js` | Connects buttons to the assembler and fills the tables |
| `tests/run.js` | Unit tests, run with `node tests/run.js` |

Planned for M3/M4 (not built yet): `src/pipeline.js` (the clock-cycle engine), `src/hazards.js`
(hazard detection + forwarding unit), `src/datapath-view.js` (SVG drawing), with their own tests.

```
 user types program ──► app.js ──► assembler.js ──► program (list of words)
                          │                              │
                          ▼                              ▼
                   machine-code table          pipeline.js (M3) ──► register / memory views
                                                    │   ▲
                                                    ▼   │
                                              hazards.js (M4)
                                                    │
                                                    ▼
                                    datapath view · control view · chart · stats
```

The pipeline engine will be a pure function: `step(state) → newState`. The page only draws the
state it returns. This keeps Step Back easy (keep a list of old states) and makes the engine
testable in Node without a browser.

## 3. Block diagram of the pipeline

Stage level:

```
        ┌────┐  IF/ID  ┌────┐  ID/EX  ┌────┐  EX/MEM ┌─────┐  MEM/WB ┌────┐
 PC ──► │ IF │ ──║──► │ ID │ ──║──► │ EX │ ──║──► │ MEM │ ──║──► │ WB │
        └────┘         └────┘         └────┘         └─────┘         └────┘
  instruction        register file     ALU            data memory     write result
  memory             + control unit    + branch       (jarisa/ngola)  to register file
                     + sign extend     compare
```

Datapath level, showing where the control, hazard and forwarding units sit:

```
        ┌─────────────────────────────────────────────── branch target / PCSrc (from EX) ──┐
        ▼                                                                                  │
 ┌────┐ PC ┌──────┐ ║IF/ID║ ┌─────────────┐ ║ID/EX║ ┌─────────────┐ ║EX/MEM║ ┌────────┐ ║MEM/WB║ ┌────────┐
 │ PC │───►│ Instr│───║────►│ Register    │───║────►│ ALU         │───║─────►│ Data   │───║─────►│ MemtoReg│
 │ +4 │    │ mem  │  ║     │ file (r0–15)│   ║     │ + branch    │   ║      │ memory │   ║      │ mux → WB│
 └────┘    └──────┘  ║     │ Sign-extend │   ║     │   compare   │   ║      └────────┘   ║      └────┬───┘
   ▲                 ║     │ Control unit│   ║     └──────▲──────┘   ║                   ║           │
   │                 ║     └──────┬──────┘   ║   ForwardA/B mux      ║                   ║           │
   │                 ║            │          ║   (from EX/MEM,       ║                   ║           │
   │         ┌───────╨────────┐   │          ║    MEM/WB)            ║                   ║           │
   └─────────┤ Hazard unit    │◄──┘          ║        ▲              ║                   ║           │
  stall PC   │ (load-use,     │              ║   ┌────┴──────────┐   ║                   ║           │
             │  flush)        │              ╚══►│ Forwarding    │◄══╝◄══════════════════╝           │
             └────────────────┘                  │ unit          │                                    │
                                                 └───────────────┘      write-back value ──► register file
```

- **IF** reads the instruction at PC from instruction memory; PC+4 goes to the next fetch.
- **ID** reads rs1/rs2 from the register file, sign-extends the immediate, and the control unit makes the signals. The **hazard unit** looks at IF/ID and ID/EX here to detect a load-use hazard.
- **EX** the ALU computes the result or memory address. Branches compare rs1 and rs2 and compute the target `PC+4 + 4·disp`. **Branches are resolved here** (M1 decision c). The **forwarding unit** chooses the ALU inputs (register value, EX/MEM result, or MEM/WB value).
- **MEM** jarisa reads data memory, ngola writes it.
- **WB** writes the ALU result or loaded value back to rd.

Instruction memory and data memory are separate (handout B2). The register file writes in the first half of a cycle and reads in the second half, so a value written in WB is visible to an instruction reading in ID in the same cycle. TODO (team): confirm you want this assumption; it changes the stall counts in section 6.

## 4. Pipeline-register data model

Defined in `src/pipeline-model.js`. Each register is a plain JavaScript object.

| Register | Fields | Why the next stage needs them |
| --- | --- | --- |
| IF/ID | pc, pcPlus4, instruction | ID decodes the instruction; branches need the PC |
| ID/EX | pc, pcPlus4, rs1, rs2, rd, usesRs1, usesRs2, readData1, readData2, imm, control | EX needs the operands and immediate; rs1/rs2/rd and the uses-flags feed the hazard and forwarding units |
| EX/MEM | rd, aluResult, storeData, branchTarget, branchTaken, control | MEM needs the address and store value; the branch result redirects the PC |
| MEM/WB | rd, aluResult, memData, control | WB chooses aluResult or memData using MemtoReg |

Every register also has `bubble: true/false` (used for stalls and flushes) and `text` (the source line,
so the pipeline chart and narration can name the instruction in every stage; display only).

**Why `usesRs1` / `usesRs2`:** in I-format the bits where rs2 would be belong to the immediate, so the
hazard unit must not treat them as a register. Only instructions that really read a register can cause a RAW hazard.

| Instruction | usesRs1 | usesRs2 |
| --- | --- | --- |
| R-type | 1 | 1 |
| eketsaI / kopanyaI / kapaI / jarisa | 1 | 0 |
| ngola (rs1 = base, rs2 = data) | 1 | 1 |
| lekana / fapane | 1 | 1 |

## 5. Control signals

Made in ID by the control unit and carried down the pipeline in `control`.

| Signal | 1 / value means |
| --- | --- |
| RegWrite | Write a result to rd in WB |
| ALUSrc | ALU input B is the immediate (not rs2) |
| ALUOp | Which operation the ALU does (the "ALU control") |
| MemRead | Read data memory (jarisa) |
| MemWrite | Write data memory (ngola) |
| MemtoReg | Write-back value comes from memory, not the ALU |
| Branch | Instruction is lekana or fapane |
| PCSrc | Take the branch: next PC is the branch target (= Branch AND compare is true; set in EX) |

| Instruction | RegWrite | ALUSrc | ALUOp | MemRead | MemWrite | MemtoReg | Branch |
| --- | --- | --- | --- | --- | --- | --- | --- |
| eketsa | 1 | 0 | add | 0 | 0 | 0 | 0 |
| fokotsa | 1 | 0 | sub | 0 | 0 | 0 | 0 |
| kopanya | 1 | 0 | and | 0 | 0 | 0 | 0 |
| kapa | 1 | 0 | or | 0 | 0 | 0 | 0 |
| fapana | 1 | 0 | xor | 0 | 0 | 0 | 0 |
| suthisa | 1 | 0 | sll | 0 | 0 | 0 | 0 |
| khutlisetsa | 1 | 0 | srl | 0 | 0 | 0 | 0 |
| nyane (set if signed less than) | 1 | 0 | slt | 0 | 0 | 0 | 0 |
| eketsaI | 1 | 1 | add | 0 | 0 | 0 | 0 |
| kopanyaI | 1 | 1 | and | 0 | 0 | 0 | 0 |
| kapaI | 1 | 1 | or | 0 | 0 | 0 | 0 |
| jarisa | 1 | 1 | add | 1 | 0 | 1 | 0 |
| ngola | 0 | 1 | add | 0 | 1 | 0 | 0 |
| lekana (branch if equal) | 0 | 0 | beq | 0 | 0 | 0 | 1 |
| fapane (branch if not equal) | 0 | 0 | bne | 0 | 0 | 0 | 1 |

(For jarisa/ngola the ALU adds base + offset to make the address. For a bubble every signal is 0, so a
bubble can never write a register or memory.)

## 6. Hazard design (built in M4)

| Hazard | Detected by | Detected when | Action | Cost |
| --- | --- | --- | --- | --- |
| RAW (ALU result needed soon) | Forwarding unit, in EX | An earlier instruction in EX/MEM or MEM/WB has RegWrite = 1, rd ≠ 0, and rd = this instruction's rs1/rs2 (and it uses that field) | ForwardA/ForwardB select the EX/MEM result (priority) or the MEM/WB value | 0 cycles |
| Load-use | Hazard unit, in ID | ID/EX has MemRead = 1 and its rd = IF/ID's rs1 or rs2 (used fields only, rd ≠ 0) | Freeze PC and IF/ID one cycle; put a bubble into ID/EX; then forward from MEM/WB | 1 stall |
| Control (branch) | EX stage | Branch = 1 and compare is true (PCSrc = 1) | Load PC with branch target; flush IF/ID and ID/EX (turn them into bubbles) | 2 flushed instructions |

Branches are predicted not taken: the two instructions after a branch are fetched anyway and flushed
only if the branch is taken. A not-taken branch costs nothing.

**Forwarding OFF:** the forwarding unit is disabled and the hazard unit stalls any instruction in ID
whose source register matches the rd of an instruction in ID/EX or EX/MEM until the value is written in WB.
That gives 2 stalls for a dependency on the instruction just before, and 1 stall when one instruction sits between them.
The register file's write-then-read in the same cycle (section 3) is what removes any third stall.

**Load-use cycle diagram** (answers M1 question A6d; `jarisa r3,0(r1)` followed by `eketsa r4,r3,r2`):

```
                    1    2    3    4    5    6    7
jarisa r3, 0(r1)    IF   ID   EX   MEM  WB
eketsa r4, r3, r2        IF   ID   --   EX   MEM  WB      (-- = stall: r3 only exists after MEM)
```

The loaded value leaves the MEM stage at the end of cycle 4. The ALU needs it at the start of the EX stage, so
the dependent instruction cannot be in EX in cycle 4. Forwarding can only move a value backwards in time to
the next cycle, never within it, which is why one stall remains.

## 7. Interface wireframes

Each panel gets its own box; the layout is one column on a phone and two columns on a laptop.

```
┌──────────────────────────────────────────────────────────────┐
│ LIMO Simulator                                               │
├──────────────────────────────┬───────────────────────────────┤
│ 1. Program editor            │ 2. Machine code               │
│ [examples ▼] [Open] [Assemble]│ PC | source | fmt | bits | hex│
│ ┌──────────────────────────┐ │ fields colour-coded + spaced  │
│ │ eketsaI r1, r0, 7        │ │ (names on hover)              │
│ └──────────────────────────┘ │                               │
│ errors: "Line 3: ..."        │                               │
├──────────────────────────────┴───────────────────────────────┤
│ 3. Controls   [Step][Step back][Run][Pause][Reset]  speed ──●│
│               breakpoints: click a line number               │
│               [x] Forwarding ON/OFF          Cycle: 7        │
├──────────────────────────────────────────────────────────────┤
│ 4. Datapath view (SVG)                                       │
│  PC─►[IF]─║─►[ID]─║─►[EX]─║─►[MEM]─║─►[WB]                    │
│  active units + wires highlighted, live value on each wire   │
│  pipeline registers listed under each ║ with all their fields│
├──────────────────────────────┬───────────────────────────────┤
│ 5. Control signals           │ 6. Hazards                    │
│ RegWrite 1  "write rd"       │ RAW: r3 forwarded EX/MEM→ALU A│
│ ALUSrc   0  "B = rs2" …      │ Load-use: 1 bubble in ID/EX   │
│ each signal at ID/EX/MEM/WB  │ Branch: 2 instructions flushed│
│ with a one-line meaning      │ ForwardA = 10, ForwardB = 00  │
├──────────────────────────────┼───────────────────────────────┤
│ 7. Pipeline chart            │ 8. Statistics                 │
│        c1 c2 c3 c4 c5 c6 …   │ Cycles 12 · Instr 8 · CPI 1.5 │
│ i1     IF ID EX ME WB        │ Stalls 1 · Flushes 2          │
│ i2        IF ID EX ME WB     │                               │
│ stage names written in text, │                               │
│ stalls shown as "S", flush "X"│                              │
├──────────────────────────────┼───────────────────────────────┤
│ 9. Registers (Sesotho names) │ 10. Data memory               │
│ changed value: bold + mark ▲ │ address | value, changed ▲    │
├──────────────────────────────┴───────────────────────────────┤
│ 11. Freshman mode: narration (English + Sesotho) for each of │
│     IF, ID, EX, MEM, WB this cycle; tooltips on every unit   │
└──────────────────────────────────────────────────────────────┘
```

Accessibility rule from handout B7: colour is never the only cue. Every highlight also has a text label,
symbol or border style (for example "▲ changed", "S" for stall).

The live page already follows this layout for panels 1, 2 and 9 (registers); the rest are placeholders until M3/M4.

## 8. Assembler

Two passes:

1. **Pass 1** — read every line, strip comments (`#` or `;`), record each label's address. Each instruction adds 4 to the PC.
2. **Pass 2** — split each instruction into fields and pack them with shifts:
   - R: `(rd<<22) | (rs1<<18) | (rs2<<14) | (funct<<6)`
   - I/S/B: `(opcode<<26) | (A<<22) | (B<<18) | (imm14<<4)`
   - Branch displacement = `(label − (PC+4)) / 4`

Immediates may be decimal or hex (`0xC`) and are checked against −8192…8191.
Errors give the line number and a plain-language reason, e.g. `Line 2: "r16" is not a register.`
The assembler stops at the first error. Curly apostrophes are rejected with a message asking for the keyboard apostrophe (`'`).

## 9. Tests

`node tests/run.js` runs 37 checks: the six M1 worked examples, every opcode/funct, negative/hex/limit
immediates, forward and backward branches, labels and comments, and eight error cases.
Tests for the control decoder (M3) and hazard/forwarding unit (M4) are added when those files exist.

## 10. M2 requirements checklist (handout section 5)

| Requirement | Where | Status |
| --- | --- | --- |
| ISA frozen with D1 feedback applied | §1 | TODO (team)-Havent gotten feedback: fill the D1 table |
| Architecture and block diagram | §2, §3 | Done |
| Pipeline-register data model | §4, `src/pipeline-model.js` | Done |
| Interface wireframes | §7 | Done |
| Working assembler with unit tests | `src/assembler.js`, `tests/run.js` | Done (37/37 pass) |
| Site live on GitHub Pages | README link | Done |
| Tag `m2` | GitHub release | Done |
| Milestone PDF + one-page sprint note on Classroom | this file → PDF; `docs/M2-sprint-note.md` |Done|
