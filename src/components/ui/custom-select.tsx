import * as React from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type OptionProps = React.OptionHTMLAttributes<HTMLOptionElement>;
type CustomSelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  id?: string;
  title?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
};

function getOptionText(children: React.ReactNode): string {
  if (typeof children === "string" || typeof children === "number") {
    return String(children);
  }
  if (Array.isArray(children)) {
    return children.map(getOptionText).join("");
  }
  if (React.isValidElement<{ children?: React.ReactNode }>(children)) {
    return getOptionText(children.props.children);
  }
  return "";
}

export function CustomSelect({
  value,
  onValueChange,
  children,
  className,
  disabled,
  id,
  title,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
}: CustomSelectProps) {
  const options = React.Children.toArray(children).map((child) => {
    if (!React.isValidElement<OptionProps>(child) || child.type !== "option") {
      throw new Error("CustomSelect only accepts option elements.");
    }

    return {
      value: String(child.props.value ?? getOptionText(child.props.children)),
      label: child.props.children,
      disabled: child.props.disabled,
    };
  });
  const selectedIndex = options.findIndex((option) => option.value === value);
  const selectedValue = selectedIndex === -1 ? undefined : `option-${selectedIndex}`;

  return (
    <Select
      value={selectedValue}
      onValueChange={(optionValue) => {
        const selectedOption = options[Number(optionValue.slice("option-".length))];
        if (selectedOption) onValueChange(selectedOption.value);
      }}
      disabled={disabled}
    >
      <SelectTrigger
        id={id}
        title={title}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        className={cn("w-full", className)}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="start">
        {options.map((option, index) => (
          <SelectItem key={`option-${index}`} value={`option-${index}`} disabled={option.disabled}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
