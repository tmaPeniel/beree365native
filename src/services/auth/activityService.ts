
/**
 * Service pour gérer l'activité des utilisateurs
 */

import { supabase } from "@/integrations/supabase/client";

/**
 * Met à jour l'activité de l'utilisateur (last_login_at)
 * @param userId ID de l'utilisateur
 */
export const updateUserActivity = async (userId: string): Promise<void> => {
  try {
    const { error } = await supabase.rpc('update_user_activity', {
      p_user_id: userId
    });
    
    if (error) {
      console.error("Erreur lors de la mise à jour de l'activité utilisateur:", error);
    }
  } catch (error) {
    console.error("Erreur lors de l'appel de update_user_activity:", error);
  }
};

/**
 * Système de heartbeat pour maintenir l'activité utilisateur
 * Met à jour l'activité maximum une fois par heure
 */
export class ActivityHeartbeat {
  private static instance: ActivityHeartbeat;
  private lastUpdateTime: number = 0;
  private readonly UPDATE_INTERVAL = 60 * 60 * 1000; // 1 heure en millisecondes
  private heartbeatTimer: NodeJS.Timeout | null = null;

  private constructor() {}

  static getInstance(): ActivityHeartbeat {
    if (!ActivityHeartbeat.instance) {
      ActivityHeartbeat.instance = new ActivityHeartbeat();
    }
    return ActivityHeartbeat.instance;
  }

  /**
   * Démarre le système de heartbeat
   * @param userId ID de l'utilisateur
   */
  start(userId: string): void {
    if (this.heartbeatTimer) {
      this.stop();
    }

    // Mise à jour immédiate si la dernière mise à jour remonte à plus d'une heure
    const now = Date.now();
    if (now - this.lastUpdateTime > this.UPDATE_INTERVAL) {
      this.updateActivity(userId);
    }

    // Programmer les mises à jour périodiques
    this.heartbeatTimer = setInterval(() => {
      this.updateActivity(userId);
    }, this.UPDATE_INTERVAL);
  }

  /**
   * Arrête le système de heartbeat
   */
  stop(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Force une mise à jour de l'activité (avec throttling)
   * @param userId ID de l'utilisateur
   */
  forceUpdate(userId: string): void {
    const now = Date.now();
    // Éviter les mises à jour trop fréquentes (minimum 5 minutes)
    if (now - this.lastUpdateTime > 5 * 60 * 1000) {
      this.updateActivity(userId);
    }
  }

  private async updateActivity(userId: string): Promise<void> {
    try {
      await updateUserActivity(userId);
      this.lastUpdateTime = Date.now();
      console.log("Activité utilisateur mise à jour via heartbeat");
    } catch (error) {
      console.error("Erreur lors de la mise à jour heartbeat:", error);
    }
  }
}
