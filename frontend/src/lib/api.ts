import { getAuthToken } from "./supabase";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

async function authHeaders(): Promise<HeadersInit> {
  const token = await getAuthToken();
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

export interface TexturePreviewItem {
  name: string;
  registry_name: string;
  type: string;
  texture: string; // base64 data URL
}

export interface TexturePreviews {
  items: TexturePreviewItem[];
  blocks: TexturePreviewItem[];
}

export interface JobStatus {
  job_id: string;
  status: "queued" | "parsing" | "generating" | "packaging" | "complete" | "failed";
  progress_message: string;
  download_ready: boolean;
  jar_url: string | null;
  error: string | null;
  edition: "java" | "bedrock";
  can_edit: boolean;
  mod_id: string | null;
  model_used: string;
  texture_previews: TexturePreviews | null;
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
  const res = await fetch(`${API_BASE}/api/status/${jobId}`, {
    headers: await authHeaders(),
  });

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
    headers: await authHeaders(),
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

export async function getPreview(jobId: string) {
  const res = await fetch(`${API_BASE}/api/preview/${jobId}`, {
    headers: await authHeaders(),
  });

  if (!res.ok) {
    throw new Error("Failed to fetch preview");
  }

  return res.json();
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
  subscription_status?: string;
  billing_period?: string | null;
  is_admin?: boolean;
  display_name?: string | null;
  earnings_balance?: number;
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

// ---- Browse: Mod Details + Download ----

export interface ModVersion {
  id: string;
  name: string;
  version_number: string;
  game_versions: string[];
  loaders: string[];
  download_url: string | null;
  filename: string;
  size: number;
  date_published: string | null;
  third_party_allowed?: boolean;
}

export interface ModDetails {
  id: string;
  name: string;
  description: string;
  body: string;
  author: string;
  icon_url: string | null;
  downloads: number;
  source: "modrinth" | "curseforge";
  url: string;
  versions: ModVersion[];
}

export async function getModDetails(
  source: string,
  modId: string,
): Promise<ModDetails> {
  const res = await fetch(`${API_BASE}/api/browse/mod/${source}/${modId}`);
  if (!res.ok) throw new Error("Failed to fetch mod details");
  return res.json();
}

export async function getModDownloadUrl(
  source: string,
  modId: string,
  versionId: string,
): Promise<string> {
  const token = await getAuthToken();
  const url = `${API_BASE}/api/browse/mod/${source}/${modId}/download?version_id=${versionId}`;
  if (token) {
    return `${url}&token=${encodeURIComponent(token)}`;
  }
  return url;
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

// ---- Subscription APIs ----

export interface SubscriptionStatus {
  tier: string;
  subscription_status: string;
  billing_period: string | null;
  subscription_expires_at: string | null;
}

export async function createCheckoutSession(
  plan: string,
  returnUrl?: string,
): Promise<{ checkout_url: string; session_id: string }> {
  const res = await fetch(`${API_BASE}/api/subscriptions/checkout`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ plan, return_url: returnUrl }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Checkout failed" }));
    throw new Error(typeof err.detail === "string" ? err.detail : "Checkout failed");
  }
  return res.json();
}

export async function getSubscriptionStatus(): Promise<SubscriptionStatus> {
  const res = await fetch(`${API_BASE}/api/subscriptions/status`, {
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch subscription status");
  return res.json();
}

export async function cancelSubscription(): Promise<{ status: string }> {
  const res = await fetch(`${API_BASE}/api/subscriptions/cancel`, {
    method: "POST",
    headers: await authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Cancel failed" }));
    throw new Error(typeof err.detail === "string" ? err.detail : "Cancel failed");
  }
  return res.json();
}

// ---- Submission APIs ----

export interface Submission {
  id: string;
  user_id: string;
  job_id: string | null;
  title: string;
  description: string;
  edition: "java" | "bedrock";
  category: "weapon" | "tool" | "armor" | "food" | "block" | "ability";
  tags: string[];
  screenshots: string[];
  video_url: string | null;
  download_url: string;
  crafting_recipe: Record<string, unknown> | null;
  survival_guide: string | null;
  status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
  download_count: number;
  featured: boolean;
  created_at: string;
  updated_at: string;
  author_name?: string;
}

export interface GalleryItem {
  id: string;
  name: string;
  description: string;
  edition: "java" | "bedrock";
  author: string;
  category: string;
  created_at: string;
  download_url: string;
  download_count: number;
  featured: boolean;
  screenshots: string[];
  tags: string[];
  source: "submission" | "ai_generated";
}

export interface GalleryListResponse {
  mods: GalleryItem[];
  total: number;
}

export async function getGalleryItems(
  sort: string = "recent",
  edition: string = "all",
  category: string = "all",
  limit: number = 20,
  offset: number = 0,
): Promise<GalleryListResponse> {
  const params = new URLSearchParams({ sort, edition, category, limit: String(limit), offset: String(offset) });
  const res = await fetch(`${API_BASE}/api/gallery?${params}`);
  if (!res.ok) throw new Error("Failed to fetch gallery");
  return res.json();
}

export async function submitMod(formData: FormData): Promise<{ id: string; status: string }> {
  const token = await getAuthToken();
  const headers: HeadersInit = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  // Don't set Content-Type — browser sets multipart boundary automatically

  const res = await fetch(`${API_BASE}/api/submissions`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Submission failed" }));
    throw new Error(typeof err.detail === "string" ? err.detail : "Submission failed");
  }
  return res.json();
}

export async function getMySubmissions(
  limit: number = 20,
  offset: number = 0,
): Promise<{ submissions: Submission[]; total: number; earnings_balance: number }> {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  const res = await fetch(`${API_BASE}/api/submissions/my?${params}`, {
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch submissions");
  return res.json();
}

export async function getSubmission(id: string): Promise<Submission> {
  const res = await fetch(`${API_BASE}/api/submissions/${id}`, {
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error("Submission not found");
  return res.json();
}

export async function updateSubmission(
  id: string,
  updates: Partial<Pick<Submission, "title" | "description" | "edition" | "category" | "tags" | "video_url" | "crafting_recipe" | "survival_guide">>,
): Promise<Submission> {
  const res = await fetch(`${API_BASE}/api/submissions/${id}`, {
    method: "PUT",
    headers: await authHeaders(),
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error("Failed to update submission");
  return res.json();
}

export async function deleteSubmission(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/submissions/${id}`, {
    method: "DELETE",
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to delete submission");
}

export async function trackDownload(
  submissionId: string,
): Promise<{ download_url: string; counted: boolean }> {
  const res = await fetch(`${API_BASE}/api/submissions/${submissionId}/download`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Download failed");
  return res.json();
}

// ---- Admin APIs ----

export async function getAdminSubmissions(
  status: string = "pending",
  limit: number = 50,
  offset: number = 0,
): Promise<{ submissions: Submission[]; total: number }> {
  const params = new URLSearchParams({ status, limit: String(limit), offset: String(offset) });
  const res = await fetch(`${API_BASE}/api/admin/submissions?${params}`, {
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch admin submissions");
  return res.json();
}

export async function approveSubmission(
  id: string,
  featured: boolean = false,
): Promise<Submission> {
  const params = new URLSearchParams({ featured: String(featured) });
  const res = await fetch(`${API_BASE}/api/admin/submissions/${id}/approve?${params}`, {
    method: "POST",
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to approve");
  return res.json();
}

export async function rejectSubmission(
  id: string,
  reason: string,
): Promise<Submission> {
  const res = await fetch(`${API_BASE}/api/admin/submissions/${id}/reject`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) throw new Error("Failed to reject");
  return res.json();
}

export async function toggleFeatured(id: string): Promise<Submission> {
  const res = await fetch(`${API_BASE}/api/admin/submissions/${id}/feature`, {
    method: "POST",
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to toggle featured");
  return res.json();
}

// ---- Public Profile API ----

export interface PublicProfile {
  user_id: string;
  display_name: string;
  joined_at: string;
  total_mods: number;
  total_downloads: number;
  mods: {
    id: string;
    title: string;
    description: string;
    edition: string;
    category: string;
    download_count: number;
    featured: boolean;
    screenshots: string[];
    created_at: string;
  }[];
}

export async function getPublicProfile(userId: string): Promise<PublicProfile> {
  const res = await fetch(`${API_BASE}/api/user/${userId}/public`);
  if (!res.ok) throw new Error("Profile not found");
  return res.json();
}

// ---- Skin Generation API ----

export interface SkinResult {
  skin_id: string;
  texture: string; // base64 data URL of 64x64 PNG
  description: string;
}

export async function generateSkin(
  description: string,
  model: string = "gpt-oss-120b",
): Promise<SkinResult> {
  const res = await fetch(`${API_BASE}/api/skins/generate`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ description, model }),
  });
  if (!res.ok) throw new Error("Skin generation failed");
  return res.json();
}
