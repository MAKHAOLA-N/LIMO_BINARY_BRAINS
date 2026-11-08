# RV32I translation of 5-raw-forwarding.limo (same instructions, same order)
addi x1, x0, 3      # eketsaI r1, r0, 3
add  x2, x1, x1     # eketsa  r2, r1, r1
add  x3, x2, x1     # eketsa  r3, r2, r1
sub  x4, x3, x2     # fokotsa r4, r3, r2
