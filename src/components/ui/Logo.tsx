import Link from "next/link";
import Image from "next/image";

type Size = "sm" | "md" | "lg";

const sizes: Record<
  Size,
  { box: string; text: string; rounded: string }
> = {
  // Box එක පොඩ්ඩක් පොඩි කරලා (h-10), ඒත් ඇතුලේ පින්තූරය ලොකුවට පේන්න හදමු
  md: { box: "h-10 w-10", text: "text-2xl", rounded: "rounded-xl" },
  sm: { box: "h-8 w-8", text: "text-lg", rounded: "rounded-lg" },
  lg: { box: "h-16 w-16", text: "text-3xl", rounded: "rounded-2xl" },
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
          // මෙන්න මේ scale-[1.8] කොටසයි වැදගත්. 
          // ඔයාගේ පින්තූරයේ වටේ ඉඩ තියෙනවා නම් මේ අංකය 2.0 ගාණට වැඩි කරන්න.
          className="object-contain scale-[1.0]" 
          priority
        />
      </div>

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
    "inline-flex items-center gap-3 transition hover:opacity-90";

  if (!href) {
    return <span className={wrapperClass}>{content}</span>;
  }

  return (
    <Link href={href} className={wrapperClass}>
      {content}
    </Link>
  );
}