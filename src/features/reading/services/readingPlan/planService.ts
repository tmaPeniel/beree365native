import { supabase } from "@/integrations/supabase/client";
import { ReadingPlan } from "@/types/supabase";

export type ReadingPlanCatalogItem = ReadingPlan & {
  is_available: boolean;
};

const normalizeCatalogItem = (plan: ReadingPlan): ReadingPlanCatalogItem => ({
  ...plan,
  is_available: plan.is_active,
});

export const getReadingPlanCatalog = async (): Promise<ReadingPlanCatalogItem[]> => {
  try {
    const { data, error } = await (supabase as any)
      .rpc("get_reading_plan_catalog");

    if (!error && data) {
      return data.map((plan: ReadingPlanCatalogItem) => ({
        ...plan,
        is_available: plan.is_available ?? plan.is_active,
      }));
    }

    if (error && error.code !== "PGRST202") {
      throw error;
    }
  } catch (error) {
    console.warn("Catalogue complet des plans indisponible, repli sur les plans actifs:", error);
  }

  try {
    const { data, error } = await supabase
      .from("reading_plans")
      .select("*")
      .order("name");

    if (error) throw error;
    return (data || []).map((plan) => normalizeCatalogItem(plan as ReadingPlan));
  } catch (error) {
    console.error("Erreur lors de la recuperation du catalogue des plans:", error);
    return [];
  }
};

export const getAvailablePlans = async (): Promise<ReadingPlan[]> => {
  try {
    const { data, error } = await supabase
      .from("reading_plans")
      .select("*")
      .eq("is_active", true)
      .order("name");

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Erreur lors de la récupération des plans:", error);
    return [];
  }
};

export const getUserPlan = async (userId: string): Promise<ReadingPlan | null> => {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select(
        `
        selected_plan_id,
        reading_plans:selected_plan_id (
          id,
          name,
          description,
          duration_days,
          is_active,
          created_at,
          image_url
        )
      `
      )
      .eq("id", userId)
      .single();

    if (error) throw error;
    return (data?.reading_plans as ReadingPlan) || null;
  } catch (error) {
    console.error("Erreur lors de la récupération du plan utilisateur:", error);
    return null;
  }
};

export const changePlan = async (planId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase.rpc("change_user_plan", {
      new_plan_id: planId,
    });

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const getPlanById = async (planId: string): Promise<ReadingPlan | null> => {
  try {
    const { data, error } = await supabase
      .from("reading_plans")
      .select("*")
      .eq("id", planId)
      .eq("is_active", true)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Erreur lors de la récupération du plan:", error);
    return null;
  }
};
