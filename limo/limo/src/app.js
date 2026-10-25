// Page logic: connects the buttons to the assembler and fills the tables.

const $ = (id) => document.getElementById(id);

// --- Example dropdown ---
for (const name in EXAMPLES) $('examples').add(new Option(name, name));
$('examples').onchange = () => { $('source').value = EXAMPLES[$('examples').value]; runAssembler(); };

// --- Open a .limo file from the computer ---
$('file').onchange = async (e) => {
  const f = e.target.files[0];
  if (f) { $('source').value = await f.text(); runAssembler(); }
};

$('assemble').onclick = runAssembler;

// --- Assemble and show the result ---
function runAssembler() {
  const msg = $('message');
  try {
    const { program } = LIMO.assemble($('source').value);
    $('machine').innerHTML = program.map(rowHTML).join('');
    msg.textContent = `Assembled ${program.length} instructions with no errors.`;
    msg.className = 'message ok';
  } catch (err) {
    $('machine').innerHTML = '';
    msg.textContent = err.message;          // e.g. "Line 3: "r16" is not a register…"
    msg.className = 'message error';
  }
}

// One table row; the binary is split into its fields, each coloured AND
// separated by a space, with the field name on hover (colour is never the only cue).
function rowHTML(ins) {
  let pos = 0;
  const bits = LIMO.LAYOUT[ins.format].map(([name, width]) => {
    const part = ins.binary.slice(pos, pos + width);
    pos += width;
    const cls = name === 'disp' ? 'imm' : name;
    return `<span class="f-${cls}" title="${name} (${width} bits)">${part}</span>`;
  }).join(' ');
  return `<tr><td>${ins.pc}</td><td><code>${escapeHTML(ins.source)}</code></td>
          <td>${ins.format}</td><td class="bits">${bits}</td><td><code>${ins.hex}</code></td></tr>`;
}

const escapeHTML = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// --- Register table (all zero until the pipeline runs in M3) ---
const NAMES = { 0: 'lefela (zero)', 14: 'mokokotlo (sp)', 15: 'aterese ea khutlo (ra)' };
$('registers').innerHTML = Array.from({ length: 16 }, (_, i) =>
  `<tr><td>r${i}</td><td>${NAMES[i] || 'n' + i}</td><td>0</td></tr>`).join('');

// --- Start with the first example loaded ---
$('source').value = EXAMPLES[Object.keys(EXAMPLES)[0]];
runAssembler();
