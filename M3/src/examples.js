// Built-in example programs (the dropdown on the page).
// The same programs are saved as files in /examples and are the B8 test programs.
// Expected results are worked out by hand in docs/test-report.md.
const EXAMPLES = {
  '0-hazard-free': `# 0. Hazard-free program (M3): every instruction class, no stalls, no flushes.
# Each result is used at least 3 instructions later, so it is already
# written back before anyone reads it. Same cycle count with forwarding ON or OFF.
.data 0  9
        eketsaI r1, r0, 7      # r1 = 7
        eketsaI r2, r0, 5      # r2 = 5
        jarisa  r6, 0(r0)      # r6 = memory[0] = 9
        eketsaI r7, r0, 1      # r7 = 1   (independent filler)
        eketsa  r3, r1, r2     # r3 = 12
        fokotsa r4, r1, r2     # r4 = 2
        kopanya r5, r6, r1     # r5 = 9 AND 7 = 1
        ngola   r3, 8(r0)      # memory[8] = 12
        lekana  r1, r2, end    # 7 == 5? no -> not taken, nothing flushed
end:    eketsaI r8, r0, 3      # r8 = 3`,

  '1-arithmetic': `# 1. Arithmetic class: eketsaI, eketsa, fokotsa
eketsaI r1, r0, 7
eketsaI r2, r0, 5
eketsa  r3, r1, r2     # r3 = 12
fokotsa r4, r1, r2     # r4 = 2`,

  '2-logic': `# 2. Logic class: AND, OR, XOR and both shifts
eketsaI     r1, r0, 10
eketsaI     r2, r0, 3
kopanya     r3, r1, r2   # 10 AND 3 = 2
kapa        r4, r1, r2   # 10 OR 3  = 11
fapana      r5, r1, r2   # 10 XOR 3 = 9
suthisa     r6, r2, r2   # 3 << 3   = 24
khutlisetsa r7, r1, r2   # 10 >> 3  = 1`,

  '3-immediate-compare': `# 3. Immediate logic and compare class: kopanyaI, kapaI, nyane
eketsaI  r1, r0, -6      # negative immediate
kopanyaI r2, r1, 0xF     # -6 AND 15 = 10   (hex immediate)
kapaI    r3, r0, 0x30    # 0 OR 48 = 48
nyane    r4, r1, r2      # -6 < 10  -> 1
nyane    r5, r2, r1      # 10 < -6  -> 0`,

  '4-load-store': `# 4. Memory class: jarisa (load) and ngola (store)
.data 0  11, 22          # memory[0] = 11, memory[4] = 22
eketsaI r1, r0, 0        # r1 = base address 0
jarisa  r2, 0(r1)        # r2 = memory[0] = 11
jarisa  r3, 4(r1)        # r3 = memory[4] = 22
ngola   r3, 8(r1)        # memory[8]  = 22  (needs r3 straight after the load)
ngola   r2, 12(r1)       # memory[12] = 11`,

  '5-raw-forwarding': `# 5. RAW hazards solved by forwarding (no stalls when forwarding is ON)
eketsaI r1, r0, 3
eketsa  r2, r1, r1       # needs r1 from the line above  -> EX/MEM
eketsa  r3, r2, r1       # r2 from EX/MEM, r1 from MEM/WB
fokotsa r4, r3, r2       # r3 from EX/MEM, r2 from MEM/WB`,

  '6-load-use': `# 6. Load-use hazard: one stall even with forwarding
.data 0  40
eketsaI r1, r0, 0
eketsaI r2, r0, 2
jarisa  r3, 0(r1)        # r3 = 40
eketsa  r4, r3, r2       # needs r3 straight after the load -> stall 1 cycle`,

  '7-branch': `# 7. Branch not taken, then branch taken (control hazard)
eketsaI r1, r0, 1
eketsaI r2, r0, 2
lekana  r1, r2, skip     # 1 == 2? no  -> not taken
fapane  r1, r2, skip     # 1 != 2? yes -> taken, 2 instructions flushed
eketsaI r3, r0, 99       # skipped: r3 stays 0
skip:   eketsaI r4, r0, 0x2A   # r4 = 42`,

  '8-array-loop': `# 8. Array loop (M1 program 3): sum memory[0], memory[4], memory[8]
.data 0  4, -2, 7
        eketsaI r1, r0, 0     # base address
        eketsaI r2, r0, 3     # item count
        eketsaI r3, r0, 0     # index
        eketsaI r4, r0, 0     # running sum
loop:   lekana  r3, r2, done
        jarisa  r5, 0(r1)
        eketsa  r4, r4, r5    # load-use -> 1 stall each time
        eketsaI r1, r1, 4
        eketsaI r3, r3, 1
        lekana  r0, r0, loop  # always taken (r0 == r0)
done:   ngola   r4, 12(r0)    # memory[12] = 9`,
};
if (typeof module !== 'undefined') module.exports = EXAMPLES;
