"use client";

import { useState } from "react";
import { speakKannada } from "@/lib/tts";

export function AudioButton({ script, roman, label = "Play" }: { script?: string; roman: string; label?: string }) {
  const [message, setMessage] = useState("");

  return (
    <span className="audio-control">
      <button
        className="button secondary icon-button"
        type="button"
        title={message || label}
        aria-label={label}
        onClick={() => void speakKannada({ script, roman }).then((result) => setMessage(result.message))}
      >
        ►
      </button>
      {message ? <span className="audio-status">{message}</span> : null}
    </span>
  );
}
