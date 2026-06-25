require('dotenv').config();

const axios = require('axios');
const { safeParseJson } = require('../utils/parser');
const {
  validateFlashcardsAndQuiz,
  validateStudySchedule,
} = require('../utils/validators');

const GROQ_CHAT_COMPLETIONS_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = process.env.GROQ_MODEL || 'llama3-8b-8192';
const DEFAULT_RETRIES = 2;

class AIServiceError extends Error {
  constructor(message, statusCode = 502, details = undefined) {
    super(message);
    this.name = 'AIServiceError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

function assertGroqConfig() {
  if (!process.env.GROQ_API_KEY) {
    throw new AIServiceError('GROQ_API_KEY is not configured', 500);
  }
}

async function callGroq(prompt, { retries = DEFAULT_RETRIES } = {}) {
  assertGroqConfig();

  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await axios.post(
        GROQ_CHAT_COMPLETIONS_URL,
        {
          model: MODEL,
          messages: [
            {
              role: 'system',
              content: 'You are CampusFlow AI. Return only valid JSON. Do not include markdown, explanations, or extra text.',
            },
            { role: 'user', content: prompt },
          ],
          temperature: 0.2,
          max_tokens: 1400,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
            'Content-Type': 'application/json',
          },
          timeout: 20000,
        },
      );

      return response.data?.choices?.[0]?.message?.content || '';
    } catch (error) {
      lastError = error;
      const status = error.response?.status;
      const shouldRetry = attempt < retries && (!status || status === 429 || status >= 500);
      if (!shouldRetry) break;
      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }

  throw new AIServiceError('Groq API request failed', lastError?.response?.status || 502, lastError?.response?.data || lastError?.message);
}

function parseAndValidate(rawContent, validator, errorMessage) {
  const parsed = safeParseJson(rawContent);
  if (!validator(parsed)) {
    throw new AIServiceError(errorMessage, 502, rawContent);
  }
  return parsed;
}

async function generateFlashcardsAndQuiz({ notes, subject }) {
  const prompt = `Generate 5 flashcards and 5 MCQ questions from these notes. Return ONLY valid JSON with this exact shape: {"flashcards":[{"question":"...","answer":"..."}],"mcqs":[{"question":"...","options":["A","B","C","D"],"answer":"..."}]}. The MCQ answer must exactly match one option string.\n\nSubject: ${subject}\nNotes:\n${notes}`;
  const rawContent = await callGroq(prompt);
  return parseAndValidate(rawContent, validateFlashcardsAndQuiz, 'AI returned invalid flashcards/MCQ JSON');
}

async function generateStudySchedule({ subject, deadline, topics }) {
  const prompt = `Create a study schedule across the remaining days before the deadline. Return ONLY valid JSON object where each key is "Day 1", "Day 2", etc. and each value is a concise study task.\n\nSubject: ${subject}\nDeadline: ${deadline}\nTopics: ${topics.join(', ')}`;
  const rawContent = await callGroq(prompt);
  return parseAndValidate(rawContent, validateStudySchedule, 'AI returned invalid study schedule JSON');
}

module.exports = {
  AIServiceError,
  generateFlashcardsAndQuiz,
  generateStudySchedule,
};
