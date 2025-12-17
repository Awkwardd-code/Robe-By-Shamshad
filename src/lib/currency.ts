const bdtFormatter = new Intl.NumberFormat("bn-BD", {
  style: "currency",
  currency: "BDT",
  maximumFractionDigits: 0,
});

export type CurrencyFormatOptions = {
  from?: "bdt" | "numeric";
};

export function formatPriceToBdt(value: number, _options?: CurrencyFormatOptions): string {
  if (!Number.isFinite(value)) {
    return bdtFormatter.format(0);
  }
  return bdtFormatter.format(value);
}
