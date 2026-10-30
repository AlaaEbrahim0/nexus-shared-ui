import { IoClose } from "react-icons/io5";
import { FiFilter } from "react-icons/fi";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";

const panelClass = "my-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-xl overflow-y-auto overscroll-contain rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xl sm:p-6";
const labelClass = "mb-1.5 block text-sm font-semibold text-neutral-700";
const fieldClass = "input input-bordered w-full bg-white text-neutral-900 placeholder:text-neutral-600 focus:border-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-700/20";

function FilterHeader({ activeCount, headingId, onClose }) {
    return (
        <div className="mb-5 flex items-start justify-between border-b border-neutral-200 pb-4">
            <div>
                <div className="flex items-center gap-2 text-neutral-900">
                    <FiFilter aria-hidden="true" className="text-primary-700" />
                    <h2 id={headingId} className="text-xl font-semibold">Filters</h2>
                </div>
                <p className="mt-1 text-sm text-neutral-600">Narrow results using the fields below.</p>
                {activeCount > 0 && (
                    <span className="mt-3 inline-flex rounded-full bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-800">
                        {activeCount} active {activeCount === 1 ? "filter" : "filters"}
                    </span>
                )}
            </div>
            <button type="button" onClick={onClose} aria-label="Close filters" className="rounded-lg p-2 text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900">
                <IoClose aria-hidden="true" className="text-xl" />
            </button>
        </div>
    );
}

function FilterActions({ onReset, onApply }) {
    return (
        <div className="mt-6 flex flex-col-reverse gap-3 border-t border-neutral-200 pt-4 sm:flex-row sm:justify-end">
            <button type="button" onClick={onReset} className="btn btn-ghost text-neutral-700">Reset filters</button>
            <button type="button" onClick={onApply} className="btn border-0 bg-primary-700 text-white hover:bg-primary-800">Apply filters</button>
        </div>
    );
}

export function FilterationComponent({ onClose, onFilter, initialFilters: appliedFilters }) {
    const initialFilters = { fullname: "", title: "", content: "", from: "", to: "", showConfessions: false };
    const [filters, setFilters] = useState(() => ({ ...initialFilters, ...appliedFilters }));
    const activeCount = useMemo(() => Object.entries(filters).filter(([key, value]) => key === "showConfessions" ? value : Boolean(value)).length, [filters]);

    const handleChange = (event) => {
        const { name, value, checked, type } = event.target;
        setFilters((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
    };
    const apply = () => { onFilter(filters); onClose(); };
    const reset = () => { setFilters(initialFilters); onFilter(initialFilters); onClose(); };

    return (
        <motion.section role="dialog" aria-modal="true" aria-labelledby="community-filter-title" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={panelClass}>
            <FilterHeader activeCount={activeCount} headingId="community-filter-title" onClose={onClose} />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {["fullname", "title", "content"].map((field) => (
                    <label key={field} className={field === "content" ? "sm:col-span-2" : ""}>
                        <span className={labelClass}>{field === "fullname" ? "Username" : field.charAt(0).toUpperCase() + field.slice(1)}</span>
                        <input type="search" name={field} value={filters[field]} onChange={handleChange} placeholder={`Search by ${field === "fullname" ? "username" : field}`} className={fieldClass} />
                    </label>
                ))}
                <label>
                    <span className={labelClass}>From</span>
                    <input type="date" name="from" value={filters.from} onChange={handleChange} className={fieldClass} />
                </label>
                <label>
                    <span className={labelClass}>To</span>
                    <input type="date" name="to" value={filters.to} onChange={handleChange} className={fieldClass} />
                </label>
            </div>
            <label className="mt-5 flex min-h-12 items-center justify-between gap-4 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3">
                <span className="text-sm font-medium text-neutral-800">Show confessions</span>
                <input type="checkbox" name="showConfessions" checked={filters.showConfessions} onChange={handleChange} className="toggle toggle-primary" />
            </label>
            <FilterActions onReset={reset} onApply={apply} />
        </motion.section>
    );
}

export function AppointmentsFilterationComponent({ onClose, onFilter, initialFilters: appliedFilters }) {
    const initialFilters = { clientName: null, startDate: "", endDate: "", status: null };
    const [filters, setFilters] = useState(() => ({
        clientName: appliedFilters?.clientName || null,
        startDate: appliedFilters?.startDate || "",
        endDate: appliedFilters?.endDate || "",
        status: appliedFilters?.status || null,
    }));
    const activeCount = Object.values(filters).filter(Boolean).length;
    const handleChange = ({ target: { name, value } }) => setFilters((current) => ({ ...current, [name]: value || null }));
    const apply = () => { onFilter(filters); onClose(); };
    const reset = () => { setFilters(initialFilters); onFilter(initialFilters); onClose(); };

    return (
        <motion.section role="dialog" aria-modal="true" aria-labelledby="appointment-filter-title" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={panelClass}>
            <FilterHeader activeCount={activeCount} headingId="appointment-filter-title" onClose={onClose} />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="sm:col-span-2">
                    <span className={labelClass}>Client name</span>
                    <input type="search" name="clientName" value={filters.clientName || ""} onChange={handleChange} placeholder="Search by client name" className={fieldClass} />
                </label>
                <label>
                    <span className={labelClass}>Start date</span>
                    <input type="date" name="startDate" value={filters.startDate} onChange={handleChange} className={fieldClass} />
                </label>
                <label>
                    <span className={labelClass}>End date</span>
                    <input type="date" name="endDate" value={filters.endDate} onChange={handleChange} className={fieldClass} />
                </label>
                <label className="sm:col-span-2">
                    <span className={labelClass}>Status</span>
                    <select className="select select-bordered w-full bg-white text-neutral-900 focus:border-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-700/20" name="status" value={filters.status || ""} onChange={handleChange}>
                        <option value="">Any status</option>
                        {["Pending", "Confirmed", "Cancelled", "Rejected"].map((status) => <option key={status} value={status}>{status}</option>)}
                    </select>
                </label>
            </div>
            <FilterActions onReset={reset} onApply={apply} />
        </motion.section>
    );
}
