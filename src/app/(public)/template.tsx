import { ViewTransition } from 'react';
// A template is created again on each navigation, so its content can leave and enter:
// the previous page fades out and the next one rises in (styles/motion.css).
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition enter="page" exit="page" default="none">
      <div>{children}</div>
    </ViewTransition>
  );
}
