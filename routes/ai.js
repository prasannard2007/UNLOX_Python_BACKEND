const express = require('express');
const {
  AIServiceError,
  generateFlashcardsAndQuiz,
  generateStudySchedule,
} = require('../services/aiService');
const { sendWebhook } = require('../services/n8nService');
const { normalizeFlashcardsRequest, normalizeScheduleRequest } = require('../utils/transformers');
const {
  buildCommonWebhookPayload,
  isIsoDateTime,
  isNonEmptyString,
} = require('../utils/validators');

const router = express.Router();

function sendError(res, error) {
  const isKnownAIError = error instanceof AIServiceError;
  const statusCode = error.statusCode || 500;

  return res.status(statusCode).json({
    success: false,
    error: statusCode >= 500 && !isKnownAIError ? 'AI integration failed' : error.message,
    details: process.env.NODE_ENV === 'production' ? undefined : error.details || error.message,
  });
}

function validateCommonFields(body) {
  const missingFields = ['studentName', 'phone', 'subject', 'taskTitle', 'deadline']
    .filter((field) => !isNonEmptyString(body?.[field]));

  if (missingFields.length > 0) {
    return `${missingFields.join(', ')} ${missingFields.length === 1 ? 'is' : 'are'} required`;
  }

  if (!isIsoDateTime(body.deadline)) {
    return 'deadline must be an ISO-8601 datetime string';
  }

  return null;
}

router.post('/flashcards', async (req, res) => {
  try {
    const body = normalizeFlashcardsRequest(req.body || {});
    const commonError = validateCommonFields(body);
    if (commonError) {
      return res.status(400).json({ success: false, error: commonError });
    }

    if (!isNonEmptyString(body.notes)) {
      return res.status(400).json({ success: false, error: 'notes is required' });
    }

    const aiContent = await generateFlashcardsAndQuiz({
      notes: body.notes,
      subject: body.subject,
    });

    await sendWebhook(buildCommonWebhookPayload(body));

    return res.json({
      success: true,
      flashcards: aiContent.flashcards,
      mcqs: aiContent.mcqs,
    });
  } catch (error) {
    return sendError(res, error);
  }
});

router.post('/schedule', async (req, res) => {
  try {
    const body = normalizeScheduleRequest(req.body || {});
    const commonError = validateCommonFields(body);
    if (commonError) {
      return res.status(400).json({ success: false, error: commonError });
    }

    if (!Array.isArray(body.topics) || body.topics.length === 0 || !body.topics.every(isNonEmptyString)) {
      return res.status(400).json({ success: false, error: 'topics must be a non-empty array of strings' });
    }

    const schedule = await generateStudySchedule({
      subject: body.subject,
      deadline: body.deadline,
      topics: body.topics,
    });

    await sendWebhook(buildCommonWebhookPayload(body));

    return res.json({ success: true, schedule });
  } catch (error) {
    return sendError(res, error);
  }
});

module.exports = router;
