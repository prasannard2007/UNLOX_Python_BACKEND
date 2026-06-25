require('dotenv').config();

const axios = require('axios');
const { validateCommonWebhookPayload } = require('../utils/validators');

async function sendWebhook(payload) {
  if (!validateCommonWebhookPayload(payload)) {
    console.warn('[n8n] Common webhook payload is invalid. Skipping trigger.');
    return { success: false, skipped: true, reason: 'INVALID_COMMON_WEBHOOK_PAYLOAD' };
  }

  if (!process.env.N8N_WEBHOOK_URL) {
    console.warn('[n8n] N8N_WEBHOOK_URL is not configured. Skipping trigger.');
    return { success: false, skipped: true, reason: 'WEBHOOK_URL_NOT_CONFIGURED' };
  }

  try {
    const response = await axios.post(process.env.N8N_WEBHOOK_URL, payload, { timeout: 10000 });
    return { success: true, status: response.status };
  } catch (error) {
    console.error('[n8n] Webhook failed:', error.message);
    return {
      success: false,
      skipped: false,
      reason: 'WEBHOOK_REQUEST_FAILED',
      status: error.response?.status,
    };
  }
}

module.exports = {
  sendWebhook,
};
