export function formatPriceInput(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function parsePriceInput(value: string) {
  return Number(value.replace(/,/g, ""));
}
