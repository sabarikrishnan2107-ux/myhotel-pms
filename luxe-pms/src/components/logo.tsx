/* eslint-disable @next/next/no-img-element */
/** The Hyder Spark logo — exact artwork from /public/logo.png, fills its tile. */
export function Logo({ className }: { className?: string }) {
  return (
    <img
      src="/logo.png"
      alt="The Hyder Spark"
      className={className ? `${className} object-cover` : "h-full w-full object-cover"}
    />
  );
}
