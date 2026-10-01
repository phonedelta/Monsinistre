// Created again on each navigation inside the portal, so every page arrives with a fade.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-in">{children}</div>;
}
