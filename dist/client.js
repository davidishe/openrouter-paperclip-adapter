export const type = "openrouter";
export function parseTranscript(output) {
    const lines = output.split("\n");
    const entries = [];
    for (const line of lines) {
        if (!line.trim())
            continue;
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
//# sourceMappingURL=client.js.map