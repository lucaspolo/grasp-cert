"use client";

import { useIMask } from "react-imask";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { format, parse, isValid } from "date-fns";

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

  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [hours, setHours] = useState("00");
  const [minutes, setMinutes] = useState("00");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (defaultValue) {
      // If defaultValue is an ISO string, convert to local BR format
      let displayValue = defaultValue;
      if (/^\d{4}-\d{2}-\d{2}T/.test(defaultValue)) {
        const d = new Date(defaultValue);
        const day = String(d.getDate()).padStart(2, "0");
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const year = d.getFullYear();
        const h = String(d.getHours()).padStart(2, "0");
        const min = String(d.getMinutes()).padStart(2, "0");
        displayValue = `${day}/${month}/${year} ${h}:${min}`;
      }
      setValue(displayValue);
      const parsed = parse(displayValue, "dd/MM/yyyy HH:mm", new Date());
      if (isValid(parsed)) {
        setSelectedDate(parsed);
        setHours(format(parsed, "HH"));
        setMinutes(format(parsed, "mm"));
      }
    }
  }, [defaultValue, setValue]);

  function handleDateSelect(date: Date | undefined) {
    if (!date) return;
    setSelectedDate(date);
    const formatted = format(date, "dd/MM/yyyy") + ` ${hours}:${minutes}`;
    setValue(formatted);
  }

  function handleTimeChange(newHours: string, newMinutes: string) {
    setHours(newHours);
    setMinutes(newMinutes);
    if (selectedDate) {
      const formatted = format(selectedDate, "dd/MM/yyyy") + ` ${newHours}:${newMinutes}`;
      setValue(formatted);
    }
  }

  function handleConfirm() {
    setOpen(false);
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
      <Popover open={open} onOpenChange={setOpen}>
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
              type="number"
              min={0}
              max={23}
              value={hours}
              onChange={(e) => handleTimeChange(e.target.value.padStart(2, "0"), minutes)}
              className="w-16 text-center"
            />
            <span className="text-sm">:</span>
            <Input
              type="number"
              min={0}
              max={59}
              value={minutes}
              onChange={(e) => handleTimeChange(hours, e.target.value.padStart(2, "0"))}
              className="w-16 text-center"
            />
            <Button
              type="button"
              size="sm"
              className="ml-auto"
              onClick={handleConfirm}
            >
              OK
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
