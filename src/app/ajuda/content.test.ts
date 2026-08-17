import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { TUTORIAL_SECTIONS } from "./content";
import { AUDIENCE_LABELS } from "@/lib/role-labels";

const shots = TUTORIAL_SECTIONS.flatMap((section) =>
  section.steps.flatMap((step) =>
    step.shot ? [{ slug: section.slug, shot: step.shot }] : []
  )
);

describe("conteúdo do tutorial", () => {
  it("tem slugs únicos e em kebab-case", () => {
    const slugs = TUTORIAL_SECTIONS.map((s) => s.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) {
      expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it("declara ao menos um cargo válido por seção", () => {
    for (const section of TUTORIAL_SECTIONS) {
      expect(section.audiences.length).toBeGreaterThan(0);
      for (const audience of section.audiences) {
        expect(AUDIENCE_LABELS[audience]).toBeTruthy();
      }
    }
  });

  it("tem ao menos um passo por seção", () => {
    for (const section of TUTORIAL_SECTIONS) {
      expect(section.steps.length).toBeGreaterThan(0);
    }
  });

  // A trava que importa: renomear ou esquecer uma captura quebraria a página
  // em produção sem quebrar o build.
  it("aponta só para imagens que existem em public/ajuda", () => {
    for (const { slug, shot } of shots) {
      expect(shot.src, slug).toMatch(/^\/ajuda\/[a-z0-9-]+\.webp$/);
      const path = join(process.cwd(), "public", shot.src);
      expect(existsSync(path), `${slug}: ${shot.src} não existe`).toBe(true);
    }
  });

  it("descreve cada imagem com alt e dimensões", () => {
    for (const { slug, shot } of shots) {
      expect(shot.alt.trim().length, slug).toBeGreaterThan(10);
      expect(shot.width, slug).toBeGreaterThan(0);
      expect(shot.height, slug).toBeGreaterThan(0);
    }
  });

  it("não repete a mesma captura em seções diferentes", () => {
    const srcs = shots.map((s) => s.shot.src);
    expect(new Set(srcs).size).toBe(srcs.length);
  });
});
