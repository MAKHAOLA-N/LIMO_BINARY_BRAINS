# RV32I translation of 7-branch.limo (same instructions, same order)
addi x1, x0, 1      # eketsaI r1, r0, 1
addi x2, x0, 2      # eketsaI r2, r0, 2
beq  x1, x2, skip   # lekana  r1, r2, skip   (not taken)
bne  x1, x2, skip   # fapane  r1, r2, skip   (taken)
addi x3, x0, 99     # eketsaI r3, r0, 99     (skipped)
skip:
addi x4, x0, 42     # eketsaI r4, r0, 0x2A
