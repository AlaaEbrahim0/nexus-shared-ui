const imagesDir = process.env.REACT_APP_IMAGE_BASE_URL || "/images";

export const PROFILE_PHOTO_FALLBACK = `${imagesDir}/profile.webp`;

export const SPECIALIZATIONS = [
    { value: "ClinicalPsychology", label: "Clinical Psychology" },
    { value: "CounselingPsychology", label: "Counseling Psychology" },
    { value: "HealthPsychology", label: "Health Psychology" },
    { value: "NeuroPsychology", label: "Neuro Psychology" },
    { value: "ForensicPsychology", label: "Forensic Psychology" },
    { value: "SchoolPsychology", label: "School Psychology" },
    { value: "SocialPsychology", label: "Social Psychology" },
];

export const SOCIAL_FIELDS = [
    { key: "websiteUrl", label: "Website", shortLabel: "Website" },
    { key: "linkedInUrl", label: "LinkedIn", shortLabel: "LinkedIn" },
    { key: "twitterUrl", label: "X / Twitter", shortLabel: "X" },
    { key: "instagramUrl", label: "Instagram", shortLabel: "Instagram" },
    { key: "facebookUrl", label: "Facebook", shortLabel: "Facebook" },
    { key: "youTubeUrl", label: "YouTube", shortLabel: "YouTube" },
];

/** `ClinicalPsychology` -> `Clinical Psychology`. */
export const humanizeEnum = (value) =>
    String(value || "")
        .replace(/_/g, " ")
        .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
        .trim();

export const formatSpecialization = (value) =>
    humanizeEnum(value) || "Mental health professional";

export const getDisplayName = (profile) => {
    const name = [profile?.firstName, profile?.lastName]
        .filter(Boolean)
        .join(" ")
        .trim();
    return name || "Nexus member";
};

export const getInitials = (profile) => {
    const first = profile?.firstName?.trim()?.[0] || "";
    const last = profile?.lastName?.trim()?.[0] || "";
    return `${first}${last}`.toUpperCase() || "N";
};

export const getProfilePhoto = (profile) =>
    safeHttpUrl(profile?.photoUrl) || PROFILE_PHOTO_FALLBACK;

export const getCoverPhoto = (profile) =>
    safeHttpUrl(profile?.coverPhotoUrl);

/**
 * Only absolute http(s) links are rendered. This prevents a stored
 * `javascript:` URL from becoming a clickable link on a public profile.
 */
export function safeHttpUrl(value) {
    if (!value || typeof value !== "string") return null;
    try {
        const url = new URL(value.trim());
        return url.protocol === "http:" || url.protocol === "https:"
            ? url.href
            : null;
    } catch {
        return null;
    }
}

const dateParts = (value) => {
    const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return null;
    return {
        year: Number(match[1]),
        month: Number(match[2]),
        day: Number(match[3]),
    };
};

const safeLocaleDate = (date, options, fallback) => {
    if (Number.isNaN(date.getTime())) return fallback;
    return date.toLocaleDateString(undefined, options);
};

export const formatMonthYear = (value) => {
    const parts = dateParts(value);
    if (!parts) return "";
    return safeLocaleDate(
        new Date(parts.year, parts.month - 1, 1),
        { month: "short", year: "numeric" },
        String(parts.year)
    );
};

export const formatFullDate = (value) => {
    const parts = dateParts(value);
    if (!parts) return "";
    return safeLocaleDate(
        new Date(parts.year, parts.month - 1, parts.day),
        { day: "numeric", month: "short", year: "numeric" },
        `${parts.day}/${parts.month}/${parts.year}`
    );
};

export const formatYearRange = (startYear, endYear) => {
    const start = startYear ? String(startYear) : "";
    const end = endYear ? String(endYear) : "";
    if (start && end && start === end) return start;
    if (start && end) return `${start} – ${end}`;
    if (start) return `${start} – Present`;
    if (end) return end;
    return "";
};

export const formatFees = (value) => {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return "Not set";
    return `${amount.toLocaleString(undefined, {
        maximumFractionDigits: 2,
    })} EGP`;
};

export const getSocialLinks = (socialLinks) =>
    SOCIAL_FIELDS.map((field) => ({
        ...field,
        url: safeHttpUrl(socialLinks?.[field.key]),
    })).filter((field) => field.url);

export const getPublicProfilePath = (profileId) =>
    `/profiles/${encodeURIComponent(profileId)}`;

/**
 * Where a member's name or photo should link. The signed-in member gets the
 * editable owner view; everyone else gets the public profile page.
 */
export const getMemberProfilePath = (profileId, currentUserId) => {
    if (!profileId) return null;
    return profileId === currentUserId
        ? "/profile"
        : getPublicProfilePath(profileId);
};

export const getStats = (profile) => {
    const stats = [
        {
            label: "Certificates",
            value: profile?.certificates?.length || 0,
        },
        {
            label: "Qualifications",
            value: profile?.qualifications?.length || 0,
        },
        {
            label: "Languages",
            value: profile?.languages?.length || 0,
        },
    ];

    if (profile?.doctor) {
        stats.unshift({
            label: "Appointments completed",
            value: profile.doctor.completedAppointments || 0,
        });
    }

    return stats;
};
