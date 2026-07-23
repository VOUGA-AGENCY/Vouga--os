"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, WifiOff, X } from "lucide-react";

import {
  FEEDBACK_QUERY_KEY,
  FEEDBACK_TONE_QUERY_KEY,
} from "./feedback";

type Feedback = {
  message: string;
  tone: "error" | "offline" | "success";
};

export function FeedbackCenter() {
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    const message = url.searchParams.get(FEEDBACK_QUERY_KEY);
    const tone =
      url.searchParams.get(FEEDBACK_TONE_QUERY_KEY) === "error"
        ? "error"
        : "success";

    if (message) {
      window.setTimeout(() => setFeedback({ message, tone }), 0);
      url.searchParams.delete(FEEDBACK_QUERY_KEY);
      url.searchParams.delete(FEEDBACK_TONE_QUERY_KEY);
      window.history.replaceState(
        window.history.state,
        "",
        `${url.pathname}${url.search}${url.hash}`,
      );
    } else if (!window.navigator.onLine) {
      window.setTimeout(
        () =>
          setFeedback({
            message:
              "Sem ligação. A informação já carregada continua disponível, mas novas operações podem falhar.",
            tone: "offline",
          }),
        0,
      );
    }

    const showOffline = () =>
      setFeedback({
        message:
          "Sem ligação. A informação já carregada continua disponível, mas novas operações podem falhar.",
        tone: "offline",
      });
    const showOnline = () =>
      setFeedback({
        message: "Ligação restabelecida.",
        tone: "success",
      });

    window.addEventListener("offline", showOffline);
    window.addEventListener("online", showOnline);

    return () => {
      window.removeEventListener("offline", showOffline);
      window.removeEventListener("online", showOnline);
    };
  }, []);

  useEffect(() => {
    if (!feedback || feedback.tone === "offline") return;
    const timeout = window.setTimeout(() => setFeedback(null), 4200);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  if (!feedback) return null;

  const Icon =
    feedback.tone === "offline"
      ? WifiOff
      : feedback.tone === "error"
        ? AlertTriangle
        : CheckCircle2;
  const isAlert = feedback.tone !== "success";

  return (
    <div
      aria-atomic="true"
      aria-live={isAlert ? "assertive" : "polite"}
      className={`feedback-toast feedback-toast-${feedback.tone}`}
      role={isAlert ? "alert" : "status"}
    >
      <Icon aria-hidden="true" />
      <span>{feedback.message}</span>
      <button aria-label="Fechar mensagem" onClick={() => setFeedback(null)} type="button">
        <X aria-hidden="true" />
      </button>
    </div>
  );
}
