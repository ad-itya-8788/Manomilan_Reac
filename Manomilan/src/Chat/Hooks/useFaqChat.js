import { useCallback, useEffect, useRef, useState } from "react";

const makeId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const now = () => new Date().toISOString();
const STOP_WORDS = new Set(["a", "an", "and", "are", "can", "do", "for", "how", "i", "in", "is", "me", "my", "of", "on", "the", "to", "what", "with"]);
const KNOWLEDGE = [
  {
    keywords: ["register", "registration", "sign up", "create account"],
    answer: "Open the registration page, enter your details and submit the form. After registering, sign in to complete your profile and use matchmaking features.",
  },
  {
    keywords: ["profile", "edit profile", "update profile", "photos", "preferences"],
    answer: "Sign in and open My Profile to add or update your personal details, photos and partner preferences. Save your changes when you are finished.",
  },
  {
    keywords: ["match", "matches", "find matches", "partner"],
    answer: "Open Find Matches to browse profiles suggested from your details and partner preferences. Completing your profile helps us show more relevant matches.",
  },
  {
    keywords: ["interest", "send interest", "interests"],
    answer: "Open a profile from Find Matches and tap Send Interest. You can review sent and received interests from the Interests section.",
  },
  {
    keywords: ["verification", "verify", "documents", "verified"],
    answer: "Verification means our team has reviewed the profile details and documents you submitted. Check your profile or notifications for any requested updates.",
  },
  {
    keywords: ["payment", "pay", "receipt", "transaction"],
    answer: "Use the payment section shown for your registration and follow its instructions. If a payment is not reflected, choose Contact Admin for account-specific help.",
  },
];

const scoreFaq = (query, faq) => {
  const question = String(faq.question || "").toLowerCase();
  const queryTokens = String(query).toLowerCase().split(/[^a-z0-9]+/).filter((token) => token && !STOP_WORDS.has(token));
  const faqTokens = new Set(question.split(/[^a-z0-9]+/).filter((token) => token && !STOP_WORDS.has(token)));
  return queryTokens.reduce((score, token) => score + (faqTokens.has(token) ? 1 : 0), 0);
};

export default function useFaqChat({ greeting = "" } = {}) {
  const [messages, setMessages] = useState(() => (
    greeting
      ? [{
          id: "faq-greeting",
          sender_type: "faq",
          mine: false,
          message: greeting,
          created_at: now(),
          status: "sent",
        }]
      : []
  ));
  const [typing, setTyping] = useState(false);
  const timerRef = useRef(null);
  const typingRef = useRef(false);

  useEffect(() => () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
  }, []);

  const ask = useCallback((question, answer) => {
    const questionText = String(question || "").trim();
    if (!questionText || typingRef.current) return false;

    const answerText = String(answer || "").trim()
      || "Please sign in and send this to our support team so they can help you.";

    typingRef.current = true;
    setMessages((current) => [
      ...current,
      {
        id: makeId("faq-question"),
        sender_type: "user",
        mine: true,
        message: questionText,
        created_at: now(),
        status: "sent",
      },
    ]);
    setTyping(true);

    timerRef.current = window.setTimeout(() => {
      setTyping(false);
      setMessages((current) => [
        ...current,
        {
          id: makeId("faq-answer"),
          sender_type: "faq",
          mine: false,
          message: answerText,
          created_at: now(),
          status: "sent",
          animate: true,
        },
      ]);
      typingRef.current = false;
      timerRef.current = null;
    }, 900);

    return true;
  }, []);

  const askFaq = useCallback((faq) => ask(faq?.question, faq?.answer), [ask]);

  const askText = useCallback((text, faqs = []) => {
    const query = String(text || "").trim();
    if (!query) return false;

    const normalized = query.toLowerCase();
    const match = faqs
      .map((faq) => ({ faq, score: scoreFaq(normalized, faq) }))
      .sort((left, right) => right.score - left.score)[0];

    if (match?.score > 0) return askFaq(match.faq);
    const knowledge = KNOWLEDGE.find((item) => item.keywords.some((keyword) => normalized.includes(keyword)));
    if (knowledge) return ask(query, knowledge.answer);
    return ask(query, "I can help with registration, profiles, matches, verification and payments. Try asking about one of these topics, or choose Contact Admin for personal support.");
  }, [ask, askFaq]);

  return { messages, typing, ask, askFaq, askText };
}
