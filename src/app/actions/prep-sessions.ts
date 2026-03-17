"use server";

import { db } from "@/db";
import { prepSessions, prepSessionTasks } from "@/db/schema";
import type { PrepSession, PrepSessionTask } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { BatchedPrepTask } from "@/lib/batching";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PrepSessionWithTasks extends PrepSession {
  tasks: PrepSessionTask[];
}

// ─── createPrepSession ────────────────────────────────────────────────────────

export async function createPrepSession(
  date: string,
  label: string = "Prep Session"
): Promise<PrepSession> {
  const [session] = await db
    .insert(prepSessions)
    .values({ date, label })
    .returning();
  revalidatePath("/prep");
  return session;
}

// ─── deletePrepSession ────────────────────────────────────────────────────────

export async function deletePrepSession(sessionId: number): Promise<void> {
  await db.delete(prepSessions).where(eq(prepSessions.id, sessionId));
  revalidatePath("/prep");
}

// ─── assignBatchTask ──────────────────────────────────────────────────────────

export async function assignBatchTask(
  sessionId: number,
  task: BatchedPrepTask
): Promise<PrepSessionTask> {
  const [row] = await db
    .insert(prepSessionTasks)
    .values({
      sessionId,
      name: task.name,
      prep: task.prep,
      totalAmount: task.totalAmount,
      unit: task.unit,
      unitMismatch: task.unitMismatch ? 1 : 0,
      prepSafe: task.prepSafe ? 1 : 0,
      recipeCount: task.recipeCount,
      recipeIds: JSON.stringify(task.recipeIds),
    })
    .returning();
  revalidatePath("/prep");
  return row;
}

// ─── removeBatchTask ──────────────────────────────────────────────────────────

export async function removeBatchTask(taskId: number): Promise<void> {
  await db.delete(prepSessionTasks).where(eq(prepSessionTasks.id, taskId));
  revalidatePath("/prep");
}

// ─── getPrepSessions ──────────────────────────────────────────────────────────

export async function getPrepSessions(): Promise<PrepSessionWithTasks[]> {
  const sessions = await db
    .select()
    .from(prepSessions)
    .orderBy(asc(prepSessions.date), asc(prepSessions.id));

  const tasks = await db.select().from(prepSessionTasks);

  return sessions.map((session) => ({
    ...session,
    tasks: tasks.filter((t) => t.sessionId === session.id),
  }));
}

// ─── getAssignedTaskKeys ──────────────────────────────────────────────────────

/**
 * Returns the set of "name::prep" keys that are already assigned to any
 * prep session. Used to mark batch tasks as "Already assigned" in the UI.
 */
export async function getAssignedTaskKeys(): Promise<Set<string>> {
  const tasks = await db.select().from(prepSessionTasks);
  return new Set(tasks.map((t) => `${t.name}::${t.prep}`));
}
