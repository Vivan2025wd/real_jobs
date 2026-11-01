import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

type Variant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "outline";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 hover:shadow-md active:scale-[0.98]",
  secondary:
    "border border-gray-200 bg-white text-gray-900 shadow-sm hover:border-gray-300 hover:bg-gray-50",
  ghost: "text-gray-700 hover:bg-gray-100",
  outline:
    "border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100",
  danger:
    "bg-rose-600 text-white shadow-sm hover:bg-rose-700 hover:shadow-md active:scale-[0.98]",
};

const sizes: Record<Size, string> = {
  // sm: මොබයිල් එකේදී පොඩි ඉඩක් (px-3), අකුරු පොඩියට (text-xs)
  sm: "min-h-[44px] px-3 text-xs gap-1.5 sm:min-h-0 sm:h-9 sm:px-3.5 sm:text-sm",
  
  // md: මොබයිල් එකේදී මධ්‍යම ඉඩක් (px-4), අකුරු text-sm
  md: "min-h-[44px] px-4 text-sm gap-2 sm:min-h-0 sm:h-10",
  
  // lg: ප්‍රධාන CTA එකකට. මොබයිල් එකේදී උස 48px (ඔබන්න ලේසි වෙන්න), පැඩින් px-5
  lg: "min-h-[48px] px-5 text-sm gap-2 sm:min-h-0 sm:h-11 sm:px-6 sm:text-base",
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  iconRight?: ReactNode;
};

export const Button = forwardRef<HTMLButtonElement, Props>(
  (
    {
      className = "",
      variant = "primary",
      size = "md",
      icon,
      iconRight,
      children,
      ...props
    },
    ref
  ) => (
    <button
      ref={ref}
      // whitespace-nowrap දැම්මා අකුරු දිග වැඩි වුණත් බටන් එක ඇතුලේ අකුරු දෙපේළියකට කැඩෙන්නේ නැතුව තියෙන්න
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-lg font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
      {iconRight && <span className="shrink-0">{iconRight}</span>}
    </button>
  )
);
Button.displayName = "Button";