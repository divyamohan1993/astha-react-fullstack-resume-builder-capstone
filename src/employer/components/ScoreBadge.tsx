interface ScoreBadgeProps {
  score: number;
  label?: string;
}

export function ScoreBadge({ score, label }: ScoreBadgeProps) {
  const color =
    score > 75 ? '#2ecc40' : score > 50 ? '#ffdc00' : '#ff4136';
  const textColor = score > 50 && score <= 75 ? '#333' : '#fff';

  return (
    <span
      className="inline-flex min-h-[28px] min-w-[48px] items-center justify-center rounded-full px-3 py-1 text-sm font-bold"
      style={{ backgroundColor: color, color: textColor }}
      role="status"
      aria-label={label ? `${label}: ${score}%` : `Score: ${score}%`}
    >
      {score}%
    </span>
  );
}
