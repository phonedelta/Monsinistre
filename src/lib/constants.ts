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
// Shown by the request form when the request could not be saved (server or network failure).
export const submissionFailed =
  'Une erreur est survenue. Votre demande n’a pas été envoyée. Veuillez réessayer.';
export const terminalStatuses = ['TERMINE', 'ANNULE', 'ARCHIVE'] as const;
/* The path of a dossier in five steps, drawn at the top of its page. Each status that moves a
   dossier forward belongs to one step; a cancelled or archived dossier is on none of them. */
export const statusStages: { label: string; statuses: (keyof typeof statusLabels)[] }[] = [
  { label: 'Réception', statuses: ['NOUVEAU', 'A_VERIFIER'] },
  { label: 'Étude', statuses: ['DOCUMENTS_REQUIS', 'DOSSIER_COMPLET', 'ANALYSE_EN_COURS'] },
  {
    label: 'Expertise',
    statuses: ['RDV_A_PLANIFIER', 'EXPERTISE_PLANIFIEE', 'EXPERTISE_EN_COURS'],
  },
  { label: 'Rapport', statuses: ['RAPPORT_EN_PREPARATION'] },
  { label: 'Terminé', statuses: ['TERMINE'] },
];
export const documentCategories = [
  'Photo',
  'Vidéo',
  'PDF',
  'Facture',
  'Rapport d’expertise',
  'Proposition d’indemnisation',
  'Certificat',
  'Inventaire',
  'Échanges avec l’assurance',
  'Autre',
];
// Files accepted as documents, 20 MB at most. The browser checks the declared type before
// sending; the server checks the content itself.
export const documentTypes = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'video/mp4',
  'video/quicktime',
];
export const documentMaxSize = 20 * 1024 * 1024;
export const date = (value: Date | string) =>
  new Intl.DateTimeFormat('fr-MA', { dateStyle: 'medium', timeZone: 'Africa/Casablanca' }).format(
    new Date(value),
  );
export const time = (value: Date | string) =>
  new Intl.DateTimeFormat('fr-MA', { timeStyle: 'short', timeZone: 'Africa/Casablanca' }).format(
    new Date(value),
  );
export const fileSize = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} Ko`
    : `${(bytes / 1024 / 1024).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} Mo`;
