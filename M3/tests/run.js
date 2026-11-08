// Runs every automated test with one command:   node tests/run.js
const { totals } = require('./check.js');

console.log('=== Assembler ===');
require('./assembler.test.js');
console.log('\n=== Pipeline: decoder, control, ALU, hazard unit, memory ===');
require('./pipeline.test.js');
console.log('\n=== The 8 test programs (forwarding ON and OFF) ===');
require('./programs.test.js');

const { passed, failed } = totals();
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
