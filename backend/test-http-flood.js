#!/usr/bin/env node

const http = require('http');

const API_URL = 'http://localhost:5000/api/v1/lands';
let totalRequests = 0;
let blockedRequests = 0;
let successRequests = 0;

console.log('🚀 HTTP Flooding Test - Watch Rate Limiting Live\n');
console.log(`Target: ${API_URL}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

function makeRequest(requestNum) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    http.get(API_URL, (res) => {
      const duration = Date.now() - startTime;
      totalRequests++;
      
      if (res.statusCode === 429) {
        blockedRequests++;
        console.log(`[${requestNum}] 🚫 RATE LIMIT HIT (429) - Duration: ${duration}ms`);
      } else if (res.statusCode === 200) {
        successRequests++;
        console.log(`[${requestNum}] ✅ SUCCESS (${res.statusCode}) - Duration: ${duration}ms`);
      } else {
        console.log(`[${requestNum}] ⚠️  Status ${res.statusCode} - Duration: ${duration}ms`);
      }
      
      res.on('data', () => {});
      res.on('end', () => resolve());
    }).on('error', (err) => {
      totalRequests++;
      console.log(`[${requestNum}] ❌ ERROR: ${err.message}`);
      resolve();
    });
  });
}

async function sequentialTest() {
  console.log('📊 PHASE 1: Sequential Requests (5 requests, 1 per second)\n');
  
  for (let i = 1; i <= 5; i++) {
    await makeRequest(i);
    await new Promise(r => setTimeout(r, 1000));
  }
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

async function floodTest() {
  console.log('⚡ PHASE 2: Rapid Flooding (50 requests as fast as possible)\n');
  
  const promises = [];
  for (let i = 6; i <= 55; i++) {
    promises.push(makeRequest(i));
    await new Promise(r => setTimeout(r, 50)); // Small delay to see them happen
  }
  
  await Promise.all(promises);
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

async function burstTest() {
  console.log('💥 PHASE 3: Burst Attack (20 requests simultaneously)\n');
  
  const promises = [];
  for (let i = 56; i <= 75; i++) {
    promises.push(makeRequest(i));
  }
  
  await Promise.all(promises);
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

async function runAllTests() {
  try {
    await sequentialTest();
    await floodTest();
    await burstTest();
    
    console.log('📈 RESULTS:\n');
    console.log(`Total Requests: ${totalRequests}`);
    console.log(`✅ Success: ${successRequests} (${((successRequests/totalRequests)*100).toFixed(1)}%)`);
    console.log(`🚫 Rate Limited: ${blockedRequests} (${((blockedRequests/totalRequests)*100).toFixed(1)}%)`);
    console.log('\n');
    
    if (blockedRequests > 0) {
      console.log('✅ RATE LIMITING IS WORKING! Your API is protected from flooding attacks.');
    } else {
      console.log('⚠️  No rate limiting detected. API might be vulnerable to flooding.');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Test failed:', err.message);
    process.exit(1);
  }
}

// Run tests
runAllTests();
