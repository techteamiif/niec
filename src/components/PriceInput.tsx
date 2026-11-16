import { useRef, type ComponentPropsWithoutRef } from "react";
import { formatPriceInput } from "@/lib/price-input";

type PriceInputProps = Omit<
  ComponentPropsWithoutRef<"input">,
  "type" | "value" | "onChange" | "inputMode"
> & {
  value: string;
  onValueChange: (value: string) => void;
};

export function PriceInput({ onValueChange, value, ...props }: PriceInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const cursor = input.selectionStart ?? input.value.length;
    const digitsBeforeCursor = input.value.slice(0, cursor).replace(/\D/g, "").length;
    const formattedValue = formatPriceInput(input.value);

    onValueChange(formattedValue);

    let nextCursor = 0;
    let digitCount = 0;
    while (nextCursor < formattedValue.length && digitCount < digitsBeforeCursor) {
      if (/\d/.test(formattedValue[nextCursor])) digitCount++;
      nextCursor++;
    }

    window.requestAnimationFrame(() => {
      if (inputRef.current === input) input.setSelectionRange(nextCursor, nextCursor);
    });
  };

  return (
    <input
      {...props}
      ref={inputRef}
      type="text"
      inputMode="numeric"
      value={formatPriceInput(value)}
      onChange={handleChange}
    />
  );
}
