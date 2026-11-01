import type { SupplierForm } from "./supplier-model";

export type SetSupplierField = <K extends keyof SupplierForm>(
  key: K,
  value: SupplierForm[K],
) => void;
