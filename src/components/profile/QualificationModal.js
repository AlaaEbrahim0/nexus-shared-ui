import { useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { Alert, Button, Input, Modal, Textarea } from "../ui/primitives";
import { getApiErrorMessage } from "../../api/client";

const currentYear = new Date().getFullYear();

const yearRule = (label) =>
    Yup.number()
        .transform((value, originalValue) =>
            String(originalValue).trim() === "" ? null : value
        )
        .nullable()
        .typeError(`${label} must be a number`)
        .integer(`${label} must be a whole year`)
        .min(1950, `${label} must be 1950 or later`)
        .max(2100, `${label} must be 2100 or earlier`);

const validationSchema = Yup.object({
    degree: Yup.string()
        .trim()
        .required("Degree is required")
        .max(160, "Degree must be 160 characters or fewer"),
    institution: Yup.string()
        .trim()
        .required("Institution is required")
        .max(200, "Institution must be 200 characters or fewer"),
    fieldOfStudy: Yup.string().max(
        160,
        "Field of study must be 160 characters or fewer"
    ),
    startYear: yearRule("Start year"),
    endYear: yearRule("End year").test(
        "end-after-start",
        "End year cannot be before the start year",
        function validateEndYear(value) {
            return (
                value == null ||
                this.parent.startYear == null ||
                Number(value) >= Number(this.parent.startYear)
            );
        }
    ),
    description: Yup.string().max(
        1000,
        "Description must be 1000 characters or fewer"
    ),
});

const initialValuesFor = (qualification) => ({
    degree: qualification?.degree || "",
    institution: qualification?.institution || "",
    fieldOfStudy: qualification?.fieldOfStudy || "",
    startYear: qualification?.startYear ?? "",
    endYear: qualification?.endYear ?? "",
    description: qualification?.description || "",
});

const QualificationForm = ({ qualification, onClose, onSubmit }) => {
    const [submitError, setSubmitError] = useState("");

    const formik = useFormik({
        initialValues: initialValuesFor(qualification),
        validationSchema,
        onSubmit: async (values, helpers) => {
            setSubmitError("");
            try {
                await onSubmit(values);
                helpers.setSubmitting(false);
                onClose();
            } catch (error) {
                setSubmitError(
                    getApiErrorMessage(
                        error,
                        "The qualification could not be saved. Please try again."
                    )
                );
                helpers.setSubmitting(false);
            }
        },
    });

    return (
        <form
            id="qualification-form"
            onSubmit={formik.handleSubmit}
            className="space-y-5"
            noValidate
        >
            {submitError && (
                <Alert variant="error" title="Could not save qualification">
                    {submitError}
                </Alert>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                    <Input
                        label="Degree"
                        name="degree"
                        value={formik.values.degree}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        error={formik.touched.degree && formik.errors.degree}
                        placeholder="MSc in Clinical Psychology"
                        required
                    />
                </div>
                <div className="sm:col-span-2">
                    <Input
                        label="Institution"
                        name="institution"
                        value={formik.values.institution}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        error={
                            formik.touched.institution &&
                            formik.errors.institution
                        }
                        placeholder="Cairo University"
                        required
                    />
                </div>
                <div className="sm:col-span-2">
                    <Input
                        label="Field of study"
                        name="fieldOfStudy"
                        value={formik.values.fieldOfStudy}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        error={
                            formik.touched.fieldOfStudy &&
                            formik.errors.fieldOfStudy
                        }
                        placeholder="Clinical Psychology"
                    />
                </div>
                <Input
                    label="Start year"
                    name="startYear"
                    type="number"
                    inputMode="numeric"
                    min="1950"
                    max="2100"
                    placeholder={String(currentYear - 4)}
                    value={formik.values.startYear}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={formik.touched.startYear && formik.errors.startYear}
                />
                <Input
                    label="End year"
                    name="endYear"
                    type="number"
                    inputMode="numeric"
                    min="1950"
                    max="2100"
                    placeholder={String(currentYear)}
                    value={formik.values.endYear}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={formik.touched.endYear && formik.errors.endYear}
                    hint="Leave empty if this is still in progress."
                />
                <div className="sm:col-span-2">
                    <Textarea
                        label="Description"
                        name="description"
                        rows={3}
                        value={formik.values.description}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        error={
                            formik.touched.description &&
                            formik.errors.description
                        }
                        placeholder="Thesis topic, specialisation track, honours, or other relevant details."
                    />
                </div>
            </div>

            <div className="flex flex-wrap justify-end gap-3 border-t border-neutral-200 pt-4">
                <Button
                    variant="outline"
                    onClick={onClose}
                    disabled={formik.isSubmitting}
                >
                    Cancel
                </Button>
                <Button
                    type="submit"
                    loading={formik.isSubmitting}
                    loadingText="Saving…"
                >
                    {qualification ? "Save changes" : "Add qualification"}
                </Button>
            </div>
        </form>
    );
};

export function QualificationModal({
    isOpen,
    onClose,
    qualification = null,
    onSubmit,
}) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={qualification ? "Edit qualification" : "Add qualification"}
            description="Degrees and training are displayed as a timeline on your public profile."
            size="xl"
        >
            {isOpen && (
                <QualificationForm
                    key={qualification?.id || "new"}
                    qualification={qualification}
                    onClose={onClose}
                    onSubmit={onSubmit}
                />
            )}
        </Modal>
    );
}
