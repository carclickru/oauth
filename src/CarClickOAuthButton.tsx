import {
  forwardRef,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type MouseEventHandler,
  type ReactNode
} from "react";
import { CarClickLogo } from "./CarClickLogo";
import { useOptionalCarClickAuth } from "./auth";
import "./styles.css";

type CommonProps = {
  /** Text displayed inside the button. */
  children?: ReactNode;
  /** Replaces the built-in CarClick mark. */
  icon?: ReactNode;
  /** Accessible label. Defaults to the text value. */
  "aria-label"?: string;
  className?: string;
  disabled?: boolean;
};

type LinkProps = CommonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof CommonProps | "href"> & {
    href: string;
    onClick?: MouseEventHandler<HTMLAnchorElement>;
  };

type ButtonProps = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonProps> & {
    href?: never;
    onClick?: MouseEventHandler<HTMLButtonElement>;
  };

export type CarClickOAuthButtonProps = LinkProps | ButtonProps;

function cx(...classes: Array<string | undefined>) {
  return classes.filter(Boolean).join(" ");
}

/**
 * Branded CarClick ID sign-in control.
 *
 * Pass `href` for a regular OAuth redirect, or `onClick` when the host
 * framework owns the authentication flow (for example NextAuth).
 */
export const CarClickOAuthButton = forwardRef<
  HTMLAnchorElement | HTMLButtonElement,
  CarClickOAuthButtonProps
>(function CarClickOAuthButton(
  {
    children = "CARCLICK ID",
    icon,
    className,
    disabled = false,
    ...props
  },
  ref
) {
  const auth = useOptionalCarClickAuth();
  const isDisabled = disabled || (auth?.isLoading ?? false);
  const content = (
    <>
      <span className="carclick-oauth-button__icon" aria-hidden="true">
        {icon ?? <CarClickLogo />}
      </span>
      <span className="carclick-oauth-button__label">{children}</span>
    </>
  );

  if ("href" in props && props.href !== undefined) {
    const { href, onClick, ...anchorProps } = props;

    return (
      <a
        {...anchorProps}
        ref={ref as React.ForwardedRef<HTMLAnchorElement>}
        href={isDisabled ? undefined : href}
        onClick={isDisabled ? event => event.preventDefault() : onClick}
        aria-disabled={isDisabled || undefined}
        className={cx("carclick-oauth-button", className)}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      {...props}
      ref={ref as React.ForwardedRef<HTMLButtonElement>}
      type={props.type ?? "button"}
      disabled={isDisabled}
      onClick={
        props.onClick ??
        (auth
          ? () => {
              void auth.signIn();
            }
          : undefined)
      }
      className={cx("carclick-oauth-button", className)}
    >
      {content}
    </button>
  );
});
