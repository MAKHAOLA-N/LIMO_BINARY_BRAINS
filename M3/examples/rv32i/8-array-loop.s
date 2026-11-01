# RV32I translation of 8-array-loop.limo
# Difference: one extra lui for the Ripes .data base address, and the final store
# uses 12(x13) instead of LIMO's 12(r0).
.data
array: .word 4, -2, 7, 0
.text
        lui  x13, 0x10000   # EXTRA: x13 = 0x10000000
        addi x1, x13, 0     # eketsaI r1, r0, 0   (base address)
        addi x2, x0, 3      # eketsaI r2, r0, 3
        addi x3, x0, 0      # eketsaI r3, r0, 0
        addi x4, x0, 0      # eketsaI r4, r0, 0
loop:   beq  x3, x2, done   # lekana  r3, r2, done
        lw   x5, 0(x1)      # jarisa  r5, 0(r1)
        add  x4, x4, x5     # eketsa  r4, r4, r5
        addi x1, x1, 4      # eketsaI r1, r1, 4
        addi x3, x3, 1      # eketsaI r3, r3, 1
        beq  x0, x0, loop   # lekana  r0, r0, loop
done:   sw   x4, 12(x13)    # ngola   r4, 12(r0)
