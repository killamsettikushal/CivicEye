import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  onClick: () => void;
  label?: string;
  disabled?: boolean;
}

export function BackButton({ onClick, label = 'Back', disabled }: BackButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="btn-ghost inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <ArrowLeft className="w-4 h-4" />
      {label}
    </button>
  );
}
