"use client";

import { QRCodeSVG } from "qrcode.react";

export function ReceiptQr({ value }: { value: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-slateui-200 bg-white p-6 shadow-sm">
      <QRCodeSVG value={value} size={200} level="M" includeMargin />
      <p className="max-w-xs text-center text-xs text-slateui-600">
        Scan to open this receipt in your browser. Save or screenshot for your records.
      </p>
    </div>
  );
}
