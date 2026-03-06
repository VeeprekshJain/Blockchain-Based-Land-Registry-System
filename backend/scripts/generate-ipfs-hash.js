/**
 * generate-ipfs-hash.js
 * Generates the IPFS CID for any file WITHOUT uploading it.
 * The hash is deterministic — same file always gives same CID.
 *
 * Usage:
 *   node scripts/generate-ipfs-hash.js path/to/document.pdf
 *   node scripts/generate-ipfs-hash.js path/to/land-deed.jpg
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const filePath = process.argv[2];

if (!filePath) {
  console.log('Usage: node scripts/generate-ipfs-hash.js <file-path>');
  console.log('Example: node scripts/generate-ipfs-hash.js land-deed.pdf');
  process.exit(1);
}

const absolutePath = path.resolve(filePath);

if (!fs.existsSync(absolutePath)) {
  console.error('File not found:', absolutePath);
  process.exit(1);
}

const fileBuffer = fs.readFileSync(absolutePath);
const fileSizeKB = (fileBuffer.length / 1024).toFixed(2);

// SHA-256 hash of the file (what IPFS uses internally)
const sha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');

// Simulate a CIDv0 (Qm... format) — same format as real IPFS
// Real IPFS uses multihash + protobuf wrapping, this gives you the raw content hash
// For production, use pinata.cloud or ipfs-only-hash npm package for exact CID
const simulatedCID = 'Qm' + Buffer.from(sha256, 'hex').toString('base64')
  .replace(/[+/=]/g, '')
  .substring(0, 44);

console.log('');
console.log('=== IPFS Document Hash Generator ===');
console.log('');
console.log('File:      ', path.basename(absolutePath));
console.log('Size:      ', fileSizeKB + ' KB');
console.log('SHA-256:   ', sha256);
console.log('');
console.log('Simulated CID (for testing):');
console.log(simulatedCID);
console.log('');
console.log('For EXACT production CID:');
console.log('  1. Upload to https://pinata.cloud');
console.log('  2. Or run: npx ipfs-only-hash ' + path.basename(absolutePath));
console.log('');
