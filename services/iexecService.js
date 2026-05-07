import fs from 'node:fs/promises';
import path from 'node:path';
import { IExecDataProtectorCore, getWeb3Provider } from '@iexec/dataprotector';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const CHAIN_ID = Number(process.env.CHAIN_ID);
const APP_ADDRESS = process.env.AUTHORIZED_APP;
const WORKERPOOL = process.env.WORKERPOOL_ADDRESS;
const WORKERPOOL_MAX_PRICE = Number(process.env.WORKERPOOL_MAX_PRICE);
const IPFS_GATEWAY = process.env.IPFS_GATEWAY;

/**
 * Initialize iExec provider and dataProtector instance
 */
function initializeProvider() {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('PRIVATE_KEY not found in environment');
  }

  const web3Provider = getWeb3Provider(privateKey, {
    host: CHAIN_ID,
  });

  const dataProtector = new IExecDataProtectorCore(web3Provider, {
    host: CHAIN_ID,
    ...(IPFS_GATEWAY ? { ipfsGateway: IPFS_GATEWAY } : {}),
  });

  return { web3Provider, dataProtector };
}

/**
 * Build protection payload based on plan_type
 * @param {Object} payload - Incoming payload with all fields
 * @returns {Object} Minimal payload for protection (only fields for the plan_type)
 */
function buildProtectionPayload(payload) {
  const planType = payload.plan_type;

  if (planType === 'timelock') {
    return {
      contract_plan_id: payload.contract_plan_id,
      plan_type: payload.plan_type,
      release_timestamp: payload.release_timestamp,
    };
  }

  if (planType === 'inactivity') {
    return {
      contract_plan_id: payload.contract_plan_id,
      plan_type: payload.plan_type,
      last_active_at: payload.last_active_at,
      inactivity_period: payload.inactivity_period,
      grace_period: payload.grace_period,
    };
  }

  if (planType === 'health_oracle') {
    return {
      contract_plan_id: payload.contract_plan_id,
      plan_type: payload.plan_type,
      health_image: payload.health_image,
    };
  }

  throw new Error(`Unsupported plan_type: ${planType}`);
}

/**
 * Protect data by creating protected data asset
 * @param {Object} payload - Data protection payload from frontend
 * @returns {Promise<Object>} Protected data info with clear naming and protected payload
 */
async function protectData(payload) {
  try {
    const { dataProtector } = initializeProvider();

    // Build minimal protection payload based on plan_type
    const protectedDataPayload = buildProtectionPayload(payload);

    // Call iExec with only required fields
    const protectedData = await dataProtector.protectData({
      name: payload.name,
      data: protectedDataPayload,
    });

    // Return metadata about what was protected, INCLUDING the exact payload
    return {
      name: payload.name,
      protected_address: protectedData.address,
      owner_address: protectedData.owner,
      plan_type: payload.plan_type,
      protected_data: protectedDataPayload,
      created_at: Date.now(),
    };
  } catch (error) {
    console.error('[protectData] Error:', error);
    // Extract cause error message if available (WorkflowError with nested cause)
    const causeMessage = error.cause?.message || error.message;
    const err = new Error(causeMessage);
    err.originalError = error;
    err.iexecError = true;
    throw err;
  }
}

/**
 * Grant access to protected data
 * @param {Object} options - Grant access options (all required from frontend)
 * @returns {Promise<Object>} Grant access result with clear naming
 */
async function grantAccess(options) {
  try {
    const {
      protectedData,
      authorizedApp,
      authorizedUser,
      numberOfAccess,
      allowBulk,
    } = options;

    if (!protectedData) {
      throw new Error('protectedData address is required');
    }
    if (!authorizedApp) {
      throw new Error('authorizedApp address is required');
    }
    if (!authorizedUser) {
      throw new Error('authorizedUser address is required');
    }

    const { dataProtector } = initializeProvider();

    console.log('[grantAccess] Calling iExec with:', { protectedData, authorizedApp, authorizedUser, numberOfAccess, allowBulk });
    const result = await dataProtector.grantAccess({
      protectedData,
      authorizedApp,
      authorizedUser,
      numberOfAccess,
      allowBulk,
    });
    console.log('[grantAccess] Result:', result);

    return {
      protected_address: protectedData,
      dataset_address: result.dataset,
      volume: result.volume,
      transaction_hash: result.txHash,
      authorized_app: authorizedApp,
      authorized_user: authorizedUser,
      access_count: numberOfAccess,
      bulk_allowed: allowBulk,
      granted_at: Date.now(),
    };
  } catch (error) {
    console.error('[grantAccess] Error:', error);
    // Extract cause error message if available (WorkflowError with nested cause)
    const causeMessage = error.cause?.message || error.message;
    const err = new Error(causeMessage);
    err.originalError = error;
    err.iexecError = true;
    throw err;
  }
}

/**
 * Process protected data
 * @param {Object} options - Process data options (all required from frontend)
 * @returns {Promise<Object>} Processing result with clear naming
 */
async function processData(options) {
  try {
    const {
      protectedData,
      authorizedApp,
      workerpool,
      workerpoolMaxPrice,
    } = options;

    if (!protectedData) {
      throw new Error('protectedData address is required');
    }
    if (!authorizedApp) {
      throw new Error('authorizedApp address is required (no env default)');
    }
    if (!workerpool) {
      throw new Error('workerpool address is required (no env default)');
    }
    if (workerpoolMaxPrice === undefined) {
      throw new Error('workerpoolMaxPrice is required (no env default)');
    }

    const { dataProtector } = initializeProvider();

    console.log('[processData] Calling iExec with:', { protectedData, authorizedApp, workerpool, workerpoolMaxPrice });
    const result = await dataProtector.processProtectedData({
      protectedData,
      app: authorizedApp,
      workerpool,
      workerpoolMaxPrice,
      onStatusUpdate: ({ title, isDone }) => {
        console.log(`[${isDone ? '✓' : '..'}] ${title}`);
      },
    });
    console.log('[processData] Result:', { taskId: result.taskId, dealId: result.dealId });

    // Save result if available
    let resultPath = null;
    if (result.result) {
      const resultsDir = path.join(process.cwd(), 'results', result.taskId);
      await fs.mkdir(resultsDir, { recursive: true });
      resultPath = path.join(resultsDir, 'result.zip');
      await fs.writeFile(resultPath, Buffer.from(result.result));
    }

    return {
      protected_address: protectedData,
      transaction_hash: result.txHash,
      deal_id: result.dealId,
      task_id: result.taskId,
      result_path: resultPath,
      computation_app: authorizedApp,
      workerpool_address: workerpool,
      workerpool_max_price: workerpoolMaxPrice,
      processed_at: Date.now(),
    };
  } catch (error) {
    console.error('[processData] Error:', error);
    // Extract cause error message if available (WorkflowError with nested cause)
    const causeMessage = error.cause?.message || error.message;
    const err = new Error(causeMessage);
    err.originalError = error;
    err.iexecError = true;
    throw err;
  }
}

/**
 * Get protected data information
 * @param {string} protectedDataAddress - Protected data address
 * @returns {Promise<Object>} Protected data details
 */
async function getProtectedData(protectedDataAddress) {
  try {
    if (!protectedDataAddress) {
      throw new Error('protectedDataAddress is required');
    }

    const { dataProtector } = initializeProvider();

    const details = await dataProtector.getProtectedData({
      protectedDataAddress,
    });

    const access = await dataProtector.getGrantedAccess({
      protectedData: protectedDataAddress,
    });

    return {
      details,
      access,
      grantCount: access?.grantedAccess?.length || 0,
    };
  } catch (error) {
    throw new Error(`Get protected data failed: ${error.message}`);
  }
}

export const iexecService = {
  protectData,
  grantAccess,
  processData,
  getProtectedData,
};
