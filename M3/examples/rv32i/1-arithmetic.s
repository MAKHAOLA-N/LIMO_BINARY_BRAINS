# RV32I translation of 1-arithmetic.limo (same instructions, same order)
addi x1, x0, 7      # eketsaI r1, r0, 7
addi x2, x0, 5      # eketsaI r2, r0, 5
add  x3, x1, x2     # eketsa  r3, r1, r2
sub  x4, x1, x2     # fokotsa r4, r1, r2
