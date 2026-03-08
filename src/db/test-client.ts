import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

const testClient = createClient({
  url: "file:./test.db",
  authToken: "local",
});

export const testDb = drizzle(testClient, { schema });
