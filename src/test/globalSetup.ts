import { execSync } from "child_process";

export async function setup() {
  // Apply all migrations to the test database
  execSync("npx drizzle-kit migrate", {
    env: {
      ...process.env,
      TURSO_DATABASE_URL: "file:./test.db",
      TURSO_AUTH_TOKEN: "local",
    },
    stdio: "pipe",
  });
}

export async function teardown() {
  // Clean up test.db after all tests
  try {
    const fs = await import("fs");
    if (fs.existsSync("./test.db")) {
      fs.unlinkSync("./test.db");
    }
  } catch {
    // ignore
  }
}
