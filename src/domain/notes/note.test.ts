import { describe, expect, test } from "vitest";
import {
  InvalidNoteError,
  normalizeFolderName,
  normalizeNoteBody,
  normalizeNoteTitle,
  parseFolderColor,
} from "./note";

describe("Notes domain", () => {
  test("normalizes folder and note labels", () => {
    expect(normalizeFolderName("  Client   docs ")).toBe("Client docs");
    expect(normalizeNoteTitle("  First   day ")).toBe("First day");
    expect(parseFolderColor("amber")).toBe("amber");
  });

  test("rejects invalid labels and colors", () => {
    expect(() => normalizeFolderName(" ")).toThrow(InvalidNoteError);
    expect(() => normalizeNoteTitle(" ")).toThrow(InvalidNoteError);
    expect(() => parseFolderColor("orange")).toThrow(InvalidNoteError);
  });

  test("normalizes body line endings and caps note size", () => {
    expect(normalizeNoteBody("one\r\ntwo")).toBe("one\ntwo");
    expect(() => normalizeNoteBody("x".repeat(200_001))).toThrow(InvalidNoteError);
  });
});
