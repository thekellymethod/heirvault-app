"use client";

export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <button onClick={() => reset()} className="btn-primary mt-4">Try again</button>
    </div>
  );
}

