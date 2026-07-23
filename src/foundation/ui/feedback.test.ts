import { describe, expect, it } from "vitest";

import { withErrorFeedback, withFeedback } from "./feedback";

describe("feedback URLs", () => {
  it("preserves existing query parameters for success feedback", () => {
    expect(withFeedback("/relations?view=profiles", "Perfil eliminado.")).toBe(
      "/relations?view=profiles&feedback=Perfil%20eliminado.",
    );
  });

  it("marks blocked actions as error feedback", () => {
    expect(
      withErrorFeedback(
        "/companies/company-1",
        "Elimina primeiro os Perfis associados.",
      ),
    ).toBe(
      "/companies/company-1?feedback=Elimina%20primeiro%20os%20Perfis%20associados.&feedback_tone=error",
    );
  });
});
