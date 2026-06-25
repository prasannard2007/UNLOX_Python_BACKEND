function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isIsoDateTime(value) {
  if (!isNonEmptyString(value)) return false;
  const parsed = Date.parse(value);
  return !Number.isNaN(parsed) && /^\d{4}-\d{2}-\d{2}T/.test(value);
}

function normalizeReminderOffsetHours(value) {
  const parsed = Number(value ?? 24);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 24;
}

function validateCommonWebhookPayload(payload) {
  return payload
    && isNonEmptyString(payload.studentName)
    && isNonEmptyString(payload.phone)
    && isNonEmptyString(payload.subject)
    && isNonEmptyString(payload.taskTitle)
    && isIsoDateTime(payload.deadline)
    && Number.isFinite(Number(payload.reminderOffsetHours))
    && Number(payload.reminderOffsetHours) > 0;
}

function buildCommonWebhookPayload(input) {
  return {
    studentName: input.studentName.trim(),
    phone: input.phone.trim(),
    subject: input.subject.trim(),
    taskTitle: input.taskTitle.trim(),
    deadline: input.deadline.trim(),
    reminderOffsetHours: normalizeReminderOffsetHours(input.reminderOffsetHours),
  };
}

function validateFlashcardsAndQuiz(value) {
  return value
    && Array.isArray(value.flashcards)
    && value.flashcards.length > 0
    && value.flashcards.every((card) => isNonEmptyString(card.question) && isNonEmptyString(card.answer))
    && Array.isArray(value.mcqs)
    && value.mcqs.length > 0
    && value.mcqs.every((mcq) => (
      isNonEmptyString(mcq.question)
      && Array.isArray(mcq.options)
      && mcq.options.length >= 2
      && mcq.options.every(isNonEmptyString)
      && isNonEmptyString(mcq.answer)
    ));
}

function validateStudySchedule(value) {
  return value
    && typeof value === 'object'
    && !Array.isArray(value)
    && Object.keys(value).length > 0
    && Object.entries(value).every(([day, task]) => isNonEmptyString(day) && isNonEmptyString(task));
}

module.exports = {
  isNonEmptyString,
  isIsoDateTime,
  normalizeReminderOffsetHours,
  validateCommonWebhookPayload,
  buildCommonWebhookPayload,
  validateFlashcardsAndQuiz,
  validateStudySchedule,
};
