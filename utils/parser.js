/**
 * Helpers for cleaning and parsing JSON returned by Groq/LLMs.
 */

function removeMarkdown(rawText = '') {
  return String(rawText)
    .replace(/```(?:json)?/gi, '')
    .replace(/```/g, '')
    .trim();
}

function extractJsonCandidate(rawText = '') {
  const cleaned = removeMarkdown(rawText);
  const firstArray = cleaned.indexOf('[');
  const firstObject = cleaned.indexOf('{');

  let start = -1;
  let end = -1;

  if (firstArray !== -1 && (firstObject === -1 || firstArray < firstObject)) {
    start = firstArray;
    end = cleaned.lastIndexOf(']');
  } else if (firstObject !== -1) {
    start = firstObject;
    end = cleaned.lastIndexOf('}');
  }

  if (start === -1 || end === -1 || end <= start) {
    return cleaned;
  }

  return cleaned.slice(start, end + 1);
}

function cleanMalformedJson(rawText = '') {
  return extractJsonCandidate(rawText)
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/,\s*([}\]])/g, '$1')
    .trim();
}

function safeParseJson(rawText = '', fallback = null) {
  try {
    return JSON.parse(cleanMalformedJson(rawText));
  } catch (error) {
    return fallback;
  }
}

module.exports = {
  removeMarkdown,
  extractJsonCandidate,
  cleanMalformedJson,
  safeParseJson,
};
