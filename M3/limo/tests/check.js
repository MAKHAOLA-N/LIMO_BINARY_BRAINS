// A tiny test helper shared by all test files. No libraries needed.
let passed = 0, failed = 0;

function check(name, condition, detail = '') {
  if (condition) { passed++; console.log('  PASS ' + name); }
  else { failed++; console.log('  FAIL ' + name + (detail ? '  -> ' + detail : '')); }
}

function section(title) { console.log('\n' + title); }

function totals() { return { passed, failed }; }

module.exports = { check, section, totals };
