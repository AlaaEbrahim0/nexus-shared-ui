import { useEffect, useState } from "react";
import { Button, Modal } from "./primitives";
import { POST_CONTENT_MAX_LENGTH, POST_TITLE_MAX_LENGTH } from "../../utils/postComposerConfig";

const inputClass = "input input-bordered h-12 w-full bg-white text-neutral-900 placeholder:text-neutral-600 focus:border-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-700/20";
const textareaClass = "textarea textarea-bordered min-h-36 w-full resize-y bg-white text-neutral-900 placeholder:text-neutral-600 focus:border-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-700/20";

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
        if (loading || !content.trim()) return;
        try {
            await onUpdate(initialData.id, {
                title: title.trim(),
                content: content.trim(),
            });
        } catch {
            // The caller owns user-facing error feedback and keeps the modal open.
        }
    };

    return (
        <Modal
            isOpen={isVisible}
            onClose={loading ? undefined : onClose}
            title="Edit post"
            description="Review your changes before saving."
            size="2xl"
            footer={
                <>
                    <Button variant="outline" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        form="update-post-form"
                        loading={loading}
                        loadingText="Saving…"
                        disabled={!content.trim()}
                    >
                        Save changes
                    </Button>
                </>
            }
        >
            <form id="update-post-form" onSubmit={handleSubmit} className="space-y-5">
                <label className="block">
                    <span className="mb-1.5 block text-sm font-semibold text-neutral-700">
                        Title (Optional)
                    </span>
                    <input
                        type="text"
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                        placeholder="Post title"
                        disabled={loading}
                        maxLength={POST_TITLE_MAX_LENGTH}
                        className={inputClass}
                    />
                </label>
                <label className="block">
                    <span className="mb-1.5 block text-sm font-semibold text-neutral-700">
                        Post content
                    </span>
                    <textarea
                        value={content}
                        onChange={(event) => setContent(event.target.value)}
                        placeholder="Post content"
                        disabled={loading}
                        required
                        rows={6}
                        maxLength={POST_CONTENT_MAX_LENGTH}
                        className={textareaClass}
                    />
                    <span className="mt-1 block text-right text-xs font-medium text-neutral-600">
                        {content.length.toLocaleString("en-US")} /{" "}
                        {POST_CONTENT_MAX_LENGTH.toLocaleString("en-US")}
                    </span>
                </label>
                {initialData?.postPhoto && (
                    <img
                        src={initialData.postPhoto}
                        alt="Current post"
                        className="max-h-48 max-w-full rounded-xl object-contain"
                    />
                )}
            </form>
        </Modal>
    );
};

export default UpdatePostModal;
