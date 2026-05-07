# iExec Backend Service - Modular Architecture

A production-ready, modular backend service for iExec Data Protector with both atomic and orchestration endpoints.

## ✨ Key Features

✅ **Modular Service Architecture** - Reusable functions, zero CLI coupling
✅ **Atomic Endpoints** - Call individual steps independently with full control
✅ **Orchestration Endpoint** - Automate complete workflows in one request
✅ **Request Validation** - Per-endpoint payload validation with clear error messages
✅ **Standardized Responses** - Consistent JSON structure across all endpoints
✅ **Comprehensive Error Handling** - Detailed error context and recovery hints
✅ **Server-side Only** - No CLI usage, full backend implementation
✅ **Backward Compatible** - Original CLI scripts still available

## 🏗️ Project Structure

```
iexec-backend-service/
│
├── server.js                    # Express server & API routes
├── services/
│   └── iexecService.js         # Core iExec operations (modular functions)
├── utils/
│   ├── validator.js            # Request payload validation
│   └── responseHandler.js      # Standardized response formatting
│
├── .env                        # Environment configuration
├── package.json                # Dependencies & scripts
│
├── API.md                      # Complete API documentation
├── config.example.js           # Configuration examples & cURL commands
├── README.md                   # This file
│
├── createProtectedData.js      # [Legacy] CLI script
├── grantAccess.js              # [Legacy] CLI script
├── processProtectData.js       # [Legacy] CLI script
├── inspectProtectedData.js     # [Legacy] CLI script
│
└── results/                    # Processing results directory
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create `.env` file (see `.env` example):

```env
PRIVATE_KEY=your_private_key_here
CHAIN_ID=421614
OWNER_WALLET=0xcb99f6255c5b1b8477d0fe6def3587048fc4f778
AUTHORIZED_APP=0x9FCba95BD46e05C97Fe059beb7F04c36482d0054
WORKERPOOL_ADDRESS=0x2956f0cb779904795a5f30d3b3ea88b714c3123f
WORKERPOOL_MAX_PRICE=100000000
IPFS_GATEWAY=https://ipfs.iex.ec
PORT=3000
```

### 3. Start Server

```bash
npm start
```

Output:
```
🚀 iExec Backend Service running on http://localhost:3000
📚 Endpoints:
   POST /iexec/protect-data
   POST /iexec/grant-access
   POST /iexec/process-data
   POST /iexec/process-job (orchestration)
```

### 4. Test Endpoints

```bash
# Health check
curl http://localhost:3000/health

# Protect data
curl -X POST http://localhost:3000/iexec/protect-data \
  -H "Content-Type: application/json" \
  -d '{"name": "my_data", "owner_name": "Alice"}'
```

## 📋 API Reference

See **[API.md](API.md)** for complete documentation including:
- Request/response schemas
- Validation rules
- Status codes
- Error handling
- cURL examples

## 🔄 Workflow Examples

### Atomic (Step-by-step)

```bash
# Step 1: Protect data
PROTECT=$(curl -s -X POST http://localhost:3000/iexec/protect-data \
  -H "Content-Type: application/json" \
  -d '{"name":"my_data","owner_name":"Alice"}')

ADDRESS=$(echo $PROTECT | jq -r '.data.address')

# Step 2: Grant access
curl -X POST http://localhost:3000/iexec/grant-access \
  -H "Content-Type: application/json" \
  -d "{\"protectedData\":\"$ADDRESS\"}"

# Step 3: Process data
curl -X POST http://localhost:3000/iexec/process-data \
  -H "Content-Type: application/json" \
  -d "{\"protectedData\":\"$ADDRESS\"}"
```

## 📊 Response Structure

All responses follow standardized format:

**Success:**
```json
{
  "success": true,
  "statusCode": 200,
  "data": { ... },
  "timestamp": "2026-05-07T10:00:00.000Z"
}
```

**Error:**
```json
{
  "success": false,
  "statusCode": 400,
  "error": {
    "message": "Error description",
    "details": { ... }
  },
  "timestamp": "2026-05-07T10:00:00.000Z"
}
```

## 🔐 Modular Service Architecture

### iExec Service (`services/iexecService.js`)

All iExec operations extracted into reusable functions:

```javascript
import { iexecService } from './services/iexecService.js';

// Protect data
const result1 = await iexecService.protectData(payload);

// Grant access
const result2 = await iexecService.grantAccess(options);

// Process data
const result3 = await iexecService.processData(options);

// Get protected data info
const info = await iexecService.getProtectedData(address);
```

**Benefits:**
- ✅ Reusable across endpoints
- ✅ Easy to extend
- ✅ No CLI coupling
- ✅ Server-side only

### Request Validation (`utils/validator.js`)

Endpoint-specific validation:

```javascript
import { validateProtectData, validateGrantAccess, ... } from './utils/validator.js';

const validation = validateProtectData(payload);
if (!validation.valid) {
  // Handle error
  console.error(validation.error);
} else {
  // Use validated data
  const data = validation.data;
}
```

### Response Handler (`utils/responseHandler.js`)

Consistent response formatting:

```javascript
import { respondSuccess, respondError } from './utils/responseHandler.js';

// Success
respondSuccess(res, data, 201);

// Error
respondError(res, 'Error message', 400, details);
```

## 🔌 Endpoint Specifications

### Atomic Endpoints

| Endpoint | Purpose | Required | Optional |
|----------|---------|----------|----------|
| `POST /iexec/protect-data` | Create protected data | name or data fields | All data fields |
| `POST /iexec/grant-access` | Grant data access | protectedData | authorizedApp, user, numberOfAccess |
| `POST /iexec/process-data` | Process protected data | protectedData | app, workerpool, maxPrice |


## 🛠️ Development

### Add New Atomic Endpoint

1. **Add validation** in `utils/validator.js`:
```javascript
export function validateMyEndpoint(payload) {
  // Validation logic
  return { valid: true, data };
}
```

2. **Add service function** in `services/iexecService.js`:
```javascript
async function myOperation(options) {
  // Business logic
  return result;
}
```

3. **Add route** in `server.js`:
```javascript
app.post('/iexec/my-endpoint', async (req, res) => {
  try {
    const validation = validateMyEndpoint(req.body);
    if (!validation.valid) {
      return respondError(res, validation.error, 400);
    }
    const result = await iexecService.myOperation(validation.data);
    respondSuccess(res, result, 201);
  } catch (error) {
    respondError(res, error.message, 500, error);
  }
});
```

### Error Handling Best Practices

✅ **Do:**
- Always validate input before processing
- Provide specific error messages
- Include context in error details
- Log server errors (5xx)
- Return appropriate status codes

❌ **Don't:**
- Trust user input
- Return generic "Error" messages
- Expose internal stack traces
- Ignore validation errors

## 📚 References

- [API Documentation](API.md) - Complete endpoint reference
- [Config Examples](config.example.js) - Request/response examples
- [iExec DataProtector Docs](https://github.com/iExecBlockchainComputing/dataprotector-sdk)

## 🐛 Troubleshooting

### "PRIVATE_KEY not found"
- Create `.env` file with PRIVATE_KEY
- Check file is in correct location
- Verify permissions

### "protectedData must be a valid Ethereum address"
- Ensure address starts with `0x`
- Verify it's 42 characters (0x + 40 hex digits)
- Check no extra spaces

### "Workerpool not responding"
- Verify WORKERPOOL_ADDRESS is correct
- Check WORKERPOOL_MAX_PRICE is sufficient
- Test network connectivity

### Results not saving
- Check write permissions in `results/` directory
- Verify disk space available
- Review IPFS_GATEWAY setting

## 📝 Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `PRIVATE_KEY` | Ethereum signing key | `0x...` |
| `CHAIN_ID` | Blockchain network | `421614` |
| `OWNER_WALLET` | Data owner address | `0xcb99...` |
| `OWNER_NAME` | Owner display name | `Alice` |
| `AUTHORIZED_APP` | iExec app address | `0x9FCb...` |
| `WORKERPOOL_ADDRESS` | Compute pool | `0x2956...` |
| `WORKERPOOL_MAX_PRICE` | Max compute price | `100000000` |
| `IPFS_GATEWAY` | IPFS endpoint | `https://ipfs.iex.ec` |
| `PORT` | Server port | `3000` |

## 📄 License

MIT

---

**Ready to use!** Start the server and begin using the modular API endpoints.
