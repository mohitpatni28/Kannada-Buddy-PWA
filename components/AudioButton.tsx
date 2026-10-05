"use client";

import { SpeakerHigh as SpeakerHighIcon } from "@phosphor-icons/react/dist/csr/SpeakerHigh";
import { useState } from "react";
import { speakKannada } from "@/lib/tts";

export function AudioButton({ script, roman, audioUrl, label }: { script?: string; roman: string; audioUrl?: string; label?: string }) {
  const accessibleLabel = label ?? `Play Kannada for ${roman}`;
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
    try {
      const result = await speakKannada({ script, roman });
      setMessage(`${audioUrl ? "Packaged audio was unavailable. " : ""}Device-generated preview—not reviewed. ${result.message}`);
    } catch {
      setMessage("Audio could not play. Try again or read the pronunciation shown.");
    }
  };

  return (
    <span className="audio-control">
      <button
        className="button secondary icon-button"
        type="button"
        title={message || accessibleLabel}
        aria-label={accessibleLabel}
        onClick={() => void play()}
      >
        <SpeakerHighIcon size={22} aria-hidden="true" />
      </button>
      <span className="audio-status" aria-live="polite" aria-atomic="true">{message}</span>
    </span>
  );
}
