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
OWNER_WALLET=0xcb..
AUTHORIZED_APP=0x9F...
WORKERPOOL_ADDRESS=0x2...
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
     # iExec Backend Service (updated)

    Small, modular backend for iExec DataProtector exposing atomic endpoints for protecting, granting access to, and processing protected data.

    **Important:** The API uses an API key header (`x-api-key`) for all protected endpoints. See Environment below.

    **What changed:** README aligned with the current codebase: implemented endpoints, payload shapes, headers, validation behavior, and where results are stored.

    ## Quick Start

    1. Install dependencies

    ```bash
    npm install
    ```

    2. Create a `.env` file with the required variables (examples below).

    3. Start the server

    ```bash
    npm start
    ```

    4. Server will log available endpoints on start:

    ```text
    🚀 iExec Backend Service running on http://localhost:3000
    📚 Endpoints:
       POST /iexec/protect-data
       POST /iexec/grant-access
       POST /iexec/process-data
       GET  /health
   GET  /docs (Swagger UI)
```

### Swagger UI Documentation

**API documentation (Swagger UI)** is available at `/docs`:
- **Local:** `http://localhost:3000/docs` — defaults to localhost server
- **Deployed:** `https://iexec-backend-service.onrender.com/docs` — defaults to same host (Render)

Click "Execute" in Swagger UI to try endpoints directly. The servers dropdown (top-right) allows switching between local, deployed, or custom hosts.
    Small, modular backend for iExec DataProtector exposing atomic endpoints for protecting, granting access to, and processing protected data.

    **Important:** The API uses an API key header (`x-api-key`) for all protected endpoints. See Environment below.

    **What changed:** README aligned with the current codebase: implemented endpoints, payload shapes, headers, validation behavior, and where results are stored.

    ## Quick Start

    1. Install dependencies

    ```bash
    npm install
    ```

    2. Create a `.env` file with the required variables (examples below).

    3. Start the server

    ```bash
    npm start
    ```

    4. Server will log available endpoints on start:

    ```text
    🚀 iExec Backend Service running on http://localhost:3000
    📚 Endpoints:
       POST /iexec/protect-data
       POST /iexec/grant-access
       POST /iexec/process-data
       GET  /health
    ```

    ## Environment (required)

    Create `.env` with at least the following variables:

    ```env
    PRIVATE_KEY=0x...            # Ethereum private key (required)
    CHAIN_ID=421614              # Numeric chain/network id
    API_SECRET_KEY=your_api_key  # Value to send in x-api-key header
    AUTHORIZED_APP=0x...         # Default app address (optional but used in examples)
    WORKERPOOL_ADDRESS=0x...     # Default workerpool address (optional)
    WORKERPOOL_MAX_PRICE=100000000
    IPFS_GATEWAY=https://ipfs.iex.ec
    PORT=3000
    ```

    Note: The code throws if `PRIVATE_KEY` is missing.

    ## Endpoints

    All protected endpoints require the `x-api-key` header set to `API_SECRET_KEY` from `.env`.

    - GET /health
      - Public health check

    - POST /iexec/protect-data
      - Creates a protected data asset using iExec DataProtector
      - Validation depends on `plan_type` (see examples)
      - Example required base fields: `name`, `contract_plan_id`, `plan_type`

    - POST /iexec/grant-access
      - Grants access to a protected data asset
      - Required fields: `protectedData`, `authorizedApp`, `authorizedUser`, `numberOfAccess`

    - POST /iexec/process-data
      - Starts processing (compute) of a protected data asset
      - Required fields: `protectedData`, `authorizedApp`, `workerpool`, `workerpoolMaxPrice`

    ## Payload validation summary

    - `protect-data`:
      - Base required fields: `name`, `contract_plan_id`, `plan_type`
      - `plan_type` must be one of: `timelock`, `inactivity`, `health_oracle`
      - `timelock` requires `release_timestamp` (number / unix ms)
      - `inactivity` requires `last_active_at`, `inactivity_period`, `grace_period`
      - `health_oracle` requires `health_image` (string)

    - `grant-access` (all required): `protectedData`, `authorizedApp`, `authorizedUser`, `numberOfAccess`

    - `process-data` (all required): `protectedData`, `authorizedApp`, `workerpool`, `workerpoolMaxPrice`

    Validation enforces Ethereum address format for fields that are addresses (regex ^0x[a-fA-F0-9]{40}$).

    ## Examples (cURL)

    Replace `API_KEY_VALUE`, `PROTECTED_ADDRESS`, and addresses with actual values.

    - Health

    ```bash
    curl http://localhost:3000/health
    ```

    - Protect data (timelock example)

    ```bash
    curl -X POST http://localhost:3000/iexec/protect-data \
      -H "Content-Type: application/json" \
      -H "x-api-key: API_KEY_VALUE" \
      -d '{
        "name": "my_data",
        "contract_plan_id": "plan-123",
        "plan_type": "timelock",
        "release_timestamp": 1735689600000
      }'
    ```

    - Grant access

    ```bash
    curl -X POST http://localhost:3000/iexec/grant-access \
      -H "Content-Type: application/json" \
      -H "x-api-key: API_KEY_VALUE" \
      -d '{
        "protectedData": "PROTECTED_ADDRESS",
        "authorizedApp": "0xAuthorizedAppAddress...",
        "authorizedUser": "0xAuthorizedUserAddress...",
        "numberOfAccess": 1,
        "allowBulk": false
      }'
    ```

    - Process data

    ```bash
    curl -X POST http://localhost:3000/iexec/process-data \
      -H "Content-Type: application/json" \
      -H "x-api-key: API_KEY_VALUE" \
      -d '{
        "protectedData": "PROTECTED_ADDRESS",
        "authorizedApp": "0xAuthorizedAppAddress...",
        "workerpool": "0xWorkerpoolAddress...",
        "workerpoolMaxPrice": 100000000
      }'
    ```

    ## Postman examples (quick guide)

    1. Create a new collection called `iExec Backend`.
    2. Add an environment with a variable `api_key` = your `API_SECRET_KEY`.
    3. For each request set a header `x-api-key` to `{{api_key}}` and `Content-Type: application/json`.
    4. Example request body (Protect data -> timelock):

    ```json
    {
      "name": "my_data",
      "contract_plan_id": "plan-123",
      "plan_type": "timelock",
      "release_timestamp": 1735689600000
    }
    ```

    5. Example request body (Grant access):

    ```json
    {
      "protectedData": "0x...",
      "authorizedApp": "0x...",
      "authorizedUser": "0x...",
      "numberOfAccess": 1,
      "allowBulk": false
    }
    ```

    6. Example request body (Process data):

    ```json
    {
      "protectedData": "0x...",
      "authorizedApp": "0x...",
      "workerpool": "0x...",
      "workerpoolMaxPrice": 100000000
    }
    ```

    Tip: Save the response `data.protected_address` to an environment variable after `protect-data` to chain requests.

    ## Response format

    All responses use the standardized JSON wrapper implemented in `utils/responseHandler.js`.

    - Success example

    ```json
    {
      "success": true,
      "statusCode": 201,
      "data": { /* endpoint-specific */ },
      "timestamp": "2026-05-07T10:00:00.000Z"
    }
    ```

    - Error example

    ```json
    {
      "success": false,
      "statusCode": 400,
      "error": { "message": "Missing required fields: ..." },
      "timestamp": "2026-05-07T10:00:00.000Z"
    }
    ```

    ## Notes & internal behaviors

    - `services/iexecService.js` exposes: `protectData`, `grantAccess`, `processData`, and `getProtectedData`.
    - `protectData` builds a minimal payload based on `plan_type` and returns `protected_address` and metadata.
    - `grantAccess` requires `authorizedApp` and `authorizedUser` and returns `transaction_hash`, `dataset`, and access metadata.
    - `processData` saves the compute result in `results/<taskId>/result.zip` when a result buffer is returned.

    ## Development

    - Run in dev mode (nodemon) by installing `nodemon` and running `npm run dev` or `npx nodemon server.js`.

    ## Troubleshooting

    - "PRIVATE_KEY not found": ensure `.env` contains `PRIVATE_KEY`.
    - Unauthorized (401): verify `x-api-key` header equals `API_SECRET_KEY`.
    - Validation errors return 400 with a clear `error.message`.

    ## License

    MIT
