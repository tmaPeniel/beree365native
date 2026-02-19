/**
 * Service de gestion des plans de lecture
 */

import { supabase } from "@/integrations/supabase/client";
import { ReadingPlan } from '@/types/supabase';
import { toast } from "sonner";

/**
 * Récupère tous les plans de lecture actifs
 * @returns {Promise<ReadingPlan[]>} Liste des plans de lecture actifs
 */
export const getAvailablePlans = async (): Promise<ReadingPlan[]> => {
  try {
    const { data, error } = await supabase
      .from('reading_plans')
      .select('*')
      .eq('is_active', true)
      .order('name');
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Erreur lors de la récupération des plans:", error);
    toast.error("Impossible de charger les plans de lecture");
    return [];
  }
};

/**
 * Récupère le plan de lecture de l'utilisateur
 * @param {string} userId ID de l'utilisateur
 * @returns {Promise<ReadingPlan|null>} Le plan de lecture de l'utilisateur ou null
 */
export const getUserPlan = async (userId: string): Promise<ReadingPlan | null> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
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
      `)
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    return data?.reading_plans as ReadingPlan || null;
  } catch (error) {
    console.error("Erreur lors de la récupération du plan utilisateur:", error);
    return null;
  }
};

/**
 * Change le plan de lecture de l'utilisateur
 * Supprime toute la progression existante et remet à zéro
 * @param {string} planId ID du nouveau plan
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const changePlan = async (planId: string): Promise<{success: boolean, error?: string}> => {
  try {
    const { error } = await supabase.rpc('change_user_plan', {
      new_plan_id: planId
    });
    
    if (error) throw error;
    
    toast.success("Plan de lecture changé avec succès");
    return { success: true };
  } catch (error: any) {
    console.error("Erreur lors du changement de plan:", error);
    toast.error(`Erreur: ${error.message}`);
    return { success: false, error: error.message };
  }
};

/**
 * Récupère un plan spécifique par son ID
 * @param {string} planId ID du plan
 * @returns {Promise<ReadingPlan|null>} Le plan de lecture ou null
 */
export const getPlanById = async (planId: string): Promise<ReadingPlan | null> => {
  try {
    const { data, error } = await supabase
      .from('reading_plans')
      .select('*')
      .eq('id', planId)
      .eq('is_active', true)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Erreur lors de la récupération du plan:", error);
    return null;
  }
};