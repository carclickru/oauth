import type { ImgHTMLAttributes } from "react";
import logoUrl from "./assets/carclick-logo.svg";

/**
 * The original CarClick logo used by the web application.
 */
export function CarClickLogo(props: ImgHTMLAttributes<HTMLImageElement>) {
  return <img src={logoUrl} alt="" aria-hidden="true" {...props} />;
}
