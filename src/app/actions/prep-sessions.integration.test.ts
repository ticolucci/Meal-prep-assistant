import { describe, it, expect, beforeEach } from "vitest";
import { testDb } from "@/db/test-client";
import {
  recipes,
  recipeIngredients,
  mealPlans,
  mealPlanRecipes,
  prepSessions,
  prepSessionTasks,
} from "@/db/schema";
import { makeRecipe } from "@/test/factories";

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function makeApprovedPlan(recipeIds: number[]) {
  const [plan] = await testDb
    .insert(mealPlans)
    .values({ status: "approved", mealCount: recipeIds.length, params: "{}" })
    .returning();
  if (recipeIds.length > 0) {
    await testDb.insert(mealPlanRecipes).values(
      recipeIds.map((id, idx) => ({
        planId: plan.id,
        recipeId: id,
        position: idx,
      }))
    );
  }
  return plan;
}

// ─── Table cleanup ────────────────────────────────────────────────────────────

beforeEach(async () => {
  await testDb.delete(prepSessionTasks);
  await testDb.delete(prepSessions);
  await testDb.delete(mealPlanRecipes);
  await testDb.delete(mealPlans);
  await testDb.delete(recipeIngredients);
  await testDb.delete(recipes);
});

// ─── createPrepSession ────────────────────────────────────────────────────────

describe("createPrepSession", () => {
  it("inserts a prep session and returns it", async () => {
    const { createPrepSession } = await import("./prep-sessions");
    const session = await createPrepSession("2026-03-17", "Sunday Batch Prep");

    const rows = await testDb.select().from(prepSessions);
    expect(rows).toHaveLength(1);
    expect(rows[0].date).toBe("2026-03-17");
    expect(rows[0].label).toBe("Sunday Batch Prep");
    expect(session.id).toBe(rows[0].id);
  });

  it("uses a default label when none is provided", async () => {
    const { createPrepSession } = await import("./prep-sessions");
    await createPrepSession("2026-03-17");

    const rows = await testDb.select().from(prepSessions);
    expect(rows[0].label).toBe("Prep Session");
  });
});

// ─── assignBatchTask ──────────────────────────────────────────────────────────

describe("assignBatchTask", () => {
  it("inserts a prep session task and returns it", async () => {
    const [session] = await testDb
      .insert(prepSessions)
      .values({ date: "2026-03-17", label: "Sunday Prep" })
      .returning();

    const { assignBatchTask } = await import("./prep-sessions");
    const task = await assignBatchTask(session.id, {
      name: "onion",
      prep: "diced",
      totalAmount: 2,
      unit: "cups",
      unitMismatch: false,
      prepSafe: true,
      recipeCount: 2,
      recipeIds: [1, 2],
    });

    const rows = await testDb.select().from(prepSessionTasks);
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("onion");
    expect(rows[0].prep).toBe("diced");
    expect(rows[0].totalAmount).toBe(2);
    expect(rows[0].unit).toBe("cups");
    expect(rows[0].prepSafe).toBe(1);
    expect(task.sessionId).toBe(session.id);
  });

  it("allows assigning a task with null amount (unit mismatch)", async () => {
    const [session] = await testDb
      .insert(prepSessions)
      .values({ date: "2026-03-17", label: "Session" })
      .returning();

    const { assignBatchTask } = await import("./prep-sessions");
    await assignBatchTask(session.id, {
      name: "garlic",
      prep: "minced",
      totalAmount: null,
      unit: null,
      unitMismatch: true,
      prepSafe: true,
      recipeCount: 3,
      recipeIds: [1, 2, 3],
    });

    const rows = await testDb.select().from(prepSessionTasks);
    expect(rows[0].totalAmount).toBeNull();
    expect(rows[0].unitMismatch).toBe(1);
  });
});

// ─── removeBatchTask ──────────────────────────────────────────────────────────

describe("removeBatchTask", () => {
  it("deletes the task by id", async () => {
    const [session] = await testDb
      .insert(prepSessions)
      .values({ date: "2026-03-17", label: "Session" })
      .returning();

    const [task] = await testDb
      .insert(prepSessionTasks)
      .values({
        sessionId: session.id,
        name: "carrot",
        prep: "sliced",
        prepSafe: 1,
        unitMismatch: 0,
        recipeCount: 2,
        recipeIds: "[1,2]",
      })
      .returning();

    const { removeBatchTask } = await import("./prep-sessions");
    await removeBatchTask(task.id);

    const rows = await testDb.select().from(prepSessionTasks);
    expect(rows).toHaveLength(0);
  });
});

// ─── getPrepSessions ──────────────────────────────────────────────────────────

describe("getPrepSessions", () => {
  it("returns empty array when no sessions exist", async () => {
    const { getPrepSessions } = await import("./prep-sessions");
    const sessions = await getPrepSessions();
    expect(sessions).toHaveLength(0);
  });

  it("returns sessions with their tasks", async () => {
    const [s1] = await testDb
      .insert(prepSessions)
      .values({ date: "2026-03-17", label: "Sunday" })
      .returning();

    const [s2] = await testDb
      .insert(prepSessions)
      .values({ date: "2026-03-18", label: "Monday" })
      .returning();

    await testDb.insert(prepSessionTasks).values({
      sessionId: s1.id,
      name: "onion",
      prep: "diced",
      prepSafe: 1,
      unitMismatch: 0,
      recipeCount: 2,
      recipeIds: "[1,2]",
    });

    await testDb.insert(prepSessionTasks).values({
      sessionId: s1.id,
      name: "garlic",
      prep: "minced",
      prepSafe: 1,
      unitMismatch: 0,
      recipeCount: 2,
      recipeIds: "[1,2]",
    });

    const { getPrepSessions } = await import("./prep-sessions");
    const sessions = await getPrepSessions();

    expect(sessions).toHaveLength(2);
    const sunday = sessions.find((s) => s.date === "2026-03-17");
    expect(sunday).toBeDefined();
    expect(sunday!.tasks).toHaveLength(2);
    const monday = sessions.find((s) => s.date === "2026-03-18");
    expect(monday!.tasks).toHaveLength(0);
  });
});

// ─── deletePrepSession ────────────────────────────────────────────────────────

describe("deletePrepSession", () => {
  it("deletes a session and cascades to its tasks", async () => {
    const [session] = await testDb
      .insert(prepSessions)
      .values({ date: "2026-03-17", label: "Session" })
      .returning();

    await testDb.insert(prepSessionTasks).values({
      sessionId: session.id,
      name: "onion",
      prep: "diced",
      prepSafe: 1,
      unitMismatch: 0,
      recipeCount: 2,
      recipeIds: "[1,2]",
    });

    const { deletePrepSession } = await import("./prep-sessions");
    await deletePrepSession(session.id);

    const sessionRows = await testDb.select().from(prepSessions);
    const taskRows = await testDb.select().from(prepSessionTasks);
    expect(sessionRows).toHaveLength(0);
    expect(taskRows).toHaveLength(0);
  });
});

// ─── getAssignedTaskKeys ──────────────────────────────────────────────────────

describe("getAssignedTaskKeys", () => {
  it("returns set of 'name::prep' keys already assigned across all sessions", async () => {
    const [session] = await testDb
      .insert(prepSessions)
      .values({ date: "2026-03-17", label: "Session" })
      .returning();

    await testDb.insert(prepSessionTasks).values([
      {
        sessionId: session.id,
        name: "onion",
        prep: "diced",
        prepSafe: 1,
        unitMismatch: 0,
        recipeCount: 2,
        recipeIds: "[1,2]",
      },
      {
        sessionId: session.id,
        name: "garlic",
        prep: "minced",
        prepSafe: 1,
        unitMismatch: 0,
        recipeCount: 2,
        recipeIds: "[1,2]",
      },
    ]);

    const { getAssignedTaskKeys } = await import("./prep-sessions");
    const keys = await getAssignedTaskKeys();

    expect(keys.has("onion::diced")).toBe(true);
    expect(keys.has("garlic::minced")).toBe(true);
    expect(keys.has("carrot::sliced")).toBe(false);
  });
});
