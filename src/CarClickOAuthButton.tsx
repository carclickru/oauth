import {
  forwardRef,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type MouseEventHandler,
  type ReactNode
} from "react";
import { CarClickLogo } from "./CarClickLogo";
import { CARCLICK_AUTHORITY, useOptionalCarClickAuth } from "./auth";
import "./styles.css";

/**
 * Origin of CarClick ID derived from the single authority constant, so the
 * host name is declared exactly once in the package.
 */
const CARCLICK_ORIGIN = CARCLICK_AUTHORITY.replace(/\/realms\/[^/]+\/?$/, "");

/** Default Keycloak realm ("node") used for the account console link. */
export const CARCLICK_DEFAULT_NODE = "master";

/**
 * Keycloak account console URL of a CarClick ID node (realm), for example
 * `https://passport.carclick.ru/realms/master/account/`.
 */
export function carClickAccountUrl(node: string = CARCLICK_DEFAULT_NODE) {
  return `${CARCLICK_ORIGIN}/realms/${node}/account/`;
}

function UserGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" focusable="false" aria-hidden="true">
      <circle cx="12" cy="8.4" r="3.6" fill="currentColor" />
      <path
        d="M4.6 20.2c0-3.7 3.3-6.2 7.4-6.2s7.4 2.5 7.4 6.2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LinkArrowGlyph() {
  return (
    <svg viewBox="0 0 14 14" fill="none" focusable="false" aria-hidden="true">
      <path
        d="M4.4 9.6 9.6 4.4M5.1 4.2h4.7v4.7"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type CommonProps = {
  /** Replaces the built-in CarClick mark. Wins over the avatar. */
  icon?: ReactNode;
  /** Accessible label. The visible brand label is always CARCLICK ID. */
  "aria-label"?: string;
  className?: string;
  disabled?: boolean;
  /**
   * Explicit signed-in override. When omitted the component falls back to the
   * optional CarClick auth context. Host apps that own the session (NextAuth,
   * a BFF cookie, …) pass this themselves.
   */
  authenticated?: boolean;
  /**
   * User picture shown in the round avatar. When omitted, the profile picture
   * of the CarClick auth context session is used.
   */
  avatarUrl?: string | null;
  /** Rendered inside the circle when there is no picture (for example initials). */
  avatarFallback?: ReactNode;
  /** Keycloak realm used to build the account console link. Default "master". */
  node?: string;
  /** Full override of the account console URL. */
  accountUrl?: string;
};

type LinkProps = CommonProps &
  Omit<
    AnchorHTMLAttributes<HTMLAnchorElement>,
    keyof CommonProps | "children" | "href"
  > & {
    href: string;
    onClick?: MouseEventHandler<HTMLAnchorElement>;
  };

type ButtonProps = CommonProps &
  Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    keyof CommonProps | "children"
  > & {
    href?: never;
    onClick?: MouseEventHandler<HTMLButtonElement>;
  };

export type CarClickOAuthButtonProps = LinkProps | ButtonProps;

function cx(...classes: Array<string | undefined>) {
  return classes.filter(Boolean).join(" ");
}

/**
 * Branded CarClick ID control.
 *
 * Signed out: pass `href` for a regular OAuth redirect, or `onClick` when the
 * host framework owns the authentication flow (for example NextAuth).
 *
 * Signed in (`authenticated`): the leading slot becomes a round avatar and a
 * trailing ↗ arrow is rendered. Since nesting interactive elements is invalid
 * HTML, the arrow is never a separate link: instead the whole control becomes
 * the account console link, unless the caller supplied its own `href`/`onClick`
 * — then the caller keeps the root and the arrow stays a decoration.
 */
export const CarClickOAuthButton = forwardRef<
  HTMLAnchorElement | HTMLButtonElement,
  CarClickOAuthButtonProps
>(function CarClickOAuthButton(
  {
    icon,
    className,
    disabled = false,
    authenticated,
    avatarUrl,
    avatarFallback,
    node = CARCLICK_DEFAULT_NODE,
    accountUrl,
    ...props
  },
  ref
) {
  const auth = useOptionalCarClickAuth();
  const isDisabled = disabled || (auth?.isLoading ?? false);
  const isAuthenticated = authenticated ?? auth?.isAuthenticated ?? false;

  const contextPicture = auth?.session?.profile?.picture;
  const picture =
    avatarUrl !== undefined
      ? avatarUrl
      : typeof contextPicture === "string"
        ? contextPicture
        : null;

  const leading =
    isAuthenticated && icon === undefined ? (
      <span
        className="carclick-oauth-button__icon carclick-oauth-button__avatar"
        aria-hidden="true"
      >
        {picture ? <img src={picture} alt="" /> : (avatarFallback ?? <UserGlyph />)}
      </span>
    ) : (
      <span className="carclick-oauth-button__icon" aria-hidden="true">
        {icon ?? <CarClickLogo />}
      </span>
    );

  const content = (
    <>
      {leading}
      <span className="carclick-oauth-button__label">CARCLICK ID</span>
      {isAuthenticated ? (
        <span className="carclick-oauth-button__arrow" aria-hidden="true">
          <LinkArrowGlyph />
        </span>
      ) : null}
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

  // Signed in and the caller did not claim the root: the control itself is the
  // account console link, so the ↗ arrow never becomes a nested <a>.
  if (isAuthenticated && props.onClick === undefined) {
    const { type: _type, onClick: _onClick, ...anchorProps } = props as ButtonProps;
    const href = accountUrl ?? carClickAccountUrl(node);

    return (
      <a
        {...(anchorProps as AnchorHTMLAttributes<HTMLAnchorElement>)}
        ref={ref as React.ForwardedRef<HTMLAnchorElement>}
        href={isDisabled ? undefined : href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={isDisabled ? event => event.preventDefault() : undefined}
        aria-disabled={isDisabled || undefined}
        aria-label={props["aria-label"] ?? "Аккаунт CarClick ID"}
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
      aria-label={
        props["aria-label"] ??
        (isAuthenticated ? "Аккаунт CarClick ID" : undefined)
      }
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
