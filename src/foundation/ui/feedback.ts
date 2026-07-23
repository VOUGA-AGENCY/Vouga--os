export const FEEDBACK_QUERY_KEY = "feedback";
export const FEEDBACK_TONE_QUERY_KEY = "feedback_tone";

export function withFeedback(
  path: string,
  message: string,
  tone: "success" | "error" = "success",
): string {
  const separator = path.includes("?") ? "&" : "?";
  const feedback = `${FEEDBACK_QUERY_KEY}=${encodeURIComponent(message)}`;
  const feedbackTone =
    tone === "error" ? `&${FEEDBACK_TONE_QUERY_KEY}=error` : "";
  return `${path}${separator}${feedback}${feedbackTone}`;
}

export const withErrorFeedback = (path: string, message: string): string =>
  withFeedback(path, message, "error");
