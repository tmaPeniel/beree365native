/**
 * Utilitaires de détection de plateforme
 * Permet de détecter si on est sur Despia, Capacitor ou Web
 */

import { Capacitor } from '@capacitor/core';

/**
 * Vérifie si on est dans l'environnement Despia Native
 */
export const isDespiaNative = (): boolean => {
  return typeof window !== 'undefined' && (window as any).despia !== undefined;
};

/**
 * Vérifie si on est dans l'environnement Capacitor Native
 */
export const isCapacitorNative = (): boolean => {
  return Capacitor.isNativePlatform();
};

/**
 * Vérifie si on est sur le web (PWA ou navigateur)
 */
export const isWeb = (): boolean => {
  return !isDespiaNative() && !isCapacitorNative();
};

/**
 * Retourne le type de plateforme actuel
 */
export const getPlatform = (): 'despia' | 'capacitor' | 'web' => {
  if (isDespiaNative()) return 'despia';
  if (isCapacitorNative()) return 'capacitor';
  return 'web';
};

/**
 * Retourne le nom de la plateforme spécifique (ios, android, web)
 */
export const getPlatformName = (): 'ios' | 'android' | 'web' => {
  if (isWeb()) return 'web';
  
  const platform = Capacitor.getPlatform();
  return platform as 'ios' | 'android' | 'web';
};
