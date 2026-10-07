"use client";

import { useEffect, useRef, useState } from "react";

export function VoiceRecorder() {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mountedRef = useRef(false);
  const requestRef = useRef(0);
  const pendingRef = useRef(false);
  const [pending, setPending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestRef.current += 1;
      pendingRef.current = false;
      const recorder = recorderRef.current;
      recorderRef.current = null;
      if (recorder) {
        recorder.onstop = null;
        recorder.ondataavailable = null;
        try { if (recorder.state === "recording") recorder.stop(); }
        finally {
          streamRef.current?.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
      } else {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  useEffect(() => () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
  }, [audioUrl]);

  const start = async () => {
    if (pendingRef.current || recorderRef.current !== null) return;
    if (!("MediaRecorder" in window) || !navigator.mediaDevices?.getUserMedia) {
      setMessage("Recording is not supported in this browser.");
      return;
    }
    pendingRef.current = true;
    setPending(true);
    setMessage("Waiting for microphone permission…");
    const request = ++requestRef.current;
    try {
      setAudioUrl("");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mountedRef.current || requestRef.current !== request) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      const chunks: Blob[] = [];
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (mountedRef.current && event.data.size) chunks.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        recorderRef.current = null;
        if (!mountedRef.current || requestRef.current !== request) return;
        const url = URL.createObjectURL(new Blob(chunks, { type: recorder.mimeType }));
        setAudioUrl(url);
        setRecording(false);
        setMessage("Play your recording, then compare it with the reference.");
      };
      recorder.start();
      setRecording(true);
      setMessage("Recording… say the phrase once.");
    } catch {
      if (!mountedRef.current || requestRef.current !== request) return;
      const recorder = recorderRef.current;
      if (recorder) {
        recorder.onstop = null;
        recorder.ondataavailable = null;
      }
      recorderRef.current = null;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setRecording(false);
      setMessage("Microphone access was not available. You can still practise aloud.");
    } finally {
      if (mountedRef.current && requestRef.current === request) {
        pendingRef.current = false;
        setPending(false);
      }
    }
  };

  const stop = () => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  };

  return (
    <div className="recorder">
      <button className={recording ? "button warning" : "button secondary"} type="button" disabled={pending} onClick={recording ? stop : () => void start()}>
        {recording ? "Stop recording" : "Record myself"}
      </button>
      {audioUrl ? <audio className="recording-playback" controls src={audioUrl} /> : null}
      {message ? <p className="small muted" role="status">{message}</p> : null}
    </div>
  );
}
