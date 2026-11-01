export type Product = {
  key: string;
  source: string;
  price: number;
  cost: number;
  share: number;
};

// Illustrative prices and costs, not the company's real table.
export const PRODUCTS: Product[] = [
  {
    key: "analise_upload",
    source: "upload",
    price: 7900,
    cost: 1200,
    share: 0.58,
  },
  {
    key: "visualizacao",
    source: "number",
    price: 4900,
    cost: 1800,
    share: 0.14,
  },
  {
    key: "inteiro_teor_simples",
    source: "cnm",
    price: 12900,
    cost: 5200,
    share: 0.17,
  },
  {
    key: "inteiro_teor",
    source: "address",
    price: 18900,
    cost: 8200,
    share: 0.11,
  },
];

export const CHANNELS = [
  { key: "site", share: 0.64, commissionBps: 0 },
  { key: "integration", share: 0.26, commissionBps: 1000 },
  { key: "promotion", share: 0.1, commissionBps: 1500 },
];

export const PARTNERS = [
  "Cartório Exemplo Alfa",
  "Imobiliária Exemplo Beta",
  "Banco Exemplo Gama",
  "Escritório Exemplo Delta",
  "Construtora Exemplo Épsilon",
  "Advocacia Exemplo Zeta",
  "Fintech Exemplo Eta",
  "Seguradora Exemplo Theta",
];

export const WEEKDAY = [0.42, 1.05, 1.15, 1.1, 1.08, 0.95, 0.55]; // Sunday first
