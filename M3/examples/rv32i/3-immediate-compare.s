# RV32I translation of 3-immediate-compare.limo (same instructions, same order)
addi x1, x0, -6     # eketsaI  r1, r0, -6
andi x2, x1, 15     # kopanyaI r2, r1, 0xF
ori  x3, x0, 48     # kapaI    r3, r0, 0x30
slt  x4, x1, x2     # nyane    r4, r1, r2
slt  x5, x2, x1     # nyane    r5, r2, r1
