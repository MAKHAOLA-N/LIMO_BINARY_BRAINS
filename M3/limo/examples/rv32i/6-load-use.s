# RV32I translation of 6-load-use.limo
# Difference: one extra lui for the Ripes .data base address (see 4-load-store.s).
.data
value: .word 40
.text
lui  x13, 0x10000   # EXTRA: x13 = 0x10000000
addi x1, x13, 0     # eketsaI r1, r0, 0
addi x2, x0, 2      # eketsaI r2, r0, 2
lw   x3, 0(x1)      # jarisa  r3, 0(r1)
add  x4, x3, x2     # eketsa  r4, r3, r2   (load-use)
