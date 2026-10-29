import React, { useState, useRef, useEffect } from "react";
import { Reply } from "./Reply";
import { convertUtcToRelativeTime } from "../../utils/utcToRelativeTime";
import { useCreateReply, useDeleteComment, useGetReplies, useUpdateComment } from "../../api/community.api";
import { getApiErrorMessage } from "../../api/client";
import { useModerationStage } from "../../hooks/useModerationStage";
import { isModerationUnavailableError, moderationUnavailableMessage } from "../../utils/moderationState";
import { BiHide, BiShow, BiMessageAltAdd } from "react-icons/bi";
import { CustomDeletionModal } from "./CustomDeletionModal";
import { FaEdit } from "react-icons/fa";
import { RiDeleteBin5Line } from "react-icons/ri";
import { MdOutlineDoneOutline } from "react-icons/md";
import ReactMarkdown from "react-markdown"; // Import ReactMarkdown

import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { getMemberProfilePath } from "../profile/profileUtils";

const imagesDir = process.env.REACT_APP_IMAGE_BASE_URL;

export const Comment = ({
    id,
    content,
    commentedAt,
    authorName,
    authorId,
    postId,
    photoUrl,
    repliesCount: initialRepliesCount,
    handleDeleteComment,
    handleCommentDeletion,
    currentUserId,
}) => {
    const [replyText, setReplyText] = useState("");
    const [showReplyInput, setShowReplyInput] = useState(false);
    const [showReplies, setShowReplies] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [commentText, setCommentText] = useState(content);
    const [tempCommentText, setTempCommentText] = useState(content);
    const [repliesCount, setRepliesCount] = useState(initialRepliesCount);
    const authorPath = getMemberProfilePath(authorId, currentUserId);

    const addReplyRef = useRef(null);

    const { isLoading: commentDeletionLoading, execute: deleteCommentExecute } =
        useDeleteComment();
    const { isLoading: commentUpdateLoading, execute: UpdateCommentExecute } =
        useUpdateComment();
    const {
        isLoading: isRepliesLoading,
        data: repliesData,
        execute: getRepliesExecute,
    } = useGetReplies();
    const {
        isLoading: isCreateLoading,
        error: createReplyError,
        execute: createReplyExecute,
    } = useCreateReply();

    const replyStage = useModerationStage(isCreateLoading);

    useEffect(() => {
        if (createReplyError) {
            const unavailable = isModerationUnavailableError(createReplyError);
            toast.error(
                unavailable
                    ? moderationUnavailableMessage("reply")
                    : getApiErrorMessage(createReplyError, "Could not add your reply. Please try again."),
                {
                    duration: unavailable ? 8000 : 4000,
                    position: "top-center",
                    className: "text-lg text-primary",
                },
            );
        }
    }, [createReplyError]);

    const handleReplyChange = (e) => {
        setReplyText(e.target.value);
    };

    const handleAddReply = async () => {
        try {
            await createReplyExecute(postId, id, replyText);
            setReplyText("");
            setRepliesCount((prevCount) => prevCount + 1);
            await getRepliesExecute(postId, id);
            setShowReplies(true);
            toast.success("Reply has been added successfully", {});
        } catch (e) {
            // Surfaced by the createReplyError effect above; caught here so a
            // rejected reply does not become an unhandled promise rejection.
        }
    };

    const toggleEdit = () => {
        if (isEditing) {
            setTempCommentText(commentText);
        }
        setIsEditing(!isEditing);
    };

    const handleSaveEdit = async () => {
        try {
            await UpdateCommentExecute(postId, id, tempCommentText);
            setCommentText(tempCommentText);
            setIsEditing(false);
        } catch (error) {
            toast.error(getApiErrorMessage(error, "Could not update this comment. Please try again."), {
                duration: 4000,
                position: "top-center",
                className: "text-lg text-primary",
            });
        }
    };

    const handleDelete = async () => {
        await deleteCommentExecute(postId, id);
        await handleDeleteComment();
        handleCommentDeletion();
    };

    const toggleReplies = async () => {
        if (!showReplies) {
            await getRepliesExecute(postId, id);
        }
        setShowReplies(!showReplies);
    };

    const scrollToAddReply = () => {
        setShowReplyInput(true);
        setTimeout(() => {
            const addReplyElement = addReplyRef.current;
            if (addReplyElement) {
                const elementHeight = addReplyElement.clientHeight;
                const windowHeight = window.innerHeight;
                const scrollPosition =
                    addReplyElement.offsetTop -
                    (windowHeight - elementHeight) / 2;

                window.scrollTo({
                    top: scrollPosition,
                    behavior: "smooth",
                });

                addReplyElement.focus();
            }
        }, 100);
    };

    return (
        <motion.article
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mt-3 w-full min-w-0 rounded-xl border border-neutral-200 bg-base-100 p-3.5 text-neutral-800 shadow-sm transition-shadow duration-200 hover:shadow-md sm:p-4"
        >
            <div className="flex min-w-0 items-start gap-3">
                    {authorPath ? (
                        <Link
                            to={authorPath}
                            aria-label={`View ${
                                authorName || "this member"
                            }'s profile`}
                            className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2"
                        >
                            <img
                                className="h-10 w-10 shrink-0 rounded-full border border-neutral-200 object-cover sm:h-11 sm:w-11"
                                src={photoUrl || `${imagesDir}/profile.webp`}
                                alt=""
                            />
                        </Link>
                    ) : (
                        <img
                            className="h-10 w-10 shrink-0 rounded-full border border-neutral-200 object-cover sm:h-11 sm:w-11"
                            src={photoUrl || `${imagesDir}/profile.webp`}
                            alt=""
                        />
                    )}
                    <div className="min-w-0 flex-1 pt-0.5">
                        <h3 className="truncate text-sm font-bold leading-5 text-neutral-900 sm:text-base">
                            {authorPath ? (
                                <Link
                                    to={authorPath}
                                    className="rounded transition hover:text-primary-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700"
                                >
                                    {authorName || "Anonymous"}
                                </Link>
                            ) : (
                                authorName || "Anonymous"
                            )}
                        </h3>
                        <p className="mt-0.5 text-xs font-medium text-neutral-600 sm:text-sm">
                            {convertUtcToRelativeTime(commentedAt)}
                        </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                        {authorId === currentUserId && (
                            <>
                                <button
                                    type="button"
                                    aria-label="Edit comment"
                                    title="Edit comment"
                                    className="grid h-9 w-9 place-items-center rounded-lg text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700"
                                    onClick={toggleEdit}
                                >
                                    {commentUpdateLoading ? (
                                        <span className="loading loading-spinner loading-xs text-primary" />
                                    ) : (
                                        <FaEdit aria-hidden="true" />
                                    )}
                                </button>
                                <button
                                    type="button"
                                    aria-label="Delete comment"
                                    title="Delete comment"
                                    className="grid h-9 w-9 place-items-center rounded-lg text-neutral-600 transition-colors hover:bg-error/10 hover:text-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error"
                                    onClick={() =>
                                        document
                                            .getElementById(
                                                `delete-reply-modal-${id}`
                                            )
                                            .showModal()
                                    }
                                >
                                    <RiDeleteBin5Line aria-hidden="true" />
                                </button>
                            </>
                        )}

                        <CustomDeletionModal
                            id={`delete-reply-modal-${id}`}
                            handleConfirm={handleDelete}
                            loading={commentDeletionLoading}
                        />
                    </div>
                </div>

                <div className="mt-3 min-w-0">
                    {isEditing ? (
                        <div className="space-y-2">
                            <textarea
                                value={tempCommentText}
                                rows={3}
                                onChange={(e) =>
                                    setTempCommentText(e.target.value)
                                }
                                aria-label="Edit comment text"
                                className="textarea textarea-bordered min-h-20 w-full resize-y rounded-xl border-neutral-300 bg-base-100 text-sm leading-6 text-neutral-900 focus:border-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-700/20 sm:text-base"
                                disabled={
                                    commentDeletionLoading ||
                                    commentUpdateLoading
                                }
                            />
                            <div className="flex justify-end gap-2">
                                <button type="button" onClick={toggleEdit} className="btn btn-ghost btn-sm min-h-9 rounded-lg text-neutral-700">Cancel</button>
                                <button type="button" onClick={handleSaveEdit} disabled={commentUpdateLoading || !tempCommentText.trim()} className="btn btn-primary btn-sm min-h-9 rounded-lg">
                                    {commentUpdateLoading ? <span className="loading loading-spinner loading-xs" /> : <MdOutlineDoneOutline aria-hidden="true" />}
                                    Save
                                </button>
                            </div>
                        </div>
                    ) : (
                        <ReactMarkdown
                            allowedElements={[
                                "p",
                                "a",
                                "h1",
                                "h2",
                                "h3",
                                "ul",
                                "li",
                            ]}
                            className="break-words whitespace-pre-line text-sm leading-6 text-neutral-700 sm:text-base sm:leading-7 [&_a]:font-medium [&_a]:text-primary-800 [&_a]:underline [&_h1]:text-lg [&_h1]:font-bold [&_h2]:text-base [&_h2]:font-bold [&_li]:ml-5 [&_li]:list-disc [&_p+p]:mt-2"
                        >
                            {commentText}
                        </ReactMarkdown>
                    )}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-2">
                    <button
                        type="button"
                        className="inline-flex min-h-9 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={toggleReplies}
                        disabled={isRepliesLoading || repliesCount === 0}
                    >
                        {isRepliesLoading ? <span className="loading loading-spinner loading-xs" /> : showReplies ? <BiHide aria-hidden="true" /> : <BiShow aria-hidden="true" />}
                        {showReplies ? "Hide" : "View"} replies
                        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700">{repliesCount || 0}</span>
                    </button>
                    <button
                        type="button"
                        className="inline-flex min-h-9 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-primary-800 transition-colors hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={scrollToAddReply}
                        disabled={isCreateLoading}
                    >
                        <BiMessageAltAdd aria-hidden="true" /> Reply
                    </button>
                </div>
            {showReplies && (
                <div className="mt-4 space-y-2 border-l-2 border-neutral-200 pl-3 sm:pl-4">
                    {repliesData &&
                        repliesData.map((reply) => (
                            <Reply
                                key={`reply-${reply.id}`}
                                id={reply.id}
                                content={reply.content}
                                username={reply.username}
                                authorId={reply.appUserId}
                                repliedAt={reply.repliedAt}
                                commentId={id}
                                postId={postId}
                                handleDeleteReply={async () => {
                                    await getRepliesExecute(postId, id);
                                    setRepliesCount(
                                        (prevCount) => prevCount - 1
                                    );
                                }}
                                image={reply.photoUrl}
                                currentUserId={currentUserId}
                            />
                        ))}
                </div>
            )}

            {showReplyInput && (
                <div className="mt-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                    <textarea
                        ref={addReplyRef}
                        value={replyText}
                        onChange={handleReplyChange}
                        placeholder="Write a reply…"
                        aria-label="Write a reply"
                        rows={2}
                        className="textarea textarea-bordered min-h-16 w-full resize-y rounded-xl border-neutral-300 bg-base-100 text-sm leading-6 text-neutral-900 placeholder:text-neutral-500 focus:border-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-700/20 sm:text-base"
                        disabled={isCreateLoading}
                    />
                    <button
                        type="button"
                        className="btn btn-sm btn-primary mt-2 min-h-10 rounded-lg"
                        onClick={handleAddReply}
                        disabled={isCreateLoading || !replyText.trim()}
                    >
                        {isCreateLoading ? (
                            <span className="loading loading-spinner"></span>
                        ) : (
                            <BiMessageAltAdd aria-hidden="true" />
                        )}
                        {isCreateLoading ? "Checking…" : "Reply"}
                    </button>
                    {replyStage && (
                        <p role="status" aria-live="polite" className="mt-2 text-sm text-neutral-700">
                            <span className="font-semibold">{replyStage.label}</span>
                            {replyStage.detail && <span className="mt-0.5 block text-xs text-neutral-600">{replyStage.detail}</span>}
                        </p>
                    )}
                </div>
            )}
        </motion.article>
    );
};
