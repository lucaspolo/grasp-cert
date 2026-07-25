"use client";

import { useIMask } from "react-imask";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { format, parse, isValid } from "date-fns";
import {
  clampTimePart,
  composeMaskedDateTime,
  splitMaskedDateTime,
} from "@/lib/time-parts";

interface DateTimeInputProps {
  id?: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
}

/** Converts an ISO defaultValue to local BR display format and parses it. */
function parseDefaultValue(defaultValue: string): {
  display: string;
  date: Date | undefined;
} {
  if (!defaultValue) {
    return { display: "", date: undefined };
  }

  let display = defaultValue;
  if (/^\d{4}-\d{2}-\d{2}T/.test(defaultValue)) {
    const d = new Date(defaultValue);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const h = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    display = `${day}/${month}/${year} ${h}:${min}`;
  }

  const parsed = parse(display, "dd/MM/yyyy HH:mm", new Date());
  return { display, date: isValid(parsed) ? parsed : undefined };
}

/** Interpreta "dd/MM/yyyy" como Date local, ou undefined se incompleta/inválida. */
function parseDateStr(dateStr: string): Date | undefined {
  if (!dateStr) return undefined;
  const parsed = parse(dateStr, "dd/MM/yyyy", new Date());
  return isValid(parsed) ? parsed : undefined;
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

  const [initial] = useState(() => parseDefaultValue(defaultValue));
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    initial.date
  );
  const [hours, setHours] = useState(
    initial.date ? format(initial.date, "HH") : "00"
  );
  const [minutes, setMinutes] = useState(
    initial.date ? format(initial.date, "mm") : "00"
  );
  const [open, setOpen] = useState(false);

  // Seeds the imask-controlled input (external system) with the initial value.
  useEffect(() => {
    if (initial.display) {
      setValue(initial.display);
    }
  }, [initial.display, setValue]);

  // Grava o valor combinando data + hora. A data vem do seletor ou, se ainda
  // não escolhida, do que já está digitado no campo — assim mudar só a hora
  // não apaga a data e vice-versa.
  function writeValue(nextHours: string, nextMinutes: string, date?: Date) {
    const effectiveDate = date ?? selectedDate;
    const dateStr = effectiveDate
      ? format(effectiveDate, "dd/MM/yyyy")
      : splitMaskedDateTime(value).dateStr;
    if (!dateStr) return; // sem data ainda: mantém só o estado de hora
    setValue(composeMaskedDateTime(dateStr, nextHours, nextMinutes));
  }

  // Ao abrir o seletor, semeia data/hora a partir do que já está no campo.
  function handleOpenChange(next: boolean) {
    if (next) {
      const parts = splitMaskedDateTime(value);
      setSelectedDate(parseDateStr(parts.dateStr));
      setHours(parts.hh);
      setMinutes(parts.mm);
    }
    setOpen(next);
  }

  function handleDateSelect(date: Date | undefined) {
    if (!date) return;
    setSelectedDate(date);
    writeValue(hours, minutes, date);
  }

  function handleHoursChange(raw: string) {
    const next = clampTimePart(raw, 23);
    setHours(next);
    writeValue(next, minutes);
  }

  function handleMinutesChange(raw: string) {
    const next = clampTimePart(raw, 59);
    setMinutes(next);
    writeValue(hours, next);
  }

  return (
    <div className="flex gap-1">
      <Input
        ref={ref as React.RefObject<HTMLInputElement>}
        id={id}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
        className="flex-1"
      />
      <input type="hidden" name={name} value={value} />
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0"
            />
          }
        >
          <CalendarIcon className="h-4 w-4" />
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
          />
          <div className="border-t px-4 py-3 flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Hora:</span>
            <Input
              type="text"
              inputMode="numeric"
              maxLength={2}
              aria-label="Hora"
              value={hours}
              onChange={(e) => handleHoursChange(e.target.value)}
              className="w-16 text-center"
            />
            <span className="text-sm">:</span>
            <Input
              type="text"
              inputMode="numeric"
              maxLength={2}
              aria-label="Minuto"
              value={minutes}
              onChange={(e) => handleMinutesChange(e.target.value)}
              className="w-16 text-center"
            />
            <Button
              type="button"
              size="sm"
              className="ml-auto"
              onClick={() => setOpen(false)}
            >
              OK
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
