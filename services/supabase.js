import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function saveMemory(userId, message, response) {
  await supabase.from("ai_memory").insert([
    { user_id: userId, message, response }
  ]);
}

export async function getMemory(userId) {
  const { data } = await supabase
    .from("ai_memory")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(10);

  return data || [];
}
