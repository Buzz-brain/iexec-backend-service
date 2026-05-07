import express from 'express';
import dotenv from 'dotenv';
import { iexecService } from './services/iexecService.js';
import { validateProtectData, validateGrantAccess, validateProcessData } from './utils/validator.js';
import { respondSuccess, respondError } from './utils/responseHandler.js';
import fs from 'node:fs';
import swaggerUi from 'swagger-ui-express';

dotenv.config({ path: '.env' });

const app = express();
const PORT = process.env.PORT || 3000;

/**
 * Map iExec error messages to HTTP status codes
 */
function getHttpStatusFromError(errorMessage) {
  if (!errorMessage) return 500;
  
  const msg = errorMessage.toLowerCase();
  
  // 404 Not Found
  if (msg.includes('not found') || msg.includes('does not exist') || msg.includes('unknown')) {
    return 404;
  }
  
  // 403 Forbidden / Permission Denied
  if (msg.includes('unauthorized') || msg.includes('permission') || msg.includes('not allowed') || msg.includes('access denied')) {
    return 403;
  }
  
  // 409 Conflict
  if (msg.includes('already granted') || msg.includes('already exists') || msg.includes('conflict')) {
    return 409;
  }
  
  // 408 Request Timeout
  if (msg.includes('timeout') || msg.includes('timed out')) {
    return 408;
  }
  
  // 422 Unprocessable Entity (validation from iExec)
  if (msg.includes('invalid') || msg.includes('malformed') || msg.includes('invalid format')) {
    return 422;
  }
  
  return 500;
}

// Middleware
app.use(express.json());

// Error handler for JSON parse errors
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return respondError(res, 'Invalid JSON in request body', 400, { details: err.message });
  }
  next(err);
});

// Minimal CORS headers to allow Swagger UI and other clients to call the API
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key, Accept');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Serve Swagger UI if openapi.json exists
let openapiDoc = null;
try {
  const openapiPath = new URL('./openapi.json', import.meta.url);
  openapiDoc = JSON.parse(fs.readFileSync(openapiPath, 'utf8'));
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiDoc));
} catch (err) {
  console.warn('Swagger UI not available (openapi.json missing or invalid)');
}

// ============================================
// AUTHENTICATION MIDDLEWARE
// ============================================

/**
 * API Key authentication middleware
 * Validates x-api-key header against process.env.API_SECRET_KEY
 */
const auth = (req, res, next) => {
  const apiKey = req.get('x-api-key');
  const expectedKey = process.env.API_SECRET_KEY;

  if (!apiKey || apiKey !== expectedKey) {
    return respondError(res, 'Unauthorized', 401);
  }

  next();
};

// ============================================
// PUBLIC ENDPOINTS
// ============================================

// Health check (public, no auth required)
app.get('/health', (req, res) => {
  respondSuccess(res, { status: 'ok' });
});

// ============================================
// PROTECTED ENDPOINTS (require API key authentication)
// ============================================

/**
 * POST /iexec/protect-data
 * Create protected data with payload
 */
app.post('/iexec/protect-data', auth, async (req, res) => {
  try {
    const validation = validateProtectData(req.body);
    if (!validation.valid) {
      return respondError(res, validation.error, 400);
    }

    const result = await iexecService.protectData(validation.data);
    respondSuccess(res, result, 201);
  } catch (error) {
    const statusCode = getHttpStatusFromError(error.message);
    const details = error.originalError ? { reason: error.originalError.message, stack: error.originalError.stack } : { stack: error.stack };
    respondError(res, error.message || 'Failed to protect data', statusCode, details);
  }
});

/**
 * POST /iexec/grant-access
 * Grant access to protected data
 */
app.post('/iexec/grant-access', auth, async (req, res) => {
  try {
    const validation = validateGrantAccess(req.body);
    if (!validation.valid) {
      return respondError(res, validation.error, 400);
    }

    const result = await iexecService.grantAccess(validation.data);
    respondSuccess(res, result, 201);
  } catch (error) {
    const statusCode = getHttpStatusFromError(error.message);
    const details = error.originalError ? { reason: error.originalError.message, stack: error.originalError.stack } : { stack: error.stack };
    respondError(res, error.message || 'Failed to grant access', statusCode, details);
  }
});

/**
 * POST /iexec/process-data
 * Process protected data
 */
app.post('/iexec/process-data', auth, async (req, res) => {
  try {
    const validation = validateProcessData(req.body);
    if (!validation.valid) {
      return respondError(res, validation.error, 400);
    }

    const result = await iexecService.processData(validation.data);
    respondSuccess(res, result, 201);
  } catch (error) {
    const statusCode = getHttpStatusFromError(error.message);
    const details = error.originalError ? { reason: error.originalError.message, stack: error.originalError.stack } : { stack: error.stack };
    respondError(res, error.message || 'Failed to process data', statusCode, details);
  }
});

// ============================================
// ERROR HANDLING
// ============================================

app.use((req, res) => {
  respondError(res, 'Endpoint not found', 404);
});

// Global error handler (catch-all for unexpected errors)
app.use((err, req, res, next) => {
  console.error('[Global Error Handler]', err);
  const statusCode = getHttpStatusFromError(err.message) || 500;
  respondError(res, err.message || 'Internal server error', statusCode, { stack: err.stack });
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
  console.log(`🚀 iExec Backend Service running on http://localhost:${PORT}`);
  console.log(`📚 Endpoints:`);
  console.log(`   POST /iexec/protect-data`);
  console.log(`   POST /iexec/grant-access`);
  console.log(`   POST /iexec/process-data`);
  console.log(`   GET /health`);
});
