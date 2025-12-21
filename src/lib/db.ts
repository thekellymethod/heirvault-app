import { supabaseServer } from "@/lib/supabase";

export type RegistryRecord = {
  id: string;
  status: string;
  insured_name: string;
  carrier_guess: string | null;
  created_at: string;
};

export type RegistryVersion = {
  id: string;
  registry_id: string;
  submitted_by: string;
  data_json: Record<string, any>;
  hash: string;
  created_at: string;
};

export type DocumentRow = {
  id: string;
  registry_version_id: string;
  storage_path: string;
  content_type: string;
  size_bytes: number;
  sha256: string;
  created_at: string;
};

export type AccessLogRow = {
  id: string;
  user_id: string | null;
  registry_id: string | null;
  action: string;
  metadata: Record<string, any> | null;
  created_at: string;
};

export async function createRegistryRecord(input: {
  insured_name: string;
  carrier_guess?: string | null;
}): Promise<RegistryRecord> {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from("registry_records")
    .insert({
      insured_name: input.insured_name.trim(),
      carrier_guess: input.carrier_guess?.trim() ?? null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as RegistryRecord;
}

export async function appendRegistryVersion(input: {
  registry_id: string;
  submitted_by: "INTAKE" | "TOKEN" | "ATTORNEY" | "SYSTEM";
  data_json: Record<string, any>;
  hash: string;
}): Promise<RegistryVersion> {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from("registry_versions")
    .insert({
      registry_id: input.registry_id,
      submitted_by: input.submitted_by,
      data_json: input.data_json,
      hash: input.hash,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as RegistryVersion;
}

export async function addDocumentRow(input: {
  registry_version_id: string;
  storage_path: string;
  content_type: string;
  size_bytes: number;
  sha256: string;
}): Promise<DocumentRow> {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from("documents")
    .insert({
      registry_version_id: input.registry_version_id,
      storage_path: input.storage_path,
      content_type: input.content_type,
      size_bytes: input.size_bytes,
      sha256: input.sha256,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as DocumentRow;
}

export async function getRegistryById(id: string): Promise<RegistryRecord | null> {
  const sb = supabaseServer();
  const { data, error } = await sb.from("registry_records").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data ?? null) as RegistryRecord | null;
}

export async function getRegistryVersions(registryId: string): Promise<RegistryVersion[]> {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from("registry_versions")
    .select("*")
    .eq("registry_id", registryId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as RegistryVersion[];
}

export async function getDocumentsForRegistry(registryId: string): Promise<DocumentRow[]> {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from("documents")
    .select("*, registry_versions!inner(registry_id)")
    .eq("registry_versions.registry_id", registryId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  // Supabase returns join shape; keep only DocumentRow fields
  return (data ?? []).map((d: any) => ({
    id: d.id,
    registry_version_id: d.registry_version_id,
    storage_path: d.storage_path,
    content_type: d.content_type,
    size_bytes: d.size_bytes,
    sha256: d.sha256,
    created_at: d.created_at,
  })) as DocumentRow[];
}

export async function listRegistries(limit = 50): Promise<RegistryRecord[]> {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from("registry_records")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as RegistryRecord[];
}

export async function logAccess(input: {
  user_id: string | null;
  registry_id?: string | null;
  action: string;
  metadata?: Record<string, any>;
}): Promise<void> {
  const sb = supabaseServer();
  const { error } = await sb.from("access_logs").insert({
    user_id: input.user_id,
    registry_id: input.registry_id ?? null,
    action: input.action,
    metadata: input.metadata ?? null,
  });
  if (error) throw error;
}

export async function constrainedSearch(input: {
  query: string;
  limit?: number;
}): Promise<RegistryRecord[]> {
  const sb = supabaseServer();
  const q = input.query.trim();
  const limit = input.limit ?? 25;

  // Constrained search: insured_name or carrier_guess only (v1)
  const { data, error } = await sb
    .from("registry_records")
    .select("*")
    .or(`insured_name.ilike.%${q}%,carrier_guess.ilike.%${q}%`)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as RegistryRecord[];
}
