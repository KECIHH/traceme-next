type VerifyBadgeProps = {
  needVerify?: boolean;
  label?: string;
};

export function VerifyBadge({ needVerify, label = "需确认" }: VerifyBadgeProps) {
  if (!needVerify) {
    return null;
  }

  return (
    <span className="inline-flex shrink-0 items-center rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">
      {label}
    </span>
  );
}
