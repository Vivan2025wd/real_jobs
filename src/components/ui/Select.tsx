import { forwardRef, type SelectHTMLAttributes } from "react";

type Option = { value: string; label: string };

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  error?: string;
  options: Option[];
  placeholder?: string;
};

export const Select = forwardRef<HTMLSelectElement, Props>(
  ({ label, error, options, placeholder, className = "", id, ...props }, ref) => {
    const selectId = id ?? props.name;
    return (
      // Container එකට w-full දැම්මා, එතකොට Select එක තියෙන තැන අනුව හරියටම stretch වෙනවා
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            // මොබයිල් එකේදී අකුරු පොඩියට (text-xs), ඩෙස්ක්ටොප් එකේදී sm:text-sm
            className="block text-xs font-medium text-gray-700 sm:text-sm"
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          // මොබයිල් එකේදී px-3 py-2.5, ඩෙස්ක්ටොප් එකේදී sm:px-3.5
          // text-base තියෙන්නම ඕනේ iOS සූම් එක නවත්තන්න
          className={`mt-1 block w-full rounded-lg border bg-white px-3 py-2.5 text-base shadow-sm transition focus:outline-none focus:ring-2 focus:ring-offset-0 sm:mt-1.5 sm:px-3.5 sm:text-sm ${
            error
              ? "border-rose-300 focus:border-rose-500 focus:ring-rose-200"
              : "border-gray-300 focus:border-indigo-500 focus:ring-indigo-200"
          } ${className}`}
          aria-invalid={!!error}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {error && (
          // Error එකේ අකුරු මොබයිල් එකේදී text-[11px] කළා, leading-snug දැම්මා
          <p className="mt-1 text-[11px] leading-snug text-rose-600 sm:mt-1.5 sm:text-xs">
            {error}
          </p>
        )}
      </div>
    );
  }
);
Select.displayName = "Select";