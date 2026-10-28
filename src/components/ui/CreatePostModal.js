import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BiImageAdd } from "react-icons/bi";
import { IoClose } from "react-icons/io5";

const inputClass = "input input-bordered h-12 w-full bg-white text-neutral-900 placeholder:text-neutral-600 focus:border-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-700/20";
const textareaClass = "textarea textarea-bordered w-full bg-white text-neutral-900 placeholder:text-neutral-600 focus:border-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-700/20";

export const CreatePostModal = ({ isVisible, onClose, onCreate, loading }) => {
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [category, setCategory] = useState("");
    const [tags, setTags] = useState("");
    const [postPhoto, setPostPhoto] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);

    useEffect(() => {
        if (!isVisible) {
            setPreviewUrl(null);
            setPostPhoto(null);
        }
    }, [isVisible]);

    const handlePhotoChange = (event) => {
        const file = event.target.files?.[0] || null;
        setPostPhoto(file);
        if (!file) {
            setPreviewUrl(null);
            return;
        }
        const reader = new FileReader();
        reader.onload = () => setPreviewUrl(reader.result);
        reader.readAsDataURL(file);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (loading || !title.trim() || !content.trim()) return;
        try {
            await onCreate(title.trim(), content.trim(), postPhoto, category, tags);
            onClose();
        } catch (error) {
            // The caller owns user-facing error feedback.
        }
    };

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-modal flex items-center justify-center overflow-y-auto bg-slate-950/50 p-3 sm:p-6">
            <motion.section role="dialog" aria-modal="true" aria-labelledby="create-post-title" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="my-auto w-full max-w-2xl rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xl sm:p-7">
                <div className="mb-6 flex items-start justify-between gap-4">
                    <div>
                        <h2 id="create-post-title" className="text-xl font-semibold text-neutral-900 sm:text-2xl">Create a post</h2>
                        <p className="mt-1 text-sm text-neutral-600">Share an update with the community.</p>
                    </div>
                    <button type="button" onClick={onClose} disabled={loading} aria-label="Close create post" className="rounded-lg p-2 text-neutral-600 hover:bg-neutral-100 disabled:opacity-50">
                        <IoClose aria-hidden="true" className="text-xl" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-5">
                    <label className="block">
                        <span className="mb-1.5 block text-sm font-semibold text-neutral-700">Title</span>
                        <input type="text" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Give your post a clear title" disabled={loading} required maxLength={160} className={inputClass} />
                    </label>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="block"><span className="mb-1.5 block text-sm font-semibold text-neutral-700">Category</span><input value={category} onChange={(event) => setCategory(event.target.value)} maxLength={100} placeholder="e.g. Clinical insight" className={inputClass} disabled={loading} /></label>
                        <label className="block"><span className="mb-1.5 block text-sm font-semibold text-neutral-700">Tags</span><input value={tags} onChange={(event) => setTags(event.target.value)} maxLength={1000} placeholder="Separate tags with commas" className={inputClass} disabled={loading} /></label>
                    </div>
                    <label className="block">
                        <span className="mb-1.5 block text-sm font-semibold text-neutral-700">Post content</span>
                        <textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder="Write your post..." disabled={loading} required rows={6} className={textareaClass} />
                    </label>
                    <div>
                        <span className="mb-1.5 block text-sm font-semibold text-neutral-700">Image <span className="font-normal text-neutral-600">(optional)</span></span>
                        <label htmlFor="create-post-image" className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-dashed border-neutral-300 px-4 py-3 text-sm font-medium text-primary-800 transition hover:border-primary-700 hover:bg-primary-50 focus-within:ring-2 focus-within:ring-primary-700/30">
                            <BiImageAdd aria-hidden="true" className="text-xl" />
                            <span>{postPhoto ? postPhoto.name : "Choose an image"}</span>
                            <input id="create-post-image" type="file" onChange={handlePhotoChange} accept="image/*" disabled={loading} className="sr-only" />
                        </label>
                        {previewUrl && (
                            <div className="relative mt-3 rounded-xl bg-neutral-50 p-2">
                            <img src={previewUrl} alt="Attachment preview" className="mx-auto max-h-56 max-w-full rounded-lg object-contain" />
                                <button type="button" disabled={loading} onClick={() => { setPreviewUrl(null); setPostPhoto(null); }} className="absolute right-3 top-3 rounded-full bg-white p-2 text-neutral-700 shadow hover:bg-neutral-100" aria-label="Remove image">
                                    <IoClose aria-hidden="true" />
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col-reverse gap-3 border-t border-neutral-200 pt-5 sm:flex-row sm:justify-end">
                        <button type="button" className="btn btn-ghost text-neutral-700" disabled={loading} onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn border-0 bg-primary-700 text-white hover:bg-primary-800" disabled={loading || !title.trim() || !content.trim()}>
                            {loading && <span className="loading loading-spinner loading-sm" aria-hidden="true" />}
                            {loading ? "Creating…" : "Create post"}
                        </button>
                    </div>
                </form>
            </motion.section>
        </div>
    );
};
