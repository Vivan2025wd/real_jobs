import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  hint?: string;
  icon?: ReactNode;
};

export const Input = forwardRef<HTMLInputElement, Props>(
  ({ label, error, hint, icon, className = "", id, ...props }, ref) => {
    const inputId = id ?? props.name;
    return (
      // w-full දැම්මා, එතකොට input එක හරියටම container එකේ පළල ගන්නවා
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            // මොබයිල් එකේදී අකුරු පොඩියට (text-xs), ඩෙස්ක්ටොප් එකේදී sm:text-sm
            className="block text-xs font-medium text-gray-700 sm:text-sm"
          >
            {label}
          </label>
        )}
        <div className="relative mt-1 sm:mt-1.5">
          {icon && (
            // අයිකන් එකේ ඉඩ මොබයිල් එකේදී පොඩ්ඩක් අඩු කළා (pl-2.5)
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-gray-400 sm:pl-3">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            // මොබයිල් එකේදී px-3 py-2.5, ඩෙස්ක්ටොප් එකේදී sm:px-3.5
            // text-base තියෙන්නම ඕනේ iOS සූම් එක නවත්තන්න
            className={`block w-full rounded-lg border bg-white px-3 py-2.5 text-base shadow-sm transition placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-0 sm:px-3.5 sm:text-sm ${
              icon ? "pl-9 sm:pl-10" : ""
            } ${
              error
                ? "border-rose-300 focus:border-rose-500 focus:ring-rose-200"
                : "border-gray-300 focus:border-indigo-500 focus:ring-indigo-200"
            } ${className}`}
            aria-invalid={!!error}
            {...props}
          />
        </div>
        {hint && !error && (
          // Hint එකේ අකුරු මොබයිල් එකේදී text-[11px] කළා
          <p className="mt-1 text-[11px] leading-snug text-gray-500 sm:mt-1.5 sm:text-xs">
            {hint}
          </p>
        )}
        {error && (
          <p className="mt-1 text-[11px] leading-snug text-rose-600 sm:mt-1.5 sm:text-xs">
            {error}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";