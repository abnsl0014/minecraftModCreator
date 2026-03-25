import { getAuthToken } from "./supabase";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function authHeaders(): Promise<HeadersInit> {
  const token = await getAuthToken();
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

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
  mod_id: string | null;
  model_used: string;
}

export interface CustomTexture {
  registry_name: string;
  custom_texture: string;
}

export async function generateMod(
  description: string,
  modName?: string,
  authorName?: string,
  edition: string = "java",
  customTextures?: CustomTexture[],
  model: string = "gpt-oss-120b",
): Promise<{ job_id: string }> {
  const res = await fetch(`${API_BASE}/api/generate`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({
      description,
      mod_name: modName || null,
      author_name: authorName || "ModCreator User",
      edition,
      custom_textures: customTextures?.length ? customTextures : null,
      model,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to start generation" }));
    const detail = err.detail;
    const message = typeof detail === "string" ? detail : detail?.message || "Failed to start generation";
    throw new Error(message);
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

export interface GalleryMod {
  id: string;
  name: string;
  description: string;
  author: string;
  edition: "java" | "bedrock";
  created_at: string;
  download_url: string;
  model_used: string;
  item_count: number;
  block_count: number;
}

export interface GalleryResponse {
  mods: GalleryMod[];
  total: number;
}

export async function getGalleryMods(
  sort: string = "recent",
  edition: string = "all",
  limit: number = 20,
  offset: number = 0,
): Promise<GalleryResponse> {
  const params = new URLSearchParams({ sort, edition, limit: String(limit), offset: String(offset) });
  const res = await fetch(`${API_BASE}/api/gallery?${params}`);
  if (!res.ok) throw new Error("Failed to fetch gallery");
  return res.json();
}

export interface MyMod extends GalleryMod {
  status: string;
}

export interface MyModsResponse {
  mods: MyMod[];
  total: number;
}

// ---- User / Token APIs ----

export interface UserProfile {
  token_balance: number;
  tier: string;
  created_at?: string;
}

export interface TokenTransaction {
  id: string;
  amount: number;
  reason: string;
  created_at: string;
}

export async function getUserProfile(): Promise<UserProfile> {
  const res = await fetch(`${API_BASE}/api/user/profile`, {
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch profile");
  return res.json();
}

export async function getTokenHistory(
  limit: number = 20,
  offset: number = 0,
): Promise<{ transactions: TokenTransaction[]; total: number }> {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  const res = await fetch(`${API_BASE}/api/user/tokens/history?${params}`, {
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch token history");
  return res.json();
}

// ---- Browse External Mods API ----

export interface ExternalMod {
  id: string;
  name: string;
  description: string;
  author: string;
  icon_url: string | null;
  downloads: number;
  follows: number;
  categories: string[];
  game_versions: string[];
  source: "modrinth" | "curseforge";
  url: string;
  created_at: string | null;
  updated_at: string | null;
}

export async function searchExternalMods(
  query: string = "",
  source: string = "modrinth",
  limit: number = 20,
  offset: number = 0,
): Promise<{ mods: ExternalMod[]; total: number }> {
  const params = new URLSearchParams({ q: query, source, limit: String(limit), offset: String(offset) });
  const res = await fetch(`${API_BASE}/api/browse/search?${params}`);
  if (!res.ok) throw new Error("Failed to search mods");
  return res.json();
}

// ---- My Mods API ----

export async function getMyMods(
  limit: number = 20,
  offset: number = 0,
): Promise<MyModsResponse> {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  const res = await fetch(`${API_BASE}/api/gallery/my-mods?${params}`, {
    headers: await authHeaders(),
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error("Please sign in to view your mods");
    throw new Error("Failed to fetch your mods");
  }
  return res.json();
}
