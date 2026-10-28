import Link from "next/link";

type Size = "sm" | "md" | "lg";

const sizes: Record<
  Size,
  { box: string; text: string; rounded: string }
> = {
  sm: { box: "h-6 w-6 text-[10px]", text: "text-sm", rounded: "rounded-md" },
  md: { box: "h-8 w-8 text-sm", text: "text-base", rounded: "rounded-lg" },
  lg: { box: "h-10 w-10 text-base", text: "text-lg", rounded: "rounded-xl" },
};

export function Logo({
  size = "md",
  withText = true,
  href = "/",
}: {
  size?: Size;
  withText?: boolean;
  /** Pass `null` to render as plain text (no link). */
  href?: string | null;
}) {
  const s = sizes[size];

  const content = (
    <>
      {/* Icon: gradient square with "R" */}
      <span
        className={`flex ${s.box} ${s.rounded} items-center justify-center bg-gradient-to-br from-indigo-500 to-violet-600 font-bold text-white shadow-sm`}
        aria-hidden
      >
        R
      </span>

      {/* Wordmark */}
      {withText && (
        <span
          className={`${s.text} font-bold tracking-tight text-gray-900`}
        >
          RealJobs
        </span>
      )}
    </>
  );

  const wrapperClass =
    "inline-flex items-center gap-2.5 transition hover:opacity-90";

  if (!href) {
    return <span className={wrapperClass}>{content}</span>;
  }

  return (
    <Link href={href} className={wrapperClass}>
      {content}
    </Link>
  );
}