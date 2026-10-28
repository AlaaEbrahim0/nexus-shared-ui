import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { IoClose } from "react-icons/io5";
import { motion } from "framer-motion";

const inputClass = "input input-bordered h-12 w-full bg-white text-neutral-900 placeholder:text-neutral-600 focus:border-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-700/20";
const textareaClass = "textarea textarea-bordered w-full bg-white text-neutral-900 placeholder:text-neutral-600 focus:border-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-700/20";

export const UpdatePostModal = ({ isVisible, onClose, onUpdate, loading, initialData }) => {
    const [title, setTitle] = useState(initialData?.title || "");
    const [content, setContent] = useState(initialData?.content || "");

    useEffect(() => {
        if (isVisible) {
            setTitle(initialData?.title || "");
            setContent(initialData?.content || "");
        }
    }, [isVisible, initialData?.id, initialData?.title, initialData?.content]);

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (loading || !title.trim() || !content.trim()) return;
        try {
            await onUpdate(initialData.id, title.trim(), content.trim(), initialData.postPhoto);
        } catch (error) {
            // The caller owns user-facing error feedback.
        }
    };

    if (!isVisible) return null;

    const modalRoot = document.getElementById("modal-root");
    if (!modalRoot) return null;

    return createPortal(
        <div className="fixed inset-0 z-modal flex items-center justify-center overflow-y-auto bg-slate-950/50 p-3 sm:p-6">
            <motion.section role="dialog" aria-modal="true" aria-labelledby="update-post-title" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="my-auto w-full max-w-2xl rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xl sm:p-7">
                <div className="mb-6 flex items-start justify-between gap-4">
                    <div>
                        <h2 id="update-post-title" className="text-xl font-semibold text-neutral-900 sm:text-2xl">Edit post</h2>
                        <p className="mt-1 text-sm text-neutral-600">Review your changes before saving.</p>
                    </div>
                    <button type="button" onClick={onClose} disabled={loading} aria-label="Close edit post" className="rounded-lg p-2 text-neutral-600 hover:bg-neutral-100 disabled:opacity-50">
                        <IoClose aria-hidden="true" className="text-xl" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-5">
                    <label className="block">
                        <span className="mb-1.5 block text-sm font-semibold text-neutral-700">Title</span>
                        <input type="text" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Post title" disabled={loading} required maxLength={160} className={inputClass} />
                    </label>
                    <label className="block">
                        <span className="mb-1.5 block text-sm font-semibold text-neutral-700">Post content</span>
                        <textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder="Post content" disabled={loading} required rows={6} className={textareaClass} />
                    </label>
                    {initialData?.postPhoto && <img src={initialData.postPhoto} alt="Current post" className="max-h-48 max-w-full rounded-xl object-contain" />}
                    <div className="flex flex-col-reverse gap-3 border-t border-neutral-200 pt-5 sm:flex-row sm:justify-end">
                        <button type="button" className="btn btn-ghost text-neutral-700" disabled={loading} onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn border-0 bg-primary-700 text-white hover:bg-primary-800" disabled={loading || !title.trim() || !content.trim()}>
                            {loading && <span className="loading loading-spinner loading-sm" aria-hidden="true" />}
                            {loading ? "Saving…" : "Save changes"}
                        </button>
                    </div>
                </form>
            </motion.section>
        </div>,
        modalRoot
    );
};

export default UpdatePostModal;
