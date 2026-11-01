import { useId } from "react";
import {
    FiCalendar,
    FiChevronLeft,
    FiChevronRight,
    FiClipboard,
    FiClock,
    FiFileText,
    FiFilter,
    FiUser,
    FiX,
} from "react-icons/fi";
import { Button, EmptyState, ErrorState, Skeleton } from "../ui";
import { parseUtcDate } from "../../utils/utcToRelativeTime";

const typeMeta = {
    appointment: { label: "Appointment", icon: FiCalendar, tone: "bg-primary-50 text-primary-800" },
    note: { label: "Consultation note", icon: FiFileText, tone: "bg-amber-50 text-amber-800" },
    follow_up: { label: "Follow-up", icon: FiClipboard, tone: "bg-emerald-50 text-emerald-800" },
};

// Shared with the portal pages so the tab labels and the API `category`
// values can never drift apart.
export const HISTORY_CATEGORIES = [
    { value: "all", label: "All activity" },
    { value: "appointments", label: "Appointments" },
    { value: "follow_ups", label: "Follow-ups" },
    { value: "notes", label: "Consultation notes" },
];

const emptyCopy = {
    all: "Appointments, shared notes and follow-ups will appear here as they are recorded.",
    appointments: "No appointments fall inside the selected filters yet.",
    follow_ups: "No follow-ups fall inside the selected filters yet.",
    notes: "No consultation notes shared with you fall inside the selected filters yet.",
};

const formatDateTime = (value) => {
    const date = parseUtcDate(value);
    if (!date) return "";
    return date.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
};

const statusTone = (status) => {
    switch ((status || "").toLowerCase()) {
        case "completed":
        case "done":
            return "border-emerald-200 bg-emerald-50 text-emerald-800";
        case "cancelled":
        case "rejected":
            return "border-rose-200 bg-rose-50 text-rose-800";
        case "confirmed":
            return "border-sky-200 bg-sky-50 text-sky-800";
        case "pending":
        case "open":
            return "border-amber-200 bg-amber-50 text-amber-800";
        default:
            return "border-neutral-200 bg-neutral-50 text-neutral-700";
    }
};

export const PatientHistoryTimeline = ({
    history,
    isLoading = false,
    error = null,
    onRetry,
    onPageChange,
    showVisibility = false,
    category = "all",
    onCategoryChange,
    dateFrom = "",
    dateTo = "",
    onDateChange,
}) => {
    const fromId = useId();
    const toId = useId();

    const activeCategory = HISTORY_CATEGORIES.some((entry) => entry.value === category)
        ? category
        : "all";

    const filterBar = (
        <div className="space-y-3">
            <div
                role="tablist"
                aria-label="Filter history by record type"
                className="flex w-full flex-wrap gap-1 rounded-xl border border-neutral-200 bg-base-100 p-1"
            >
                {HISTORY_CATEGORIES.map((entry) => (
                    <button
                        key={entry.value}
                        type="button"
                        role="tab"
                        aria-selected={activeCategory === entry.value}
                        onClick={() => onCategoryChange?.(entry.value)}
                        className={`min-h-10 flex-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 sm:text-sm ${
                            activeCategory === entry.value
                                ? "bg-primary text-white"
                                : "text-neutral-700 hover:bg-neutral-100"
                        }`}
                    >
                        {entry.label}
                    </button>
                ))}
            </div>

            {onDateChange && (
                <div className="flex flex-wrap items-end gap-2">
                    <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-end">
                        <div className="min-w-0 flex-1">
                            <label htmlFor={fromId} className="mb-1 block text-xs font-semibold text-neutral-700">
                                From
                            </label>
                            <input
                                id={fromId}
                                type="date"
                                value={dateFrom}
                                max={dateTo || undefined}
                                onChange={(event) => onDateChange?.({ from: event.target.value, to: dateTo })}
                                className="input input-bordered input-sm w-full rounded-xl border-neutral-300 bg-base-100 text-sm"
                            />
                        </div>
                        <div className="min-w-0 flex-1">
                            <label htmlFor={toId} className="mb-1 block text-xs font-semibold text-neutral-700">
                                To
                            </label>
                            <input
                                id={toId}
                                type="date"
                                value={dateTo}
                                min={dateFrom || undefined}
                                onChange={(event) => onDateChange?.({ from: dateFrom, to: event.target.value })}
                                className="input input-bordered input-sm w-full rounded-xl border-neutral-300 bg-base-100 text-sm"
                            />
                        </div>
                    </div>
                    {(dateFrom || dateTo) && (
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onDateChange?.({ from: "", to: "" })}
                        >
                            <FiX aria-hidden="true" /> Clear dates
                        </Button>
                    )}
                </div>
            )}
        </div>
    );

    if (isLoading && !history) {
        return (
            <div className="space-y-4">
                {filterBar}
                <div className="space-y-3" aria-label="Loading patient history" aria-busy="true">
                    {[0, 1, 2, 3].map((index) => (
                        <Skeleton key={index} className="h-28 w-full" rounded="rounded-2xl" />
                    ))}
                </div>
            </div>
        );
    }

    if (error && !history) {
        return (
            <div className="space-y-4">
                {filterBar}
                <ErrorState
                    title="Patient history could not be loaded"
                    message="Please try again."
                    onRetry={onRetry}
                />
            </div>
        );
    }

    const items = history?.items || [];
    if (!isLoading && items.length === 0) {
        return (
            <div className="space-y-4">
                {filterBar}
                <EmptyState
                    icon={activeCategory === "appointments" ? <FiCalendar aria-hidden="true" /> : activeCategory === "follow_ups" ? <FiClipboard aria-hidden="true" /> : activeCategory === "notes" ? <FiFileText aria-hidden="true" /> : <FiFilter aria-hidden="true" />}
                    title={activeCategory === "all" ? "No history yet" : `No ${HISTORY_CATEGORIES.find((entry) => entry.value === activeCategory)?.label.toLowerCase() || "records"} yet`}
                    description={emptyCopy[activeCategory]}
                    action={
                        (dateFrom || dateTo || activeCategory !== "all") ? (
                            <Button size="sm" variant="outline" onClick={() => { onCategoryChange?.("all"); onDateChange?.({ from: "", to: "" }); }}>
                                Reset filters
                            </Button>
                        ) : undefined
                    }
                />
            </div>
        );
    }

    const pageNumber = history?.pageNumber || 1;
    const pageSize = history?.pageSize || 20;
    const totalCount = history?.totalCount || items.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    return (
        <div className="space-y-4">
            {filterBar}

            <ol className="relative space-y-3 border-l border-neutral-200 pl-4 sm:pl-6">
                {items.map((item) => {
                    const meta = typeMeta[item.type] || typeMeta.note;
                    const Icon = meta.icon;
                    return (
                        <li key={`${item.type}-${item.sourceId ?? item.appointmentId ?? item.title}`} className="relative">
                            <span className="absolute -left-[1.85rem] top-4 grid h-7 w-7 place-items-center rounded-full border border-neutral-200 bg-base-100 text-neutral-600 sm:-left-[2.35rem]">
                                <Icon aria-hidden="true" className="text-sm" />
                            </span>
                            <article className="rounded-2xl border border-neutral-200 bg-base-100 p-4 shadow-sm">
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${meta.tone}`}>
                                            {meta.label}
                                        </span>
                                        <h3 className="mt-2 break-words text-sm font-bold text-neutral-900 sm:text-base">{item.title}</h3>
                                    </div>
                                    <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                                        {item.status && (
                                            <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize ${statusTone(item.status)}`}>
                                                {item.status}
                                            </span>
                                        )}
                                        {showVisibility && item.type === "note" && (
                                            <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${item.isPatientVisible ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-neutral-200 bg-neutral-50 text-neutral-700"}`}>
                                                {item.isPatientVisible ? "Shared with patient" : "Private note"}
                                            </span>
                                        )}
                                        {showVisibility && item.type === "follow_up" && item.isPatientVisible && (
                                            <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                                                Shared with patient
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {item.detail && (
                                    <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-neutral-700">{item.detail}</p>
                                )}
                                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-600">
                                    <span className="inline-flex items-center gap-1"><FiClock aria-hidden="true" /> {formatDateTime(item.occurredAtUtc)}</span>
                                    {item.doctorName && (
                                        <span className="inline-flex items-center gap-1"><FiUser aria-hidden="true" /> Dr. {item.doctorName}</span>
                                    )}
                                    {item.dueAtUtc && (
                                        <span className="inline-flex items-center gap-1"><FiCalendar aria-hidden="true" /> Due {formatDateTime(item.dueAtUtc)}</span>
                                    )}
                                </div>
                            </article>
                        </li>
                    );
                })}
            </ol>

            <div className="flex flex-col items-start justify-between gap-2 border-t border-neutral-200 pt-3 text-sm text-neutral-600 sm:flex-row sm:items-center">
                <p>{totalCount} record{totalCount === 1 ? "" : "s"} · page {pageNumber} of {totalPages}</p>
                <div className="flex gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        disabled={pageNumber <= 1 || isLoading}
                        onClick={() => onPageChange?.(pageNumber - 1)}
                    >
                        <FiChevronLeft aria-hidden="true" /> Previous
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        disabled={pageNumber >= totalPages || isLoading}
                        onClick={() => onPageChange?.(pageNumber + 1)}
                    >
                        Next <FiChevronRight aria-hidden="true" />
                    </Button>
                </div>
            </div>
        </div>
    );
};
