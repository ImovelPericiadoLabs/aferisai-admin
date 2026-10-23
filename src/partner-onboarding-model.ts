export type OnboardingErrors = Partial<
  Record<"name" | "slug" | "application", string>
>;

export function suggestedSlug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120)
    .replace(/-$/g, "");
}

export function validateCompany(name: string, slug: string): OnboardingErrors {
  const errors: OnboardingErrors = {};
  if (!name.trim() || name.trim().length > 255)
    errors.name = "Informe o nome da empresa (até 255 caracteres).";
  if (
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ||
    slug.length < 2 ||
    slug.length > 120
  )
    errors.slug =
      "Use de 2 a 120 letras minúsculas, números ou hífens entre palavras.";
  return errors;
}

export function validateApplication(application: string): OnboardingErrors {
  if (!application.trim() || application.trim().length > 255)
    return {
      application: "Informe o nome da primeira aplicação (até 255 caracteres).",
    };
  return {};
}
