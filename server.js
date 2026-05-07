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

// Middleware
app.use(express.json());

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
    respondError(res, error.message || 'Failed to protect data', 500, error);
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
    respondError(res, error.message || 'Failed to grant access', 500, error);
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
    respondError(res, error.message || 'Failed to process data', 500, error);
  }
});

// ============================================
// ERROR HANDLING
// ============================================

app.use((req, res) => {
  respondError(res, 'Endpoint not found', 404);
});

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  respondError(res, 'Internal server error', 500, err);
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
