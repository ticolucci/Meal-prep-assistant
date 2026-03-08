import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock Next.js server functions that throw outside of Next.js request context
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));
