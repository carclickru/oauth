import type { SVGProps } from "react";

export function CarClickLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      role="presentation"
      aria-hidden="true"
      {...props}
    >
      <path
        fill="currentColor"
        d="M38.8 6.5H22.4A17.5 17.5 0 1 0 34.6 36l-7-7a7.7 7.7 0 1 1-5.2-13.4h7.1l9.3-9.1Z"
      />
      <path
        fill="currentColor"
        d="M27.8 23.2v18.3l5.7-5.7 6.8 6.8 4.4-4.4-6.8-6.8 6.1-6.1-16.2-2.1Z"
      />
    </svg>
  );
}
