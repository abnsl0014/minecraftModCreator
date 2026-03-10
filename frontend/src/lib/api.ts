const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface JobStatus {
  job_id: string;
  status: "queued" | "parsing" | "generating" | "compiling" | "fixing" | "complete" | "failed";
  progress_message: string;
  iteration: number;
  max_iterations: number;
  download_ready: boolean;
  jar_url: string | null;
  error: string | null;
  edition: "java" | "bedrock";
  can_edit: boolean;
}

export async function generateMod(
  description: string,
  modName?: string,
  authorName?: string,
  edition: string = "java"
): Promise<{ job_id: string }> {
  const res = await fetch(`${API_BASE}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      description,
      mod_name: modName || null,
      author_name: authorName || "ModCreator User",
      edition,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to start generation" }));
    throw new Error(err.detail || "Failed to start generation");
  }

  return res.json();
}

export async function getStatus(jobId: string): Promise<JobStatus> {
  const res = await fetch(`${API_BASE}/api/status/${jobId}`);

  if (!res.ok) {
    throw new Error("Failed to fetch status");
  }

  return res.json();
}

export async function editMod(
  jobId: string,
  editDescription: string
): Promise<{ job_id: string }> {
  const res = await fetch(`${API_BASE}/api/edit/${jobId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ edit_description: editDescription }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to start edit" }));
    throw new Error(err.detail || "Failed to start edit");
  }

  return res.json();
}

export function getDownloadUrl(jobId: string): string {
  return `${API_BASE}/api/download/${jobId}`;
}
