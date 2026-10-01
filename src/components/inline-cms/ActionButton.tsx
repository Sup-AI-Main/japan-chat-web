"use client";

import { useRef, useState } from "react";

interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  onAction: () => void | Promise<void>;
  cooldownMs?: number;
}

/**
 * Admin action button with an immediate same-click lock.
 * The ref closes the race where two clicks happen before React re-renders.
 */
export function ActionButton({
  onAction,
  cooldownMs = 350,
  disabled = false,
  children,
  ...props
}: ActionButtonProps) {
  const lockedRef = useRef(false);
  const [locked, setLocked] = useState(false);

  const handleClick = async () => {
    if (disabled || lockedRef.current) return;
    lockedRef.current = true;
    setLocked(true);
    try {
      await onAction();
    } finally {
      window.setTimeout(() => {
        lockedRef.current = false;
        setLocked(false);
      }, cooldownMs);
    }
  };

  return (
    <button {...props} type={props.type ?? "button"} onClick={() => void handleClick()} disabled={disabled || locked}>
      {children}
    </button>
  );
}
