# RV32I translation of 2-logic.limo (same instructions, same order)
addi x1, x0, 10     # eketsaI     r1, r0, 10
addi x2, x0, 3      # eketsaI     r2, r0, 3
and  x3, x1, x2     # kopanya     r3, r1, r2
or   x4, x1, x2     # kapa        r4, r1, r2
xor  x5, x1, x2     # fapana      r5, r1, r2
sll  x6, x2, x2     # suthisa     r6, r2, r2
srl  x7, x1, x2     # khutlisetsa r7, r1, r2
