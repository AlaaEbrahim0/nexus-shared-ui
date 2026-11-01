import { useState } from "react";
import { FiFlag } from "react-icons/fi";
import toast from "react-hot-toast";
import { Badge, EmptyState, Select } from "../ui";
import { formatChatTimestamp } from "../../utils/chat";
import {
    getChatErrorMessage,
    useUpdateChatReportStatus,
} from "../../api/chat.api";

const statusBadgeVariant = (status) => {
    if (status === "Open") return "warning";
    if (status === "Actioned") return "danger";
    if (status === "Reviewed") return "info";

    return "neutral";
};

// The server accepts only these three transitions out of Open.
const NEXT_STATUSES = ["Reviewed", "Dismissed", "Actioned"];

/**
 * The report queue of a room.
 *
 * Only the owner and doctor moderators can open this panel. A report carries
 * the original message content even when the sender has since deleted the
 * message, because a moderator needs the original text to judge it. That
 * content must never leak into the message list or into a non-moderator view.
 */
export const RoomReportsPanel = ({ roomId, reports, onStatusChanged }) => {
    const [busyReportId, setBusyReportId] = useState(null);
    const { execute } = useUpdateChatReportStatus();

    const handleStatusChange = async (report, nextStatus) => {
        setBusyReportId(report.id);

        try {
            const updated = await execute(roomId, report.id, nextStatus);
            onStatusChanged?.(updated);
        } catch (error) {
            toast.error(getChatErrorMessage(error, "The report could not be updated."));
        } finally {
            setBusyReportId(null);
        }
    };

    if (!reports || reports.length === 0) {
        return (
            <EmptyState
                icon={<FiFlag aria-hidden="true" />}
                title="No reports"
                description="Reported messages appear here for review."
                className="border-0 shadow-none"
            />
        );
    }

    return (
        <div>
            <h3 className="text-sm font-bold text-neutral-900">Reports</h3>
            <p className="mt-0.5 text-xs text-neutral-600">
                {reports.length} {reports.length === 1 ? "report" : "reports"}
            </p>

            <ul className="mt-3 space-y-3">
                {reports.map((report) => (
                    <li
                        key={report.id}
                        className="rounded-xl border border-neutral-200 bg-base-100 p-3"
                    >
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={statusBadgeVariant(report.status)} size="sm">
                                {report.status}
                            </Badge>
                            <span className="text-xs text-neutral-500">
                                {formatChatTimestamp(report.createdAtUtc)}
                            </span>
                        </div>

                        <p className="mt-2 text-sm leading-6 text-neutral-800">
                            <span className="font-semibold">Reason:</span> {report.reason}
                        </p>

                        {report.message && (
                            <div className="mt-2 rounded-lg bg-neutral-50 p-2.5">
                                <p className="text-xs font-semibold text-neutral-700">
                                    {report.message.senderDisplayName}
                                </p>
                                <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-neutral-700">
                                    {report.message.content}
                                </p>
                            </div>
                        )}

                        {report.status === "Open" && (
                            <div className="mt-3">
                                <span className="block w-36">
                                    <Select
                                        aria-label={`Status for report ${report.id}`}
                                        value=""
                                        disabled={busyReportId === report.id}
                                        onChange={(event) => {
                                            if (!event.target.value) return;
                                            handleStatusChange(report, event.target.value)
                                                .catch(() => undefined);
                                        }}
                                    >
                                        <option value="">Mark as…</option>
                                        {NEXT_STATUSES.map((status) => (
                                            <option key={status} value={status}>
                                                {status}
                                            </option>
                                        ))}
                                    </Select>
                                </span>
                            </div>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
};
