import { useEffect } from "react";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.css";
import Label from "./Label";
import { CalenderIcon } from "../../icons";
import { FiClock } from "react-icons/fi";
import Hook = flatpickr.Options.Hook;
import DateOption = flatpickr.Options.DateOption;

type PropsType = {
  id: string;
  mode?: "single" | "multiple" | "range" | "time";
  onChange?: Hook | Hook[];
  defaultDate?: DateOption;
  label?: string;
  placeholder?: string;
  required?: boolean;
  minDate?: DateOption;
  disabled?: boolean;
  staticPositioning?: boolean;
};

export default function DatePicker({
  id,
  mode,
  onChange,
  label,
  defaultDate,
  placeholder,
  required = false,
  minDate,
  disabled = false,
  staticPositioning = false,
}: PropsType) {
  useEffect(() => {
    const config: any = {
      static: staticPositioning,
      monthSelectorType: "static",
      defaultDate,
      onChange,
    };

    if (mode === "time") {
      config.enableTime = true;
      config.noCalendar = true;
      config.dateFormat = "h:i K"; // hh:mm AM/PM format
      config.altInput = true;
      config.altFormat = "h:i K";
      config.altInputClass =
        "h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:focus:border-brand-800 disabled:bg-gray-100 dark:disabled:bg-gray-800 cursor-pointer";
    } else {
      config.mode = mode || "single";
      config.dateFormat = "Y-m-d"; // internal storage format (ISO YYYY-MM-DD)
      config.altInput = true;
      config.altFormat = "d/m/Y";  // user display format (DD/MM/YYYY)
      config.altInputClass =
        "h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:focus:border-brand-800 disabled:bg-gray-100 dark:disabled:bg-gray-800 cursor-pointer";
      if (minDate) {
        config.minDate = minDate;
      }
    }

    const flatPickr = flatpickr(`#${id}`, config);

    return () => {
      if (flatPickr) {
        if (Array.isArray(flatPickr)) {
          flatPickr.forEach((i) => i.destroy());
        } else {
          flatPickr.destroy();
        }
      }
    };
  }, [mode, onChange, id, defaultDate, minDate, disabled, staticPositioning]);

  return (
    <div>
      {label && (
        <Label htmlFor={id}>
          {label} {required && <span className="text-error-500">*</span>}
        </Label>
      )}

      <div className="relative">
        <input
          id={id}
          placeholder={placeholder}
          disabled={disabled}
          className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:focus:border-brand-800 disabled:bg-gray-100 dark:disabled:bg-gray-800 cursor-pointer"
        />

        <span className="absolute text-gray-500 -translate-y-1/2 pointer-events-none right-3 top-1/2 dark:text-gray-400">
          {mode === "time" ? (
            <FiClock className="size-5" />
          ) : (
            <CalenderIcon className="size-6" />
          )}
        </span>
      </div>
    </div>
  );
}
