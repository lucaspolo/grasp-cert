"use client";

import { useIMask } from "react-imask";
import { Input } from "@/components/ui/input";
import { useEffect } from "react";

interface DateTimeInputProps {
  id?: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
}

export function DateTimeInput({
  id,
  name,
  defaultValue = "",
  placeholder = "DD/MM/AAAA HH:mm",
  required,
}: DateTimeInputProps) {
  const { ref, value, setValue } = useIMask({
    mask: "00/00/0000 00:00",
    lazy: true,
    placeholderChar: "_",
  });

  useEffect(() => {
    if (defaultValue) {
      setValue(defaultValue);
    }
  }, [defaultValue, setValue]);

  return (
    <>
      <Input
        ref={ref as React.RefObject<HTMLInputElement>}
        id={id}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
      />
      <input type="hidden" name={name} value={value} />
    </>
  );
}
