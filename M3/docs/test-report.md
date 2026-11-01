# LIMO — Test Report (B8)

Team Binary Brains · CS3520 · AY 2026/2027

## (i) Automated unit tests

Run every test with one command from the project folder:

```
node tests/run.js
```

| File | What it tests | Checks |
| --- | --- | --- |
| `tests/assembler.test.js` | M1 worked encodings, every opcode/funct, immediates, labels, `.data`, 12 error messages | 41 |
| `tests/pipeline.test.js` | Decoder, **control decoder** (all 15 instructions), ALU, **forwarding unit** (ForwardA/B), **hazard detection** (load-use, RAW with forwarding off), data memory | 42 |
| `tests/programs.test.js` | The 8 programs below plus `0-hazard-free` (M3), forwarding ON and OFF: registers, memory, cycles, stalls, flushes | 54 |
| **Total** | | **137 — all pass** |

To show the tests can catch mistakes: if the forwarding unit returns `01` instead of `10`, 7 tests fail.

## (ii) The eight LIMO test programs

All in `examples/`, also in the page's example dropdown. Every expected value was worked out by hand first, then checked by the simulator.

**Cycle formula** (5-stage pipeline):

```
cycles = instructions executed + 4 + stalls + 2 × taken branches
```

- **+4**: the first instruction needs 5 cycles; after that, one finishes every cycle.
- **stall**: one cycle when ID must wait (a bubble goes into EX).
- **taken branch**: decided in EX, so the 2 instructions behind it (in IF and ID) are flushed. That costs 2 cycles.

| # | Program | Class / hazard shown | Expected registers | Expected memory | Instr. | Cycles ON | Stalls ON | Flushed | Cycles OFF | Stalls OFF |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `1-arithmetic` | arithmetic | r1=7 r2=5 r3=12 r4=2 | – | 4 | 8 | 0 | 0 | 10 | 2 |
| 2 | `2-logic` | logic + shifts | r1=10 r2=3 r3=2 r4=11 r5=9 r6=24 r7=1 | – | 7 | 11 | 0 | 0 | 13 | 2 |
| 3 | `3-immediate-compare` | immediate logic + compare | r1=−6 r2=10 r3=48 r4=1 r5=0 | – | 5 | 9 | 0 | 0 | 12 | 3 |
| 4 | `4-load-store` | memory | r1=0 r2=11 r3=22 | [0]=11 [4]=22 [8]=22 [12]=11 | 5 | 10 | 1 | 0 | 13 | 4 |
| 5 | `5-raw-forwarding` | RAW with forwarding | r1=3 r2=6 r3=9 r4=3 | – | 4 | 8 | 0 | 0 | 14 | 6 |
| 6 | `6-load-use` | load-use stall | r1=0 r2=2 r3=40 r4=42 | [0]=40 | 4 | 9 | 1 | 0 | 11 | 3 |
| 7 | `7-branch` | branch not taken + taken | r1=1 r2=2 r3=0 r4=42 | – | 5 | 11 | 0 | 2 | 13 | 2 |
| 8 | `8-array-loop` | array loop | r1=12 r2=3 r3=3 r4=9 r5=7 | [0]=4 [4]=−2 [8]=7 [12]=9 | 24 | 39 | 3 | 5 | 43 | 7 |

### How the numbers were derived (by hand)

1. **Arithmetic.** 4 + 4 = 8. With forwarding OFF, `eketsa r3,r1,r2` needs r2 from the line just above. It waits until that line has written back, which is 2 stalls → 10.
2. **Logic.** 7 + 4 = 11. OFF: `kopanya` waits 2 for r2 → 13. 10 AND 3 = 2, OR = 11, XOR = 9, 3<<3 = 24, 10>>3 = 1.
3. **Immediate/compare.** −6 AND 15 = 10 (−6 is …11111010). 5 + 4 = 9. OFF: `kopanyaI` waits 2 for r1; `nyane r4` waits 1 for r2 (r2's producer is already in MEM) → 12.
4. **Load/store.** `ngola r3` straight after `jarisa r3` must stall 1 even with forwarding. To keep the design simple, we do not forward from MEM to MEM. 5 + 4 + 1 = 10. OFF: 2 + 2 stalls → 13.
5. **RAW forwarding.** Every dependency is forwarded (EX/MEM or MEM/WB), so 4 + 4 = 8. OFF: three back-to-back dependencies × 2 stalls = 6 → 14.
6. **Load-use.** 4 + 4 + 1 = 9. OFF: `jarisa` waits 1 for r1 (its producer is two lines up), `eketsa` waits 2 for r3 → 11.
7. **Branch.** 5 instructions run (r3 = 99 is skipped). One taken branch → 5 + 4 + 2 = 11. OFF: `lekana` waits 2 for r2 → 13.
8. **Array loop.** 4 set-up + 3 iterations × 6 + the final `lekana` (taken) + `ngola` = 24 instructions. Taken branches: 3 × `lekana r0,r0,loop` + 1 final `lekana r3,r2,done` = 4 → +8. One load-use stall per iteration → +3. Total 24 + 4 + 3 + 8 = 39. Flushed instructions = 5, not 8: when the loop's last `lekana` is taken, the slot after `ngola` is past the end of the program, so only 1 real instruction is flushed (3 × 1 + 2 = 5). OFF: the first `lekana` waits 1 for r3, and each `eketsa r4,r4,r5` waits 2 → 1 + 6 = 7 stalls → 43.

**Forwarding ON vs OFF** (B5): turning forwarding off costs 2–6 extra cycles in these programs. The cost is largest for back-to-back dependencies (program 5: 8 → 14 cycles, CPI 2.0 → 3.5).

## (iii) Cross-check with Ripes (team to complete)

RV32I translations are in `examples/rv32i/`. Open each in Ripes and choose the **5-stage processor** (with forwarding and hazard detection). Run it to the end and record the results.

| # | Program | LIMO cycles (ON) | RV32I instructions | Expected difference | Ripes cycles | Registers / memory agree? | Explanation |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | arithmetic | 8 | 4 | none | | | |
| 2 | logic | 11 | 7 | none | | | |
| 3 | immediate-compare | 9 | 5 | none | | | |
| 4 | load-store | 10 | 6 | +1 (extra `lui`) | | | |
| 5 | raw-forwarding | 8 | 4 | none | | | |
| 6 | load-use | 9 | 5 | +1 (extra `lui`) | | | |
| 7 | branch | 11 | 6 | depends on where Ripes resolves branches | | | |
| 8 | array-loop | 39 | 12 | +1 (`lui`); branches as above | | | |

Known differences to explain if the numbers disagree:
- **Data address.** LIMO data starts at address 0. Ripes `.data` starts at 0x10000000, so the memory programs need one extra `lui`, which adds 1 cycle.
- **Branch penalty.** LIMO resolves branches in EX, a 2-cycle penalty (M1 decision c). If Ripes resolves them in a different stage, its penalty per taken branch differs.
- **How cycles are counted.** Check whether Ripes' cycle counter includes the cycles that empty the pipeline at the end. LIMO counts until the last instruction finishes WB.
- **Register numbers.** LIMO r1–r15 map to RV32I x1–x15; x13 is used as the data base register in the memory programs.

## (iv) Usability test (team to complete)

At least three first-year students from outside CS3520.

**Tasks given to each student**
1. Open the site, load the example "1-arithmetic", and assemble it.
2. Step one cycle at a time until `eketsa r3, r1, r2` reaches WB. Say what value r3 gets.
3. Load "6-load-use". Find the cycle where the pipeline stalls and explain why, using the hazard panel.
4. Turn forwarding OFF, run "5-raw-forwarding", and compare the number of cycles.
5. Type a program with a mistake (e.g. `eketsa r1, r2`) and fix it from the error message.

| Student (first name, programme) | Tasks completed | Where they got stuck | What they said |
| --- | --- | --- | --- |
| 1 | | | |
| 2 | | | |
| 3 | | | |

**Changes we made after the test**

| Observation | Change | Commit |
| --- | --- | --- |
| | | |
