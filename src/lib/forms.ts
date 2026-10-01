import { z } from 'zod';
import { normalizePhone } from './phone';
export type Field = {
  key: string;
  label: string;
  options?: string[];
  multiple?: boolean;
  kind?: 'date' | 'text';
  optional?: boolean;
};
export type Step = { title: string; fields: Field[] };
const yesNo = ['Oui', 'Non'];
const unsure = [...yesNo, 'Je ne sais pas'];
const insurance: Field[] = [
  { key: 'insured', label: 'Le bien était-il assuré au moment de l’incendie ?', options: unsure },
  { key: 'declared', label: 'Le sinistre a-t-il été déclaré à l’assurance ?', options: yesNo },
  { key: 'ongoing', label: 'Votre dossier est-il toujours en cours ?', options: unsure },
  {
    key: 'finalDecision',
    label: 'Avez-vous reçu une décision définitive ?',
    options: ['Non', 'Oui', 'Je ne sais pas'],
  },
  {
    key: 'firstEvaluation',
    label: 'Une première évaluation a-t-elle été réalisée ?',
    options: yesNo,
    optional: true,
  },
];
export const formSteps: Record<string, Step[]> = {
  INCENDIE_HABITATION: [
    {
      title: 'Situation',
      fields: [
        {
          key: 'property',
          label: 'Quel bien a subi l’incendie ?',
          options: ['Maison', 'Villa', 'Appartement', 'Autre habitation'],
        },
        { key: 'fireDate', label: 'Date de l’incendie', kind: 'date' },
      ],
    },
    { title: 'Assurance', fields: insurance },
    {
      title: 'Dommages',
      fields: [
        {
          key: 'problem',
          label: 'Quel est aujourd’hui votre principal problème ?',
          options: [
            'Je ne sais pas si tous les dommages ont été évalués',
            'L’évaluation me paraît insuffisante',
            'Je ne comprends pas la gestion de mon dossier',
            'Mon dossier prend du retard',
            'J’ai un désaccord avec l’assurance',
            'Autre',
          ],
        },
      ],
    },
    {
      title: 'Documents',
      fields: [
        {
          key: 'documents',
          label: 'Quels documents sont disponibles ?',
          multiple: true,
          optional: true,
          options: [
            'Photos / vidéos',
            'Rapport / expertise',
            'Proposition d’indemnisation',
            'Échanges avec l’assurance',
            'Plusieurs de ces documents',
            'Aucun pour le moment',
          ],
        },
      ],
    },
  ],
  INCENDIE_COMMERCE: [
    {
      title: 'Commerce',
      fields: [
        {
          key: 'commerce',
          label: 'Quel commerce a été touché ?',
          options: [
            'Alimentation',
            'Vêtements / tissus',
            'Équipements électriques / électroménager',
            'Pharmacie',
            'Commerce en marché / kissariat',
            'Autre commerce',
          ],
        },
        { key: 'fireDate', label: 'Date de l’incendie', kind: 'date' },
      ],
    },
    { title: 'Assurance', fields: insurance },
    {
      title: 'Dommages',
      fields: [
        {
          key: 'damages',
          label: 'Quels éléments ont été touchés ?',
          multiple: true,
          options: [
            'Stock / marchandises',
            'Équipements',
            'Mobilier et aménagement',
            'Installations électriques',
            'Local / bâtiment',
            'Plusieurs de ces éléments',
          ],
        },
        {
          key: 'problem',
          label: 'Quel problème rencontrez-vous actuellement ?',
          options: [
            'L’évaluation semble trop faible',
            'Certains dommages n’ont pas été pris en compte',
            'Je ne comprends pas l’évaluation',
            'Le traitement du dossier est bloqué / retardé',
            'Je souhaite faire vérifier mes pertes',
            'Autre',
          ],
        },
      ],
    },
    {
      title: 'Documents',
      fields: [
        {
          key: 'documents',
          label: 'Disposez-vous déjà de documents ?',
          multiple: true,
          optional: true,
          options: [
            'Photos / vidéos',
            'Inventaire du stock',
            'Factures',
            'Rapport d’expertise',
            'Proposition d’indemnisation',
            'Échanges avec l’assurance',
          ],
        },
      ],
    },
  ],
  EXPERTISE_PREALABLE: [
    {
      title: 'Vos biens',
      fields: [
        {
          key: 'assets',
          label: 'Quels biens souhaitez-vous faire expertiser ?',
          multiple: true,
          options: [
            'Bijoux',
            'Montres',
            'Tableaux',
            'Œuvres d’art',
            'Objets de valeur',
            'Plusieurs catégories',
            'Autre',
          ],
        },
        {
          key: 'quantity',
          label: 'Combien de biens ?',
          options: ['1 bien', '2 à 5 biens', '6 à 10 biens', 'Plus de 10 biens'],
        },
        {
          key: 'location',
          label: 'Où se trouvent actuellement ces biens ?',
          options: [
            'Villa / résidence principale',
            'Résidence secondaire',
            'Coffre / lieu sécurisé',
            'Autre',
          ],
        },
      ],
    },
    {
      title: 'Votre besoin',
      fields: [
        {
          key: 'objective',
          label: 'Pourquoi souhaitez-vous réaliser cette expertise ?',
          options: [
            'Avant de souscrire une assurance',
            'Avant de renouveler / revoir une couverture',
            'Pour connaître la valeur de mon patrimoine',
            'Avant une vente',
            'Autre',
          ],
        },
      ],
    },
    {
      title: 'Documents',
      fields: [
        {
          key: 'documents',
          label: 'Avez-vous des documents concernant ces biens ?',
          multiple: true,
          optional: true,
          options: [
            'Factures',
            'Certificats',
            'Anciennes expertises',
            'Photos / documents',
            'Aucun document',
            'Je ne sais pas',
          ],
        },
      ],
    },
    {
      title: 'Délai',
      fields: [
        {
          key: 'deadline',
          label: 'Quand souhaitez-vous réaliser l’expertise ?',
          options: [
            'Dès que possible',
            'Dans les prochaines semaines',
            'Dans les prochains mois',
            'Je me renseigne pour le moment',
          ],
        },
      ],
    },
  ],
};
export const phoneSchema = z.string().transform((value, ctx) => {
  try {
    return normalizePhone(value);
  } catch {
    ctx.addIssue({ code: 'custom', message: 'Numéro marocain invalide.' });
    return z.NEVER;
  }
});
export const passwordSchema = z
  .string()
  .min(12, 'Utilisez au moins 12 caractères.')
  .refine((v) => new TextEncoder().encode(v).length <= 72, '72 octets maximum.');
export const personSchema = z.object({
  fullName: z.string().trim().min(3).max(120),
  phone: phoneSchema,
  city: z.string().trim().min(2).max(100),
  businessName: z.string().trim().max(160).optional(),
});
export function validateAnswers(type: string, data: unknown) {
  const steps = formSteps[type];
  if (!steps) throw new Error('Service invalide.');
  const shape: Record<string, z.ZodType> = {};
  for (const field of steps.flatMap((s) => s.fields)) {
    let rule: z.ZodType;
    if (field.options) {
      const choice = z.string().refine((v) => field.options!.includes(v), 'Choix invalide.');
      rule = field.multiple
        ? z
            .array(choice)
            .min(field.optional ? 0 : 1)
            .max(field.options.length)
        : choice;
    } else if (field.kind === 'date')
      rule = z.iso
        .date()
        .refine(
          (v) => v <= new Date().toISOString().slice(0, 10),
          'La date ne peut pas être future.',
        );
    else rule = z.string().trim().min(1).max(500);
    shape[field.key] = field.optional ? rule.optional() : rule;
  }
  return z.object(shape).strict().parse(data);
}
export function reviewFlags(data: Record<string, unknown>) {
  return [
    data.insured === 'Non' ? 'Bien non assuré' : '',
    data.ongoing === 'Non' ? 'Dossier déjà clôturé' : '',
    data.finalDecision === 'Oui' ? 'Décision définitive reçue' : '',
  ].filter(Boolean);
}
export const fieldLabels = Object.fromEntries(
  Object.values(formSteps).flatMap((s) => s.flatMap((x) => x.fields.map((f) => [f.key, f.label]))),
);
