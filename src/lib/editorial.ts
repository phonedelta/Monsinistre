import { readFile } from 'node:fs/promises';
import path from 'node:path';
export const landings = {
  'incendie-habitation': {
    file: 'Landing Page — Accompagnement Incendie Habitation.md',
    type: 'INCENDIE_HABITATION',
    visual: 'habitation',
    eyebrow: 'INCENDIE HABITATION',
    title: 'Votre habitation a subi un incendie ? Ne gérez pas seul votre dossier d’assurance.',
    intro:
      'Si votre logement est assuré et que votre dossier est toujours en cours, Monsinistre vous accompagne dans l’évaluation des dommages et la défense de votre indemnisation.',
    cta: 'Faire analyser mon dossier incendie',
    final: 11,
  },
  'incendie-magasins': {
    file: 'Landing Page — Accompagnement Incendie Magasins _ Monsinistre.md',
    type: 'INCENDIE_COMMERCE',
    visual: 'commerce',
    eyebrow: 'MAGASINS & LOCAUX COMMERCIAUX',
    title: 'Votre magasin a subi un incendie ?',
    intro:
      'Si votre local est assuré et que votre dossier est toujours en cours, Monsinistre évalue vos dommages, documente vos pertes et vous accompagne dans le traitement technique du dossier avec votre assurance.',
    cta: 'Faire examiner mon dossier incendie',
    final: 13,
  },
  'expertise-prealable': {
    file: 'Landing Page — Expertise Préalable _ Monsinistre.md',
    type: 'EXPERTISE_PREALABLE',
    visual: 'prealable',
    eyebrow: 'EXPERTISE PRÉALABLE',
    title: 'Avant d’assurer vos biens de valeur, connaissez leur valeur réelle.',
    intro:
      'Bijoux, tableaux, œuvres d’art et objets de valeur : faites réaliser une expertise préalable pour identifier, évaluer et documenter vos biens avant de souscrire votre assurance.',
    cta: 'Demander mon expertise préalable',
    final: 10,
  },
} as const;

/* A section of a business page, read from its Markdown source and split into the parts the
   page lays out: a title, a lead, then lists, items (cards, numbered steps or a comparison)
   and callouts. The text itself is never rewritten. */
export type EditorialItem = { title: string; body: string; icon?: string; step?: string };
export type EditorialBlock =
  | { kind: 'list'; items: string[] }
  | { kind: 'items'; layout: 'cards' | 'steps' | 'compare'; items: EditorialItem[] }
  | { kind: 'callout'; title: string; body: string };
export type EditorialSection = {
  number: number;
  title: string;
  lead: string;
  blocks: EditorialBlock[];
  cta?: string;
};
const unbold = (text: string) => text.replace(/\*\*/g, '').trim();
const emoji = /^(\p{Extended_Pictographic})️?\s*/u;
function parseSection(text: string): Omit<EditorialSection, 'number' | 'cta'> {
  // The first `##` line is the title; `###` lines open the items that follow it.
  const [intro, ...chunks] = text.split(/^###\s+/m);
  let title = '';
  const lead: string[] = [];
  const blocks: EditorialBlock[] = [];
  const inline: EditorialItem[] = [];
  const flush = () => {
    if (inline.length) blocks.push({ kind: 'items', layout: 'cards', items: inline.splice(0) });
  };
  for (const paragraph of intro.split(/\n\s*\n/).map((p) => p.trim())) {
    if (!paragraph) continue;
    const heading = paragraph.match(/^##\s+(.*)$/);
    if (heading && !title) {
      title = unbold(heading[1]);
      continue;
    }
    const lines = paragraph.split('\n').map((line) => line.trim());
    const item = paragraph.match(/^\*\*(.+?)\*\*\s*\n([\s\S]+)$/);
    const icon = paragraph.match(emoji);
    if (lines.every((line) => line.startsWith('* '))) {
      flush();
      blocks.push({ kind: 'list', items: lines.map((line) => line.slice(2).trim()) });
    } else if (item) {
      // A bold line followed by its text: "**Tableaux**  \n Œuvres picturales…"
      const itemIcon = item[1].match(emoji);
      inline.push({
        title: item[1].replace(emoji, '').trim(),
        body: item[2].trim(),
        icon: itemIcon?.[1],
      });
    } else if (icon) {
      // A line led by a pictogram: "🔥 Votre magasin a subi un incendie."
      inline.push({ title: paragraph.replace(emoji, '').trim(), body: '', icon: icon[1] });
    } else {
      flush();
      lead.push(paragraph);
    }
  }
  flush();
  const items: EditorialItem[] = [];
  const callouts: EditorialBlock[] = [];
  for (const chunk of chunks) {
    const [heading, ...rest] = chunk.split('\n');
    const body = rest.join('\n').trim();
    const name = unbold(heading);
    // A heading whose whole text is one bold sentence is a statement to set apart.
    if (/^\*\*[^*]+\*\*$/.test(body)) {
      callouts.push({ kind: 'callout', title: name, body: unbold(body) });
      continue;
    }
    const step = name.match(/^(?:Étape\s+)?(\d+)\s*—\s*(.+)$/);
    items.push(
      step ? { title: step[2], body, step: step[1].padStart(2, '0') } : { title: name, body },
    );
  }
  if (items.length)
    blocks.push({
      kind: 'items',
      layout: items.every((item) => item.step)
        ? 'steps'
        : items.some((item) => item.body.includes('→'))
          ? 'compare'
          : 'cards',
      items,
    });
  return { title, lead: lead.join('\n\n'), blocks: [...blocks, ...callouts] };
}
export async function readEditorial(slug: keyof typeof landings): Promise<EditorialSection[]> {
  const data = landings[slug];
  const raw = await readFile(path.join(process.cwd(), 'content', data.file), 'utf8');
  return raw
    .split(/^#{1,2}\s+\*\*SECTION\s+/m)
    .slice(1)
    .flatMap((block) => {
      const number = Number(block.match(/^\d+/)?.[0]);
      if (number <= 1 || number >= data.final) return [];
      const text = block
        .replace(/^\d+\*\*[^\n]*\n/, '')
        .replace(/^###\s*\*\*Sous-titre\*\*\s*$/gm, '')
        .replace(/^###\s*$/gm, '');
      const parts = text.split(/^###\s*\*\*CTA\*\*\s*$/m);
      return [{ number, ...parseSection(parts[0].trim()), cta: parts[1] && unbold(parts[1]) }];
    });
}
