import Link from "next/link";
import Image from "next/image";

type Size = "sm" | "md" | "lg";

const sizes: Record<
  Size,
  { box: string; text: string; rounded: string }
> = {
  // md (Default): මොබයිල් එකේදී h-9 w-9, ඩෙස්ක්ටොප් එකේදී sm:h-10 sm:w-10
  md: { 
    box: "h-9 w-9 sm:h-10 sm:w-10", 
    text: "text-xl sm:text-2xl", 
    rounded: "rounded-lg sm:rounded-xl" 
  },
  // sm: මොබයිල් එකේදී h-7 w-7, ඩෙස්ක්ටොප් එකේදී sm:h-8 sm:w-8
  sm: { 
    box: "h-7 w-7 sm:h-8 sm:w-8", 
    text: "text-base sm:text-lg", 
    rounded: "rounded-md sm:rounded-lg" 
  },
  // lg: මොබයිල් එකේදී h-14 w-14, ඩෙස්ක්ටොප් එකේදී sm:h-16 sm:w-16
  lg: { 
    box: "h-14 w-14 sm:h-16 sm:w-16", 
    text: "text-2xl sm:text-3xl", 
    rounded: "rounded-xl sm:rounded-2xl" 
  },
};

export function Logo({
  size = "md",
  withText = true,
  href = "/",
}: {
  size?: Size;
  withText?: boolean;
  href?: string | null;
}) {
  const s = sizes[size];

  const content = (
    <>
      {/* Icon Container */}
      <div className={`relative ${s.box} shrink-0 flex items-center justify-center overflow-hidden`}>
        <Image
          src="/logo.jpg"
          alt="RealJobs Logo"
          fill
          // පින්තූරයේ වටේ ඉඩ තියෙනවා නම් මේ අංකය 1.5 හෝ 2.0 ගාණට වැඩි කරන්න
          className="object-contain scale-[1.0]" 
          priority
        />
      </div>

      {/* Wordmark */}
      {withText && (
        <span
          // min-w-0 සහ truncate දැම්මා, එතකොට ඉඩ මදි වුණත් අකුරු කැපෙන්නේ නෑ
          className={`${s.text} min-w-0 truncate font-bold tracking-tight text-gray-900`}
        >
          RealJobs
        </span>
      )}
    </>
  );

  // මොබයිල් එකේදී gap-2, ඩෙස්ක්ටොප් එකේදී sm:gap-3
  const wrapperClass =
    "inline-flex items-center gap-2 sm:gap-3 transition hover:opacity-90";

  if (!href) {
    return <span className={wrapperClass}>{content}</span>;
  }

  return (
    <Link href={href} className={wrapperClass}>
      {content}
    </Link>
  );
}