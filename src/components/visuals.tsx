import type { CSSProperties } from 'react';
import { BadgeCheck, FolderCheck, ShieldCheck } from 'lucide-react';

/* Illustrations of the site: technical line drawings on a 560 × 440 sheet, whose strokes
   draw themselves, with callouts placed on the points they describe (styles/public.css). */

const order = (i: number) => ({ '--i': i }) as CSSProperties;

// A stroke that draws itself; `i` orders the strokes of a drawing.
function Line({
  d,
  i = 0,
  soft,
  accent,
}: {
  d: string;
  i?: number;
  soft?: boolean;
  accent?: boolean;
}) {
  return (
    <path
      className={`bp-draw${soft ? ' bp-soft' : ''}${accent ? ' bp-accent' : ''}`}
      d={d}
      pathLength={1}
      style={order(i)}
    />
  );
}

function House() {
  return (
    <>
      <path className="bp-fill" d="M168 150H404V372H168ZM72 238H168V372H72ZM404 262H492V372H404Z" />
      <path className="bp-fill" d="M156 138H416V150H156ZM62 228H168V238H62ZM404 252H500V262H404Z" />
      <path
        className="bp-tint"
        d="M196 236V196A18 18 0 0 1 232 196V236ZM268 236V196A18 18 0 0 1 304 196V236ZM340 236V196A18 18 0 0 1 376 196V236ZM104 330V296A16 16 0 0 1 136 296V330ZM424 300H472V344H424ZM242 372V292A20 20 0 0 1 282 292V372Z"
      />
      <Line i={0} d="M24 372H536" />
      <Line i={1} d="M168 372V150H404V372" />
      <Line i={2} d="M156 150V138H416V150Z" />
      <Line i={3} d="M168 238H72V372" />
      <Line i={4} d="M168 228H62V238H168" />
      <Line i={5} d="M404 262H492V372" />
      <Line i={6} d="M404 252H500V262H404" />
      <Line i={7} soft d="M168 262H404" />
      <Line i={8} d="M234 372V292A28 28 0 0 1 290 292V372" />
      <Line i={9} d="M242 372V292A20 20 0 0 1 282 292V372M262 272V372" />
      <Line i={10} d="M196 236V196A18 18 0 0 1 232 196V236ZM214 178V236" />
      <Line i={11} d="M268 236V196A18 18 0 0 1 304 196V236ZM286 178V236" />
      <Line i={12} d="M340 236V196A18 18 0 0 1 376 196V236ZM358 178V236" />
      <Line i={13} d="M186 244H386" />
      <Line i={14} d="M104 330V296A16 16 0 0 1 136 296V330ZM120 280V330" />
      <Line i={15} d="M424 300H472V344H424ZM448 300V344M424 322H472" />
      <Line
        i={16}
        d="M330 138V106M404 138V106M320 106H414M320 98H414M334 98V106M350 98V106M366 98V106M382 98V106M398 98V106"
      />
      <Line i={17} d="M522 372C519 344 525 320 520 296" />
      <Line
        i={18}
        d="M520 296C506 284 492 286 484 298M520 296C510 276 494 270 484 276M520 296C518 276 526 264 538 260M520 296C532 282 546 284 552 296M520 296C534 292 544 300 548 310"
      />
      <Line i={19} soft d="M44 228V372M38 228H50M38 372H50" />
      <circle className="bp-ink" cx="257" cy="334" r="2" />
      <circle className="bp-ink" cx="267" cy="334" r="2" />
    </>
  );
}

function Shop() {
  return (
    <>
      <path className="bp-fill" d="M112 132H448V372H112ZM100 120H460V132H100Z" />
      <path className="bp-fill" d="M104 190L88 228H472L456 190Z" />
      <path className="bp-tint" d="M136 262H292V350H136ZM348 266H404V336H348Z" />
      <rect className="bp-tint" x="212" y="148" width="136" height="28" rx="8" />
      <Line i={0} d="M24 372H536" />
      <Line i={1} d="M112 372V132H448V372" />
      <Line i={2} d="M100 132V120H460V132Z" />
      <Line i={3} d="M104 190H456" />
      <rect
        className="bp-draw"
        pathLength={1}
        style={order(4)}
        x="212"
        y="148"
        width="136"
        height="28"
        rx="8"
      />
      <Line i={5} accent d="M232 162H300" />
      <Line i={5} soft d="M310 162H328" />
      <Line i={6} d="M104 190L88 228H472L456 190" />
      <Line
        i={7}
        d="M88 228a16 9 0 0 0 32 0a16 9 0 0 0 32 0a16 9 0 0 0 32 0a16 9 0 0 0 32 0a16 9 0 0 0 32 0a16 9 0 0 0 32 0a16 9 0 0 0 32 0a16 9 0 0 0 32 0a16 9 0 0 0 32 0a16 9 0 0 0 32 0a16 9 0 0 0 32 0a16 9 0 0 0 32 0"
      />
      <Line
        i={8}
        soft
        d="M133 190L120 228M163 190L152 228M192 190L184 228M221 190L216 228M251 190L248 228M280 190V228M309 190L312 228M339 190L344 228M368 190L376 228M397 190L408 228M427 190L440 228"
      />
      <Line i={9} d="M136 262H292V350H136ZM136 308H292M128 350H300" />
      <Line
        i={10}
        d="M150 308V286H170V308M178 308V278H192V308M202 308V290H226V308M238 308V282H256V308M264 308V292H282V308"
      />
      <Line
        i={11}
        d="M152 350V330H166V350M176 350V324H196V350M208 350V334H232V350M244 350V328H258V350M266 350V336H284V350"
      />
      <Line i={12} d="M336 372V254H416V372" />
      <Line i={13} d="M348 266H404V336H348Z" />
      <Line i={14} accent d="M342 300V324" />
      <Line i={15} d="M448 160H476" />
      <rect
        className="bp-draw"
        pathLength={1}
        style={order(16)}
        x="462"
        y="166"
        width="30"
        height="30"
        rx="6"
      />
      <circle
        className="bp-draw bp-accent"
        pathLength={1}
        style={order(16)}
        cx="477"
        cy="181"
        r="6"
      />
      <Line i={17} d="M60 372V350H88V372" />
      <Line i={18} d="M74 350C66 336 62 330 60 322M74 350C76 334 80 326 86 318M74 350V326" />
    </>
  );
}

function Valuables() {
  return (
    <>
      <ellipse className="bp-tint" cx="290" cy="372" rx="64" ry="6" />
      <path className="bp-fill" d="M178 178L226 122H354L402 178L290 318Z" />
      <path className="bp-tint" d="M234 178H346L290 318Z" />
      <path className="bp-fill" d="M414 214H520V344H414Z" />
      <path className="bp-tint" d="M426 226H508V332H426Z" />
      <circle className="bp-fill" cx="104" cy="300" r="36" />
      <circle className="bp-tint" cx="104" cy="300" r="28" />
      <Line i={0} d="M40 372H520" />
      <Line i={1} d="M178 178L226 122H354L402 178L290 318Z" />
      <Line i={2} d="M178 178H402" />
      <Line i={3} d="M226 122L234 178L290 122L346 178L354 122" />
      <Line i={4} d="M234 178L290 318L346 178" />
      <Line i={5} soft d="M290 178V318M226 104H354M226 98V110M354 98V110" />
      <Line i={6} d="M414 214H520V344H414Z" />
      <Line i={7} d="M426 226H508V332H426Z" />
      <Line i={8} d="M426 314L452 282L470 300L488 272L508 304" />
      <circle
        className="bp-draw bp-accent"
        pathLength={1}
        style={order(8)}
        cx="450"
        cy="250"
        r="8"
      />
      <Line i={9} soft d="M444 214L467 196L490 214" />
      <circle className="bp-draw" pathLength={1} style={order(10)} cx="104" cy="300" r="36" />
      <circle
        className="bp-draw bp-soft"
        pathLength={1}
        style={order(11)}
        cx="104"
        cy="300"
        r="28"
      />
      <Line
        i={11}
        d="M84 270L90 232H118L124 270M84 330L90 372M118 372L124 330M140 294H147V306H140"
      />
      <Line i={12} accent d="M104 300V282M104 300L117 307" />
      <Line i={12} soft d="M104 276V280M128 300H124M104 324V320M80 300H84" />
      <ellipse
        className="bp-draw"
        pathLength={1}
        style={order(13)}
        cx="212"
        cy="359"
        rx="26"
        ry="10"
      />
      <Line i={14} d="M201 352L212 341L223 352L212 358Z" />
      <circle className="bp-glass" cx="222" cy="218" r="40" />
      <circle
        className="bp-draw bp-accent"
        pathLength={1}
        style={order(15)}
        cx="222"
        cy="218"
        r="40"
      />
      <Line i={16} accent d="M193 247L162 278" />
      <Line i={17} accent d="M424 98L427 109L438 112L427 115L424 126L421 115L410 112L421 109Z" />
      <Line i={18} accent d="M158 132L160 138L166 140L160 142L158 148L156 142L150 140L156 138Z" />
    </>
  );
}

function Method() {
  const rows = [172, 208, 244, 280];
  return (
    <>
      <rect className="bp-fill" x="206" y="62" width="200" height="280" rx="10" />
      <rect
        className="bp-draw bp-soft"
        pathLength={1}
        style={order(0)}
        x="206"
        y="62"
        width="200"
        height="280"
        rx="10"
      />
      <rect className="bp-fill" x="178" y="84" width="204" height="288" rx="12" />
      <circle className="bp-tint" cx="206" cy="116" r="11" />
      <rect className="bp-fill" x="424" y="92" width="96" height="52" rx="12" />
      <Line i={0} d="M40 372H520" />
      <rect
        className="bp-draw"
        pathLength={1}
        style={order(1)}
        x="178"
        y="84"
        width="204"
        height="288"
        rx="12"
      />
      <circle className="bp-draw" pathLength={1} style={order(2)} cx="206" cy="116" r="11" />
      <Line i={3} accent d="M228 110H300" />
      <Line i={3} soft d="M228 124H276M196 146H364" />
      {rows.map((y, n) => (
        <g key={y}>
          <rect
            className="bp-draw"
            pathLength={1}
            style={order(4 + n)}
            x="198"
            y={y - 8}
            width="16"
            height="16"
            rx="4"
          />
          {n < 3 && <Line i={8 + n} accent d={`M202 ${y}l4 4l7-8`} />}
          <Line i={4 + n} d={`M228 ${y - 3}H330`} />
          <Line i={4 + n} soft d={`M228 ${y + 6}H300`} />
        </g>
      ))}
      <Line i={11} soft d="M198 350H272" />
      <Line i={12} accent d="M206 350V334M220 350V324M234 350V338M248 350V316M262 350V328" />
      <circle
        className="bp-draw bp-accent"
        pathLength={1}
        style={order(13)}
        cx="334"
        cy="328"
        r="24"
      />
      <circle
        className="bp-draw bp-soft"
        pathLength={1}
        style={order(13)}
        cx="334"
        cy="328"
        r="17"
      />
      <Line i={14} accent d="M324 328l7 7l13-15" />
      <circle className="bp-glass" cx="392" cy="214" r="38" />
      <circle
        className="bp-draw bp-accent"
        pathLength={1}
        style={order(15)}
        cx="392"
        cy="214"
        r="38"
      />
      <Line i={16} accent d="M419 241L452 274" />
      <Line i={17} d="M150 250L164 256L134 338L120 332ZM120 332L134 338L122 356ZM146 262L160 268" />
      <Line
        i={18}
        d="M436 92H508a12 12 0 0 1 12 12v28a12 12 0 0 1-12 12H452l-14 14v-14h-2a12 12 0 0 1-12-12v-28a12 12 0 0 1 12-12Z"
      />
      <Line i={19} soft d="M440 110H504M440 124H486" />
    </>
  );
}

type Tag = { x: number; y: number; text: string; flip?: boolean };
// `sheet` is the part of the 560 × 440 sheet a drawing uses: its top and its height.
type Sheet = [top: number, height: number];
const drawings = {
  habitation: {
    label: 'Dessin technique d’une habitation, avec les sources de dommages repérées',
    drawing: House,
    sheet: [56, 364],
    tags: [
      { x: 262, y: 330, text: 'Le feu' },
      { x: 358, y: 206, text: 'La fumée' },
      { x: 120, y: 304, text: 'La chaleur' },
    ],
    note: ['Dommages documentés', 'Au-delà de ce qui a brûlé'],
  },
  commerce: {
    label: 'Dessin technique d’un commerce, avec les postes de pertes repérés',
    drawing: Shop,
    sheet: [76, 344],
    tags: [
      { x: 214, y: 300, text: 'Stock' },
      { x: 280, y: 209, text: 'Aménagement' },
      { x: 432, y: 300, text: 'Local' },
    ],
    note: ['Pertes documentées', 'Stock, équipements, local'],
  },
  prealable: {
    label: 'Dessin technique de biens de valeur examinés à la loupe',
    drawing: Valuables,
    sheet: [60, 360],
    tags: [
      { x: 402, y: 178, text: 'Bijoux' },
      { x: 140, y: 300, text: 'Montres' },
      { x: 467, y: 262, text: 'Tableaux', flip: true },
    ],
    note: ['Valeur documentée', 'Avant d’assurer'],
  },
  methode: {
    label: 'Dessin d’un dossier d’expertise examiné à la loupe',
    drawing: Method,
    sheet: [24, 396],
    tags: [
      { x: 206, y: 116, text: 'Étude des faits' },
      { x: 392, y: 214, text: 'Analyse des pièces', flip: true },
      { x: 438, y: 158, text: 'Échange clair', flip: true },
    ],
    note: undefined,
  },
} satisfies Record<
  string,
  { label: string; drawing: () => React.ReactNode; sheet: Sheet; tags: Tag[]; note?: string[] }
>;

function Stage({
  drawing: Drawing,
  sheet: [top, height] = [0, 440],
  tags,
  numbered = false,
}: {
  drawing: () => React.ReactNode;
  sheet?: Sheet;
  tags: Tag[];
  numbered?: boolean;
}) {
  return (
    <div className="visual-stage" style={{ aspectRatio: `560 / ${height}` }}>
      <svg className="bp" viewBox={`0 ${top} 560 ${height}`}>
        <Drawing />
      </svg>
      {tags.map((tag, n) => (
        <span
          className={tag.flip ? 'visual-tag flip' : 'visual-tag'}
          style={{
            left: `${tag.x / 5.6}%`,
            top: `${((tag.y - top) / height) * 100}%`,
            ...order(n),
          }}
          key={tag.text}
        >
          <i />
          <span>
            {numbered && <b>0{n + 1} · </b>}
            {tag.text}
          </span>
        </span>
      ))}
    </div>
  );
}

// The drawing of a service page, with a card that sums up what the service produces.
export function ServiceVisual({ kind }: { kind: keyof typeof drawings }) {
  const { label, drawing, sheet, tags, note } = drawings[kind];
  return (
    <div className={note ? 'visual has-check' : 'visual'} role="img" aria-label={label}>
      <Stage drawing={drawing} sheet={sheet as Sheet} tags={tags} />
      {note && (
        <div className="visual-card visual-check">
          <BadgeCheck size={26} strokeWidth={1.6} />
          <div>
            <strong>{note[0]}</strong>
            <small>{note[1]}</small>
          </div>
        </div>
      )}
    </div>
  );
}

// The home illustration: the same house, the three verbs of the method, and a dossier being followed.
export function HeroVisual() {
  return (
    <div
      className="visual has-card"
      role="img"
      aria-label="Dessin technique d’une habitation et aperçu du suivi d’un dossier"
    >
      <Stage
        drawing={House}
        numbered
        tags={[
          { x: 72, y: 233, text: 'Identifier' },
          { x: 358, y: 206, text: 'Évaluer' },
          { x: 262, y: 330, text: 'Documenter' },
        ]}
      />
      <div className="visual-note">
        <ShieldCheck size={30} strokeWidth={1.5} />
        <div>
          Une vision précise.
          <br />
          <strong>Un dossier solide.</strong>
        </div>
      </div>
      <div className="visual-card">
        <div className="visual-card-top">
          <span className="visual-card-icon">
            <FolderCheck size={18} />
          </span>
          <div>
            <strong>Incendie habitation</strong>
            <small>MS-2026-000128</small>
          </div>
          <span className="badge badge-expertise_en_cours">
            <i />
            Expertise en cours
          </span>
        </div>
        <div className="visual-progress">
          <span />
        </div>
        <ol className="visual-steps">
          <li className="done">Analyse</li>
          <li className="current">Expertise</li>
          <li>Évaluation</li>
          <li>Dossier</li>
        </ol>
      </div>
    </div>
  );
}
