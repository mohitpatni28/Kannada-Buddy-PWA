"use client";

import { useEffect, useRef, useState } from "react";

export function VoiceRecorder() {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState("");
  const [message, setMessage] = useState("");

  useEffect(
    () => () => {
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    },
    []
  );

  useEffect(() => () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
  }, [audioUrl]);

  const start = async () => {
    if (!("MediaRecorder" in window) || !navigator.mediaDevices?.getUserMedia) {
      setMessage("Recording is not supported in this browser.");
      return;
    }
    try {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      setAudioUrl("");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const chunks: Blob[] = [];
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      recorder.onstop = () => {
        const url = URL.createObjectURL(new Blob(chunks, { type: recorder.mimeType }));
        setAudioUrl(url);
        stream.getTracks().forEach((track) => track.stop());
        setRecording(false);
        setMessage("Play your recording, then compare it with the reference.");
      };
      recorder.start();
      setRecording(true);
      setMessage("Recording… say the phrase once.");
    } catch {
      setMessage("Microphone access was not available. You can still practise aloud.");
    }
  };

  const stop = () => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  };

  return (
    <div className="recorder">
      <button className={recording ? "button warning" : "button secondary"} type="button" onClick={recording ? stop : () => void start()}>
        {recording ? "Stop recording" : "Record myself"}
      </button>
      {audioUrl ? <audio className="recording-playback" controls src={audioUrl} /> : null}
      {message ? <p className="small muted" role="status">{message}</p> : null}
    </div>
  );
}
