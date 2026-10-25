// Built-in example programs shown in the page's dropdown.
// The same programs are saved as .limo files in /examples.
const EXAMPLES = {
  'Arithmetic': `# Program 1 — arithmetic
eketsaI r1, r0, 7
eketsaI r2, r0, 5
eketsa  r3, r1, r2   # r3 = 12
fokotsa r4, r1, r2   # r4 = 2`,

  'Logic and shift': `# Program 2 — logic and shift
eketsaI r1, r0, 10
eketsaI r2, r0, 3
kopanya r3, r1, r2   # AND = 2
kapa    r4, r1, r2   # OR  = 11
fapana  r5, r1, r2   # XOR = 9
suthisa r6, r2, r2   # 3 << 3 = 24`,

  'Array sum (loop)': `# Program 3 — sum memory[0], memory[4], memory[8]
        eketsaI r1, r0, 0    # base address
        eketsaI r2, r0, 3    # item count
        eketsaI r3, r0, 0    # index
        eketsaI r4, r0, 0    # running sum
loop:   lekana  r3, r2, done
        jarisa  r5, 0(r1)
        eketsa  r4, r4, r5
        eketsaI r1, r1, 4
        eketsaI r3, r3, 1
        lekana  r0, r0, loop # always taken (r0 == r0)
done:   ngola   r4, 12(r0)`,

  'Load-use hazard': `# A load followed straight away by a user of the loaded value
eketsaI r1, r0, 0
eketsaI r2, r0, 5
jarisa  r3, 0(r1)
eketsa  r4, r3, r2   # needs r3 -> one stall`,

  'Branch taken / not taken': `eketsaI r1, r0, 1
eketsaI r2, r0, 2
lekana  r1, r2, skip  # not taken (1 != 2)
fapane  r1, r2, skip  # taken
eketsaI r3, r0, 99    # flushed, never runs
skip:   eketsaI r4, r0, 0x2A`,
};
