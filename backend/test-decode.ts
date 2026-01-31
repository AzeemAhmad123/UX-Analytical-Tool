import { decodeSnapshot } from './src/utils/decodeSnapshot'
import * as LZString from 'lz-string'
import { gzipSync } from 'zlib'

console.log('🧪 Testing decodeSnapshot function...\n')

// Test 1: Plain JSON array
console.log('Test 1: Plain JSON array')
const plainJson = JSON.stringify([{ type: 2, timestamp: 1000, data: { node: {} } }])
const result1 = decodeSnapshot(plainJson)
console.log('Result:', result1 ? `✅ Success - ${result1.length} events` : '❌ Failed')
console.log('Expected: 1 event with type 2\n')

// Test 2: LZString compressed (as string - direct from SDK)
console.log('Test 2: LZString compressed (as string)')
const events = [{ type: 2, timestamp: 1000, data: { node: {} } }, { type: 3, timestamp: 2000, data: {} }]
const lzCompressed = LZString.compress(JSON.stringify(events))
// LZString returns a string - decodeSnapshot should handle it directly
const result2 = decodeSnapshot(lzCompressed)
console.log('Result:', result2 ? `✅ Success - ${result2.length} events` : '❌ Failed')
console.log('Expected: 2 events\n')

// Test 3: Hex BYTEA format (Supabase format) - LZString stored as BYTEA
console.log('Test 3: Hex BYTEA format (\\x...) - LZString')
// Simulate how Supabase stores LZString: compress -> Buffer -> hex BYTEA
const lzCompressed2 = LZString.compress(JSON.stringify(events))
const testData = Buffer.from(lzCompressed2, 'latin1') // Use latin1 to preserve binary
const hexString = '\\x' + testData.toString('hex')
const result3 = decodeSnapshot(hexString)
console.log('Result:', result3 ? `✅ Success - ${result3.length} events` : '❌ Failed')
console.log('Expected: 2 events\n')

// Test 4: Buffer input (LZString as Buffer)
console.log('Test 4: Buffer input (LZString)')
const lzCompressed3 = LZString.compress(JSON.stringify(events))
const buffer = Buffer.from(lzCompressed3, 'latin1') // Use latin1 to preserve binary
const result4 = decodeSnapshot(buffer)
console.log('Result:', result4 ? `✅ Success - ${result4.length} events` : '❌ Failed')
console.log('Expected: 2 events\n')

// Test 5: Gzip compressed
console.log('Test 5: Gzip compressed')
const gzipData = gzipSync(JSON.stringify(events))
const result5 = decodeSnapshot(gzipData)
console.log('Result:', result5 ? `✅ Success - ${result5.length} events` : '❌ Failed')
console.log('Expected: 2 events\n')

// Test 6: Nested array (double-wrapped)
console.log('Test 6: Nested array (double-wrapped)')
const nested = [[{ type: 2, timestamp: 1000, data: {} }]]
const nestedJson = JSON.stringify(nested)
const result6 = decodeSnapshot(nestedJson)
console.log('Result:', result6 ? `✅ Success - ${result6.length} events (should be flattened)` : '❌ Failed')
console.log('Expected: 1 event (flattened from nested array)\n')

// Test 7: Single event object (not array)
console.log('Test 7: Single event object')
const singleEvent = { type: 2, timestamp: 1000, data: {} }
const singleJson = JSON.stringify(singleEvent)
const result7 = decodeSnapshot(singleJson)
console.log('Result:', result7 ? `✅ Success - ${result7.length} events (should be wrapped in array)` : '❌ Failed')
console.log('Expected: 1 event (wrapped in array)\n')

// Summary
console.log('📊 Test Summary:')
const tests = [
  { name: 'Plain JSON', result: result1 },
  { name: 'LZString', result: result2 },
  { name: 'Hex BYTEA', result: result3 },
  { name: 'Buffer', result: result4 },
  { name: 'Gzip', result: result5 },
  { name: 'Nested Array', result: result6 },
  { name: 'Single Object', result: result7 }
]

const passed = tests.filter(t => t.result !== null && t.result.length > 0).length
const failed = tests.length - passed

console.log(`✅ Passed: ${passed}/${tests.length}`)
console.log(`❌ Failed: ${failed}/${tests.length}`)

if (failed === 0) {
  console.log('\n🎉 All tests passed! decodeSnapshot is working correctly.')
  process.exit(0)
} else {
  console.log('\n⚠️ Some tests failed. Please review the decodeSnapshot implementation.')
  process.exit(1)
}
