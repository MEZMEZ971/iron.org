import { QRCodeSVG } from "qrcode.react";

interface Props {
  value: string;
  loading?: boolean;
}

export function DepositQrCode({ value, loading }: Props) {
  if (loading || !value) {
    return (
      <div className="flex h-44 w-44 items-center justify-center rounded-2xl border border-df bg-df-inset">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#f0b90b] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#f0b90b]/20 bg-white p-3 shadow-lg shadow-[#f0b90b]/10">
      <QRCodeSVG
        value={value}
        size={160}
        level="M"
        bgColor="#ffffff"
        fgColor="#0a0e1a"
        includeMargin={false}
      />
    </div>
  );
}
