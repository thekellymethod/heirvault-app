"use client";

import React from "react";

interface BoxFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  required?: boolean;
  className?: string;
}

/**
 * Passport-style box field - one box per character
 */
function BoxField({ label, value, onChange, maxLength, required, className = "" }: BoxFieldProps) {
  const boxes = Array(maxLength).fill("");

  const handleChange = (index: number, char: string) => {
    // Only allow alphanumeric and common characters
    const sanitized = char.replace(/[^A-Za-z0-9\s\-.,]/g, "").toUpperCase();
    if (sanitized.length > 1) return; // Only single character

    const newValue = value.split("");
    newValue[index] = sanitized;
    onChange(newValue.join("").substring(0, maxLength));
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !value[index] && index > 0) {
      // Move to previous box on backspace
      const prevInput = e.currentTarget.previousElementSibling as HTMLInputElement;
      if (prevInput) prevInput.focus();
    } else if (e.key === "ArrowLeft" && index > 0) {
      const prevInput = e.currentTarget.previousElementSibling as HTMLInputElement;
      if (prevInput) prevInput.focus();
    } else if (e.key === "ArrowRight" && index < maxLength - 1) {
      const nextInput = e.currentTarget.nextElementSibling as HTMLInputElement;
      if (nextInput) nextInput.focus();
    }
  };

  return (
    <div className={`mb-4 ${className}`}>
      <label className="block text-xs font-semibold text-ink-900 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="flex gap-1 flex-wrap">
        {boxes.map((_, index) => (
          <input
            key={index}
            type="text"
            maxLength={1}
            value={value[index] || ""}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            className="w-8 h-10 text-center text-sm font-mono border-2 border-slate-300 rounded focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-200"
            style={{ textTransform: "uppercase" }}
          />
        ))}
      </div>
    </div>
  );
}

interface PassportStyleFormProps {
  initialData?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    dateOfBirth?: string;
    policyNumber?: string;
    insurerName?: string;
    policyType?: string;
  };
  onSubmit: (data: any) => void;
  onPrint?: () => void;
}

export function PassportStyleForm({ initialData, onSubmit, onPrint }: PassportStyleFormProps) {
  const [formData, setFormData] = React.useState({
    firstName: initialData?.firstName || "",
    lastName: initialData?.lastName || "",
    email: initialData?.email || "",
    phone: initialData?.phone || "",
    dateOfBirth: initialData?.dateOfBirth || "",
    policyNumber: initialData?.policyNumber || "",
    insurerName: initialData?.insurerName || "",
    policyType: initialData?.policyType || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 print:space-y-2" id="passport-form">
      <div className="border-2 border-slate-800 p-6 print:p-4 bg-white">
        <h3 className="text-lg font-bold text-ink-900 mb-4 print:text-base print:mb-2 border-b-2 border-slate-800 pb-2">
          CLIENT INFORMATION UPDATE FORM
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:gap-2">
          <BoxField
            label="First Name"
            value={formData.firstName}
            onChange={(v) => setFormData({ ...formData, firstName: v })}
            maxLength={20}
            required
          />
          <BoxField
            label="Last Name"
            value={formData.lastName}
            onChange={(v) => setFormData({ ...formData, lastName: v })}
            maxLength={25}
            required
          />
        </div>

        <BoxField
          label="Email Address"
          value={formData.email}
          onChange={(v) => setFormData({ ...formData, email: v })}
          maxLength={50}
          required
        />

        <BoxField
          label="Phone Number (Format: 1234567890)"
          value={formData.phone.replace(/\D/g, "")}
          onChange={(v) => setFormData({ ...formData, phone: v.replace(/\D/g, "") })}
          maxLength={10}
        />

        <BoxField
          label="Date of Birth (Format: MMDDYYYY)"
          value={formData.dateOfBirth.replace(/\D/g, "")}
          onChange={(v) => setFormData({ ...formData, dateOfBirth: v.replace(/\D/g, "").substring(0, 8) })}
          maxLength={8}
        />

        <div className="border-t-2 border-slate-300 my-4 print:my-2 pt-4 print:pt-2">
          <h4 className="text-sm font-bold text-ink-900 mb-3 print:mb-1">POLICY INFORMATION</h4>

          <BoxField
            label="Policy Number"
            value={formData.policyNumber}
            onChange={(v) => setFormData({ ...formData, policyNumber: v })}
            maxLength={25}
          />

          <BoxField
            label="Insurer Name"
            value={formData.insurerName}
            onChange={(v) => setFormData({ ...formData, insurerName: v })}
            maxLength={40}
          />

          <BoxField
            label="Policy Type (TERM, WHOLE, UNIVERSAL, GROUP, OTHER)"
            value={formData.policyType}
            onChange={(v) => setFormData({ ...formData, policyType: v })}
            maxLength={10}
          />
        </div>

        <div className="mt-6 print:hidden flex gap-3">
          <button
            type="submit"
            className="px-6 py-2 bg-gold-500 text-white font-semibold rounded hover:bg-gold-600 transition"
          >
            Submit Update
          </button>
          {onPrint && (
            <button
              type="button"
              onClick={onPrint}
              className="px-6 py-2 bg-slate-600 text-white font-semibold rounded hover:bg-slate-700 transition"
            >
              Print Form
            </button>
          )}
        </div>

        <div className="mt-4 text-xs text-slate-600 print:text-[10px]">
          <p className="mb-1">
            <strong>Instructions:</strong> Fill in each box with one character. Use CAPITAL LETTERS and numbers only.
          </p>
          <p className="mb-1">
            <strong>For scanning:</strong> Print this form, fill it out by hand or type, then scan and upload.
          </p>
          <p>
            <strong>Note:</strong> This form can be filled digitally or printed and filled by hand, then scanned back.
          </p>
        </div>
      </div>
    </form>
  );
}

