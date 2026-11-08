// B3 — live datapath view.
// The picture is the same as docs/datapath.svg, but every stage is a group
// (<g id="dp-IF"> … ) and every live value is a <text id="v-…">.
// After each cycle, updateDatapath() lights up the stages that held an
// instruction, dims the empty ones, and writes the live values on the wires.

const DATAPATH_SVG = `
<svg class="dp" viewBox="0 0 1000 545" font-family="Arial, Helvetica, sans-serif" font-size="11" role="img" aria-label="LIMO pipelined datapath with live values">
  <defs>
    <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill="#334155"/>
    </marker>
  </defs>
  <rect width="1000" height="545" fill="#ffffff"/>

  <!-- Branch target back to the PC mux: lit only when a branch is taken (PCSrc = 1) -->
  <g id="dp-branch">
    <polyline class="w" points="683,95 695,95 695,25 6,25 6,250 15,250"/>
    <text class="l" x="300" y="20">branch target (used when PCSrc = 1, branch taken)</text>
  </g>

  <!-- ================= IF ================= -->
  <g id="dp-IF" class="stage">
    <polyline class="w" points="200,95 200,140 10,140 10,220 15,220"/>
    <line class="w" x1="37" y1="235" x2="50" y2="235"/>
    <line class="w" x1="95" y1="235" x2="115" y2="235"/>
    <polyline class="w" points="72,205 72,95 115,95"/>
    <line class="w" x1="175" y1="95" x2="235" y2="95"/>
    <line class="w" x1="210" y1="235" x2="235" y2="235"/>
    <text class="l" x="212" y="228">instr</text>
    <g><title>PC mux (PCSrc): picks PC+4, or the branch target when a branch is taken</title>
      <rect class="m" x="15" y="200" width="22" height="70" rx="8"/><text class="s" x="26" y="239">M</text></g>
    <g><title>PC: the address of the instruction being fetched</title>
      <rect class="u" x="50" y="205" width="45" height="60"/><text class="t" x="72" y="230">PC</text>
      <text class="v" id="v-pc" x="72" y="250"></text></g>
    <g><title>Instruction memory: gives the 32-bit instruction at address PC</title>
      <rect class="u" x="115" y="180" width="95" height="110"/><text class="t" x="162" y="230">Instruction</text><text class="t" x="162" y="245">memory</text></g>
    <text class="v" id="v-instr" x="162" y="306"></text>
    <g><title>Adder: PC + 4 = address of the next instruction</title>
      <rect class="u" x="115" y="70" width="60" height="50"/><text class="t" x="145" y="99">+4</text></g>
    <text class="l" id="v-pc4" x="180" y="88">PC+4</text>
  </g>

  <!-- ================= ID ================= -->
  <g id="dp-ID" class="stage">
    <line class="w" x1="253" y1="72" x2="290" y2="72"/>
    <text class="l" x="257" y="67">opcode</text>
    <line class="w" x1="253" y1="200" x2="290" y2="200"/>
    <text class="l" id="v-rs1" x="258" y="195">rs1</text>
    <line class="w" x1="253" y1="240" x2="290" y2="240"/>
    <text class="l" id="v-rs2" x="258" y="235">rs2</text>
    <line class="w" x1="253" y1="352" x2="300" y2="352"/>
    <text class="l" x="257" y="347">imm14</text>
    <line class="w" x1="253" y1="112" x2="440" y2="112"/>
    <text class="l" x="330" y="108">PC+4</text>
    <line class="w" x1="400" y1="72" x2="440" y2="72"/>
    <line class="w" x1="410" y1="200" x2="440" y2="200"/>
    <line class="w" x1="410" y1="250" x2="440" y2="250"/>
    <line class="w" x1="395" y1="352" x2="440" y2="352"/>
    <g><title>Control unit: reads the opcode/funct and makes RegWrite, ALUSrc, ALUOp, MemRead, MemWrite, MemtoReg, Branch</title>
      <rect class="u" x="290" y="50" width="110" height="45"/><text class="t" x="345" y="68">Control unit</text>
      <text class="v" id="v-ctrl" x="345" y="86"></text></g>
    <g><title>Register file: 16 registers r0–r15. Reads rs1 and rs2; WB writes rd</title>
      <rect class="u" x="290" y="170" width="120" height="130"/><text class="t" x="350" y="228">Register file</text><text class="s" x="350" y="243">r0–r15</text>
      <text class="v" id="v-d1" x="405" y="190" text-anchor="end"></text>
      <text class="v" id="v-d2" x="405" y="268" text-anchor="end"></text></g>
    <g><title>Sign-extend: stretches the 14-bit immediate to 32 bits, keeping its sign</title>
      <rect class="u" x="300" y="330" width="95" height="45"/><text class="t" x="347" y="350">Sign-extend</text><text class="s" x="347" y="364">14 → 32 bits</text></g>
    <text class="v" id="v-imm" x="347" y="392"></text>
  </g>

  <!-- ================= EX ================= -->
  <g id="dp-EX" class="stage">
    <line class="w" x1="458" y1="105" x2="490" y2="105"/>
    <line class="w" x1="458" y1="200" x2="545" y2="200"/>
    <line class="w" x1="458" y1="250" x2="500" y2="250"/>
    <polyline class="w" points="458,352 480,352 480,280 500,280"/>
    <line class="w" x1="522" y1="265" x2="545" y2="265"/>
    <polyline class="w" points="490,250 490,395 665,395"/>
    <circle cx="490" cy="250" r="2.5" fill="#334155"/>
    <text class="l" x="560" y="390">store data (rs2)</text>
    <line class="w" x1="600" y1="95" x2="665" y2="95"/>
    <line class="w" x1="625" y1="255" x2="665" y2="255"/>
    <text class="v" id="v-fa" x="503" y="182"></text>
    <text class="v" id="v-a" x="503" y="195"></text>
    <g><title>Branch adder: target = PC+4 + (displacement × 4)</title>
      <rect class="u" x="490" y="70" width="110" height="50"/><text class="t" x="545" y="92">Branch adder</text><text class="s" x="545" y="107">PC+4 + (imm &lt;&lt; 2)</text></g>
    <text class="v" id="v-target" x="545" y="136"></text>
    <g><title>ALUSrc mux: 0 = use register rs2, 1 = use the immediate</title>
      <rect class="m" x="500" y="235" width="22" height="60" rx="8"/><text class="s" x="511" y="268">M</text></g>
    <text class="l" x="490" y="310">ALUSrc</text>
    <text class="v" id="v-b" x="511" y="326"></text>
    <text class="v" id="v-fb" x="511" y="339"></text>
    <g><title>ALU: does the operation chosen by ALUOp. For branches it subtracts; result 0 means equal</title>
      <polygon class="u" points="545,175 625,200 625,270 545,295 545,250 560,235 545,220"/><text class="t" x="595" y="228">ALU</text>
      <text class="v" id="v-op" x="595" y="244"></text>
      <text class="v" id="v-res" x="595" y="259"></text></g>
  </g>

  <!-- ================= MEM ================= -->
  <g id="dp-MEM" class="stage">
    <line class="w" x1="683" y1="255" x2="710" y2="255"/>
    <text class="l" x="686" y="250">addr</text>
    <polyline class="w" points="683,395 760,395 760,290"/>
    <polyline class="w" points="698,255 698,330 860,330"/>
    <circle cx="698" cy="255" r="2.5" fill="#334155"/>
    <text class="l" x="770" y="325">ALU result</text>
    <line class="w" x1="820" y1="235" x2="860" y2="235"/>
    <text class="l" x="826" y="230">data</text>
    <g><title>Data memory: 256 bytes, little-endian. jarisa reads a word, ngola writes one</title>
      <rect class="u" x="710" y="180" width="110" height="110"/><text class="t" x="765" y="210">Data</text><text class="t" x="765" y="225">memory</text>
      <text class="v" id="v-addr" x="765" y="250"></text>
      <text class="v" id="v-mdata" x="765" y="266"></text></g>
  </g>

  <!-- ================= WB ================= -->
  <g id="dp-WB" class="stage">
    <line class="w" x1="878" y1="225" x2="905" y2="225"/>
    <polyline class="w" points="878,330 892,330 892,265 905,265"/>
    <polyline class="w" points="927,245 960,245 960,470 275,470 275,285 290,285"/>
    <text class="l" id="v-wb" x="560" y="465">write-back value → register rd</text>
    <g><title>MemtoReg mux: 1 = write back the value from memory, 0 = the ALU result</title>
      <rect class="m" x="905" y="205" width="22" height="80" rx="8"/><text class="s" x="916" y="249">M</text></g>
    <text class="l" x="895" y="300">MemtoReg</text>
  </g>

  <!-- Pipeline registers (always shown) -->
  <g><title>IF/ID pipeline register</title><rect class="p" x="235" y="40" width="18" height="400"/></g>
  <g><title>ID/EX pipeline register</title><rect class="p" x="440" y="40" width="18" height="400"/></g>
  <g><title>EX/MEM pipeline register</title><rect class="p" x="665" y="40" width="18" height="400"/></g>
  <g><title>MEM/WB pipeline register</title><rect class="p" x="860" y="40" width="18" height="400"/></g>
  <text class="g" x="244" y="453">IF/ID</text><text class="g" x="449" y="453">ID/EX</text>
  <text class="g" x="674" y="453">EX/MEM</text><text class="g" x="869" y="453">MEM/WB</text>

  <!-- Stage names, and which instruction is in each stage this cycle -->
  <text class="st" x="120" y="500">IF · fetch</text>
  <text class="st" x="345" y="500">ID · decode</text>
  <text class="st" x="560" y="500">EX · execute</text>
  <text class="st" x="770" y="500">MEM · memory</text>
  <text class="st" x="935" y="500">WB</text>
  <text class="ins" id="t-IF" x="120" y="522"></text>
  <text class="ins" id="t-ID" x="345" y="522"></text>
  <text class="ins" id="t-EX" x="560" y="522"></text>
  <text class="ins" id="t-MEM" x="770" y="522"></text>
  <text class="ins" id="t-WB" x="935" y="522"></text>
</svg>`;

// Text shown before anything has run
const DP_DEFAULTS = { 'v-pc4': 'PC+4', 'v-rs1': 'rs1', 'v-rs2': 'rs2', 'v-wb': 'write-back value → register rd' };

function mountDatapath(container) {
  container.innerHTML = DATAPATH_SVG;
}

function setDP(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function updateDatapath(state) {
  const v = state && state.last;            // what happened in the latest cycle
  const hex = (n) => '0x' + (n >>> 0).toString(16).toUpperCase().padStart(8, '0');
  const fwd = (sel) => (sel === '10' ? 'fwd EX/MEM' : sel === '01' ? 'fwd MEM/WB' : '');

  // 1. Light up busy stages, dim empty ones, name the instruction in each
  for (const st of ['IF', 'ID', 'EX', 'MEM', 'WB']) {
    const info = v && v[st];
    const g = document.getElementById('dp-' + st);
    g.classList.toggle('active', !!info);
    g.classList.toggle('idle', !!v && !info);
    let label = v ? '(empty)' : '';
    if (info) label = info.text + (info.stalled ? '  [stall]' : '') + (info.flushed ? '  [flushed]' : '');
    setDP('t-' + st, label);
  }
  const taken = !!(v && v.EX && v.EX.taken);
  document.getElementById('dp-branch').classList.toggle('taken', taken);

  // 2. Live values on the wires
  const IF = v && v.IF, ID = v && v.ID, EX = v && v.EX, MEM = v && v.MEM, WB = v && v.WB;
  const values = {
    'v-pc': IF ? String(IF.pc) : '',
    'v-pc4': IF ? `PC+4 = ${IF.pcPlus4}` : '',
    'v-instr': IF ? hex(IF.word) : '',
    'v-ctrl': ID ? ID.name : '',
    'v-rs1': ID ? `r${ID.rs1}` : '',
    'v-rs2': ID ? (ID.readsRs2 ? `r${ID.rs2}` : '–') : '',
    'v-d1': ID ? `data1 = ${ID.d1}` : '',
    'v-d2': ID && ID.readsRs2 ? `data2 = ${ID.d2}` : '',
    'v-imm': ID && !(ID.name in { eketsa: 1, fokotsa: 1, kopanya: 1, kapa: 1, fapana: 1, suthisa: 1, khutlisetsa: 1, nyane: 1 }) ? `imm = ${ID.imm}` : '',
    'v-a': EX ? `A = ${EX.a}` : '',
    'v-fa': EX ? fwd(EX.fA) : '',
    'v-b': EX ? `B = ${EX.b}` : '',
    'v-fb': EX ? fwd(EX.fB) : '',
    'v-op': EX ? EX.op : '',
    'v-res': EX ? `= ${EX.result}` : '',
    'v-target': EX && EX.branch ? `target ${EX.target} · ${EX.taken ? 'TAKEN' : 'not taken'}` : '',
    'v-addr': MEM && MEM.action !== 'none' ? `addr = ${MEM.addr}` : '',
    'v-mdata': MEM ? (MEM.action === 'read' ? `read ${MEM.value}` : MEM.action === 'write' ? `write ${MEM.value}` : 'not used') : '',
    'v-wb': WB ? (WB.write ? `write-back ${WB.value} → r${WB.rd}` : 'nothing to write back') : '',
  };
  for (const id in values) setDP(id, v ? values[id] : (DP_DEFAULTS[id] || ''));
}
