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
      <div>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700"
          >
            {label}
          </label>
        )}
        <div className="relative mt-1.5">
          {icon && (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`block w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm shadow-sm transition placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-0 ${
              icon ? "pl-10" : ""
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
          <p className="mt-1.5 text-xs text-gray-500">{hint}</p>
        )}
        {error && <p className="mt-1.5 text-xs text-rose-600">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";