export const statusLabels = {
  NOUVEAU: 'Nouveau',
  A_VERIFIER: 'À vérifier',
  DOCUMENTS_REQUIS: 'Documents requis',
  DOSSIER_COMPLET: 'Dossier complet',
  ANALYSE_EN_COURS: 'Analyse en cours',
  RDV_A_PLANIFIER: 'Rendez-vous à planifier',
  EXPERTISE_PLANIFIEE: 'Expertise planifiée',
  EXPERTISE_EN_COURS: 'Expertise en cours',
  RAPPORT_EN_PREPARATION: 'Rapport en préparation',
  TERMINE: 'Terminé',
  ANNULE: 'Annulé',
  ARCHIVE: 'Archivé',
} as const;
export const typeLabels = {
  INCENDIE_HABITATION: 'Incendie habitation',
  INCENDIE_COMMERCE: 'Incendie commerce',
  EXPERTISE_PREALABLE: 'Expertise préalable',
  AUTRE_INCENDIE: 'Accompagnement incendie',
} as const;
export const contactLabels = {
  NOUVEAU: 'Nouveau',
  CONTACTE: 'Contacté',
  EN_COURS: 'En cours',
  CONVERTI: 'Converti en dossier',
  FERME: 'Fermé',
} as const;
export const terminalStatuses = ['TERMINE', 'ANNULE', 'ARCHIVE'] as const;
export const documentCategories = [
  'Photo',
  'Vidéo',
  'PDF',
  'Facture',
  'Rapport d’expertise',
  'Proposition d’indemnisation',
  'Certificat',
  'Inventaire',
  'Autre',
];
export const date = (value: Date | string) =>
  new Intl.DateTimeFormat('fr-MA', { dateStyle: 'medium', timeZone: 'Africa/Casablanca' }).format(
    new Date(value),
  );
