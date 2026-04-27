export interface TranscriptEntry {
  type: "log" | "status";
  message?: string;
  stream?: "stdout" | "stderr";
  status?: "running" | "success" | "error";
  timestamp: string;
}

export const type = "openrouter" as const;

export function parseTranscript(output: string): TranscriptEntry[] {
  const lines = output.split("\n");
  const entries: TranscriptEntry[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;

    if (line.includes("[openrouter] Completed.")) {
      entries.push({
        type: "status",
        message: line,
        status: "success",
        timestamp: new Date().toISOString(),
      });
      continue;
    }

    if (line.includes("[openrouter] API error:")) {
      entries.push({
        type: "status",
        message: line,
        status: "error",
        timestamp: new Date().toISOString(),
      });
      continue;
    }

    entries.push({
      type: "log",
      stream: line.includes("[openrouter]") ? "stdout" : "stderr",
      message: line,
      timestamp: new Date().toISOString(),
    });
  }

  return entries;
}
