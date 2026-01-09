const crypto = require('crypto');

// Your credentials from database
const apiKey = 'cred-api-key-12345';  // Replace with your actual API key
const apiSecret = 'cred-api-secret-67890';  // Replace with your actual API secret

// Request body as object
const requestBody = {
  "external_txn_id": "TXN123456789",
  "pan_number": "GYTPM3631L",
  "full_name": "GARVIT MANRAL",
  "father_name": "GIRISH MANRAL",
  "date_of_birth": "23-09-2003",
  "source_party": "CRED"
};

// Stringify the body (must match server's JSON.stringify)
const requestBodyString = JSON.stringify(requestBody);

// Generate timestamp
const timestamp = Date.now().toString();

// Compute HMAC: SHA256(secret + request_body + timestamp)
const message = apiSecret + requestBodyString + timestamp;
const hmacSignature = crypto.createHash('sha256').update(message).digest('hex');

console.log('=== HMAC Authentication Values ===');
console.log('API Key:', apiKey);
console.log('Timestamp:', timestamp);
console.log('Request Body:', requestBodyString);
console.log('Message (secret + body + timestamp):', message);
console.log('HMAC Signature:', hmacSignature);
console.log('\n=== Headers to use in Postman/curl ===');
console.log('x-api-key:', apiKey);
console.log('x-hmac-signature:', hmacSignature);
console.log('x-timestamp:', timestamp);
