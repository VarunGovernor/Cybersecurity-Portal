"use client";
import { useState, useRef } from "react";
import { Upload, X, FileJson, CheckCircle, Loader2 } from "lucide-react";

interface UploadPanelProps {
  onClose: () => void;
  onIngest: (logs: any[]) => Promise<void>;
}

export function UploadPanel({ onClose, onIngest }: UploadPanelProps) {
  const [file, setFile]         = useState<File | null>(null);
  const [preview, setPreview]   = useState<any[] | null>(null);
  const [parsing, setParsing]   = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError]       = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (f: File) => {
    if (!f.name.endsWith(".json") && !f.name.endsWith(".jsonl")) {
      setError("Only .json or .jsonl files supported");
      return;
    }
    setFile(f);
    setError("");
    setParsing(true);
    try {
      const text = await f.text();
      let parsed: any[];
      if (f.name.endsWith(".jsonl")) {
        parsed = text.trim().split("\n").map((l) => JSON.parse(l));
      } else {
        const raw = JSON.parse(text);
        parsed = Array.isArray(raw) ? raw : [raw];
      }
      setPreview(parsed.slice(0, 3));
    } catch {
      setError("Failed to parse file — ensure valid JSON/JSONL");
    } finally {
      setParsing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleSubmit = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const text = await file.text();
      let logs: any[];
      if (file.name.endsWith(".jsonl")) {
        logs = text.trim().split("\n").map((l) => JSON.parse(l));
      } else {
        const raw = JSON.parse(text);
        logs = Array.isArray(raw) ? raw : [raw];
      }
      await onIngest(logs);
    } catch { setError("Ingestion failed"); }
    finally { setUploading(false); }
  };

  // Mock sample for demo
  const loadSample = () => {
    const sample = [
      { level: "error", source: "firewall", source_ip: "192.168.1.45", destination_ip: "10.0.0.1",
        destination_port: 22, protocol: "tcp", message: "Connection refused - SSH brute force detected",
        event_type: "authentication_failure", action: "blocked" },
      { level: "warning", source: "application", source_ip: "203.0.113.99",
        message: "SQL injection attempt: ' OR '1'='1 --", event_type: "sqli_attempt",
        action: "blocked", service: "web-api" },
      { level: "critical", source: "endpoint", source_ip: "10.0.5.12",
        message: "Mass file encryption detected — possible ransomware",
        event_type: "mass_encryption", action: "detected" },
    ];
    setPreview(sample);
    setFile(new File([JSON.stringify(sample)], "sample.json", { type: "application/json" }));
    setError("");
  };

  return (
    <div className="bg-card border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Upload size={14} className="text-primary" />
          Log Ingestion
        </h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X size={16} />
        </button>
      </div>

      <div className="p-5 space-y-4">
        {/* Drop zone */}
        <div
          className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/2 transition-colors"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".json,.jsonl"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          {parsing ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 size={24} className="animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Parsing file...</p>
            </div>
          ) : file ? (
            <div className="flex flex-col items-center gap-1.5">
              <CheckCircle size={22} className="text-green-500" />
              <p className="text-sm font-medium">{file.name}</p>
              <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5">
              <FileJson size={22} className="text-muted-foreground" />
              <p className="text-sm font-medium">Drop JSON / JSONL file here</p>
              <p className="text-xs text-muted-foreground">or click to browse</p>
            </div>
          )}
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        {/* Preview */}
        {preview && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Preview (first 3 records)
            </p>
            <div className="bg-muted/40 rounded-md p-3 overflow-x-auto scrollbar-thin">
              <pre className="text-[11px] font-mono text-foreground whitespace-pre-wrap">
                {JSON.stringify(preview, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={loadSample}
            className="text-xs px-3 py-1.5 border rounded-md hover:bg-accent transition-colors"
          >
            Load Sample Data
          </button>
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="text-xs px-3 py-1.5 border rounded-md hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            disabled={!file || uploading}
            onClick={handleSubmit}
            className="text-xs px-4 py-1.5 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-60 transition-colors flex items-center gap-1.5"
          >
            {uploading && <Loader2 size={12} className="animate-spin" />}
            {uploading ? "Ingesting..." : "Ingest Logs"}
          </button>
        </div>
      </div>
    </div>
  );
}
