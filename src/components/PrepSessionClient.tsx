"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { BatchedPrepTask } from "@/lib/batching";
import type { PrepSessionWithTasks } from "@/app/actions/prep-sessions";
import {
  createPrepSession,
  deletePrepSession,
  assignBatchTask,
  removeBatchTask,
} from "@/app/actions/prep-sessions";

interface Props {
  batchedTasks: BatchedPrepTask[];
  sessions: PrepSessionWithTasks[];
  assignedKeys: Set<string>;
}

export default function PrepSessionClient({
  batchedTasks,
  sessions: initialSessions,
  assignedKeys: initialAssignedKeys,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [newDate, setNewDate] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [assignedKeys, setAssignedKeys] = useState<Set<string>>(initialAssignedKeys);

  function refreshState() {
    startTransition(() => {
      router.refresh();
    });
  }

  async function handleCreateSession() {
    if (!newDate) {
      setError("Please choose a date.");
      return;
    }
    setError(null);
    const label = newLabel.trim() || "Prep Session";
    await createPrepSession(newDate, label);
    setNewDate("");
    setNewLabel("");
    refreshState();
  }

  async function handleDeleteSession(sessionId: number) {
    await deletePrepSession(sessionId);
    refreshState();
  }

  async function handleAssignTask(
    sessionId: number,
    task: BatchedPrepTask
  ) {
    const key = `${task.name}::${task.prep}`;
    await assignBatchTask(sessionId, task);
    setAssignedKeys((prev) => new Set([...prev, key]));
    refreshState();
  }

  async function handleRemoveTask(taskId: number, name: string, prep: string) {
    const key = `${name}::${prep}`;
    await removeBatchTask(taskId);
    setAssignedKeys((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
    refreshState();
  }

  const hasBatchedTasks = batchedTasks.length > 0;

  return (
    <div data-testid="prep-sessions-panel" className="mt-2 space-y-6">
      {!hasBatchedTasks && (
        <p
          data-testid="prep-sessions-empty"
          className="text-xs text-zinc-400"
        >
          No batch prep tasks yet. Approve a meal plan with AI-parsed recipes to see batch tasks here.
        </p>
      )}
      {/* ── Create New Session ─────────────────────────────────────────────── */}
      <section
        data-testid="create-session-form"
        className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4"
      >
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-3">
          New Prep Session
        </h3>
        <div className="flex flex-col gap-2">
          <input
            type="date"
            data-testid="session-date-input"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <input
            type="text"
            data-testid="session-label-input"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Label (e.g. Sunday Batch Prep)"
            className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          {error && (
            <p data-testid="session-form-error" className="text-xs text-red-500">
              {error}
            </p>
          )}
          <button
            data-testid="create-session-button"
            onClick={handleCreateSession}
            disabled={isPending}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition"
          >
            {isPending ? "Creating…" : "Create Session"}
          </button>
        </div>
      </section>

      {/* ── Existing Sessions ──────────────────────────────────────────────── */}
      {initialSessions.map((session) => (
        <section
          key={session.id}
          data-testid="prep-session"
          className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-zinc-900 p-4"
        >
          <div className="flex items-start justify-between gap-2 mb-3">
            <div>
              <h3
                data-testid="session-label"
                className="font-semibold text-zinc-900 dark:text-zinc-50"
              >
                {session.label}
              </h3>
              <p
                data-testid="session-date"
                className="text-xs text-zinc-500 mt-0.5"
              >
                {session.date}
              </p>
            </div>
            <button
              data-testid="delete-session-button"
              onClick={() => handleDeleteSession(session.id)}
              disabled={isPending}
              className="text-xs text-red-500 hover:text-red-700 underline disabled:opacity-50"
            >
              Delete
            </button>
          </div>

          {/* Tasks assigned to this session */}
          {session.tasks.length === 0 ? (
            <p
              data-testid="session-no-tasks"
              className="text-sm text-zinc-400 mb-3"
            >
              No tasks assigned yet — assign batch tasks below.
            </p>
          ) : (
            <ul className="space-y-2 mb-3">
              {session.tasks.map((task) => (
                <li
                  key={task.id}
                  data-testid="assigned-task"
                  className="flex items-center justify-between rounded-lg border border-zinc-100 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2"
                >
                  <div className="text-sm text-zinc-700 dark:text-zinc-300 capitalize">
                    <span className="font-medium">{task.prep} {task.name}</span>
                    {task.totalAmount != null && task.unit && (
                      <span className="text-zinc-500"> — {task.totalAmount} {task.unit}</span>
                    )}
                    {task.unitMismatch === 1 && (
                      <span className="text-amber-600"> (mixed units)</span>
                    )}
                  </div>
                  <button
                    data-testid="remove-assigned-task"
                    onClick={() => handleRemoveTask(task.id, task.name, task.prep)}
                    disabled={isPending}
                    className="ml-2 text-xs text-red-500 hover:text-red-700 underline disabled:opacity-50 shrink-0"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Assign available batch tasks to this session */}
          {hasBatchedTasks && (
            <div>
              <p className="text-xs text-zinc-400 mb-2">Assign batch tasks:</p>
              <div className="flex flex-wrap gap-2">
                {batchedTasks.map((task, idx) => {
                  const key = `${task.name}::${task.prep}`;
                  const isAssigned = assignedKeys.has(key);
                  const isAssignedToThisSession = session.tasks.some(
                    (t) => t.name === task.name && t.prep === task.prep
                  );
                  return (
                    <button
                      key={idx}
                      data-testid="assign-task-button"
                      onClick={() => handleAssignTask(session.id, task)}
                      disabled={isPending || isAssigned}
                      title={
                        isAssigned
                          ? isAssignedToThisSession
                            ? "Already in this session"
                            : "Assigned to another session"
                          : `Assign: ${task.prep} ${task.name}`
                      }
                      className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                        isAssigned
                          ? "bg-zinc-100 dark:bg-zinc-700 text-zinc-400 cursor-default"
                          : "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
                      }`}
                    >
                      {isAssigned ? "✓ " : "+ "}
                      {task.prep} {task.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
