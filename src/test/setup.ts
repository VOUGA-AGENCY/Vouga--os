import { vi } from "vitest";

console.log("TEST SETUP RUNNING - MOCKING SERVER-ONLY");
vi.mock("server-only", () => ({}));
