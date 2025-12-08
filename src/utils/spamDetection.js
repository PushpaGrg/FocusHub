// src/utils/spamDetection.js

export function containsSpam(text) {
  if (!text) return false;

  text = text.toLowerCase();

  // 🚨 SPAM KEYWORDS
  const spamWords = [
    "http",
    "www.",
    ".com",
    ".net",
    ".org",
    "buy now",
    "free followers",
    "giveaway",
    "click here",
    "earn money",
    "work from home",
    "visit my channel",
    "subscribe",
    "donate here",
    "crypto investment",
    "double your money",
  ];

  // 1️⃣ contains known spam keywords
  if (spamWords.some(word => text.includes(word))) {
    return true;
  }

  // 2️⃣ too many repeated characters
  if (/([a-zA-Z])\1\1\1+/g.test(text)) {
    return true;
  }

  // 3️⃣ message too long (spam wall)
  if (text.length > 300) {
    return true;
  }

  // 4️⃣ too many emojis
  const emojiCount = (text.match(/[\p{Emoji}]/gu) || []).length;
  if (emojiCount > 10) {
    return true;
  }

  // 5️⃣ all caps shouting
  if (text.length > 6 && text === text.toUpperCase()) {
    return true;
  }

  return false;
}
