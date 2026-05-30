/**
 * Spam Detection Utility
 * Validates chat messages against common spam patterns:
 * - URLs and promotional links
 * - Repeated characters
 * - Message length limits
 * - Excessive emojis
 * - All-caps text
 */

const SPAM_KEYWORDS = [
  'http', 'www.', '.com', '.net', '.org',
  'buy now', 'free followers', 'giveaway', 'click here',
  'earn money', 'work from home', 'visit my channel',
  'subscribe', 'donate here', 'crypto investment', 'double your money'
];

const MAX_MESSAGE_LENGTH = 300;
const MAX_EMOJI_COUNT = 10;
const MIN_CAPS_LENGTH = 6;

/**
 * Checks if a message contains spam patterns
 * @param {string} text - Message text to validate
 * @returns {boolean} True if spam detected, false otherwise
 */
export function containsSpam(text) {
  if (!text) return false;

  const lowerText = text.toLowerCase();

  // Check for known spam keywords or URLs
  if (SPAM_KEYWORDS.some(keyword => lowerText.includes(keyword))) {
    return true;
  }

  // Check for repeated characters (e.g., "aaaaaaa")
  if (/([a-zA-Z])\1\1\1+/g.test(text)) {
    return true;
  }

  // Check for spam wall (excessively long message)
  if (text.length > MAX_MESSAGE_LENGTH) {
    return true;
  }

  // Check for excessive emojis
  const emojiCount = (text.match(/[\p{Emoji}]/gu) || []).length;
  if (emojiCount > MAX_EMOJI_COUNT) {
    return true;
  }

  // Check for all-caps shouting
  if (text.length > MIN_CAPS_LENGTH && text === text.toUpperCase()) {
    return true;
  }

  return false;
}
