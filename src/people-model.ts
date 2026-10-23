export type Person = {
  id: string;
  email: string;
  status: "active" | "suspended";
  created_at: string;
  role?: "administrator" | "manager" | "viewer" | "financial";
};

export type PeopleTab = { page: "users" | "team-members"; label: string };

const dateFormat = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

export function formatPersonDate(iso: string): string {
  return dateFormat.format(new Date(iso));
}

export function accountAge(iso: string, now = Date.now()): string {
  const days = Math.floor((now - Date.parse(iso)) / 86_400_000);
  if (!Number.isFinite(days) || days < 0) return "—";
  if (days === 0) return "Criada hoje";
  if (days === 1) return "Criada há 1 dia";
  if (days < 60) return `Criada há ${days} dias`;
  return `Criada há ${Math.floor(days / 30)} meses`;
}

export function filterPeople(
  people: Person[],
  query: string,
  status: string,
  role: string,
): Person[] {
  const needle = query.trim().toLocaleLowerCase("pt-BR");
  return people.filter(
    (person) =>
      (!needle ||
        person.email.toLocaleLowerCase("pt-BR").includes(needle) ||
        person.id.toLowerCase().includes(needle)) &&
      (!status || person.status === status) &&
      (!role || person.role === role),
  );
}
