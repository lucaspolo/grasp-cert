import Image from "next/image";
import { RoleBadge } from "@/components/role-badge";
import type { TutorialSection as TutorialSectionData } from "@/app/ajuda/content";

export function TutorialSection({ section }: { section: TutorialSectionData }) {
  return (
    <section
      id={section.slug}
      aria-labelledby={`${section.slug}-titulo`}
      className="scroll-mt-20 border-t pt-10"
    >
      <h2 id={`${section.slug}-titulo`} className="text-2xl font-bold">
        {section.title}
      </h2>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Quem pode fazer:</span>
        {section.audiences.map((audience) => (
          <RoleBadge key={audience} audience={audience} />
        ))}
      </div>

      {section.note && (
        <p className="mt-3 rounded-md border-l-2 border-primary bg-muted px-3 py-2 text-sm">
          {section.note}
        </p>
      )}

      <p className="mt-4 text-muted-foreground">{section.intro}</p>

      <ol className="mt-6 space-y-8">
        {section.steps.map((step, index) => (
          <li key={index} className="flex gap-4">
            <span
              aria-hidden
              className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground tabular-nums"
            >
              {index + 1}
            </span>
            <div className="min-w-0 flex-1 space-y-3">
              <p>{step.text}</p>
              {step.shot && <Shot shot={step.shot} />}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

/**
 * As capturas foram feitas no tema claro. A moldura branca com anel deixa
 * claro que é uma foto de tela, e não a página escurecendo no dark mode.
 */
function Shot({ shot }: { shot: NonNullable<TutorialSectionData["steps"][number]["shot"]> }) {
  return (
    <figure className="space-y-1.5">
      <Image
        src={shot.src}
        alt={shot.alt}
        width={shot.width}
        height={shot.height}
        sizes="(min-width: 768px) 700px, 100vw"
        // maxWidth na largura original: as capturas de painel são estreitas e
        // ampliá-las até a coluna só as deixaria borradas.
        style={{ maxWidth: shot.width }}
        className="h-auto w-full rounded-lg bg-white p-1 ring-1 ring-foreground/10"
      />
      {shot.caption && (
        <figcaption
          className="text-xs text-muted-foreground"
          style={{ maxWidth: shot.width }}
        >
          {shot.caption}
        </figcaption>
      )}
    </figure>
  );
}
