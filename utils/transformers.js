const { normalizeReminderOffsetHours } = require('./validators');

function firstNonEmptyString(...values) {
  const match = values.find((value) => typeof value === 'string' && value.trim().length > 0);
  return match ? match.trim() : undefined;
}

function computeReminderOffsetHours(deadline, reminderTime) {
  const deadlineMs = Date.parse(deadline);
  const reminderMs = Date.parse(reminderTime);

  if (Number.isNaN(deadlineMs) || Number.isNaN(reminderMs) || reminderMs >= deadlineMs) {
    return undefined;
  }

  const hours = Math.round((deadlineMs - reminderMs) / (1000 * 60 * 60));
  return hours > 0 ? hours : undefined;
}

function normalizeCommonPayload(input = {}, defaults = {}) {
  const subject = firstNonEmptyString(input.subject, defaults.subject);
  const taskTitle = firstNonEmptyString(
    input.taskTitle,
    input.title,
    defaults.taskTitle,
    subject ? `${subject} Task` : undefined,
  );
  const deadline = firstNonEmptyString(input.deadline, defaults.deadline);
  const reminderOffsetHours = input.reminderOffsetHours
    ?? computeReminderOffsetHours(deadline, input.reminderTime)
    ?? defaults.reminderOffsetHours
    ?? 24;

  return {
    studentName: firstNonEmptyString(input.studentName, input.name, defaults.studentName),
    phone: firstNonEmptyString(input.phone, defaults.phone),
    subject,
    taskTitle,
    deadline,
    reminderOffsetHours: normalizeReminderOffsetHours(reminderOffsetHours),
  };
}

function normalizeFlashcardsRequest(input = {}) {
  const subject = firstNonEmptyString(input.subject);
  return {
    ...normalizeCommonPayload(input, {
      taskTitle: subject ? `${subject} Quiz Ready` : 'Quiz Ready',
    }),
    notes: firstNonEmptyString(input.notes, input.text),
  };
}

function normalizeScheduleRequest(input = {}) {
  return {
    ...normalizeCommonPayload(input),
    topics: Array.isArray(input.topics)
      ? input.topics.map((topic) => (typeof topic === 'string' ? topic.trim() : topic)).filter(Boolean)
      : [],
  };
}

module.exports = {
  computeReminderOffsetHours,
  normalizeCommonPayload,
  normalizeFlashcardsRequest,
  normalizeScheduleRequest,
};
