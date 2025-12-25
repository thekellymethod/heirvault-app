"use client";

import { useRouter, useSearchParams } from "next/navigation";

interface SortSelectProps {
  name: string,
  defaultValue: string,
  options: Array<{ value: string, label: string }>;
  className?: string,
}

export function SortSelect({ name, defaultValue, options, className }: SortSelectProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const form = e.currentTarget.form;
    if (form) {
      form.submit();
    }
  };

  return (
    <form method="get" className="flex gap-2">
      {/* Preserve existing search params */}
      {Array.from(searchParams.entries())
        .filter(([key]) => key !== name)
        .map(([key, value]) => (
          <input key={key} type="hidden" name={key} value={value} />
        ))}
      <select
        name={name}
        title="Sort by"
        defaultValue={defaultValue}
        onChange={handleChange}
        className={className}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </form>
  );
}

