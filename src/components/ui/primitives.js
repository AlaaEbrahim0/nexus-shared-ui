import {
    forwardRef,
    useEffect,
    useId,
    useRef,
    useState,
} from "react";
import { createPortal } from "react-dom";
import {
    FiAlertCircle,
    FiAlertTriangle,
    FiCheckCircle,
    FiInfo,
    FiX,
} from "react-icons/fi";

/**
 * Shared UI primitives.
 *
 * These components are intentionally small and opinionated: they own the
 * spacing, focus, and colour decisions that were previously repeated across
 * pages. Import them from "components/ui" rather than recreating buttons,
 * fields, cards, or dialogs inside a page.
 */

const buttonVariants = {
    primary:
        "bg-primary-700 text-white shadow-sm hover:bg-primary-800 active:bg-primary-900",
    secondary:
        "bg-neutral-900 text-white shadow-sm hover:bg-neutral-800 active:bg-neutral-950",
    outline:
        "border border-neutral-300 bg-base-100 text-neutral-800 hover:border-neutral-400 hover:bg-neutral-50",
    ghost: "text-primary-800 hover:bg-primary-50 active:bg-primary-100",
    danger: "bg-danger-600 text-white shadow-sm hover:bg-danger-700 active:bg-danger-800",
    success:
        "bg-success-800 text-white shadow-sm hover:bg-success-900 active:bg-success-900",
    link: "h-auto p-0 text-primary-700 underline-offset-4 hover:underline",
};

const buttonSizes = {
    sm: "h-9 px-3 text-sm",
    md: "h-11 px-4 text-sm",
    lg: "h-12 px-5 text-base",
};

const iconButtonSizes = {
    sm: "h-9 w-9 p-0",
    md: "h-11 w-11 p-0",
    lg: "h-12 w-12 p-0",
};

export const Spinner = ({ size = "md", className = "", label }) => {
    const sizeClasses = {
        sm: "h-4 w-4 border-2",
        md: "h-5 w-5 border-2",
        lg: "h-8 w-8 border-[3px]",
        xl: "h-10 w-10 border-4",
    };

    return (
        <span
            role={label ? "status" : undefined}
            aria-label={label}
            aria-hidden={label ? undefined : "true"}
            className={`inline-block shrink-0 animate-spin rounded-full border-current border-t-transparent ${sizeClasses[size] || sizeClasses.md} ${className}`}
        />
    );
};

export const Button = forwardRef(function Button(
    {
        as: Component = "button",
        variant = "primary",
        size = "md",
        loading = false,
        loadingText,
        fullWidth = false,
        iconOnly = false,
        className = "",
        children,
        disabled = false,
        type = "button",
        ...props
    },
    ref
) {
    const isDisabled = disabled || loading;
    const isNativeButton = Component === "button";
    const variantClasses = buttonVariants[variant] || buttonVariants.primary;
    const sizeClasses = iconOnly
        ? iconButtonSizes[size] || iconButtonSizes.md
        : buttonSizes[size] || buttonSizes.md;

    return (
        <Component
            {...props}
            ref={ref}
            {...(isNativeButton
                ? { type, disabled: isDisabled }
                : { "aria-disabled": isDisabled || undefined })}
            aria-busy={loading || undefined}
            className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${sizeClasses} ${variantClasses} ${fullWidth ? "w-full" : ""} ${className}`}
        >
            {loading && <Spinner size="sm" />}
            {loading && loadingText ? <span>{loadingText}</span> : children}
        </Component>
    );
});

export const Field = ({
    id,
    label,
    error,
    hint,
    required = false,
    children,
    className = "",
}) => (
    <div className={`w-full ${className}`}>
        {label && (
            <label
                htmlFor={id}
                className="mb-1.5 block text-sm font-semibold text-neutral-800"
            >
                {label}
                {required && (
                    <span
                        aria-hidden="true"
                        className="ml-1 text-error after:content-['*']"
                    />
                )}
            </label>
        )}
        {children}
        {error ? (
            <p
                id={`${id}-error`}
                role="alert"
                className="mt-1.5 text-sm font-medium text-error"
            >
                {error}
            </p>
        ) : hint ? (
            <p id={`${id}-hint`} className="mt-1.5 text-xs text-neutral-600">
                {hint}
            </p>
        ) : null}
    </div>
);

const controlClasses = (error) =>
    `input input-bordered w-full rounded-xl bg-base-100 text-base text-neutral-900 placeholder:text-neutral-500 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-500 ${
        error
            ? "border-error focus:border-error focus-visible:ring-error"
            : "border-neutral-300 focus:border-primary focus-visible:ring-primary-500"
    }`;

export const Input = forwardRef(function Input(
    { label, error, hint, id, required = false, className = "", ...props },
    ref
) {
    const generatedId = useId();
    const inputId = id || generatedId;
    const messageId = error
        ? `${inputId}-error`
        : hint
          ? `${inputId}-hint`
          : undefined;
    const describedBy =
        [props["aria-describedby"], messageId].filter(Boolean).join(" ") ||
        undefined;

    return (
        <Field
            id={inputId}
            label={label}
            error={error}
            hint={hint}
            required={required}
        >
            <input
                {...props}
                ref={ref}
                id={inputId}
                required={required}
                aria-invalid={error ? "true" : undefined}
                aria-describedby={describedBy}
                className={`${controlClasses(error)} h-12 ${className}`}
            />
        </Field>
    );
});

export const Textarea = forwardRef(function Textarea(
    {
        label,
        error,
        hint,
        id,
        required = false,
        rows = 4,
        className = "",
        ...props
    },
    ref
) {
    const generatedId = useId();
    const textareaId = id || generatedId;
    const messageId = error
        ? `${textareaId}-error`
        : hint
          ? `${textareaId}-hint`
          : undefined;
    const describedBy =
        [props["aria-describedby"], messageId].filter(Boolean).join(" ") ||
        undefined;

    return (
        <Field
            id={textareaId}
            label={label}
            error={error}
            hint={hint}
            required={required}
        >
            <textarea
                {...props}
                ref={ref}
                id={textareaId}
                rows={rows}
                required={required}
                aria-invalid={error ? "true" : undefined}
                aria-describedby={describedBy}
                className={`${controlClasses(error)} min-h-28 py-3 ${className}`}
            />
        </Field>
    );
});

export const Select = forwardRef(function Select(
    {
        label,
        error,
        hint,
        id,
        required = false,
        className = "",
        children,
        ...props
    },
    ref
) {
    const generatedId = useId();
    const selectId = id || generatedId;
    const messageId = error
        ? `${selectId}-error`
        : hint
          ? `${selectId}-hint`
          : undefined;
    const describedBy =
        [props["aria-describedby"], messageId].filter(Boolean).join(" ") ||
        undefined;

    return (
        <Field
            id={selectId}
            label={label}
            error={error}
            hint={hint}
            required={required}
        >
            <select
                {...props}
                ref={ref}
                id={selectId}
                required={required}
                aria-invalid={error ? "true" : undefined}
                aria-describedby={describedBy}
                className={`${controlClasses(error)} h-12 ${className}`}
            >
                {children}
            </select>
        </Field>
    );
});

export const Card = ({
    as: Component = "div",
    padded = true,
    hover = false,
    className = "",
    children,
    ...props
}) => (
    <Component
        {...props}
        className={`rounded-2xl border border-neutral-200 bg-base-100 shadow-card ${
            padded ? "p-4 sm:p-5 lg:p-6" : ""
        } ${
            hover
                ? "transition duration-200 hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-lg"
                : ""
        } ${className}`}
    >
        {children}
    </Component>
);

const badgeVariants = {
    neutral: "border-neutral-200 bg-neutral-100 text-neutral-700",
    primary: "border-primary-200 bg-primary-50 text-primary-800",
    success: "border-success-200 bg-success-50 text-success-800",
    warning: "border-warning-200 bg-warning-50 text-warning-800",
    danger: "border-danger-200 bg-danger-50 text-danger-800",
    error: "border-danger-200 bg-danger-50 text-danger-800",
    info: "border-info-200 bg-info-50 text-info-800",
};

const badgeSizes = {
    sm: "px-2 py-0.5 text-[0.6875rem]",
    md: "px-2.5 py-1 text-xs",
    lg: "px-3 py-1 text-sm",
};

export const Badge = ({
    variant = "neutral",
    size = "md",
    className = "",
    children,
    ...props
}) => (
    <span
        {...props}
        className={`inline-flex items-center gap-1 rounded-full border font-semibold ${
            badgeVariants[variant] || badgeVariants.neutral
        } ${badgeSizes[size] || badgeSizes.md} ${className}`}
    >
        {children}
    </span>
);

const alertVariants = {
    info: {
        classes: "border-info-200 bg-info-50 text-info-900",
        icon: <FiInfo aria-hidden="true" className="h-5 w-5 text-info-700" />,
        role: "status",
    },
    success: {
        classes: "border-success-200 bg-success-50 text-success-900",
        icon: (
            <FiCheckCircle
                aria-hidden="true"
                className="h-5 w-5 text-success-700"
            />
        ),
        role: "status",
    },
    warning: {
        classes: "border-warning-200 bg-warning-50 text-warning-900",
        icon: (
            <FiAlertTriangle
                aria-hidden="true"
                className="h-5 w-5 text-warning-700"
            />
        ),
        role: "status",
    },
    error: {
        classes: "border-error/30 bg-error/5 text-error",
        icon: <FiAlertCircle aria-hidden="true" className="h-5 w-5 text-error" />,
        role: "alert",
    },
};

export const Alert = ({
    variant = "info",
    title,
    action,
    icon,
    className = "",
    children,
    ...props
}) => {
    const config = alertVariants[variant === "danger" ? "error" : variant]
        || alertVariants.info;

    return (
        <div
            {...props}
            role={props.role || config.role}
            className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${config.classes} ${className}`}
        >
            <span className="mt-0.5 shrink-0">{icon || config.icon}</span>
            <div className="min-w-0 flex-1">
                {title && <p className="font-semibold">{title}</p>}
                <div className={title ? "mt-1 leading-6" : "leading-6"}>
                    {children}
                </div>
            </div>
            {action && <div className="shrink-0">{action}</div>}
        </div>
    );
};

const FOCUSABLE_SELECTOR = [
    "a[href]",
    "button:not([disabled])",
    "textarea:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "[tabindex]:not([tabindex='-1'])",
].join(",");

const modalSizes = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "3xl": "max-w-3xl",
    "4xl": "max-w-4xl",
    full: "max-w-full",
};

export const Modal = ({
    isOpen,
    onClose,
    title,
    description,
    children,
    footer,
    size = "md",
    closeOnBackdrop = true,
    initialFocusRef,
    className = "",
    ...props
}) => {
    const dialogRef = useRef(null);
    const previouslyFocusedRef = useRef(null);
    const onCloseRef = useRef(onClose);
    const titleId = useId();
    const descriptionId = useId();

    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    useEffect(() => {
        if (!isOpen) return undefined;

        previouslyFocusedRef.current = document.activeElement;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        const dialog = dialogRef.current;
        const getFocusable = () =>
            Array.from(dialog?.querySelectorAll(FOCUSABLE_SELECTOR) || []);

        const focusTarget = initialFocusRef?.current || getFocusable()[0] || dialog;
        focusTarget?.focus();

        const handleKeyDown = (event) => {
            if (event.key === "Escape") {
                event.preventDefault();
                onCloseRef.current?.();
                return;
            }

            if (event.key !== "Tab") return;

            const focusable = getFocusable();
            if (focusable.length === 0) {
                event.preventDefault();
                dialog?.focus();
                return;
            }

            const first = focusable[0];
            const last = focusable[focusable.length - 1];

            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };

        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = previousOverflow;
            if (typeof previouslyFocusedRef.current?.focus === "function") {
                previouslyFocusedRef.current.focus();
            }
        };
    }, [isOpen, initialFocusRef]);

    if (!isOpen || typeof document === "undefined") return null;

    return createPortal(
        <div
            className="fixed inset-0 z-modal flex items-center justify-center overflow-hidden bg-slate-950/55 p-3 sm:p-6"
            onClick={(event) => {
                if (closeOnBackdrop && event.target === event.currentTarget) {
                    onCloseRef.current?.();
                }
            }}
        >
            <div
                {...props}
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={title ? titleId : undefined}
                aria-describedby={description ? descriptionId : undefined}
                tabIndex={-1}
                className={`flex max-h-[calc(100dvh-1.5rem)] w-full flex-col overflow-hidden ${
                    modalSizes[size] || modalSizes.md
                } rounded-2xl border border-neutral-200 bg-base-100 shadow-2xl outline-none ${className}`}
            >
                {(title || onClose) && (
                    <div className="flex shrink-0 items-start justify-between gap-4 border-b border-neutral-200 px-5 py-4 sm:px-6">
                        <div className="min-w-0">
                            {title && (
                                <h2
                                    id={titleId}
                                    className="text-lg font-bold text-neutral-900"
                                >
                                    {title}
                                </h2>
                            )}
                            {description && (
                                <p
                                    id={descriptionId}
                                    className="mt-1 text-sm leading-6 text-neutral-600"
                                >
                                    {description}
                                </p>
                            )}
                        </div>
                        {onClose && (
                            <button
                                type="button"
                                onClick={onClose}
                                aria-label="Close dialog"
                                className="-mr-1 shrink-0 rounded-lg p-2 text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                            >
                                <FiX aria-hidden="true" className="h-5 w-5" />
                            </button>
                        )}
                    </div>
                )}
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
                    {children}
                </div>
                {footer && (
                    <div className="flex shrink-0 flex-wrap justify-end gap-3 border-t border-neutral-200 bg-base-100 px-5 py-4 sm:px-6">
                        {footer}
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};

export const ConfirmDialog = ({
    isOpen,
    onClose,
    onConfirm,
    onError,
    title = "Confirm action",
    message,
    children,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    variant = "danger",
    loading = false,
    closeOnConfirm = true,
}) => {
    const [isWorking, setIsWorking] = useState(false);
    const busy = loading || isWorking;

    useEffect(() => {
        if (!isOpen) setIsWorking(false);
    }, [isOpen]);

    const handleConfirm = async () => {
        if (busy) return;

        setIsWorking(true);
        try {
            await onConfirm?.();
            if (closeOnConfirm) onClose?.();
        } catch (error) {
            onError?.(error);
        } finally {
            setIsWorking(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={busy ? undefined : onClose}
            title={title}
            size="sm"
            footer={
                <>
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={busy}
                    >
                        {cancelLabel}
                    </Button>
                    <Button
                        variant={variant === "danger" ? "danger" : "primary"}
                        onClick={handleConfirm}
                        loading={busy}
                    >
                        {confirmLabel}
                    </Button>
                </>
            }
        >
            {children || (
                <p className="text-sm leading-6 text-neutral-600">{message}</p>
            )}
        </Modal>
    );
};

export const EmptyState = ({
    icon,
    title,
    description,
    action,
    className = "",
}) => (
    <div
        className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-base-100 px-6 py-12 text-center ${className}`}
    >
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary-50 text-xl text-primary-700">
            {icon || <FiInfo aria-hidden="true" />}
        </div>
        {title && (
            <h3 className="mt-4 text-lg font-bold text-neutral-900">{title}</h3>
        )}
        {description && (
            <p className="mt-1 max-w-md text-sm leading-6 text-neutral-600">
                {description}
            </p>
        )}
        {action && <div className="mt-5">{action}</div>}
    </div>
);

export const ErrorState = ({
    title = "Something went wrong",
    message,
    onRetry,
    retryLabel = "Try again",
    className = "",
}) => (
    <div
        role="alert"
        className={`rounded-2xl border border-error/20 bg-error/5 p-6 text-center ${className}`}
    >
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-error/10 text-error">
            <FiAlertCircle aria-hidden="true" className="h-6 w-6" />
        </div>
        <h2 className="mt-3 text-lg font-bold text-neutral-900">{title}</h2>
        {message && (
            <p className="mt-1 text-sm leading-6 text-neutral-600">{message}</p>
        )}
        {onRetry && (
            <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
                {retryLabel}
            </Button>
        )}
    </div>
);

export const Skeleton = ({ className = "", rounded = "rounded-lg" }) => (
    <div
        aria-hidden="true"
        className={`animate-pulse bg-neutral-200 ${rounded} ${className}`}
    />
);

export const SkeletonText = ({ lines = 3, className = "" }) => (
    <div aria-hidden="true" className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, index) => (
            <div
                key={index}
                className={`animate-pulse rounded bg-neutral-200 h-4 ${
                    index === lines - 1 ? "w-2/3" : "w-full"
                }`}
            />
        ))}
    </div>
);
