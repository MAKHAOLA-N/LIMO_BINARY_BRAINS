# LIMO — Binary Brains

A Sesotho-language processor derived from RISC-V, and a five-stage pipeline simulator for it that runs in the browser.
CS3520 Computer Organisation and Architecture, National University of Lesotho.

**Live site:** _(GitHub Pages link)_
**Demo video:** _(YouTube link, unlisted, ≤ 5:00)_

## Run it

- **Simulator:** open `index.html` in any browser. No install, server or login needed.
- **Tests:** `node tests/run.js` → 137 checks.

## Where each handout requirement is

| Item | On the page | In the code |
| --- | --- | --- |
| B1 Editor & assembler | Panels 1–2 | `src/assembler.js` |
| B2 Pipeline & controls | Panel 3 buttons, Break column in panel 2 | `src/pipeline.js`, `src/app.js` |
| B3 Datapath view | Panel 3 diagram + pipeline-register table | `src/datapath.js` |
| B4 Control view | Panel 4 | `controlSignals()` in `src/pipeline.js`, `src/views.js` |
| B5 Hazards | Panel 5, Forwarding checkbox | `forwardSelect()`, `hazardCheck()` in `src/pipeline.js` |
| B6 Statistics & state | Panels 7–9 | `src/views.js` |
| B7 Freshman mode | Panel 6 (English + Sesotho), tooltips, 8 examples | `narrate()` in `src/views.js` |
| B8 Testing | – | `tests/`, `examples/`, `examples/rv32i/`, `docs/test-report.md` |

## Folders

| Folder | Contents |
| --- | --- |
| `src/` | Assembler, pipeline, datapath view, panels, page logic, styles |
| `tests/` | Unit tests and the 8 program tests (`node tests/run.js`) |
| `examples/` | 8 `.limo` test programs; `rv32i/` holds their RV32I translations for Ripes |
| `docs/` | ISA spec (M1), design (M2), datapath diagram, test report |

## Team

| Member | GitHub | Role this week |
| --- | --- | --- |
| Makhaola Nkhahle | MAKHAOLA-N | |
| Eric Letsoela | ericletsoela | |
| Ramosamo Lekhela | lekhela | |
| Hlabathe Moeko | moekohlabathe18 | |
| Kananelo Ketlele | Kananelok | |
| Bonolo Makhotla | bonolomakhotla-a11y | |
| Ntoetse Selomo | ntoetseselemo-crypto | |
