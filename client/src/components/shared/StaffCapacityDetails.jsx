import { getStaffRemainingCapacity } from "@/lib/utils"

export default function StaffCapacityDetails({
  workload,
  dateLabel = "this day",
  showToday = true,
  className = "text-sm text-muted-foreground",
}) {
  if (!workload) return null

  const remaining = getStaffRemainingCapacity(workload)
  const todayRemaining =
    workload.todayRemainingCapacity ??
    Math.max(0, workload.dailyCapacity - (workload.todayAssignedCount ?? 0))

  return (
    <div className={`space-y-1 ${className}`}>
      <p>
        Assigned for {dateLabel}:{" "}
        <span className="font-semibold text-foreground">
          {workload.assignedCount}/{workload.dailyCapacity}
        </span>
      </p>
      <p>
        Remaining:{" "}
        <span className={remaining > 0 ? "font-semibold text-foreground" : "font-semibold text-destructive"}>
          {remaining} slot{remaining === 1 ? "" : "s"}
        </span>
      </p>
      {showToday && workload.todayAssignedCount !== undefined && (
        <p>
          Assigned today:{" "}
          <span className="font-semibold text-foreground">
            {workload.todayAssignedCount}/{workload.dailyCapacity}
          </span>
          {" · "}
          {todayRemaining} left today
        </p>
      )}
    </div>
  )
}
