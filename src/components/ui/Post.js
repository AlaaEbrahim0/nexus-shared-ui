import React, { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown"; // Import ReactMarkdown
import { HiOutlineMenu } from "react-icons/hi";
import { BiHide, BiShow, BiMessageAltAdd } from "react-icons/bi";
import { convertUtcToRelativeTime } from "../../utils/utcToRelativeTime";
import { Comment } from "./Comment";
import { deletePostMedia, setPostLike, uploadPostMedia, useCreateComment, useGetComments, useUpdatePost } from "../../api/community.api";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import UpdatePostModal from "./UpdatePostModal"; // Import the UpdatePostModal component
import { CustomDeletionModal } from "./CustomDeletionModal";
import { motion } from "framer-motion";
import { FiShare2 } from "react-icons/fi";
import { getApiErrorMessage } from "../../api/client";
import { getMemberProfilePath } from "../profile/profileUtils";
import { MediaGallery } from "../media/MediaGallery";
import { useModerationStage } from "../../hooks/useModerationStage";
import { isModerationUnavailableError, moderationUnavailableMessage } from "../../utils/moderationState";

const imagesDir = process.env.REACT_APP_IMAGE_BASE_URL;

export const Post = ({
    id,
    authorName,
    authorId,
    title,
    content,
    date,
    image,
    postPhoto,
    media,
    postData,
    groups = [],
    canPostDoctorsOnly = false,
    isOwnPost,
    commentCount: initialCommentCount,
    setData,
    currentUserId,
    handleDelete,
    postDeletionLoading,
    likesCount: initialLikesCount = 0,
    isLikedByCurrentUser: initialLiked = false,
}) => {
    const [commentText, setCommentText] = useState("");
    const [showComments, setShowComments] = useState(false);
    const [commentCount, setCommentCount] = useState(initialCommentCount);
    const [likesCount, setLikesCount] = useState(initialLikesCount);
    const [isLiked, setIsLiked] = useState(initialLiked);
    const [likeLoading, setLikeLoading] = useState(false);
    const [isUpdateModalVisible, setUpdateModalVisible] = useState(false); // Add state to control the visibility of the update modal
    const authorPath = getMemberProfilePath(authorId, currentUserId);

    // Anonymous posts carry no author id, so ownership comes from the API.
    const canManagePost = Boolean(isOwnPost) || (Boolean(authorId) && authorId === currentUserId);

    // Older payloads only have the single photo URL; new ones send a list.
    const attachments = Array.isArray(media) && media.length
        ? media
        : postPhoto
            ? [{ url: postPhoto, type: "image" }]
            : [];
    const firstImage = attachments.find((item) => item.type === "image");

    const {
        isLoading: isUpdatePostLoading,
        execute: updatePostExecute,
    } = useUpdatePost();

    const {
        isLoading: isCommentsLoading,
        data: commentsData,
        execute: getCommentsExecute,
    } = useGetComments();

    const {
        isLoading: isCreateLoading,
        execute: createCommentExecute,
    } = useCreateComment();

    const commentStage = useModerationStage(isCreateLoading);

    const handleCommentChange = (e) => {
        setCommentText(e.target.value);
    };

    const handleAddComment = async () => {
        if (!commentText) {
            return;
        }
        try {
            await createCommentExecute(id, commentText);
            setCommentText("");
            setCommentCount((prevCount) => prevCount + 1);
            await getCommentsExecute(id);
            setShowComments(true);
            toast.success("Comment has been  added successfully", {});
        } catch (e) {
            // A check that never finished is not a judgement on the author, so
            // it must not be reported as the policy message the API would have
            // returned for a real rejection.
            const message = isModerationUnavailableError(e)
                ? moderationUnavailableMessage("comment")
                : getApiErrorMessage(e, "Could not add your comment. Please try again.");
            toast.error(message, {
                duration: isModerationUnavailableError(e) ? 8000 : 4000,
                position: "top-center",
                className: "text-lg text-primary",
            });
        }
    };
    const toggleComments = async () => {
        if (!showComments) {
            await getCommentsExecute(id);
        }
        setShowComments(!showComments);
    };

    const handleSharePost = async () => {
        const url = `${window.location.origin}/forums/${id}`;
        try {
            if (navigator.share) {
                await navigator.share({ title: title || "Community post", text: content, url });
            } else if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(url);
                toast.success("Post link copied to clipboard");
            } else {
                toast.error("Sharing is not available in this browser");
            }
        } catch (error) {
            if (error.name !== "AbortError") toast.error("Could not share this post");
        }
    };

    useEffect(() => {
        setCommentCount(initialCommentCount);
    }, [initialCommentCount]);

    useEffect(() => { setLikesCount(initialLikesCount); setIsLiked(initialLiked); }, [initialLikesCount, initialLiked]);

    const toggleLike = async () => {
        if (likeLoading) return;

        // Optimistic update: flip the UI straight away so the button reacts
        // immediately, then reconcile with the server response. If the request
        // fails we roll back to the previous state.
        const previousLiked = isLiked;
        const previousCount = likesCount;
        const nextLiked = !isLiked;

        setLikeLoading(true);
        setIsLiked(nextLiked);
        setLikesCount((prev) => Math.max(0, prev + (nextLiked ? 1 : -1)));

        try {
            const result = await setPostLike(id, nextLiked);
            const serverCount = result?.likesCount;
            const serverLiked = result?.isLikedByCurrentUser;

            // The API is the source of truth for the counter.
            if (typeof serverCount === "number") setLikesCount(serverCount);
            if (typeof serverLiked === "boolean") setIsLiked(serverLiked);

            // Keep the list in sync so the state survives a re-render or a
            // re-fetch of the feed.
            if (typeof setData === "function") {
                setData((prev) =>
                    (prev || []).map((post) =>
                        post.id === id
                            ? {
                                ...post,
                                likesCount: typeof serverCount === "number" ? serverCount : post.likesCount,
                                isLikedByCurrentUser:
                                    typeof serverLiked === "boolean" ? serverLiked : post.isLikedByCurrentUser,
                            }
                            : post
                    )
                );
            }
        } catch (error) {
            // Roll back the optimistic update.
            setIsLiked(previousLiked);
            setLikesCount(previousCount);
            toast.error(getApiErrorMessage(error, "Could not update your like. Please try again."));
        } finally {
            setLikeLoading(false);
        }
    };

    const handleUpdatePost = async (postId, payload) => {
        if (!payload?.content) {
            return;
        }
        try {
            await updatePostExecute(postId, payload);

            await setData();

            setUpdateModalVisible(false);
        } catch (e) {
            toast.error(getApiErrorMessage(e, "Could not update this post. Please try again."), {
                duration: 4000,
                position: "top-center",
                className: "text-lg text-primary",
            });
            throw e;
        }
    };

    return (
        <motion.article
            animate={{ opacity: 1 }}
            initial={{ opacity: 0 }}
            className="group mb-5 mt-0 flex w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-base-100 text-neutral-800 shadow-sm transition-all duration-200 hover:border-neutral-300 hover:shadow-md"
        >
            <div className="flex items-start justify-between gap-3 p-4 pb-0 sm:p-5 sm:pb-0">
                <div className="flex min-w-0 items-center gap-3">
                    {authorPath ? (
                        <Link
                            to={authorPath}
                            aria-label={`View ${
                                authorName || "this member"
                            }'s profile`}
                            className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2"
                        >
                            <img
                                className="h-11 w-11 shrink-0 rounded-full border border-neutral-200 object-cover ring-2 ring-neutral-50 sm:h-12 sm:w-12"
                                src={image || imagesDir + "/profile.webp"}
                                alt=""
                            />
                        </Link>
                    ) : (
                        <img
                            className="h-11 w-11 shrink-0 rounded-full border border-neutral-200 object-cover ring-2 ring-neutral-50 sm:h-12 sm:w-12"
                            src={image || imagesDir + "/profile.webp"}
                            alt=""
                        />
                    )}
                    <div className="min-w-0">
                        <h2 className="truncate text-sm font-bold text-neutral-900 sm:text-base">
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
                        </h2>
                        <p className="mt-0.5 text-xs font-medium text-neutral-600 sm:text-sm">
                            {convertUtcToRelativeTime(date)}
                        </p>
                    </div>
                </div>

                {canManagePost && (
                    <div className="dropdown dropdown-end">
                        <button type="button" tabIndex={0} aria-label="Post actions" aria-haspopup="menu" className="grid h-10 w-10 place-items-center rounded-xl text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700">
                            <HiOutlineMenu className="text-xl" aria-hidden="true" />
                        </button>
                        <ul
                            tabIndex={0}
                            role="menu"
                            className="dropdown-content z-[1] menu mt-1 w-36 rounded-xl border border-neutral-200 bg-base-100 p-2 shadow-lg"
                        >
                            <>
                                <li className="mb-1">
                                    <button
                                        role="menuitem"
                                        className="justify-start rounded-lg text-sm font-medium text-neutral-700"
                                        onClick={() =>
                                            setUpdateModalVisible(true)
                                        } // Show update modal on click
                                    >
                                        Edit
                                    </button>
                                </li>
                                <li className="mb-1">
                                    <>
                                        <button
                                            role="menuitem"
                                            className="justify-start rounded-lg text-sm font-medium text-error"
                                            onClick={() =>
                                                document
                                                    .getElementById(
                                                        "delete-post-modal-" +
                                                            id
                                                    )
                                                    .showModal()
                                            }
                                            disabled={postDeletionLoading}
                                        >
                                            {postDeletionLoading && (
                                                <span className="loading loading-spinner text-error"></span>
                                            )}
                                            Delete
                                        </button>
                                    </>
                                </li>
                                <CustomDeletionModal
                                    id={"delete-post-modal-" + id}
                                    handleConfirm={async () => handleDelete(id)}
                                    loading={postDeletionLoading}
                                />
                            </>
                            {/* <li>
                                <button className="btn btn-sm btn-error text-md">
                                    Report
                                </button>
                            </li> */}
                        </ul>
                    </div>
                )}
            </div>
            <div className="mt-4 min-w-0 px-4 sm:px-5">
                {title ? (
                    <Link className="inline-block rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700" to={`/forums/${id}`}>
                        <h3 className="break-words text-xl font-bold leading-7 tracking-tight text-neutral-900 transition-colors group-hover:text-primary-900 sm:text-2xl sm:leading-8">
                            {title}
                        </h3>
                    </Link>
                ) : (
                    <Link className="text-sm font-semibold text-primary-800 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700" to={`/forums/${id}`}>
                        View discussion
                    </Link>
                )}
                <ReactMarkdown className="break-words whitespace-pre-line text-sm leading-6 text-neutral-700 sm:text-base sm:leading-7">
                    {content}
                </ReactMarkdown>
            </div>
            {attachments.length > 0 && (
                <MediaGallery media={attachments} className="mx-4 mt-4 sm:mx-5" />
            )}
            {showComments && (
                <div className="mt-4">
                    {commentsData &&
                        commentsData.map((comment) => (
                            <Comment
                                key={"comment-" + comment.id}
                                id={comment.id}
                                content={comment.content}
                                authorName={comment.username || "Anonymous"}
                                commentedAt={comment.commentedAt}
                                authorId={comment.appUserId}
                                postId={id}
                                handleDeleteComment={async () =>
                                    await getCommentsExecute(id)
                                }
                                photoUrl={comment.photoUrl}
                                handleCommentDeletion={() =>
                                    setCommentCount(commentCount - 1)
                                }
                                currentUserId={currentUserId}
                                repliesCount={comment.repliesCount}
                            />
                        ))}
                </div>
            )}

            <div className="mt-5 border-t border-neutral-200 px-4 py-4 sm:px-5">
                <button type="button" onClick={toggleLike} disabled={likeLoading} aria-pressed={isLiked} className="mb-3 inline-flex min-h-9 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-primary-800 hover:bg-primary/10 disabled:opacity-60">
                    {likeLoading ? <span className="loading loading-spinner loading-xs" aria-hidden="true" /> : isLiked ? "♥" : "♡"} {isLiked ? "Liked" : "Like"} <span>{likesCount}</span>
                </button>
                <div className="flex items-end gap-2">
                    <textarea
                        value={commentText}
                        onChange={handleCommentChange}
                        placeholder="Add a thoughtful comment…"
                        aria-label="Write a comment"
                        rows={2}
                        className="textarea textarea-bordered min-h-11 min-w-0 flex-1 resize-y rounded-xl border-neutral-300 bg-base-100 px-3 py-2.5 text-sm leading-5 text-neutral-900 placeholder:text-neutral-500 focus:border-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-700/20"
                        disabled={isCreateLoading}
                    />
                    <button
                        type="button"
                        className="btn btn-primary h-11 min-h-11 shrink-0 rounded-xl px-3 sm:px-4"
                        onClick={handleAddComment}
                        disabled={isCreateLoading || !commentText.trim()}
                        aria-label="Add comment"
                    >
                        {isCreateLoading ? <span className="loading loading-spinner loading-sm" aria-hidden="true" /> : <BiMessageAltAdd className="text-lg" aria-hidden="true" />}
                        <span className="hidden sm:inline">{isCreateLoading ? "Checking…" : "Comment"}</span>
                    </button>
                </div>
                {commentStage && (
                    <p role="status" aria-live="polite" className="mt-2 text-sm text-neutral-700">
                        <span className="font-semibold">{commentStage.label}</span>
                        {commentStage.detail && <span className="mt-0.5 block text-xs text-neutral-600">{commentStage.detail}</span>}
                    </p>
                )}
                <div className="mt-3 flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-3">
                        {commentCount > 0 ? <button
                            type="button"
                            className="inline-flex min-h-9 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700"
                            onClick={toggleComments}
                            disabled={isCommentsLoading}
                        >
                            {isCommentsLoading ? <span className="loading loading-spinner loading-xs" aria-hidden="true" /> : showComments ? <BiHide aria-hidden="true" /> : <BiShow aria-hidden="true" />}
                            {showComments ? "Hide" : "View"} comments <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700">{commentCount}</span>
                        </button> : <span className="px-2 text-xs text-neutral-600">Be the first to comment</span>}
                    </div>
                    <button
                        type="button"
                        className="inline-flex min-h-9 shrink-0 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700"
                        onClick={handleSharePost}
                    >
                        <FiShare2 aria-hidden="true" /> Share
                    </button>
                </div>
            </div>

            <UpdatePostModal
                isVisible={isUpdateModalVisible}
                onClose={() => setUpdateModalVisible(false)}
                onUpdate={handleUpdatePost}
                loading={isUpdatePostLoading}
                groups={groups}
                canPostDoctorsOnly={canPostDoctorsOnly}
                onUploadMedia={uploadPostMedia}
                onDeleteMedia={deletePostMedia}
                initialData={{
                    id,
                    title,
                    content,
                    category: postData?.category,
                    tags: postData?.tags,
                    media: attachments,
                    visibility: postData?.visibility,
                    targetGroupId: postData?.targetGroupId,
                    isAnonymous: postData?.isAnonymous,
                    postPhoto: firstImage?.url,
                }}
            />
        </motion.article>
    );
};
