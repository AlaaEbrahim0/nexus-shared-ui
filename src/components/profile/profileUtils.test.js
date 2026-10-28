import {
    formatMonthYear,
    formatSpecialization,
    formatYearRange,
    getSocialLinks,
    getStats,
    safeHttpUrl,
} from "./profileUtils";

describe("safeHttpUrl", () => {
    it("accepts http and https URLs", () => {
        expect(safeHttpUrl("https://example.com/profile")).toBe(
            "https://example.com/profile"
        );
        expect(safeHttpUrl("http://example.com")).toBe("http://example.com/");
    });

    it("rejects non-http protocols and malformed input", () => {
        expect(safeHttpUrl("javascript:alert(1)")).toBeNull();
        expect(safeHttpUrl("not a url")).toBeNull();
        expect(safeHttpUrl(null)).toBeNull();
        expect(safeHttpUrl("")).toBeNull();
    });
});

describe("social links", () => {
    it("keeps only safe links and preserves labels", () => {
        const links = getSocialLinks({
            websiteUrl: "https://example.com",
            linkedInUrl: "https://linkedin.com/in/doctor",
            twitterUrl: "javascript:alert(1)",
            youTubeUrl: "",
        });

        expect(links.map((link) => link.key)).toEqual([
            "websiteUrl",
            "linkedInUrl",
        ]);
        expect(links[1].label).toBe("LinkedIn");
        expect(links[1].url).toBe("https://linkedin.com/in/doctor");
    });
});

describe("profile formatting", () => {
    it("humanizes specialization enum values", () => {
        expect(formatSpecialization("ClinicalPsychology")).toBe(
            "Clinical Psychology"
        );
        expect(formatSpecialization("")).toBe("Mental health professional");
    });

    it("formats year ranges", () => {
        expect(formatYearRange(2018, 2022)).toBe("2018 – 2022");
        expect(formatYearRange(2022, 2022)).toBe("2022");
        expect(formatYearRange(2022)).toBe("2022 – Present");
        expect(formatYearRange(null, null)).toBe("");
    });

    it("formats a DateOnly month without shifting the day", () => {
        const expected = new Date(2024, 4, 1).toLocaleDateString(undefined, {
            month: "short",
            year: "numeric",
        });
        expect(formatMonthYear("2024-05-01")).toBe(expected);
        expect(formatMonthYear("")).toBe("");
    });
});

describe("getStats", () => {
    it("summarizes profile collections", () => {
        expect(
            getStats({
                certificates: [{ id: 1 }],
                qualifications: [{ id: 1 }, { id: 2 }],
                languages: ["Arabic", "English"],
            })
        ).toEqual([
            { label: "Certificates", value: 1 },
            { label: "Qualifications", value: 2 },
            { label: "Languages", value: 2 },
        ]);
    });

    it("adds the completed appointment count for doctors", () => {
        expect(
            getStats({
                certificates: [],
                qualifications: [],
                languages: [],
                doctor: { completedAppointments: 42 },
            })[0]
        ).toEqual({ label: "Appointments completed", value: 42 });
    });
});
