export type Profile = { id: string; vorname: string | null; name: string; ortswehr: string | null; role?: string };
export type Teilnehmer = { id: string; vorname: string; name: string; ortswehr: string };
export type Termin = { id: string; titel: string; datum: string; uhrzeit: string | null; hinweis: string | null };
export type Rueckmeldung = {
  termin_id: string; profile_id: string | null; teilnehmer_id: string | null;
  teilnehmer_vorname: string | null; teilnehmer_name: string | null;
  teilnehmer_ortswehr: string | null; status: string;
  rolle: "pa_traeger" | "maschinist" | "beide" | null;
};

export type SharedData = { profiles: Profile[]; teilnehmer: Teilnehmer[]; termine: Termin[]; rueckmeldungen: Rueckmeldung[] };
export type AdminSession = { token: string; user: { id: string; email: string }; profile: Profile };
export type TeilnehmerSession = Teilnehmer & { token: string };

const API_URL = "https://termine.feuerwehrfelm.de/api";
const ADMIN_KEY = "terminabfrage_admin_session_v1";
const TEILNEHMER_KEY = "teilnahme_session_v2";

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
  });
  const payload = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) throw new ApiError(payload.error || "Die Anfrage ist fehlgeschlagen.", response.status);
  return payload as T;
}

export const loadSharedData = () => request<SharedData>("/data");

export async function login(email: string, password: string) {
  const session = await request<AdminSession>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
  localStorage.setItem(ADMIN_KEY, JSON.stringify(session));
  return session;
}

export function getAdminSession(): AdminSession | null {
  try { return JSON.parse(localStorage.getItem(ADMIN_KEY) || "null") as AdminSession | null; } catch { return null; }
}

export function logoutAdmin() { localStorage.removeItem(ADMIN_KEY); }

export async function startTeilnahme(vorname: string, name: string, ortswehr: string, code: string) {
  const session = await request<TeilnehmerSession>("/teilnahme/session", { method: "POST", body: JSON.stringify({ vorname, name, ortswehr, code }) });
  localStorage.setItem(TEILNEHMER_KEY, JSON.stringify(session));
  return session;
}

export function getTeilnehmerSession(): TeilnehmerSession | null {
  try { return JSON.parse(localStorage.getItem(TEILNEHMER_KEY) || "null") as TeilnehmerSession | null; } catch { return null; }
}

export function logoutTeilnehmer() { localStorage.removeItem(TEILNEHMER_KEY); }

export function saveRueckmeldung(token: string, payload: Omit<Rueckmeldung, "teilnehmer_vorname" | "teilnehmer_name" | "teilnehmer_ortswehr">) {
  return request<{ status: "saved" }>("/rueckmeldungen", { method: "PUT", body: JSON.stringify(payload) }, token);
}

export function updateProfile(token: string, profile: Pick<Profile, "vorname" | "name" | "ortswehr">) {
  return request<{ profile: Profile }>("/profile", { method: "PUT", body: JSON.stringify(profile) }, token);
}

export function createTermin(token: string, termin: Omit<Termin, "id">) {
  return request<{ id: string }>("/termine", { method: "POST", body: JSON.stringify(termin) }, token);
}

export function deleteTermin(token: string, id: string) {
  return request<{ status: "deleted" }>(`/termine/${encodeURIComponent(id)}`, { method: "DELETE" }, token);
}
