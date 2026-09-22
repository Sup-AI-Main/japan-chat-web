/**
 * Save progress pipeline UI for entity editor.
 *
 * Shows real step-based progress — NO fake timer/percentage.
 * Only transitions when actual events occur.
 */

"use client";

export type SaveStepStatus =
  | "pending"
  | "running"
  | "success"
  | "error"
  | "skipped";

export interface SaveStep {
  id: string;
  label: string;
  status: SaveStepStatus;
}

interface EntitySaveProgressProps {
  steps: SaveStep[];
  visible: boolean;
}

const STATUS_ICON: Record<SaveStepStatus, string> = {
  pending: "○",
  running: "●",
  success: "✓",
  error: "✗",
  skipped: "—",
};

export function EntitySaveProgress({ steps, visible }: EntitySaveProgressProps) {
  if (!visible || steps.length === 0) return null;

  return (
    <div className="rounded-[10px] border border-border bg-surface p-3">
      <div className="space-y-2">
        {steps.map((step) => (
          <div
            key={step.id}
            className="flex items-center gap-2 text-[13px]"
          >
            <span
              className={
                step.status === "success"
                  ? "text-green-600"
                  : step.status === "error"
                  ? "text-red-600"
                  : step.status === "running"
                  ? "text-primary"
                  : "text-muted"
              }
            >
              {STATUS_ICON[step.status]}
            </span>
            <span
              className={
                step.status === "running"
                  ? "font-medium text-text"
                  : step.status === "success"
                  ? "text-green-700"
                  : step.status === "error"
                  ? "text-red-700"
                  : "text-muted"
              }
            >
              {step.label}
            </span>
            {step.status === "error" && (
              <span className="text-red-500 text-[12px] ml-1">
                — 실패
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
