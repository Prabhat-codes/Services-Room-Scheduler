import Image from "next/image";
import { clsx } from "clsx";

/**
 * The committee lockup. The artwork is black on transparent, so a second file with
 * light lettering is swapped in for dark mode; the red and yellow stay put.
 */
export function ServicesLogo({ className, priority }: { className?: string; priority?: boolean }) {
  return (
    <>
      <Image src="/logo.png" alt="Services committee" width={1933} height={542} priority={priority} className={clsx("dark:hidden", className)} />
      <Image
        src="/logo-dark.png"
        alt=""
        aria-hidden
        width={1933}
        height={542}
        priority={priority}
        className={clsx("hidden dark:block", className)}
      />
    </>
  );
}

/** Just the crescent mark, for headers and tight spaces. */
export function ServicesMark({ className }: { className?: string }) {
  return <Image src="/icon.png" alt="" aria-hidden width={512} height={512} className={clsx("size-7 shrink-0", className)} />;
}
