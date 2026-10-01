import ReactMarkdown from 'react-markdown';
import {
  Check,
  CircleCheck,
  CircleX,
  Droplets,
  Flame,
  FolderOpen,
  Hourglass,
  Info,
  ShieldCheck,
  Thermometer,
  Wind,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { EditorialBlock, EditorialSection } from '@/lib/editorial';
import { ButtonLink } from './ui';
import { Reveal } from './reveal';

// Pictograms written in the source text are drawn with the site's own icons.
const icons: Record<string, LucideIcon> = {
  '🔥': Flame,
  '🌫': Wind,
  '🌡': Thermometer,
  '💧': Droplets,
  '⚡': Zap,
  '🛡': ShieldCheck,
  '📂': FolderOpen,
  '⏳': Hourglass,
};
function Block({ block }: { block: EditorialBlock }) {
  if (block.kind === 'list')
    return (
      <Reveal as="ul" stagger className="check-list">
        {block.items.map((item) => (
          <li key={item}>
            <Check size={20} />
            <span>{item}</span>
          </li>
        ))}
      </Reveal>
    );
  if (block.kind === 'callout')
    return (
      <Reveal className="callout">
        <Info size={22} />
        <div>
          <h3>{block.title}</h3>
          <p>{block.body}</p>
        </div>
      </Reveal>
    );
  if (block.layout === 'steps')
    return (
      <Reveal as="ol" stagger className="step-list">
        {block.items.map((item) => (
          <li key={item.title}>
            <span>{item.step}</span>
            <div>
              <h3>{item.title}</h3>
              <ReactMarkdown>{item.body}</ReactMarkdown>
            </div>
          </li>
        ))}
      </Reveal>
    );
  if (block.layout === 'compare')
    return (
      <Reveal stagger className="compare">
        {block.items.map((item, i) => {
          // The source lists the situation to avoid first and the recommended one last.
          const best = i === block.items.length - 1;
          const Mark = best ? CircleCheck : CircleX;
          return (
            <div className={best ? 'compare-card best' : 'compare-card'} key={item.title}>
              <h3>{item.title}</h3>
              <ul>
                {item.body
                  .split('\n')
                  .map((line) => line.replace(/^\s*→\s*/, '').trim())
                  .filter(Boolean)
                  .map((line) => (
                    <li key={line}>
                      <Mark size={18} />
                      <span>{line}</span>
                    </li>
                  ))}
              </ul>
            </div>
          );
        })}
      </Reveal>
    );
  return (
    <Reveal stagger className="feature-grid">
      {block.items.map((item, i) => {
        const Icon = item.icon ? icons[item.icon] : undefined;
        return (
          <article className="feature" key={item.title}>
            {item.icon ? (
              <span className="feature-icon">
                {Icon ? <Icon size={22} strokeWidth={1.5} /> : item.icon}
              </span>
            ) : (
              <span className="feature-index">{String(i + 1).padStart(2, '0')}</span>
            )}
            <h3>{item.title}</h3>
            {item.body && <ReactMarkdown>{item.body}</ReactMarkdown>}
          </article>
        );
      })}
    </Reveal>
  );
}
/* The sections of a business page. A section with items shows its title beside them;
   a section that only states something becomes a centred card, light then dark in turn. */
export function EditorialSections({ sections }: { sections: EditorialSection[] }) {
  const statements = sections.filter((section) => !section.blocks.length);
  const split = sections.filter((section) => section.blocks.length);
  return sections.map((section, i) => {
    const number = <span className="editorial-number">{String(i + 1).padStart(2, '0')}</span>;
    const lead = section.lead && (
      <div className="prose">
        <ReactMarkdown>{section.lead}</ReactMarkdown>
      </div>
    );
    const cta = section.cta && <ButtonLink href="#demande">{section.cta}</ButtonLink>;
    if (!section.blocks.length)
      return (
        <section className="editorial-section" key={section.number}>
          <Reveal
            className={`container statement${statements.indexOf(section) % 2 ? ' dark' : ''}`}
          >
            {number}
            <h2>{section.title}</h2>
            {lead}
            {cta}
          </Reveal>
        </section>
      );
    return (
      <section
        className={`editorial-section${split.indexOf(section) % 2 ? ' pale' : ''}`}
        key={section.number}
      >
        <div className="container editorial-grid">
          <Reveal as="header" className="editorial-head">
            {number}
            <h2>{section.title}</h2>
            {lead}
          </Reveal>
          <div className="editorial-body">
            {section.blocks.map((block, n) => (
              <Block block={block} key={n} />
            ))}
            {cta}
          </div>
        </div>
      </section>
    );
  });
}
