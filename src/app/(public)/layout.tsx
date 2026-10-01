import { Nav } from '@/components/nav';
import { Footer } from '@/components/public';
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <main id="main">{children}</main>
      <Footer />
    </>
  );
}
