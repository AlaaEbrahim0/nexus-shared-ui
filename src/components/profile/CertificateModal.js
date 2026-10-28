import { useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { FiImage, FiUploadCloud } from "react-icons/fi";
import { Alert, Button, Input, Modal, Textarea } from "../ui/primitives";
import { getApiErrorMessage } from "../../api/client";
import { safeHttpUrl } from "./profileUtils";

const today = () => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${now.getFullYear()}-${month}-${day}`;
};

const validationSchema = Yup.object({
    title: Yup.string()
        .trim()
        .required("Certificate title is required")
        .max(160, "Title must be 160 characters or fewer"),
    issuingOrganization: Yup.string()
        .trim()
        .required("Issuing organization is required")
        .max(160, "Organization must be 160 characters or fewer"),
    issueDate: Yup.string().required("Issue date is required"),
    expiryDate: Yup.string().test(
        "expiry-after-issue",
        "Expiry date cannot be before the issue date",
        function validateExpiry(value) {
            return !value || !this.parent.issueDate || value >= this.parent.issueDate;
        }
    ),
    credentialId: Yup.string().max(120, "Credential ID must be 120 characters or fewer"),
    credentialUrl: Yup.string().test(
        "credential-url",
        "Enter a valid http(s) URL",
        (value) => !value || Boolean(safeHttpUrl(value))
    ),
    description: Yup.string().max(1000, "Description must be 1000 characters or fewer"),
    image: Yup.mixed()
        .test("file-size", "Image must be smaller than 5 MB", (value) =>
            value instanceof File ? value.size < 5 * 1024 * 1024 : true
        )
        .test("file-type", "Use a JPG, PNG, or GIF image", (value) =>
            value instanceof File
                ? ["image/jpeg", "image/png", "image/gif"].includes(value.type)
                : true
        ),
});

const initialValuesFor = (certificate) => ({
    title: certificate?.title || "",
    issuingOrganization: certificate?.issuingOrganization || "",
    issueDate: certificate?.issueDate || "",
    expiryDate: certificate?.expiryDate || "",
    credentialId: certificate?.credentialId || "",
    credentialUrl: certificate?.credentialUrl || "",
    description: certificate?.description || "",
    image: null,
});

const CertificateForm = ({ certificate, onClose, onSubmit }) => {
    const [submitError, setSubmitError] = useState("");
    const [preview, setPreview] = useState(() =>
        safeHttpUrl(certificate?.imageUrl)
    );

    const formik = useFormik({
        initialValues: initialValuesFor(certificate),
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
                        "The certificate could not be saved. Please try again."
                    )
                );
                helpers.setSubmitting(false);
            }
        },
    });

    const handleImageChange = (event) => {
        const file = event.currentTarget.files?.[0] || null;
        formik.setFieldValue("image", file);
        if (!file) {
            setPreview(safeHttpUrl(certificate?.imageUrl));
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => setPreview(reader.result);
        reader.readAsDataURL(file);
    };

    const imageError = formik.touched.image && formik.errors.image;

    return (
        <form
            id="certificate-form"
            onSubmit={formik.handleSubmit}
            className="space-y-5"
            noValidate
        >
            {submitError && (
                <Alert variant="error" title="Could not save certificate">
                    {submitError}
                </Alert>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                    <Input
                        label="Certificate title"
                        name="title"
                        value={formik.values.title}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        error={formik.touched.title && formik.errors.title}
                        placeholder="Licensed Clinical Psychologist"
                        required
                    />
                </div>
                <div className="sm:col-span-2">
                    <Input
                        label="Issuing organization"
                        name="issuingOrganization"
                        value={formik.values.issuingOrganization}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        error={
                            formik.touched.issuingOrganization &&
                            formik.errors.issuingOrganization
                        }
                        placeholder="Egyptian Ministry of Health"
                        required
                    />
                </div>
                <Input
                    label="Issue date"
                    name="issueDate"
                    type="date"
                    max={today()}
                    value={formik.values.issueDate}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={formik.touched.issueDate && formik.errors.issueDate}
                    required
                />
                <Input
                    label="Expiry date"
                    name="expiryDate"
                    type="date"
                    min={formik.values.issueDate || undefined}
                    value={formik.values.expiryDate}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={formik.touched.expiryDate && formik.errors.expiryDate}
                    hint="Leave empty if the certificate does not expire."
                />
                <Input
                    label="Credential ID"
                    name="credentialId"
                    value={formik.values.credentialId}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={formik.touched.credentialId && formik.errors.credentialId}
                    placeholder="Optional"
                />
                <Input
                    label="Credential URL"
                    name="credentialUrl"
                    type="url"
                    value={formik.values.credentialUrl}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={formik.touched.credentialUrl && formik.errors.credentialUrl}
                    placeholder="https://verify.example.com/..."
                />
                <div className="sm:col-span-2">
                    <Textarea
                        label="Description"
                        name="description"
                        rows={3}
                        value={formik.values.description}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        error={formik.touched.description && formik.errors.description}
                        placeholder="What this certificate covers, training hours, or other details."
                    />
                </div>
            </div>

            <div>
                <p className="mb-1.5 text-sm font-semibold text-neutral-800">
                    Certificate image
                </p>
                <label className="flex cursor-pointer items-center gap-4 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-4 transition-colors hover:border-primary-300 hover:bg-primary-50/40">
                    <span className="grid h-20 w-24 shrink-0 place-items-center overflow-hidden rounded-lg border border-neutral-200 bg-white text-neutral-400">
                        {preview ? (
                            <img
                                src={preview}
                                alt="Certificate preview"
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <FiImage
                                aria-hidden="true"
                                className="h-7 w-7"
                            />
                        )}
                    </span>
                    <span className="min-w-0">
                        <span className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
                            <FiUploadCloud aria-hidden="true" /> Upload an image
                        </span>
                        <span className="mt-1 block text-xs text-neutral-600">
                            JPG, PNG, or GIF, up to 5 MB. Recommended aspect
                            ratio 4:3.
                        </span>
                        {formik.values.image?.name && (
                            <span className="mt-1 block truncate text-xs font-medium text-primary-800">
                                {formik.values.image.name}
                            </span>
                        )}
                    </span>
                    <input
                        type="file"
                        accept="image/jpeg,image/png,image/gif"
                        className="sr-only"
                        onChange={handleImageChange}
                    />
                </label>
                {imageError && (
                    <p role="alert" className="mt-1.5 text-sm font-medium text-error">
                        {imageError}
                    </p>
                )}
            </div>

            <div className="flex flex-wrap justify-end gap-3 border-t border-neutral-200 pt-4">
                <Button variant="outline" onClick={onClose} disabled={formik.isSubmitting}>
                    Cancel
                </Button>
                <Button type="submit" loading={formik.isSubmitting} loadingText="Saving…">
                    {certificate ? "Save changes" : "Add certificate"}
                </Button>
            </div>
        </form>
    );
};

export function CertificateModal({
    isOpen,
    onClose,
    certificate = null,
    onSubmit,
}) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={certificate ? "Edit certificate" : "Add certificate"}
            description="Certificates are shown on your public profile and help patients verify your credentials."
            size="2xl"
        >
            {isOpen && (
                <CertificateForm
                    key={certificate?.id || "new"}
                    certificate={certificate}
                    onClose={onClose}
                    onSubmit={onSubmit}
                />
            )}
        </Modal>
    );
}
