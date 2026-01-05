export default async function ExportRegistryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main className="min-h-screen bg-[#05070c] text-white p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-semibold" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
          Export Policy Registry Summary
        </h1>
        <p className="mt-2 text-sm text-white/65">
          This generates a clean PDF summary suitable for internal review or filing.
        </p>

        <div className="mt-6 flex gap-3">
          <a
            href={`/api/registries/${id}/export`}
            className="rounded-xl bg-[#C9A227] px-4 py-2 text-sm font-semibold text-black hover:brightness-95 transition"
          >
            Download PDF
          </a>
          <a
            href={`/app/registries/${id}`}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/90 hover:bg-white/10 transition"
          >
            Back to registry
          </a>
        </div>

        <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4">
          <iframe
            src={`/api/registries/${id}/export`}
            className="w-full h-[75vh] rounded-xl border border-white/10 bg-black/30"
          />
        </div>
      </div>
    </main>
  );
}
