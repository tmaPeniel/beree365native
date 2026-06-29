/**
 * Mapping des images des plans de lecture
 * Les images sont importées localement pour une meilleure performance
 */

import planChronologique12 from './plan-chronologique-12.jpg';
import planChronologique6 from './plan-chronologique-6.jpg';
import planCanonique12 from './plan-canonique-12.jpg';
import planCanonique6 from './plan-canonique-6.jpg';
import type { ImageSourcePropType } from 'react-native';

// Mapping des IDs de plans vers leurs images
export const planImages: Record<string, ImageSourcePropType> = {
  '8419b4f7-3dbd-4d97-a8de-5bf61bdec7cc': planChronologique12, // Chronologique 12 mois
  'eba4c6e0-dbac-42f2-83e8-bfc8c385bdb7': planChronologique6,  // Chronologique 06 mois
  'fa63f02b-7e58-4418-a0eb-58282fd8799d': planCanonique12,     // Canonique 12 mois
  '13348976-577b-4d1f-bedd-c4992dd488be': planCanonique6,      // Canonique 06 mois
};

/**
 * Récupère l'image d'un plan par son ID
 * @param planId - ID du plan de lecture
 * @returns URL de l'image ou undefined si non trouvée
 */
export const getPlanImage = (planId: string): ImageSourcePropType | undefined => {
  return planImages[planId];
};
