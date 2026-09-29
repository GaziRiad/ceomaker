import type { ReactNode } from "react";

export function Container({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`mx-auto w-full max-w-5xl px-5 sm:px-8 ${className}`}>{children}</div>;
}

export function SectionShell({
  id,
  heading,
  children,
  className = "",
}: {
  id: string;
  heading: string;
  children: ReactNode;
  className?: string;
}) {
  const headingId = `${id}-heading`;
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={`scroll-mt-20 py-16 sm:py-24 ${className}`}
    >
      <Container>
        <div className="grid gap-8 lg:grid-cols-[14rem_1fr] lg:gap-16">
          <h2
            id={headingId}
            className="text-sm font-medium tracking-[0.16em] text-site-accent uppercase"
          >
            {heading}
          </h2>
          <div>{children}</div>
        </div>
      </Container>
    </section>
  );
}
