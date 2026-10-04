"use client";

import { useRef, useState } from "react";
import { createBackup, MAX_BACKUP_BYTES, parseBackup, restoreBackup, type LocalBackup } from "@/lib/backup";

export function LocalBackup() {
  const fileRequest = useRef(0);
  const [preview, setPreview] = useState<LocalBackup | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const report = (text: string, failed = false) => { setMessage(text); setError(failed); };
  const exportFile = () => {
    try {
      const backup = createBackup(window.localStorage);
      const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }));
      const anchor = document.createElement("a");
      anchor.href = url; anchor.download = `kannada-buddy-${backup.exportedAt.slice(0, 10)}.json`;
      document.body.append(anchor); anchor.click(); anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      report("Backup downloaded. Keep it somewhere safe; it contains your learning history.");
    } catch { report("Could not export your data. Check browser storage permissions and stored data.", true); }
  };
  const chooseFile = async (file: File | undefined) => {
    const request = ++fileRequest.current;
    setPreview(null); setMessage("");
    if (!file) return;
    try {
      if (file.size > MAX_BACKUP_BYTES) throw new Error("Backup is too large (maximum 5 MB).");
      const parsed = parseBackup(await file.text());
      if (request === fileRequest.current) setPreview(parsed);
    } catch (cause) { if (request === fileRequest.current) report(cause instanceof Error ? cause.message : "Could not read backup.", true); }
  };
  const restore = () => {
    if (!preview) return;
    try {
      restoreBackup(preview, window.localStorage, (event) => window.dispatchEvent(new Event(event)));
      setPreview(null); report("Backup restored on this browser. No data was sent to a server.");
    } catch (cause) { report(cause instanceof Error ? cause.message : "Could not restore backup.", true); }
  };
  return (
    <section className="panel settings-section" aria-labelledby="backup-title">
      <div>
        <h2 id="backup-title">Back up your progress</h2>
        <p className="small muted">Progress stays in this browser. Download a backup to move it manually to another device or recover after clearing browser data. There is no automatic sync.</p>
        <p className="small muted">Includes learning history and settings. Admin edits and passwords are excluded.</p>
      </div>
      <button className="button secondary" type="button" onClick={exportFile}>Download backup</button>
      <label className="small" htmlFor="backup-file">Choose a backup to restore</label>
      <input id="backup-file" type="file" accept=".json,application/json" onChange={(event) => { void chooseFile(event.target.files?.[0]); event.target.value = ""; }} />
      {preview ? <div>
        <p>Backup from {new Date(preview.exportedAt).toLocaleString()}: {Object.keys(preview.data.learning?.concepts ?? {}).length} practised concepts.</p>
        {preview.data.learning === null && preview.data.legacyProgress ? <p className="small">{Object.keys(preview.data.legacyProgress).length} legacy phrase records will migrate after restore.</p> : null}
        <p className="small">Restoring replaces learning history and settings in this browser, including any newer progress. Keep a current backup first.</p>
        <button className="button" type="button" onClick={restore}>Restore backup</button>{" "}
        <button className="button secondary" type="button" onClick={() => { fileRequest.current += 1; setPreview(null); }}>Cancel restore</button>
      </div> : null}
      {message ? <p className="small" role={error ? "alert" : "status"}>{message}</p> : null}
    </section>
  );
}
