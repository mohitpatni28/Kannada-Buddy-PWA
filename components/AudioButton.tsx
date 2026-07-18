"use client";

import { useState } from "react";
import { speakKannada } from "@/lib/tts";

export function AudioButton({ script, roman, audioUrl, label = "Play" }: { script?: string; roman: string; audioUrl?: string; label?: string }) {
  const [message, setMessage] = useState("");

  const play = async () => {
    if (audioUrl) {
      try {
        const audio = new Audio(audioUrl);
        await audio.play();
        setMessage("Playing reviewed packaged Kannada audio.");
        return;
      } catch {
        setMessage("Packaged audio was unavailable. Trying the device voice.");
      }
    }
    const result = await speakKannada({ script, roman });
    setMessage(`Device-generated preview—not reviewed. ${result.message}`);
  };

  return (
    <span className="audio-control">
      <button
        className="button secondary icon-button"
        type="button"
        title={message || label}
        aria-label={label}
        onClick={() => void play()}
      >
        ►
      </button>
      {message ? <span className="audio-status">{message}</span> : null}
    </span>
  );
}
