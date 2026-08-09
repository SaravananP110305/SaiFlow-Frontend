import { useEffect, useState } from "react";

interface Option {
  value: string;
  label: string;
  optionClassName?: string;
}

interface SelectProps {
  options: Option[];
  placeholder?: string;
  onChange: (value: string) => void;
  className?: string;
  defaultValue?: string;
  disabled?: boolean;
}

const Select: React.FC<SelectProps> = ({
  options,
  placeholder = "Select an Option",
  onChange,
  className = "",
  defaultValue = "",
  disabled = false,
}) => {
  // Manage the selected value
  const [selectedValue, setSelectedValue] = useState<string>(defaultValue);

  useEffect(() => {
    setSelectedValue(defaultValue);
  }, [defaultValue]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedValue(value);
    onChange(value); // Trigger parent handler
  };

  // Check if options array already contains an item with value === ""
  const hasEmptyInOptions = options.some((opt) => opt.value === "");

  // Deduplicate options by value to prevent repeating duplicate options
  const uniqueOptions: Option[] = [];
  const seenValues = new Set<string>();
  for (const option of options) {
    if (option.value !== "" && seenValues.has(option.value)) {
      continue;
    }
    if (option.value !== "") {
      seenValues.add(option.value);
    }
    uniqueOptions.push(option);
  }

  // When the current value isn't present in the options (e.g. it references an
  // inactive master record that was filtered out of the dropdown), render it as
  // a disabled option so it stays visible in Edit mode without being selectable
  // again for new selections.
  const currentValueMissing =
    !!selectedValue &&
    !uniqueOptions.some((opt) => opt.value === selectedValue);

  return (
    <select
      disabled={disabled}
      className={`h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 pr-11 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 ${
        selectedValue
          ? "text-gray-800 dark:text-white/90"
          : "text-gray-400 dark:text-gray-400"
      } ${className}`}
      value={selectedValue}
      onChange={handleChange}
      style={{
        backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236B7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
        backgroundPosition: "right 0.75rem center",
        backgroundSize: "1.1rem",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Render placeholder option only if options doesn't already contain a value="" item */}
      {!hasEmptyInOptions && placeholder && (
        <option
          value=""
          disabled
          className="text-gray-700 dark:bg-gray-900 dark:text-gray-400"
        >
          {placeholder}
        </option>
      )}
      {/* Preserve the current (possibly filtered-out) value as a disabled option */}
      {currentValueMissing && (
        <option
          value={selectedValue}
          disabled
          className="text-gray-700 dark:bg-gray-900 dark:text-gray-400"
        >
          {selectedValue}
        </option>
      )}
      {/* Map over deduplicated options */}
      {uniqueOptions.map((option) => (
        <option
          key={`${option.value}-${option.label}`}
          value={option.value}
          className={`text-gray-700 dark:bg-gray-900 dark:text-gray-400 ${option.optionClassName || ""}`}
        >
          {option.label}
        </option>
      ))}
    </select>
  );
};

export default Select;
