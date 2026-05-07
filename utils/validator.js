/**
 * Validate protect-data request payload
 * NEW: Payload validated based on plan_type (timelock, inactivity, health_oracle)
 * Only fields relevant to the plan_type are required
 */
export function validateProtectData(payload) {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  // Base required fields (always needed)
  const baseRequired = ['name', 'contract_plan_id', 'plan_type'];
  const baseMissing = baseRequired.filter((field) => !payload[field]);

  if (baseMissing.length > 0) {
    return {
      valid: false,
      error: `Missing required fields: ${baseMissing.join(', ')}`,
    };
  }

  // Validate plan_type is one of allowed values
  const allowedPlanTypes = ['timelock', 'inactivity', 'health_oracle'];
  if (!allowedPlanTypes.includes(payload.plan_type)) {
    return {
      valid: false,
      error: `plan_type must be one of: ${allowedPlanTypes.join(', ')}`,
    };
  }

  // Validate plan-type specific required fields
  if (payload.plan_type === 'timelock') {
    if (!payload.release_timestamp && payload.release_timestamp !== 0) {
      return { valid: false, error: 'release_timestamp is required for plan_type timelock' };
    }
    if (!isNonNegativeNumber(payload.release_timestamp)) {
      return { valid: false, error: 'release_timestamp must be a non-negative number' };
    }
  }

  if (payload.plan_type === 'inactivity') {
    const inactivityRequired = ['last_active_at', 'inactivity_period', 'grace_period'];
    const inactivityMissing = inactivityRequired.filter((field) => payload[field] === undefined || payload[field] === null);

    if (inactivityMissing.length > 0) {
      return {
        valid: false,
        error: `inactivity plan requires: ${inactivityMissing.join(', ')}`,
      };
    }
    if (!isNonNegativeNumber(payload.last_active_at)) {
      return { valid: false, error: 'last_active_at must be a non-negative number' };
    }
    if (!isNonNegativeNumber(payload.inactivity_period)) {
      return { valid: false, error: 'inactivity_period must be a non-negative number' };
    }
    if (!isNonNegativeNumber(payload.grace_period)) {
      return { valid: false, error: 'grace_period must be a non-negative number' };
    }
  }

  if (payload.plan_type === 'health_oracle') {
    if (!payload.health_image) {
      return { valid: false, error: 'health_image is required for plan_type health_oracle' };
    }
    if (typeof payload.health_image !== 'string') {
      return { valid: false, error: 'health_image must be a string' };
    }
  }

  // Build validated data object with all submitted fields
  const data = {
    name: payload.name,
    contract_plan_id: payload.contract_plan_id,
    plan_type: payload.plan_type,
    ...(payload.release_timestamp && { release_timestamp: payload.release_timestamp }),
    ...(payload.last_active_at && { last_active_at: payload.last_active_at }),
    ...(payload.inactivity_period && { inactivity_period: payload.inactivity_period }),
    ...(payload.grace_period && { grace_period: payload.grace_period }),
    ...(payload.health_image && { health_image: payload.health_image }),
  };

  return { valid: true, data };
}

/**
 * Validate grant-access request payload
 * ALL fields required from frontend - no env defaults
 */
export function validateGrantAccess(payload) {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  // Required fields
  const required = ['protectedData', 'authorizedApp', 'authorizedUser', 'numberOfAccess'];
  const missing = required.filter((field) => !payload[field] && payload[field] !== 0);

  if (missing.length > 0) {
    return {
      valid: false,
      error: `Missing required fields: ${missing.join(', ')}`,
    };
  }

  if (!isValidEthereumAddress(payload.protectedData)) {
    return { valid: false, error: 'protectedData must be a valid Ethereum address (0x followed by 40 hex characters)' };
  }

  if (!isValidEthereumAddress(payload.authorizedApp)) {
    return { valid: false, error: 'authorizedApp must be a valid Ethereum address (0x followed by 40 hex characters)' };
  }

  if (!isValidEthereumAddress(payload.authorizedUser)) {
    return { valid: false, error: 'authorizedUser must be a valid Ethereum address (0x followed by 40 hex characters)' };
  }

  if (!isPositiveNumber(payload.numberOfAccess)) {
    return { valid: false, error: 'numberOfAccess must be a positive number (greater than 0)' };
  }

  const data = {
    protectedData: payload.protectedData,
    authorizedApp: payload.authorizedApp,
    authorizedUser: payload.authorizedUser,
    numberOfAccess: payload.numberOfAccess,
    allowBulk: payload.allowBulk === true,
  };

  return { valid: true, data };
}

/**
 * Validate process-data request payload
 * ALL fields required from frontend - no env defaults
 */
export function validateProcessData(payload) {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  // Required fields
  const required = ['protectedData', 'authorizedApp', 'workerpool', 'workerpoolMaxPrice'];
  const missing = required.filter((field) => !payload[field] && payload[field] !== 0);

  if (missing.length > 0) {
    return {
      valid: false,
      error: `Missing required fields: ${missing.join(', ')}`,
    };
  }

  if (!isValidEthereumAddress(payload.protectedData)) {
    return { valid: false, error: 'protectedData must be a valid Ethereum address (0x followed by 40 hex characters)' };
  }

  if (!isValidEthereumAddress(payload.authorizedApp)) {
    return { valid: false, error: 'authorizedApp must be a valid Ethereum address (0x followed by 40 hex characters)' };
  }

  if (!isValidEthereumAddress(payload.workerpool)) {
    return { valid: false, error: 'workerpool must be a valid Ethereum address (0x followed by 40 hex characters)' };
  }

  if (!isNonNegativeNumber(payload.workerpoolMaxPrice)) {
    return { valid: false, error: 'workerpoolMaxPrice must be a non-negative number' };
  }

  const data = {
    protectedData: payload.protectedData,
    authorizedApp: payload.authorizedApp,
    workerpool: payload.workerpool,
    workerpoolMaxPrice: payload.workerpoolMaxPrice,
  };

  return { valid: true, data };
}

/**
 * Helper: Validate Ethereum address format
 */
function isValidEthereumAddress(address) {
  if (!address || typeof address !== 'string') return false;
  // Must start with 0x and be followed by 40 hex characters (0x + 40 = 42 total)
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Helper: Validate is a positive number
 */
function isPositiveNumber(value) {
  return typeof value === 'number' && value > 0 && !isNaN(value);
}

/**
 * Helper: Validate is a non-negative number
 */
function isNonNegativeNumber(value) {
  return typeof value === 'number' && value >= 0 && !isNaN(value);
}
