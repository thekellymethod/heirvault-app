import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { Logo } from "@/components/Logo";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { ReceiptQr } from "../../_components/ReceiptQr";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function maskEmail(email: string): string {
  const at = email.lastIndexOf("@");
  if (at < 1) return "—";
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const prefix = local.slice(0, Math.min(2, local.length));
  return `${prefix}***@${domain}`;
}

function maskPolicyNumber(value: string): string {
  const t = value.trim();
  if (t.length <= 4) return "••••";
  return `••••${t.slice(-4)}`;
}

async function siteOrigin(): Promise<string> {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  if (host) return `${proto}://${host}`;
  return "";
}

export default async function PolicySubmissionReceiptPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!UUID_RE.test(token)) notFound();

  const { data, error } = await supabaseAdmin
    .from("policy_submissions")
    .select(
      "reference_id, created_at, insured_name, policy_number, carrier, carrier_phone, carrier_street, carrier_city, carrier_state, carrier_zip, submitted_by_email, status"
    )
    .eq("receipt_token", token)
    .maybeSingle();

  if (error || !data) notFound();

  const origin = await siteOrigin();
  const receiptPath = `/submit-policy/receipt/${token}`;
  const receiptUrl = origin ? `${origin}${receiptPath}` : receiptPath;

  const submittedAt = data.created_at
    ? new Date(data.created_at as string).toLocaleString(undefined, {
        dateStyle: "long",
        timeStyle: "short",
      })
    : "—";

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-slateui-200 bg-paper-50/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Logo size="lg" showTagline={false} className="flex-row" href="/" />
          <Link
            href="/submit-policy"
            className="text-sm font-medium text-slateui-600 underline-offset-4 hover:text-ink-900 hover:underline"
          >
            New submission
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="mb-10 text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-gold-700">
            HeirVault registry
          </p>
          <h1 className="font-display text-3xl text-ink-900 sm:text-4xl">Submission receipt</h1>
          <p className="mt-3 text-sm text-slateui-600 sm:text-base">
            Save this page, download a PDF from your browser, or use the QR code. This link stays
            valid for your record.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-start">
          <div className="space-y-6 rounded-3xl border border-slateui-200 bg-white p-6 shadow-sm sm:p-8">
            <dl className="grid gap-5 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slateui-600">
                  Reference ID
                </dt>
                <dd className="mt-1 font-mono text-lg text-ink-900">{data.reference_id as string}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slateui-600">
                  Status
                </dt>
                <dd className="mt-1 capitalize text-ink-900">{(data.status as string) || "received"}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slateui-600">
                  Submitted
                </dt>
                <dd className="mt-1 text-ink-900">{submittedAt}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slateui-600">
                  Insured (as submitted)
                </dt>
                <dd className="mt-1 text-ink-900">{data.insured_name as string}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slateui-600">
                  Policy number
                </dt>
                <dd className="mt-1 font-mono text-ink-900">
                  {maskPolicyNumber(String(data.policy_number ?? ""))}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slateui-600">
                  Your email on file
                </dt>
                <dd className="mt-1 break-all text-ink-900">
                  {maskEmail(String(data.submitted_by_email ?? ""))}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slateui-600">
                  Insurance company
                </dt>
                <dd className="mt-1 text-ink-900">{data.carrier as string}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slateui-600">
                  Company phone
                </dt>
                <dd className="mt-1 text-ink-900">{(data.carrier_phone as string) || "—"}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slateui-600">
                  Company address
                </dt>
                <dd className="mt-1 text-ink-900">
                  {data.carrier_street as string}, {data.carrier_city as string},{" "}
                  {data.carrier_state as string} {data.carrier_zip as string}
                </dd>
              </div>
            </dl>

            <div className="rounded-2xl border border-amber-200/80 bg-amber-50/80 p-4 text-sm text-ink-900">
              <p className="font-semibold text-amber-950">Important</p>
              <p className="mt-2 text-amber-950/90">
                HeirVault maintains a <strong>registry only</strong>. We do not change your policy and
                we do not contact your insurer except for limited verification tied to this intake.
                To correct what you submitted, contact us from the <strong>email or phone on file</strong>
                , or use this receipt when instructed in our update flow.
              </p>
              <p className="mt-3">
                <Link
                  href={`/update-policy?receipt=${encodeURIComponent(token)}`}
                  className="font-medium text-ink-900 underline underline-offset-2 hover:text-gold-800"
                >
                  Update policy information
                </Link>
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-4">
            <ReceiptQr value={receiptUrl} />
            {origin ? (
              <p className="max-w-[220px] break-all text-center font-mono text-[10px] text-slateui-500">
                {receiptUrl}
              </p>
            ) : null}
          </div>
        </div>
      </main>
    </>
  );
}
