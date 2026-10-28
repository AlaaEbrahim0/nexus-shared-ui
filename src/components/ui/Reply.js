import { useState } from "react";
import { CustomDeletionModal } from "./CustomDeletionModal";
import { useDeleteReply, useUpdateReply } from "../../api/community.api";
import { getApiErrorMessage } from "../../api/client";
import { FaEdit } from "react-icons/fa";
import { RiDeleteBin5Line } from "react-icons/ri";
import { MdOutlineDoneOutline } from "react-icons/md";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import ReactMarkdown from "react-markdown"; // Import ReactMarkdown
import { Link } from "react-router-dom";
import { getMemberProfilePath } from "../profile/profileUtils";
import { convertUtcToRelativeTime } from "../../utils/utcToRelativeTime";

const imagesDir = process.env.REACT_APP_IMAGE_BASE_URL;

export const Reply = ({
    id = -1,
    content,
    repliedAt,
    username,
    authorId,
    commentId = -1,
    postId = -1,
    handleDeleteReply,
    image,
    currentUserId,
}) => {
    const [replyText, setReplyText] = useState(content);
    const [isEditing, setIsEditing] = useState(false);
    const [tempReplyText, setTempReplyText] = useState(content);
    const authorPath = getMemberProfilePath(authorId, currentUserId);

    const handleReplyChange = (e) => {
        setTempReplyText(e.target.value);
    };

    const {
        isLoading: replyDeletionLoading,
        execute: deleteReplyExecute,
    } = useDeleteReply();
    const {
        isLoading: replyUpdateLoading,
        execute: UpdateReplyExecute,
    } = useUpdateReply();

    const toggleEdit = () => {
        if (isEditing) {
            setTempReplyText(replyText);
        }
        setIsEditing(!isEditing);
    };

    const handleSaveEdit = async () => {
        try {
            await UpdateReplyExecute(postId, commentId, id, tempReplyText);
            setReplyText(tempReplyText);
            setIsEditing(false);
        } catch (error) {
            toast.error(getApiErrorMessage(error, "Could not update this reply. Please try again."), {
                duration: 4000,
                position: "top-center",
                className: "text-lg text-primary",
            });
        }
    };

    const handleDelete = async () => {
        await deleteReplyExecute(postId, commentId, id);
        
        await handleDeleteReply();
    };

    return (
        <motion.article
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full min-w-0 rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-neutral-800 transition-colors duration-200 hover:bg-base-100 sm:p-4"
        >
            <div className="flex min-w-0 items-start gap-3">
                    {authorPath ? (
                        <Link
                            to={authorPath}
                            aria-label={`View ${
                                username || "this member"
                            }'s profile`}
                            className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2"
                        >
                            <img
                                className="h-9 w-9 shrink-0 rounded-full border border-neutral-200 object-cover sm:h-10 sm:w-10"
                                src={image || imagesDir + "/profile.webp"}
                                alt=""
                            />
                        </Link>
                    ) : (
                        <img
                            className="h-9 w-9 shrink-0 rounded-full border border-neutral-200 object-cover sm:h-10 sm:w-10"
                            src={image || imagesDir + "/profile.webp"}
                            alt=""
                        />
                    )}
                    <div className="min-w-0 flex-1 pt-0.5">
                        <h3 className="truncate text-sm font-semibold leading-5 text-neutral-900 sm:text-base">
                            {authorPath ? (
                                <Link
                                    to={authorPath}
                                    className="rounded transition hover:text-primary-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700"
                                >
                                    {username || "Anonymous"}
                                </Link>
                            ) : (
                                username || "Anonymous"
                            )}
                        </h3>
                        <p className="mt-0.5 text-xs font-medium text-neutral-600 sm:text-sm">
                            {convertUtcToRelativeTime(repliedAt)}
                        </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                        {currentUserId === authorId && (
                            <>
                                {!isEditing && (
                                    <button
                                        type="button"
                                        aria-label="Edit reply"
                                        title="Edit reply"
                                        className="grid h-8 w-8 place-items-center rounded-lg text-neutral-600 transition-colors hover:bg-neutral-200 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 sm:h-9 sm:w-9"
                                        onClick={toggleEdit}
                                    >
                                        {replyUpdateLoading ? (
                                            <span className="loading loading-spinner loading-xs text-primary" />
                                        ) : (
                                            <FaEdit aria-hidden="true" />
                                        )}
                                    </button>
                                )}
                                <button
                                    type="button"
                                    aria-label="Delete reply"
                                    title="Delete reply"
                                    className="grid h-8 w-8 place-items-center rounded-lg text-neutral-600 transition-colors hover:bg-error/10 hover:text-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error sm:h-9 sm:w-9"
                                    onClick={() =>
                                        document
                                            .getElementById(
                                                "delete-reply-modal-" + id
                                            )
                                            .showModal()
                                    }
                                >
                                    {replyDeletionLoading ? (
                                        <span className="loading loading-spinner text-primary"></span>
                                    ) : (
                                        <RiDeleteBin5Line aria-hidden="true" />
                                    )}
                                </button>
                                <CustomDeletionModal
                                    id={"delete-reply-modal-" + id}
                                    handleConfirm={handleDelete}
                                    loading={replyDeletionLoading}
                                />
                            </>
                        )}
                    </div>
                </div>

                <div className="mt-3 min-w-0">
                    {isEditing ? (
                        <div className="space-y-2">
                            <textarea
                                rows={3}
                                value={tempReplyText}
                                onChange={handleReplyChange}
                                aria-label="Edit reply text"
                                className="textarea textarea-bordered min-h-16 w-full resize-y rounded-xl border-neutral-300 bg-base-100 text-sm leading-6 text-neutral-900 focus:border-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-700/20 sm:text-base"
                            />
                            <div className="flex justify-end gap-2">
                                <button type="button" onClick={toggleEdit} className="btn btn-ghost btn-sm min-h-9 rounded-lg text-neutral-700">Cancel</button>
                                <button type="button" onClick={handleSaveEdit} disabled={replyUpdateLoading || !tempReplyText.trim()} className="btn btn-primary btn-sm min-h-9 rounded-lg">
                                    {replyUpdateLoading ? <span className="loading loading-spinner loading-xs" /> : <MdOutlineDoneOutline aria-hidden="true" />}
                                    Save
                                </button>
                            </div>
                        </div>
                    ) : (
                        <ReactMarkdown className="break-words whitespace-pre-line text-sm leading-6 text-neutral-700 sm:text-base sm:leading-7 [&_a]:font-medium [&_a]:text-primary-800 [&_a]:underline [&_li]:ml-5 [&_li]:list-disc [&_p+p]:mt-2">
                            {replyText}
                        </ReactMarkdown>
                    )}
                </div>
        </motion.article>
    );
};
