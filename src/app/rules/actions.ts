"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { AlertDirection, AlertType } from "@/lib/types";

export async function createRule(formData: FormData) {
  const supabase = getSupabaseAdmin();

  const item_id = String(formData.get("item_id"));
  const type = String(formData.get("type")) as AlertType;
  const direction = String(formData.get("direction")) as AlertDirection;
  const threshold = Number(formData.get("threshold"));
  const cooldown_minutes = Number(formData.get("cooldown_minutes"));

  if (!item_id || !type || !direction || !Number.isFinite(threshold)) {
    throw new Error("Champs de règle invalides");
  }

  const { error } = await supabase.from("alert_rules").insert({
    item_id,
    type,
    direction,
    threshold,
    cooldown_minutes: Number.isFinite(cooldown_minutes) ? cooldown_minutes : 60,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/rules");
}

export async function deleteRule(formData: FormData) {
  const supabase = getSupabaseAdmin();
  const id = String(formData.get("id"));

  const { error } = await supabase.from("alert_rules").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/rules");
}

export async function toggleRule(formData: FormData) {
  const supabase = getSupabaseAdmin();
  const id = String(formData.get("id"));
  const enabled = formData.get("enabled") === "true";

  const { error } = await supabase
    .from("alert_rules")
    .update({ enabled: !enabled })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/rules");
}
