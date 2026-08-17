import type { Metadata } from "next";
import Link from "next/link";
import { TUTORIAL_SECTIONS } from "./content";
import { TutorialSection } from "@/components/tutorial-section";
import { RoleBadge } from "@/components/role-badge";
import type { TutorialAudience } from "@/lib/role-labels";

export const metadata: Metadata = {
  title: "Como usar — Ham Cert",
  description:
    "Tutorial ilustrado do Ham Cert: cadastro, certificados, lançamento de QSOs, eventos, templates e administração, com o cargo necessário em cada procedimento.",
};

/** Ordem de apresentação dos cargos, do mais amplo ao mais restrito. */
const ROLES_OVERVIEW: { audience: TutorialAudience; description: string }[] = [
  {
    audience: "PUBLIC",
    description:
      "Consulta os eventos abertos, as estatísticas de cada um e confere a autenticidade de qualquer certificado.",
  },
  {
    audience: "USER",
    description:
      "Cargo de todo cadastro novo. Vê os próprios QSOs e baixa os certificados de participação.",
  },
  {
    audience: "OPERATOR",
    description:
      "Lança QSOs — só nos eventos em que foi designado — e recebe o certificado de operador.",
  },
  {
    audience: "GROUP_ADMIN",
    description:
      "Não é um cargo da conta, e sim uma função dentro de um grupo: quem administra um clube cria os eventos e os templates dele e chama os membros — só nesse grupo. Qualquer cargo pode acumular essa função.",
  },
  {
    audience: "ADMIN",
    description:
      "Cria e edita eventos, designa operadores e cuida dos templates, bandas e modos — em qualquer grupo.",
  },
  {
    audience: "OWNER",
    description:
      "Tudo o que o Admin faz, mais a gestão de cargos, a exclusão de usuários e a trilha de auditoria.",
  },
];

export default function AjudaPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <header>
        <h1 className="text-3xl font-bold">Como usar o Ham Cert</h1>
        <p className="mt-2 text-muted-foreground">
          O Ham Cert registra os contatos de um concurso de radioamadorismo e
          emite os certificados de participação. Este guia percorre o sistema
          inteiro e indica, em cada seção, quem pode executar o procedimento.
        </p>
      </header>

      <section aria-labelledby="cargos" className="mt-10">
        <h2 id="cargos" className="text-xl font-semibold">
          Os cargos
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Cada conta tem um cargo, e o cargo decide o que aparece no menu. Além
          dele, você pode administrar um ou mais grupos — o que dá acesso aos
          eventos e templates daqueles grupos, e de nenhum outro. Se um item
          descrito aqui não estiver no seu menu, é porque o seu cargo não dá
          acesso a ele — peça ao Owner do sistema ou ao admin do seu grupo.
        </p>
        <dl className="mt-4 space-y-3">
          {ROLES_OVERVIEW.map(({ audience, description }) => (
            <div key={audience} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <dt className="shrink-0">
                <RoleBadge audience={audience} />
              </dt>
              <dd className="flex-1 text-sm text-muted-foreground">
                {description}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <nav aria-labelledby="sumario" className="mt-10">
        <h2 id="sumario" className="text-xl font-semibold">
          Sumário
        </h2>
        <ul className="mt-4 space-y-2">
          {TUTORIAL_SECTIONS.map((section) => (
            <li
              key={section.slug}
              className="flex flex-wrap items-center gap-x-3 gap-y-1"
            >
              <Link
                href={`#${section.slug}`}
                className="font-medium text-primary hover:underline"
              >
                {section.title}
              </Link>
              <span className="flex flex-wrap gap-1">
                {section.audiences.map((audience) => (
                  <RoleBadge key={audience} audience={audience} />
                ))}
              </span>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-12 space-y-12">
        {TUTORIAL_SECTIONS.map((section) => (
          <TutorialSection key={section.slug} section={section} />
        ))}
      </div>
    </div>
  );
}
