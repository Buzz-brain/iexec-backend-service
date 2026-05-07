/**
 * Test Script: Verify API Key Authentication
 * 
 * This script tests that:
 * 1. Protected endpoints require valid x-api-key header
 * 2. Requests without API key return 401
 * 3. Requests with wrong API key return 401
 * 4. /health endpoint remains public
 * 5. Valid requests with correct API key proceed normally
 */

import http from 'http';

const BASE_URL = 'http://localhost:3000';
const VALID_API_KEY = 'your-secret-api-key-here'; // Must match .env API_SECRET_KEY
const INVALID_API_KEY = 'wrong-key';

console.log('🧪 Testing API Key Authentication\n');

// Helper function to make HTTP requests
function makeRequest(method, path, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          body: data ? JSON.parse(data) : null,
        });
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// Test 1: Health endpoint is public
console.log('Test 1: GET /health (public, no auth required)');
try {
  const response = await makeRequest('GET', '/health');
  console.log('Result:', response.status === 200 ? '✅ PASS' : '❌ FAIL');
  console.log('Status:', response.status);
  console.log('Response:', JSON.stringify(response.body, null, 2));
} catch (error) {
  console.log('Result: ❌ FAIL - Error:', error.message);
}
console.log();

// Test 2: Protected endpoint without API key
console.log('Test 2: POST /iexec/protect-data (without x-api-key header)');
try {
  const response = await makeRequest('POST', '/iexec/protect-data', {}, {
    name: 'test',
    contract_plan_id: '0x123',
    plan_type: 'timelock',
    release_timestamp: '1735689600',
  });
  console.log('Result:', response.status === 401 ? '✅ PASS' : '❌ FAIL');
  console.log('Status:', response.status);
  console.log('Response:', JSON.stringify(response.body, null, 2));
} catch (error) {
  console.log('Result: ❌ FAIL - Error:', error.message);
}
console.log();

// Test 3: Protected endpoint with invalid API key
console.log('Test 3: POST /iexec/protect-data (with invalid x-api-key)');
try {
  const response = await makeRequest('POST', '/iexec/protect-data', 
    { 'x-api-key': INVALID_API_KEY }, 
    {
      name: 'test',
      contract_plan_id: '0x123',
      plan_type: 'timelock',
      release_timestamp: '1735689600',
    }
  );
  console.log('Result:', response.status === 401 ? '✅ PASS' : '❌ FAIL');
  console.log('Status:', response.status);
  console.log('Response:', JSON.stringify(response.body, null, 2));
} catch (error) {
  console.log('Result: ❌ FAIL - Error:', error.message);
}
console.log();

// Test 4: Protected endpoint with valid API key (expect 400 for invalid payload, not 401)
console.log('Test 4: POST /iexec/protect-data (with valid x-api-key)');
try {
  const response = await makeRequest('POST', '/iexec/protect-data',
    { 'x-api-key': VALID_API_KEY },
    {
      name: 'test',
      contract_plan_id: '0x123',
      plan_type: 'timelock',
      release_timestamp: '1735689600',
    }
  );
  console.log('Result:', response.status !== 401 ? '✅ PASS (authenticated)' : '❌ FAIL (still 401)');
  console.log('Status:', response.status);
  console.log('Note: Status may be 400+ for other validation, but NOT 401 (auth passed)');
  console.log('Response:', JSON.stringify(response.body, null, 2).slice(0, 200) + '...');
} catch (error) {
  console.log('Result: ❌ FAIL - Error:', error.message);
}
console.log();

// Test 5: Grant-access without API key
console.log('Test 5: POST /iexec/grant-access (without x-api-key header)');
try {
  const response = await makeRequest('POST', '/iexec/grant-access', {}, {
    protectedData: '0x123',
    authorizedApp: '0x456',
    authorizedUser: '0x789',
    numberOfAccess: 1,
  });
  console.log('Result:', response.status === 401 ? '✅ PASS' : '❌ FAIL');
  console.log('Status:', response.status);
} catch (error) {
  console.log('Result: ❌ FAIL - Error:', error.message);
}
console.log();

// Test 6: Process-data without API key
console.log('Test 6: POST /iexec/process-data (without x-api-key header)');
try {
  const response = await makeRequest('POST', '/iexec/process-data', {}, {
    protectedData: '0x123',
    authorizedApp: '0x456',
    workerpool: '0x789',
    workerpoolMaxPrice: 1000,
  });
  console.log('Result:', response.status === 401 ? '✅ PASS' : '❌ FAIL');
  console.log('Status:', response.status);
} catch (error) {
  console.log('Result: ❌ FAIL - Error:', error.message);
}
console.log();

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✅ Authentication tests completed!');
console.log('');
console.log('💡 Summary:');
console.log('  • /health endpoint: Public (no auth required)');
console.log('  • /iexec/* endpoints: Protected (x-api-key required)');
console.log('  • Missing or invalid key: Returns 401 Unauthorized');
console.log('  • Valid key: Proceeds to business logic');
console.log('');
console.log('🚀 Usage:');
console.log('  Include header in requests: x-api-key: your-secret-api-key-here');
console.log('');
