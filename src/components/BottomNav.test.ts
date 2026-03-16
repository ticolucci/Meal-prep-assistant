import { describe, it, expect } from "vitest";

// Pure logic extracted from BottomNav: a tab is active when pathname matches
// the href exactly, or is a sub-path (e.g. /prep/cook/1 activates /prep).
function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
}

const tabs = ["/recipes", "/plan", "/shopping", "/prep"];

describe("BottomNav active-state logic", () => {
  it("marks the exact matching tab as active", () => {
    for (const href of tabs) {
      expect(isActive(href, href)).toBe(true);
    }
  });

  it("marks a sub-path as active for the parent tab", () => {
    expect(isActive("/prep/cook/42", "/prep")).toBe(true);
    expect(isActive("/recipes/import", "/recipes")).toBe(true);
  });

  it("does not mark other tabs as active", () => {
    expect(isActive("/recipes", "/plan")).toBe(false);
    expect(isActive("/prep/cook/1", "/recipes")).toBe(false);
  });

  it("does not falsely match a prefix that is not a path boundary", () => {
    // /preparation should not activate /prep
    expect(isActive("/preparation", "/prep")).toBe(false);
  });
});
