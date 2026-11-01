# AI use declaration

| Milestone | Tool | Used for | How we checked / changed it |
| --- | --- | --- | --- |
| M1 | ChatGPT | Explaining RV32I formats and template sections | Compared with RISC-V manual and lecture notes; spec text written by team |
| M1 | Claude | Reviewing register file, immediates, branch reach | Recomputed ranges and encodings by hand |
| M2 | Claude | Drafting the assembler, tests, page and design doc | Every M1 worked encoding re-checked by the tests; team traced the code line by line and can explain it |
| M3–M4 | Claude | Drafting the pipeline, hazard unit, datapath/control/hazard views, tests and RV32I translations | Expected results for all 8 programs worked out by hand before running; 129 automated checks; team traced each file and can explain it |
