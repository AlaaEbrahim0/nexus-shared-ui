import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
    FiAward,
    FiBookOpen,
    FiBriefcase,
    FiCheck,
    FiChevronRight,
    FiCopy,
    FiEdit2,
    FiExternalLink,
    FiFacebook,
    FiGlobe,
    FiInstagram,
    FiLinkedin,
    FiMail,
    FiMapPin,
    FiPhone,
    FiPlus,
    FiShare2,
    FiTrash2,
    FiTwitter,
    FiYoutube,
} from "react-icons/fi";
import { Badge, Button, Card, EmptyState } from "../ui/primitives";
import {
    formatFees,
    formatMonthYear,
    formatSpecialization,
    formatYearRange,
    getCoverPhoto,
    getDisplayName,
    getProfilePhoto,
    getPublicProfilePath,
    getSocialLinks,
    getStats,
    PROFILE_PHOTO_FALLBACK,
    safeHttpUrl,
} from "./profileUtils";

const socialIcons = {
    websiteUrl: FiGlobe,
    linkedInUrl: FiLinkedin,
    twitterUrl: FiTwitter,
    instagramUrl: FiInstagram,
    facebookUrl: FiFacebook,
    youTubeUrl: FiYoutube,
};

const copyToClipboard = async (text) => {
    if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
};

const ShareProfileButton = ({ profileId }) => {
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!copied) return undefined;
        const timer = window.setTimeout(() => setCopied(false), 2200);
        return () => window.clearTimeout(timer);
    }, [copied]);

    const handleCopy = async () => {
        const url = `${window.location.origin}${getPublicProfilePath(profileId)}`;
        try {
            await copyToClipboard(url);
            setCopied(true);
        } catch {
            setCopied(false);
        }
    };

    return (
        <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            aria-label="Copy link to this public profile"
            className="bg-base-100/95 backdrop-blur"
        >
            {copied ? (
                <>
                    <FiCheck aria-hidden="true" /> Copied
                </>
            ) : (
                <>
                    <FiShare2 aria-hidden="true" /> Share
                </>
            )}
        </Button>
    );
};

const Section = ({ icon, title, count, action, children, className = "" }) => (
    <Card className={className}>
        <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary-800">
                    {icon}
                </span>
                <h2 className="truncate text-lg font-bold text-neutral-900">
                    {title}
                </h2>
                {count > 0 && (
                    <Badge variant="neutral" size="sm">
                        {count}
                    </Badge>
                )}
            </div>
            {action}
        </div>
        <div className="mt-5">{children}</div>
    </Card>
);

const OwnerActions = ({ label, onEdit, onDelete }) => {
    if (!onEdit && !onDelete) return null;

    return (
        <div className="flex shrink-0 items-center gap-1">
            {onEdit && (
                <Button
                    variant="ghost"
                    size="sm"
                    iconOnly
                    onClick={onEdit}
                    aria-label={`Edit ${label}`}
                >
                    <FiEdit2 aria-hidden="true" />
                </Button>
            )}
            {onDelete && (
                <Button
                    variant="ghost"
                    size="sm"
                    iconOnly
                    onClick={onDelete}
                    aria-label={`Delete ${label}`}
                    className="text-danger-700 hover:bg-danger-50 hover:text-danger-800"
                >
                    <FiTrash2 aria-hidden="true" />
                </Button>
            )}
        </div>
    );
};

const CompactEmpty = ({ message, actionLabel, onAction }) => (
    <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50/70 px-4 py-6 text-center">
        <p className="text-sm text-neutral-600">{message}</p>
        {onAction && (
            <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={onAction}
            >
                <FiPlus aria-hidden="true" /> {actionLabel}
            </Button>
        )}
    </div>
);

const CertificateCard = ({ certificate, isOwner, onEdit, onDelete }) => {
    const imageUrl = safeHttpUrl(certificate.imageUrl);
    const credentialUrl = safeHttpUrl(certificate.credentialUrl);
    const issued = formatMonthYear(certificate.issueDate);
    const expires = formatMonthYear(certificate.expiryDate);

    return (
        <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-base-100 transition-shadow hover:shadow-md">
            {imageUrl ? (
                <img
                    src={imageUrl}
                    alt={`${certificate.title} certificate`}
                    className="h-36 w-full object-cover"
                    loading="lazy"
                />
            ) : (
                <div className="flex h-24 items-center justify-center bg-gradient-to-br from-primary/15 via-base-100 to-base-200">
                    <FiAward
                        aria-hidden="true"
                        className="h-9 w-9 text-primary-700"
                    />
                </div>
            )}

            <div className="flex flex-1 flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <h3 className="font-bold leading-snug text-neutral-900">
                            {certificate.title}
                        </h3>
                        <p className="mt-1 text-sm font-medium text-neutral-600">
                            {certificate.issuingOrganization}
                        </p>
                    </div>
                    <OwnerActions
                        label={`certificate ${certificate.title}`}
                        onEdit={isOwner && onEdit ? () => onEdit(certificate) : null}
                        onDelete={
                            isOwner && onDelete
                                ? () => onDelete(certificate)
                                : null
                        }
                    />
                </div>

                <p className="mt-2 text-xs font-medium text-neutral-500">
                    Issued {issued || "—"}
                    {expires ? ` · Expires ${expires}` : ""}
                </p>

                {certificate.isExpired && (
                    <Badge variant="warning" size="sm" className="mt-2 w-fit">
                        Expired
                    </Badge>
                )}

                {certificate.description && (
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-neutral-600">
                        {certificate.description}
                    </p>
                )}

                {(credentialUrl || certificate.credentialId) && (
                    <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-4 text-xs">
                        {credentialUrl && (
                            <a
                                href={credentialUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 font-semibold text-primary-800 hover:underline"
                            >
                                View credential{" "}
                                <FiExternalLink aria-hidden="true" />
                            </a>
                        )}
                        {certificate.credentialId && (
                            <span className="text-neutral-500">
                                ID: {certificate.credentialId}
                            </span>
                        )}
                    </div>
                )}
            </div>
        </article>
    );
};

const QualificationItem = ({
    qualification,
    isLast,
    isOwner,
    onEdit,
    onDelete,
}) => {
    const years = formatYearRange(
        qualification.startYear,
        qualification.endYear
    );

    return (
        <li className="relative flex gap-4">
            {!isLast && (
                <span
                    aria-hidden="true"
                    className="absolute left-[19px] top-10 h-[calc(100%-1rem)] w-px bg-neutral-200"
                />
            )}
            <span className="relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-primary-100 bg-primary-50 text-primary-800">
                <FiBookOpen aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1 pb-5">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <h3 className="font-bold leading-snug text-neutral-900">
                            {qualification.degree}
                        </h3>
                        <p className="mt-0.5 text-sm font-medium text-neutral-700">
                            {qualification.institution}
                        </p>
                        {(qualification.fieldOfStudy || years) && (
                            <p className="mt-1 text-xs font-medium text-neutral-500">
                                {[qualification.fieldOfStudy, years]
                                    .filter(Boolean)
                                    .join(" · ")}
                            </p>
                        )}
                    </div>
                    <OwnerActions
                        label={`qualification ${qualification.degree}`}
                        onEdit={
                            isOwner && onEdit
                                ? () => onEdit(qualification)
                                : null
                        }
                        onDelete={
                            isOwner && onDelete
                                ? () => onDelete(qualification)
                                : null
                        }
                    />
                </div>
                {qualification.description && (
                    <p className="mt-2 text-sm leading-6 text-neutral-600">
                        {qualification.description}
                    </p>
                )}
            </div>
        </li>
    );
};

const DetailRow = ({ icon, label, children }) => (
    <div className="flex gap-3 py-2.5">
        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-neutral-100 text-neutral-600">
            {icon}
        </span>
        <div className="min-w-0">
            <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-500">
                {label}
            </dt>
            <dd className="mt-0.5 break-words text-sm font-medium text-neutral-800">
                {children}
            </dd>
        </div>
    </div>
);

/**
 * Presentational profile used by both the owner's `/profile` page and the
 * public `/profiles/:id` page. Owner-only controls are enabled with props.
 */
export function ProfileView({
    profile,
    isOwner = false,
    onEdit,
    onAddCertificate,
    onEditCertificate,
    onDeleteCertificate,
    onAddQualification,
    onEditQualification,
    onDeleteQualification,
    primaryAction = null,
    showPublicViewLink = true,
    className = "",
}) {
    if (!profile) return null;

    const isDoctor = Boolean(profile.doctor) || profile.role === "Doctor";
    const displayName = getDisplayName(profile);
    const name = isDoctor && !/^dr\.?\s/i.test(displayName)
        ? `Dr. ${displayName}`
        : displayName;
    const photo = getProfilePhoto(profile);
    const cover = getCoverPhoto(profile);
    const socialLinks = getSocialLinks(profile.socialLinks);
    const stats = getStats(profile);
    const languages = profile.languages || [];
    const interests = profile.interests || [];
    const certificates = profile.certificates || [];
    const qualifications = profile.qualifications || [];
    const doctor = profile.doctor;
    const legacyQualifications = doctor?.qualifications?.trim();
    const contact = profile.contact || {};
    const contactEmail = contact.email?.trim();
    const contactPhone = contact.phone?.trim();
    const contactAddress = contact.address?.trim();
    const hasContact = Boolean(contactEmail || contactPhone || contactAddress);

    const handlePhotoError = (event) => {
        event.currentTarget.onerror = null;
        event.currentTarget.src = PROFILE_PHOTO_FALLBACK;
    };

    return (
        <div className={`space-y-6 ${className}`}>
            {isOwner && !profile.isProfilePublic && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-900">
                    <p>
                        <span className="font-bold">Your profile is private.</span>{" "}
                        Only you can open this page. Turn on public visibility
                        to share it publicly.
                    </p>
                    {onEdit && (
                        <Button variant="outline" size="sm" onClick={onEdit}>
                            Change visibility
                        </Button>
                    )}
                </div>
            )}

            <section
                className="overflow-hidden rounded-3xl border border-neutral-200 bg-base-100 shadow-card"
                aria-label={`${name}'s profile`}
            >
                <div className="relative h-40 bg-gradient-to-br from-primary-900 via-primary-700 to-primary-500 sm:h-52 lg:h-60">
                    {cover && (
                        <img
                            src={cover}
                            alt=""
                            className="absolute inset-0 h-full w-full object-cover"
                        />
                    )}
                    {cover && (
                        <div
                            aria-hidden="true"
                            className="absolute inset-0 bg-gradient-to-t from-slate-950/65 via-slate-950/10 to-transparent"
                        />
                    )}
                    <div
                        aria-hidden="true"
                        className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(255,255,255,0.22),transparent_35%),radial-gradient(circle_at_85%_10%,rgba(255,255,255,0.12),transparent_30%)]"
                    />
                    <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
                        <ShareProfileButton profileId={profile.id} />
                    </div>
                </div>

                <div className="relative px-4 pb-5 sm:px-6 lg:px-8">
                    <div className="-mt-14 flex flex-col gap-4 sm:-mt-16 sm:flex-row sm:items-end sm:justify-between">
                        <div className="flex items-end gap-4">
                            <img
                                src={photo}
                                alt={name}
                                onError={handlePhotoError}
                                className="h-28 w-28 shrink-0 rounded-full border-4 border-white bg-neutral-100 object-cover shadow-lg sm:h-36 sm:w-36"
                            />
                            <div className="pb-1 sm:hidden">
                                <Badge variant={isDoctor ? "primary" : "info"}>
                                    {isDoctor ? "Doctor" : profile.role || "Member"}
                                </Badge>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pb-1 sm:justify-end">
                            {primaryAction}
                            {isOwner && (
                                <>
                                    <Button
                                        as={Link}
                                        to="/profile/edit"
                                        size="sm"
                                    >
                                        <FiEdit2 aria-hidden="true" /> Edit
                                        profile
                                    </Button>
                                    {showPublicViewLink && (
                                        <Button
                                            as={Link}
                                            to={getPublicProfilePath(profile.id)}
                                            variant="outline"
                                            size="sm"
                                        >
                                            View public profile{" "}
                                            <FiChevronRight aria-hidden="true" />
                                        </Button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    <div className="mt-4">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                            <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900 sm:text-3xl">
                                {name}
                            </h1>
                            {profile.pronouns && (
                                <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-600">
                                    {profile.pronouns}
                                </span>
                            )}
                            <span className="hidden sm:inline-flex">
                                <Badge variant={isDoctor ? "primary" : "info"}>
                                    {isDoctor ? "Doctor" : profile.role || "Member"}
                                </Badge>
                            </span>
                            {isDoctor && doctor?.isAvailable && (
                                <Badge variant="success" size="sm">
                                    <span
                                        aria-hidden="true"
                                        className="h-1.5 w-1.5 rounded-full bg-success-700"
                                    />
                                    Available for appointments
                                </Badge>
                            )}
                        </div>

                        {profile.headline && (
                            <p className="mt-2 max-w-3xl text-base leading-7 text-neutral-700 sm:text-lg">
                                {profile.headline}
                            </p>
                        )}

                        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-neutral-600">
                            {isDoctor && doctor?.specialization && (
                                <span className="inline-flex items-center gap-1.5">
                                    <FiBriefcase
                                        aria-hidden="true"
                                        className="text-primary-700"
                                    />
                                    {formatSpecialization(
                                        doctor.specialization
                                    )}
                                    {doctor.professionalTitle
                                        ? ` · ${doctor.professionalTitle}`
                                        : ""}
                                </span>
                            )}
                            {profile.city && (
                                <span className="inline-flex items-center gap-1.5">
                                    <FiMapPin
                                        aria-hidden="true"
                                        className="text-primary-700"
                                    />
                                    {profile.city}
                                </span>
                            )}
                            {doctor?.clinicName && (
                                <span className="inline-flex items-center gap-1.5">
                                    <FiBriefcase
                                        aria-hidden="true"
                                        className="text-primary-700"
                                    />
                                    {doctor.clinicName}
                                </span>
                            )}
                        </div>
                    </div>

                    <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-neutral-200 pt-5 sm:grid-cols-4">
                        {stats.map((stat) => (
                            <div key={stat.label}>
                                <dd className="text-xl font-extrabold text-neutral-900 sm:text-2xl">
                                    {stat.value}
                                </dd>
                                <dt className="mt-0.5 text-xs font-medium text-neutral-500">
                                    {stat.label}
                                </dt>
                            </div>
                        ))}
                    </dl>
                </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
                <div className="space-y-6">
                    {(profile.biography ||
                        interests.length > 0 ||
                        isOwner) && (
                        <Section
                            icon={<FiGlobe aria-hidden="true" />}
                            title="About"
                        >
                            {profile.biography ? (
                                <p className="whitespace-pre-line text-sm leading-7 text-neutral-700">
                                    {profile.biography}
                                </p>
                            ) : isOwner ? (
                                <CompactEmpty
                                    message="Tell patients who you are, how you work, and what they can expect from a session."
                                    actionLabel="Add a bio"
                                    onAction={onEdit}
                                />
                            ) : (
                                <p className="text-sm text-neutral-600">
                                    This member has not added a biography yet.
                                </p>
                            )}

                            {interests.length > 0 && (
                                <div className="mt-5 border-t border-neutral-200 pt-4">
                                    <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-neutral-500">
                                        Interests
                                    </h3>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {interests.map((interest) => (
                                            <Badge
                                                key={interest}
                                                variant="neutral"
                                            >
                                                {interest}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </Section>
                    )}

                    {(certificates.length > 0 || isOwner) && (
                        <Section
                            icon={<FiAward aria-hidden="true" />}
                            title="Certificates"
                            count={certificates.length}
                            action={
                                isOwner && onAddCertificate ? (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={onAddCertificate}
                                    >
                                        <FiPlus aria-hidden="true" /> Add
                                        certificate
                                    </Button>
                                ) : null
                            }
                        >
                            {certificates.length > 0 ? (
                                <div className="grid gap-4 sm:grid-cols-2">
                                    {certificates.map((certificate) => (
                                        <CertificateCard
                                            key={certificate.id}
                                            certificate={certificate}
                                            isOwner={isOwner}
                                            onEdit={onEditCertificate}
                                            onDelete={onDeleteCertificate}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <CompactEmpty
                                    message="Add licenses, board certifications, and professional training to build trust."
                                    actionLabel="Add your first certificate"
                                    onAction={onAddCertificate}
                                />
                            )}
                        </Section>
                    )}

                    {(qualifications.length > 0 ||
                        legacyQualifications ||
                        isOwner) && (
                        <Section
                            icon={<FiBookOpen aria-hidden="true" />}
                            title="Education & qualifications"
                            count={qualifications.length}
                            action={
                                isOwner && onAddQualification ? (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={onAddQualification}
                                    >
                                        <FiPlus aria-hidden="true" /> Add
                                        qualification
                                    </Button>
                                ) : null
                            }
                        >
                            {qualifications.length > 0 ? (
                                <ol className="space-y-0">
                                    {qualifications.map(
                                        (qualification, index) => (
                                            <QualificationItem
                                                key={qualification.id}
                                                qualification={qualification}
                                                isLast={
                                                    index ===
                                                    qualifications.length - 1
                                                }
                                                isOwner={isOwner}
                                                onEdit={onEditQualification}
                                                onDelete={onDeleteQualification}
                                            />
                                        )
                                    )}
                                </ol>
                            ) : legacyQualifications ? null : (
                                <EmptyState
                                    icon={<FiBookOpen aria-hidden="true" />}
                                    title="No qualifications yet"
                                    description="Degrees, residencies, and specialist training appear here."
                                    action={
                                        onAddQualification ? (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={onAddQualification}
                                            >
                                                <FiPlus aria-hidden="true" />{" "}
                                                Add qualification
                                            </Button>
                                        ) : null
                                    }
                                />
                            )}
                            {legacyQualifications && (
                                <div
                                    className={
                                        qualifications.length > 0
                                            ? "mt-4 border-t border-neutral-200 pt-4"
                                            : ""
                                    }
                                >
                                    <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-neutral-500">
                                        Professional qualifications
                                    </h3>
                                    <p className="mt-2 whitespace-pre-line text-sm leading-7 text-neutral-700">
                                        {legacyQualifications}
                                    </p>
                                </div>
                            )}
                        </Section>
                    )}

                    {!isOwner &&
                        !profile.biography &&
                        interests.length === 0 &&
                        certificates.length === 0 &&
                        qualifications.length === 0 &&
                        !legacyQualifications && (
                            <Card>
                                <EmptyState
                                    icon={<FiGlobe aria-hidden="true" />}
                                    title="Profile in progress"
                                    description={`${name} has not added detailed profile information yet.`}
                                />
                            </Card>
                        )}
                </div>

                <aside className="space-y-6">
                    {isDoctor && doctor && (
                        <Card>
                            <h2 className="flex items-center gap-2 text-lg font-bold text-neutral-900">
                                <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-50 text-primary-800">
                                    <FiBriefcase aria-hidden="true" />
                                </span>
                                Practice
                            </h2>
                            <dl className="mt-3 divide-y divide-neutral-100">
                                <DetailRow
                                    icon={<FiBriefcase aria-hidden="true" />}
                                    label="Specialization"
                                >
                                    {formatSpecialization(
                                        doctor.specialization
                                    )}
                                </DetailRow>
                                {doctor.professionalTitle && (
                                    <DetailRow
                                        icon={<FiAward aria-hidden="true" />}
                                        label="Professional title"
                                    >
                                        {doctor.professionalTitle}
                                    </DetailRow>
                                )}
                                {doctor.clinicName && (
                                    <DetailRow
                                        icon={<FiMapPin aria-hidden="true" />}
                                        label="Clinic"
                                    >
                                        {doctor.clinicName}
                                    </DetailRow>
                                )}
                                {doctor.location && (
                                    <DetailRow
                                        icon={<FiMapPin aria-hidden="true" />}
                                        label="Location"
                                    >
                                        {doctor.location}
                                    </DetailRow>
                                )}
                                {doctor.yearsOfExperience != null && (
                                    <DetailRow
                                        icon={<FiAward aria-hidden="true" />}
                                        label="Experience"
                                    >
                                        {doctor.yearsOfExperience}{" "}
                                        {doctor.yearsOfExperience === 1
                                            ? "year"
                                            : "years"}
                                    </DetailRow>
                                )}
                                <DetailRow
                                    icon={<FiAward aria-hidden="true" />}
                                    label="Session fee"
                                >
                                    {formatFees(doctor.sessionFees)}
                                </DetailRow>
                                <DetailRow
                                    icon={<FiCheck aria-hidden="true" />}
                                    label="Availability"
                                >
                                    {doctor.isAvailable
                                        ? "Accepting new appointments"
                                        : "Not accepting new appointments"}
                                </DetailRow>
                            </dl>
                            {isOwner && onEdit && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    fullWidth
                                    className="mt-3"
                                    onClick={onEdit}
                                >
                                    <FiEdit2 aria-hidden="true" /> Edit practice
                                    details
                                </Button>
                            )}
                        </Card>
                    )}

                    <Card>
                        <h2 className="flex items-center gap-2 text-lg font-bold text-neutral-900">
                            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-50 text-primary-800">
                                <FiGlobe aria-hidden="true" />
                            </span>
                            Details
                        </h2>
                        <dl className="mt-3 divide-y divide-neutral-100">
                            <DetailRow
                                icon={<FiGlobe aria-hidden="true" />}
                                label="Languages"
                            >
                                {languages.length ? (
                                    <span className="flex flex-wrap gap-1.5">
                                        {languages.map((language) => (
                                            <Badge
                                                key={language}
                                                variant="neutral"
                                                size="sm"
                                            >
                                                {language}
                                            </Badge>
                                        ))}
                                    </span>
                                ) : (
                                    <span className="text-neutral-500">
                                        Not specified
                                    </span>
                                )}
                            </DetailRow>
                            {profile.pronouns && (
                                <DetailRow
                                    icon={<FiGlobe aria-hidden="true" />}
                                    label="Pronouns"
                                >
                                    {profile.pronouns}
                                </DetailRow>
                            )}
                            {profile.city && (
                                <DetailRow
                                    icon={<FiMapPin aria-hidden="true" />}
                                    label="City"
                                >
                                    {profile.city}
                                </DetailRow>
                            )}
                            {isOwner && (
                                <DetailRow
                                    icon={<FiCheck aria-hidden="true" />}
                                    label="Visibility"
                                >
                                    {profile.isProfilePublic
                                        ? "Public profile"
                                        : "Private profile"}
                                </DetailRow>
                            )}
                        </dl>
                        {isOwner && onEdit && (
                            <Button
                                variant="outline"
                                size="sm"
                                fullWidth
                                className="mt-3"
                                onClick={onEdit}
                            >
                                <FiEdit2 aria-hidden="true" /> Edit details
                            </Button>
                        )}
                    </Card>

                    {(hasContact || isOwner) && (
                        <Card>
                            <h2 className="flex items-center gap-2 text-lg font-bold text-neutral-900">
                                <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-50 text-primary-800">
                                    <FiMail aria-hidden="true" />
                                </span>
                                Contact
                            </h2>
                            {hasContact ? (
                                <dl className="mt-3 divide-y divide-neutral-100">
                                    {contactEmail && (
                                        <DetailRow
                                            icon={<FiMail aria-hidden="true" />}
                                            label="Email"
                                        >
                                            <a
                                                href={`mailto:${contactEmail}`}
                                                className="break-all text-primary-800 hover:underline"
                                            >
                                                {contactEmail}
                                            </a>
                                        </DetailRow>
                                    )}
                                    {contactPhone && (
                                        <DetailRow
                                            icon={<FiPhone aria-hidden="true" />}
                                            label="Phone"
                                        >
                                            <a
                                                href={`tel:${contactPhone.replace(
                                                    /[^\d+]/g,
                                                    ""
                                                )}`}
                                                className="text-primary-800 hover:underline"
                                            >
                                                {contactPhone}
                                            </a>
                                        </DetailRow>
                                    )}
                                    {contactAddress && (
                                        <DetailRow
                                            icon={<FiMapPin aria-hidden="true" />}
                                            label="Address"
                                        >
                                            <span className="whitespace-pre-line">
                                                {contactAddress}
                                            </span>
                                        </DetailRow>
                                    )}
                                </dl>
                            ) : (
                                <div className="mt-3">
                                    <CompactEmpty
                                        message="Add a public email, phone number, or practice address so people can reach you."
                                        actionLabel="Add contact info"
                                        onAction={onEdit}
                                    />
                                </div>
                            )}
                            {isOwner && onEdit && hasContact && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    fullWidth
                                    className="mt-3"
                                    onClick={onEdit}
                                >
                                    <FiEdit2 aria-hidden="true" /> Edit contact
                                    info
                                </Button>
                            )}
                        </Card>
                    )}

                    {(socialLinks.length > 0 || isOwner) && (
                        <Card>
                            <h2 className="flex items-center gap-2 text-lg font-bold text-neutral-900">
                                <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-50 text-primary-800">
                                    <FiShare2 aria-hidden="true" />
                                </span>
                                Connect
                            </h2>
                            {socialLinks.length > 0 ? (
                                <ul className="mt-3 space-y-1">
                                    {socialLinks.map((link) => {
                                        const Icon =
                                            socialIcons[link.key] || FiGlobe;
                                        return (
                                            <li key={link.key}>
                                                <a
                                                    href={link.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex min-h-11 items-center gap-3 rounded-xl px-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
                                                >
                                                    <Icon
                                                        aria-hidden="true"
                                                        className="shrink-0 text-lg text-primary-800"
                                                    />
                                                    <span className="min-w-0 flex-1 truncate">
                                                        {link.label}
                                                    </span>
                                                    <FiExternalLink
                                                        aria-hidden="true"
                                                        className="shrink-0 text-neutral-400"
                                                    />
                                                </a>
                                            </li>
                                        );
                                    })}
                                </ul>
                            ) : (
                                <div className="mt-3">
                                    <CompactEmpty
                                        message="Add the places people can find your professional work."
                                        actionLabel="Add social links"
                                        onAction={onEdit}
                                    />
                                </div>
                            )}
                        </Card>
                    )}

                    {isOwner && (
                        <Card className="bg-neutral-50">
                            <h2 className="flex items-center gap-2 text-sm font-bold text-neutral-900">
                                <FiCopy aria-hidden="true" /> Your public link
                            </h2>
                            <p className="mt-1 break-all text-xs text-neutral-600">
                                {`${window.location.origin}${getPublicProfilePath(
                                    profile.id
                                )}`}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <Button
                                    as={Link}
                                    to={getPublicProfilePath(profile.id)}
                                    variant="outline"
                                    size="sm"
                                >
                                    Open public view
                                </Button>
                                <ShareProfileButton profileId={profile.id} />
                            </div>
                        </Card>
                    )}
                </aside>
            </div>
        </div>
    );
}

export { ShareProfileButton };
