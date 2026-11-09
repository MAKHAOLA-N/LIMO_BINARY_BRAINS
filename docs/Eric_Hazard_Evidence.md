# Eric Letsoela — hazard-unit contribution evidence

GitHub account: `ericletsoela`. Checked on 9 November 2026.

## Documents

- `M2_Hazard_Unit_Eric_Letsoela.docx`: original supplied M2 hazard design write-up, now stored as a tracked file rather than only a PR attachment.
- `M3_Hazard_Unit_Eric_Letsoela.docx`: original supplied M3 write-up, retained as a draft/historical description. Read the verification notes below before using it as evidence of current implementation.

These files document the author's stated contribution. This upload does not establish authorship of every team implementation file or replace a teammate's review.

## Existing GitHub evidence

- [M2 pull request #11](https://github.com/MAKHAOLA-N/LIMO_BINARY_BRAINS/pull/11), opened by `ericletsoela`, was merged on 1 November 2026. Its description links the M2 Word document as an attachment.
- [Commit 042160c](https://github.com/MAKHAOLA-N/LIMO_BINARY_BRAINS/commit/042160cda8ae21b971fbe2853b1a087fc4ec9f37) is attributed to Eric Letsoela. Its changes added `limo/limo.zip` and a gitlink named `LIMO_BINARY_BRAINS`; it did not add the hazard Word document as a normal tracked file.
- No formal submitted reviews were returned for PR #11 when checked. A merged PR alone is not proof of peer review.

## Current code verification

The checked `main` commit was `f6d89e214ee7ac02c2c6cdd969bed08ab2ea520c`. Its simulator source under `limo/limo/` is the M2 assembler and pipeline-register model.

The separate [`m3` branch](https://github.com/MAKHAOLA-N/LIMO_BINARY_BRAINS/tree/m3), checked at `0cff5a3091fe414bd4d7fa7529c479f1b18a21e3`, contains the pipeline implementation under `M3/`. Its JavaScript source, tests and LIMO example files were retrieved and checked locally with `node tests/run.js` from `M3/`: **137 passed, 0 failed**. This is an automated test result, not a browser usability test or a Ripes cross-check.

Relevant files on that branch include `M3/src/pipeline-model.js`, `M3/src/pipeline.js`, `M3/tests/programs.test.js` and `M3/examples/0-hazard-free.limo`.

## Corrections and limitations when explaining the documents

1. The M3 document's claim of 85 tests describes a different/earlier version; the checked branch has 137 passing checks.
2. The M3 document's example names (`1-all-classes`, `2-arithmetic-logic`, `3-load-store`) differ from the checked branch. Its hazard-free example is now `0-hazard-free.limo`.
3. The current m3 branch already contains forwarding and hazard handling. Do not present the document's old claim that the core produces r2=0 for an adjacent dependency as the current behaviour without reproducing it on an identified earlier revision.
4. M2 describes `readsRs2` as an implemented field. The main-branch M2 model lacks it; the m3 model has it. Distinguish a design requirement from implemented code.
5. A load produces its value at the end of MEM, after a dependent instruction would need it at the start of EX in that cycle. Those are different times; forwarding cannot send values back in time.
6. Forwarding comparisons must ignore bubbles, unused source operands and writes to r0. EX/MEM forwarding must not treat a load's computed address as the loaded value. Store data and branch operands also need dependency handling.
7. Separate instruction/data memories remove their shared-memory structural conflict; the broader claim of no structural hazards assumes the rest of the selected datapath has sufficient resources.
8. The no-stall spacing rule k-p >= 3 assumes WB is visible to ID in the same cycle, and must hold relative to the relevant preceding writer. The n+4 cycle formula assumes a nonempty ideal five-stage stream; hazard penalties depend on the chosen pipeline and termination behaviour.

## Review still needed

A teammate should review this documentation PR, verify the contribution descriptions against actual work, and submit their own GitHub review before merging. Commit/PR links inside the original M3 Word document remain blank; no reviews or historical contributions have been invented.

## AI assistance for this update

ChatGPT/Codex inspected the supplied documents and GitHub history, retrieved and ran the current m3 tests, and drafted this evidence note. The original Word documents are preserved unchanged. The current update records documentation and verification work; it does not claim that Eric independently authored all code inspected during this session.
