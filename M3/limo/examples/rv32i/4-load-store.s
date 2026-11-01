# RV32I translation of 4-load-store.limo
# Difference: LIMO data starts at address 0. In Ripes the .data section starts at
# 0x10000000, so one extra instruction (lui) puts that base address in x13.
.data
words: .word 11, 22, 0, 0
.text
lui  x13, 0x10000   # EXTRA: x13 = 0x10000000 (start of .data)
addi x1, x13, 0     # eketsaI r1, r0, 0   (base address)
lw   x2, 0(x1)      # jarisa  r2, 0(r1)
lw   x3, 4(x1)      # jarisa  r3, 4(r1)
sw   x3, 8(x1)      # ngola   r3, 8(r1)
sw   x2, 12(x1)     # ngola   r2, 12(r1)
