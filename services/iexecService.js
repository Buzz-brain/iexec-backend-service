import fs from 'node:fs/promises';
import path from 'node:path';
import { IExecDataProtectorCore, getWeb3Provider } from '@iexec/dataprotector';
import PQueue from 'p-queue';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

/**
 * Transaction queue for managing blockchain requests sequentially
 * This prevents nonce conflicts when sending multiple transactions from the same account
 * Concurrency is set to 1 to ensure only one transaction is sent at a time
 */
const txQueue = new PQueue({ concurrency: 1 });

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
  const rpcUrl = process.env.RPC_URL;
  if (!privateKey) {
    throw new Error('PRIVATE_KEY not found in environment');
  }
  if (!rpcUrl) {
    throw new Error('RPC_URL not found in environment');
  }

  const web3Provider = getWeb3Provider(privateKey, rpcUrl);

  const dataProtectorConfig = {
    ...(IPFS_GATEWAY ? { ipfsGateway: IPFS_GATEWAY } : {}),
  };

  console.log('[DEBUG] DataProtector Config:', {
    rpcUrl,
    ipfsGateway: dataProtectorConfig.ipfsGateway || 'using default',
  });

  const dataProtector = new IExecDataProtectorCore(web3Provider, dataProtectorConfig);

  return { web3Provider, dataProtector };
}

/**
 * Build protection payload based on plan_type
 * @param {Object} payload - Incoming payload with all fields as strings
 * @returns {Object} Payload for protection (only fields for the plan_type, all as strings)
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
 * @param {Object} payload - Data protection payload from frontend (all fields as strings)
 * @returns {Promise<Object>} Protected data info with address and metadata
 */
async function protectData(payload) {
  const startTime = Date.now();
  console.log('\n📋 [PROTECT DATA] Starting protection process');
  console.log(`   Plan Type: ${payload.plan_type}`);
  console.log(`   Contract ID: ${payload.contract_plan_id}`);
  
  try {
    // Build minimal protection payload based on plan_type
    console.log('   └─ Building protection payload...');
    const protectedDataPayload = buildProtectionPayload(payload);
    console.log('   ✓ Payload validated');

    // Queue the blockchain transaction to prevent nonce conflicts
    console.log('   └─ Queueing blockchain transaction (concurrency: 1)...');
    const protectedData = await txQueue.add(async () => {
      const { dataProtector } = initializeProvider();
      console.log('   └─ Initializing provider and calling protectData()...');
      const result = await dataProtector.protectData({
        data: protectedDataPayload,
      });
      console.log('   ✓ Blockchain transaction successful');
      return result;
    });

    console.log('   ✓ Protected data created');
    console.log(`   └─ Address: ${protectedData.address}`);
    console.log(`   └─ Owner: ${protectedData.owner}`);
    console.log(`   ✓ Total time: ${Date.now() - startTime}ms\n`);

    // Return metadata about what was protected
    return {
      protected_address: protectedData.address,
      owner_address: protectedData.owner,
      plan_type: payload.plan_type,
      protected_data: protectedDataPayload,
      created_at: Date.now(),
    };
  } catch (error) {
    const errorMsg = error.cause?.message || error.message;
    console.error(`\n   ✗ FAILED in ${Date.now() - startTime}ms`);
    console.error(`   └─ Reason: ${errorMsg}\n`);
    
    // Extract cause error message if available (WorkflowError with nested cause)
    const err = new Error(errorMsg);
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
  const startTime = Date.now();
  console.log('\n🔐 [GRANT ACCESS] Starting access grant process');
  
  try {
    const {
      protectedData,
      authorizedApp,
      authorizedUser,
      numberOfAccess,
      allowBulk,
    } = options;

    // Validation
    console.log('   └─ Validating parameters...');
    if (!protectedData) {
      throw new Error('protectedData address is required');
    }
    if (!authorizedApp) {
      throw new Error('authorizedApp address is required');
    }
    if (!authorizedUser) {
      throw new Error('authorizedUser address is required');
    }
    console.log('   ✓ All parameters validated');

    console.log('   └─ Configuration:');
    console.log(`      • Protected Data: ${protectedData.substring(0, 10)}...`);
    console.log(`      • App: ${authorizedApp.substring(0, 10)}...`);
    console.log(`      • User: ${authorizedUser.substring(0, 10)}...`);
    console.log(`      • Access Count: ${numberOfAccess}`);
    console.log(`      • Bulk Allowed: ${allowBulk}`);
    
    // Queue the blockchain transaction to prevent nonce conflicts
    console.log('   └─ Queueing blockchain transaction (concurrency: 1)...');
    const result = await txQueue.add(async () => {
      const { dataProtector } = initializeProvider();
      console.log('   └─ Initializing provider and calling grantAccess()...');
      const grantResult = await dataProtector.grantAccess({
        protectedData,
        authorizedApp,
        authorizedUser,
        numberOfAccess,
        allowBulk,
      });
      console.log('   ✓ Blockchain transaction successful');
      return grantResult;
    });

    console.log('   ✓ Access granted successfully');
    console.log(`   └─ Dataset: ${result.dataset}`);
    console.log(`   └─ Volume: ${result.volume}`);
    console.log(`   └─ Tx Hash: ${result.txHash}`);
    console.log(`   ✓ Total time: ${Date.now() - startTime}ms\n`);

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
    const errorMsg = error.cause?.message || error.message;
    console.error(`\n   ✗ FAILED in ${Date.now() - startTime}ms`);
    console.error(`   └─ Reason: ${errorMsg}\n`);
    
    // Extract cause error message if available (WorkflowError with nested cause)
    const err = new Error(errorMsg);
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
  const startTime = Date.now();
  console.log('\n⚙️  [PROCESS DATA] Starting computation process');
  
  try {
    const {
      protectedData,
      authorizedApp,
      workerpool,
      workerpoolMaxPrice,
    } = options;

    // Validation
    console.log('   └─ Validating parameters...');
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
    console.log('   ✓ All parameters validated');

    console.log('   └─ Configuration:');
    console.log(`      • Protected Data: ${protectedData.substring(0, 10)}...`);
    console.log(`      • App: ${authorizedApp.substring(0, 10)}...`);
    console.log(`      • Workerpool: ${workerpool.substring(0, 10)}...`);
    console.log(`      • Max Price: ${workerpoolMaxPrice} RLC`);
    
    // Queue the blockchain transaction to prevent nonce conflicts
    console.log('   └─ Queueing blockchain transaction (concurrency: 1)...');
    const result = await txQueue.add(async () => {
      const { dataProtector } = initializeProvider();
      console.log('   └─ Initializing provider and calling processProtectedData()...');
      const processResult = await dataProtector.processProtectedData({
        protectedData,
        app: authorizedApp,
        workerpool,
        workerpoolMaxPrice,
        onStatusUpdate: ({ title, isDone }) => {
          const icon = isDone ? '✓' : '⟳';
          console.log(`      ${icon} ${title}`);
        },
      });
      console.log('   ✓ Blockchain transaction successful');
      return processResult;
    });

    console.log('   ✓ Computation started');
    console.log(`   └─ Deal ID: ${result.dealId}`);
    console.log(`   └─ Task ID: ${result.taskId}`);

    // Save result if available
    let resultPath = null;
    if (result.result) {
      console.log('   └─ Saving computation results...');
      const resultsDir = path.join(process.cwd(), 'results', result.taskId);
      await fs.mkdir(resultsDir, { recursive: true });
      resultPath = path.join(resultsDir, 'result.zip');
      await fs.writeFile(resultPath, Buffer.from(result.result));
      console.log(`   ✓ Results saved to: ${resultPath}`);
    }

    console.log(`   ✓ Total time: ${Date.now() - startTime}ms\n`);

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
    const errorMsg = error.cause?.message || error.message;
    console.error(`\n   ✗ FAILED in ${Date.now() - startTime}ms`);
    console.error(`   └─ Reason: ${errorMsg}\n`);
    
    // Extract cause error message if available (WorkflowError with nested cause)
    const err = new Error(errorMsg);
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
  const startTime = Date.now();
  console.log('\n📖 [GET PROTECTED DATA] Fetching information');
  
  try {
    if (!protectedDataAddress) {
      throw new Error('protectedDataAddress is required');
    }

    console.log(`   └─ Address: ${protectedDataAddress.substring(0, 10)}...`);

    const { dataProtector } = initializeProvider();

    console.log('   └─ Fetching details...');
    const details = await dataProtector.getProtectedData({
      protectedDataAddress,
    });

    console.log('   └─ Fetching granted access...');
    const access = await dataProtector.getGrantedAccess({
      protectedData: protectedDataAddress,
    });

    console.log('   ✓ Data retrieved successfully');
    console.log(`   └─ Grants: ${access?.grantedAccess?.length || 0}`);
    console.log(`   ✓ Total time: ${Date.now() - startTime}ms\n`);

    return {
      details,
      access,
      grantCount: access?.grantedAccess?.length || 0,
    };
  } catch (error) {
    const errorMsg = error.message;
    console.error(`\n   ✗ FAILED in ${Date.now() - startTime}ms`);
    console.error(`   └─ Reason: ${errorMsg}\n`);
    throw new Error(`Get protected data failed: ${errorMsg}`);
  }
}

export const iexecService = {
  protectData,
  grantAccess,
  processData,
  getProtectedData,
};
