import type { Metadata } from 'next';
import { Poppins } from 'next/font/google';
import './globals.css';
// Single typeface of the platform; tokens.css maps --font-poppins to --font-sans.
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-poppins',
});
export const metadata: Metadata = {
  title: {
    default: 'Monsinistre — Expertise & accompagnement au Maroc',
    template: '%s | Monsinistre',
  },
  description:
    'Expertise technique, évaluation des dommages et accompagnement après incendie. Expertise préalable des biens de valeur au Maroc.',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={poppins.variable} data-scroll-behavior="smooth">
      <body>
        <a className="skip-link" href="#main">
          Aller au contenu
        </a>
        {children}
      </body>
    </html>
  );
}
