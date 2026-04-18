"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { FileText, Shield, Sparkles } from "lucide-react";

function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

/** Display helper: up to 10 digits → XXX-XXX-XXXX */
function formatUsPhoneDisplay(raw: string): string {
  const d = digitsOnly(raw).slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
}

function labelClass() {
  return "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slateui-600";
}

function fieldWrap() {
  return "space-y-1";
}

export default function SubmitPolicyPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [contactPhone, setContactPhone] = useState("");
  const [submitterPhone, setSubmitterPhone] = useState("");
  const [carrierPhone, setCarrierPhone] = useState("");

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-slateui-200/80 bg-paper-50/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Logo size="lg" showTagline={false} className="flex-row" href="/" />
          <Link
            href="/update-policy"
            className="text-sm font-medium text-slateui-600 underline-offset-4 hover:text-ink-900 hover:underline"
          >
            Update with receipt
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="mb-10 grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-gold-600/25 bg-gold-600/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-gold-800">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Registry intake
            </div>
            <h1 className="font-display text-3xl leading-tight text-ink-900 sm:text-4xl md:text-[2.35rem]">
              Policy document registry
            </h1>
            <p className="mt-4 max-w-xl text-base text-slateui-600">
              Submit a copy of your policy or insurer confirmation for your HeirVault record. This is{" "}
              <strong className="font-semibold text-ink-900">registration only</strong> — it does not
              authorize us to change your coverage or to contact your insurance company except for
              limited verification related to this submission.
            </p>
          </div>

          <div className="rounded-3xl border border-slateui-200 bg-white/90 p-5 shadow-sm backdrop-blur-sm sm:p-6">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-ink-900 text-white">
                <Shield className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <p className="text-sm font-semibold text-ink-900">Secure handling</p>
                <p className="mt-1 text-sm leading-relaxed text-slateui-600">
                  PDFs are stored in encrypted storage. Identity fields help us match your file to your
                  account path; we treat them as sensitive.
                </p>
              </div>
            </div>
          </div>
        </div>

        <form
          className="grid gap-10 lg:grid-cols-[1fr_320px]"
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            setIsSubmitting(true);

            const form = e.currentTarget;
            const fd = new FormData(form);

            const id4 = String(fd.get("id_last_four") || "").trim();
            const dl = String(fd.get("dl_number") || "").trim();
            if (!/^\d{4}$/.test(id4) && !dl) {
              setError("Enter either the last 4 of the insured's SSN or their full driver's license number.");
              setIsSubmitting(false);
              return;
            }
            if (id4 && !/^\d{4}$/.test(id4)) {
              setError("SSN last four must be exactly 4 digits.");
              setIsSubmitting(false);
              return;
            }

            if (digitsOnly(String(fd.get("contact_phone") || "")).length !== 10) {
              setError("Insured phone must be a complete 10-digit US number.");
              setIsSubmitting(false);
              return;
            }
            if (digitsOnly(String(fd.get("carrier_phone") || "")).length !== 10) {
              setError("Company phone must be a complete 10-digit US number.");
              setIsSubmitting(false);
              return;
            }
            const subPh = String(fd.get("submitted_by_phone") || "").trim();
            if (subPh && digitsOnly(subPh).length !== 10) {
              setError("Your phone must be a complete 10-digit US number, or leave it blank.");
              setIsSubmitting(false);
              return;
            }

            try {
              const res = await fetch("/api/submit-policy", { method: "POST", body: fd });
              const json: unknown = await res.json().catch(() => ({}));
              if (!res.ok) {
                const msg =
                  typeof json === "object" && json && "error" in json && typeof (json as { error: unknown }).error === "string"
                    ? (json as { error: string }).error
                    : "Submission failed.";
                setError(msg);
                setIsSubmitting(false);
                return;
              }
              const token =
                typeof json === "object" && json && "receipt_token" in json
                  ? String((json as { receipt_token: unknown }).receipt_token)
                  : "";
              if (!token) {
                setError("Saved, but receipt could not be created. Please contact support.");
                setIsSubmitting(false);
                return;
              }
              router.push(`/submit-policy/receipt/${encodeURIComponent(token)}`);
            } catch {
              setError("Network error. Please try again.");
            } finally {
              setIsSubmitting(false);
            }
          }}
          encType="multipart/form-data"
        >
          {/* Hidden inputs submit canonical phone values alongside visible controlled fields */}
          <input type="hidden" name="contact_phone" value={formatUsPhoneDisplay(contactPhone)} />
          <input type="hidden" name="submitted_by_phone" value={formatUsPhoneDisplay(submitterPhone)} />
          <input type="hidden" name="carrier_phone" value={formatUsPhoneDisplay(carrierPhone)} />

          <div className="space-y-10">
            <section className="rounded-3xl border border-slateui-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="mb-6 flex items-center gap-3 border-b border-slateui-100 pb-4">
                <FileText className="h-5 w-5 text-gold-700" aria-hidden />
                <div>
                  <h2 className="font-display text-xl text-ink-900">Insured person</h2>
                  <p className="text-sm text-slateui-600">Legal name and contact for the insured.</p>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-3">
                <div className={fieldWrap()}>
                  <label className={labelClass()} htmlFor="insured_first_name">
                    First name *
                  </label>
                  <Input id="insured_first_name" name="insured_first_name" required autoComplete="given-name" />
                </div>
                <div className={fieldWrap()}>
                  <label className={labelClass()} htmlFor="insured_middle_name">
                    Middle
                  </label>
                  <Input id="insured_middle_name" name="insured_middle_name" autoComplete="additional-name" />
                </div>
                <div className={fieldWrap()}>
                  <label className={labelClass()} htmlFor="insured_last_name">
                    Last name *
                  </label>
                  <Input id="insured_last_name" name="insured_last_name" required autoComplete="family-name" />
                </div>
              </div>

              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <div className={fieldWrap()}>
                  <label className={labelClass()} htmlFor="dob">
                    Date of birth
                  </label>
                  <Input id="dob" name="dob" type="date" />
                </div>
                <div className={fieldWrap()}>
                  <label className={labelClass()} htmlFor="contact_phone_visible">
                    Insured phone *
                  </label>
                  <Input
                    id="contact_phone_visible"
                    inputMode="numeric"
                    autoComplete="tel"
                    placeholder="000-000-0000"
                    value={contactPhone}
                    onChange={(ev) => setContactPhone(formatUsPhoneDisplay(ev.target.value))}
                    required
                    className="font-mono"
                  />
                  <p className="text-xs text-slateui-600">US mobile or landline, 10 digits.</p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-slateui-100 bg-paper-50/80 p-5">
                <p className={labelClass()}>Identification *</p>
                <p className="mb-4 text-sm text-slateui-600">
                  Provide <strong className="text-ink-900">either</strong> the last four of the insured's
                  Social Security number <strong className="text-ink-900">or</strong> their full driver's
                  license number (as printed on the card).
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className={fieldWrap()}>
                    <label className={labelClass()} htmlFor="id_last_four">
                      SSN last 4
                    </label>
                    <Input
                      id="id_last_four"
                      name="id_last_four"
                      inputMode="numeric"
                      maxLength={4}
                      placeholder="0000"
                      className="font-mono"
                    />
                  </div>
                  <div className={fieldWrap()}>
                    <label className={labelClass()} htmlFor="dl_number">
                      Driver license #
                    </label>
                    <Input
                      id="dl_number"
                      name="dl_number"
                      autoComplete="off"
                      maxLength={24}
                      className="font-mono uppercase"
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slateui-200 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="font-display mb-6 border-b border-slateui-100 pb-4 text-xl text-ink-900">
                Policy & carrier
              </h2>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className={cn(fieldWrap(), "sm:col-span-2")}>
                  <label className={labelClass()} htmlFor="policy_number">
                    Policy number *
                  </label>
                  <Input id="policy_number" name="policy_number" required autoComplete="off" className="font-mono" />
                </div>
                <div className={cn(fieldWrap(), "sm:col-span-2")}>
                  <label className={labelClass()} htmlFor="carrier">
                    Insurance company name *
                  </label>
                  <Input id="carrier" name="carrier" required autoComplete="organization" />
                </div>
                <div className={cn(fieldWrap(), "sm:col-span-2")}>
                  <label className={labelClass()} htmlFor="carrier_phone_visible">
                    Company phone *
                  </label>
                  <Input
                    id="carrier_phone_visible"
                    inputMode="numeric"
                    autoComplete="tel"
                    placeholder="000-000-0000"
                    value={carrierPhone}
                    onChange={(ev) => setCarrierPhone(formatUsPhoneDisplay(ev.target.value))}
                    required
                    className="font-mono"
                  />
                </div>
                <div className={cn(fieldWrap(), "sm:col-span-2")}>
                  <label className={labelClass()} htmlFor="carrier_street">
                    Company street address *
                  </label>
                  <Input id="carrier_street" name="carrier_street" required autoComplete="street-address" />
                </div>
                <div className={fieldWrap()}>
                  <label className={labelClass()} htmlFor="carrier_city">
                    City *
                  </label>
                  <Input id="carrier_city" name="carrier_city" required autoComplete="address-level2" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className={fieldWrap()}>
                    <label className={labelClass()} htmlFor="carrier_state">
                      State *
                    </label>
                    <Input
                      id="carrier_state"
                      name="carrier_state"
                      required
                      maxLength={2}
                      placeholder="TX"
                      className="uppercase"
                      autoComplete="address-level1"
                    />
                  </div>
                  <div className={fieldWrap()}>
                    <label className={labelClass()} htmlFor="carrier_zip">
                      ZIP *
                    </label>
                    <Input
                      id="carrier_zip"
                      name="carrier_zip"
                      required
                      placeholder="12345 or 12345-6789"
                      className="font-mono"
                      autoComplete="postal-code"
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slateui-200 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="font-display mb-6 border-b border-slateui-100 pb-4 text-xl text-ink-900">
                Your contact & document
              </h2>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className={cn(fieldWrap(), "sm:col-span-2")}>
                  <label className={labelClass()} htmlFor="submitted_by_email">
                    Your email *
                  </label>
                  <Input
                    id="submitted_by_email"
                    name="submitted_by_email"
                    type="email"
                    required
                    autoComplete="email"
                  />
                </div>
                <div className={cn(fieldWrap(), "sm:col-span-2")}>
                  <label className={labelClass()} htmlFor="submitter_phone_visible">
                    Your phone <span className="font-normal normal-case text-slateui-500">(optional)</span>
                  </label>
                  <Input
                    id="submitter_phone_visible"
                    inputMode="numeric"
                    autoComplete="tel"
                    placeholder="000-000-0000"
                    value={submitterPhone}
                    onChange={(ev) => setSubmitterPhone(formatUsPhoneDisplay(ev.target.value))}
                    className="font-mono"
                  />
                  <p className="text-xs text-slateui-600">
                    If provided, we may treat calls from this number like your email for change requests.
                  </p>
                </div>
                <div className={cn(fieldWrap(), "sm:col-span-2")}>
                  <label className={labelClass()} htmlFor="file">
                    Policy or confirmation PDF *
                  </label>
                  <div className="relative mt-1 rounded-xl border border-dashed border-slateui-300 bg-slateui-50/50 p-6 text-center transition hover:border-gold-600/40 hover:bg-paper-50">
                    <Input
                      id="file"
                      name="file"
                      type="file"
                      accept="application/pdf"
                      required
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    />
                    <p className="text-sm font-medium text-ink-900">Drop a PDF here or tap to browse</p>
                    <p className="mt-1 text-xs text-slateui-600">Maximum 50 MB · PDF only</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-amber-200/90 bg-gradient-to-br from-amber-50/90 to-paper-50 p-6 sm:p-8">
              <h2 className="font-display mb-3 text-lg text-ink-900">Registry disclaimer</h2>
              <div className="space-y-3 text-sm leading-relaxed text-amber-950/95">
                <p>
                  By submitting this form, you confirm you are uploading policy-related information
                  (including the insured's name, contact phone, identification details as provided,
                  policy number, insurance company contact and address, and your email/phone) solely for{" "}
                  <strong>HeirVault's registry</strong>.
                </p>
                <p>
                  This registration <strong>does not</strong> grant HeirVault permission to alter your
                  insurance policy or to contact your insurance company for any purpose other than{" "}
                  <strong>verification</strong> associated with this intake.
                </p>
                <p>
                  Information you submit can only be changed if you <strong>email or call us from the
                  email address or phone number on file</strong> for this submission, or if you use the{" "}
                  <strong>receipt issued after this submission</strong> (including its QR code) when our
                  process allows you to update your record.
                </p>
              </div>
              <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-2xl border border-amber-300/60 bg-white/80 p-4 text-sm text-ink-900 shadow-sm">
                <input
                  type="checkbox"
                  name="acknowledged_disclaimer"
                  value="on"
                  required
                  className="mt-1 h-4 w-4 shrink-0 rounded border-slateui-300 text-ink-900 focus:ring-ink-900"
                />
                <span>
                  I have read and agree to the disclaimer above. I understand this is registry-only
                  intake and how I may request changes.
                </span>
              </label>
            </section>

            {error ? (
              <div
                className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
                role="alert"
              >
                {error}
              </div>
            ) : null}

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <Button type="submit" size="lg" disabled={isSubmitting} className="min-w-[200px] sm:w-auto">
                {isSubmitting ? "Submitting…" : "Submit to registry"}
              </Button>
              <p className="text-xs text-slateui-600 sm:max-w-xs sm:text-right">
                After a successful submit you will be taken to a receipt page with a unique QR code for
                this record.
              </p>
            </div>
          </div>

          <aside className="lg:sticky lg:top-28 lg:self-start">
            <div className="rounded-3xl border border-slateui-200 bg-white p-6 shadow-sm">
              <p className="font-display text-lg text-ink-900">Checklist</p>
              <ul className="mt-4 space-y-3 text-sm text-slateui-600">
                <li className="flex gap-2">
                  <span className="text-gold-700">✓</span>
                  Insured first and last name (middle optional)
                </li>
                <li className="flex gap-2">
                  <span className="text-gold-700">✓</span>
                  Insured phone in 000-000-0000 format
                </li>
                <li className="flex gap-2">
                  <span className="text-gold-700">✓</span>
                  SSN last 4 <em className="not-italic text-slateui-500">or</em> full DL number
                </li>
                <li className="flex gap-2">
                  <span className="text-gold-700">✓</span>
                  Policy number and carrier details (phone + full mailing address)
                </li>
                <li className="flex gap-2">
                  <span className="text-gold-700">✓</span>
                  One PDF (policy or confirmation)
                </li>
              </ul>
            </div>
          </aside>
        </form>
      </main>
    </>
  );
}
