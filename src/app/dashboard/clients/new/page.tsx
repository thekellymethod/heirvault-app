"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { useFormValidation } from "@/lib/validation/useFormValidation";
import { rules } from "@/lib/validation/rules";

export default function NewClientPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    fields,
    setFieldValue,
    setFieldTouched,
    validateForm,
    getFieldError,
    getFormValues,
  } = useFormValidation({
    initialValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      dateOfBirth: "",
    },
    validationRules: {
      firstName: [rules.required("First name"), rules.name("First name"), rules.maxLength(100, "First name")],
      lastName: [rules.required("Last name"), rules.name("Last name"), rules.maxLength(100, "Last name")],
      email: [rules.required("Email"), rules.email()],
      phone: [rules.phone()],
      dateOfBirth: [rules.date("Date of birth"), rules.dateNotFuture("Date of birth")],
    },
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Mark all fields as touched
    Object.keys(fields).forEach((key) => setFieldTouched(key));

    // Validate form
    if (!validateForm()) {
      setError("Please fix the errors below");
      return;
    }

    setLoading(true);

    try {
      // Use unified fetchJson which handles 402 automatically
      const { fetchJson } = await import("@/lib/http/fetchJson");
      const { showPromise } = await import("@/lib/toast");
      
      const formValues = getFormValues();
      
      const data = await showPromise(
        fetchJson("/api/clients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: formValues.firstName,
            lastName: formValues.lastName,
            email: formValues.email,
            phone: formValues.phone || null,
            dateOfBirth: formValues.dateOfBirth || null,
          }),
        }),
        {
          loading: "Creating client...",
          success: "Client created successfully!",
          error: (err) => err instanceof Error ? err.message : "Failed to create client",
        }
      );

      const clientId = data?.client?.id as string | undefined;
      if (!clientId) throw new Error("Client created but no id returned");

      router.push(`/dashboard/clients/${clientId}`);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900">New Client</h1>
        <p className="text-sm text-slateui-600">
          Create a client profile for the life insurance registry.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="rounded-xl border border-slateui-200 bg-white p-5 space-y-4 shadow-sm"
      >
        {error ? (
          <div className="rounded-lg border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            label="First name"
            name="firstName"
            type="text"
            value={fields.firstName.value}
            onChange={(value) => setFieldValue("firstName", value)}
            onBlur={() => setFieldTouched("firstName")}
            error={getFieldError("firstName")}
            required
          />

          <FormField
            label="Last name"
            name="lastName"
            type="text"
            value={fields.lastName.value}
            onChange={(value) => setFieldValue("lastName", value)}
            onBlur={() => setFieldTouched("lastName")}
            error={getFieldError("lastName")}
            required
          />
        </div>

        <FormField
          label="Email"
          name="email"
          type="email"
          value={fields.email.value}
          onChange={(value) => setFieldValue("email", value)}
          onBlur={() => setFieldTouched("email")}
          error={getFieldError("email")}
          required
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            label="Phone"
            name="phone"
            type="tel"
            value={fields.phone.value}
            onChange={(value) => setFieldValue("phone", value)}
            onBlur={() => setFieldTouched("phone")}
            error={getFieldError("phone")}
            placeholder="Optional"
          />

          <FormField
            label="Date of birth"
            name="dateOfBirth"
            type="date"
            value={fields.dateOfBirth.value}
            onChange={(value) => setFieldValue("dateOfBirth", value)}
            onBlur={() => setFieldTouched("dateOfBirth")}
            error={getFieldError("dateOfBirth")}
            helpText="Optional"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/dashboard/clients")}
            disabled={loading}
          >
            Cancel
          </Button>

          <Button type="submit" size="lg" disabled={loading}>
            {loading ? "Creating..." : "Create Client"}
          </Button>
        </div>
      </form>
    </div>
  );
}
