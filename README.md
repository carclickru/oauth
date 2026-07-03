# @carclickru/oauth

React SDK для входа через CarClick ID. Использует OpenID Connect Authorization
Code Flow с PKCE и всегда работает с issuer:

```text
https://passport.carclick.ru/realms/master
```

Пакет подходит для React SPA и клиентской части Next.js. Он открывает CarClick
ID, обрабатывает callback, восстанавливает пользователя после перезагрузки и
обновляет access token.

Надпись брендированной кнопки всегда фиксирована: `CARCLICK ID`. Компонент не
принимает `children`, поэтому интегратор не может заменить текст кнопки.

## Что должна получить сторонняя организация

Для каждой интеграции CarClick создаёт в Keycloak отдельный public client:

- `Client authentication`: Off;
- `Standard flow`: On;
- PKCE method: `S256`;
- точные `Valid redirect URIs`;
- точные `Valid post logout redirect URIs`;
- точные `Web origins`.

Keycloak проверяет `redirect_uri` как часть настроек конкретного `clientId`.
URI, схема, домен, порт и путь должны совпасть. Например, эти адреса разные:

```text
https://pay4car.me/auth/carclick/callback
http://localhost:3000/auth/carclick/callback
```

Для разработки используйте отдельный dev-client либо добавьте localhost URI в
разрешённые адреса. На production не используйте fallback client ID:

```ts
const clientId = import.meta.env.VITE_CARCLICK_CLIENT_ID;
if (!clientId) throw new Error("VITE_CARCLICK_CLIENT_ID is required");
```

Для `Web origins` указывается origin без завершающего `/`:

```text
https://pay4car.me
```

Значение `*` на production использовать не рекомендуется.

Организации передаются только `clientId` и согласованные callback URL. Никаких
client secret в React/Next frontend быть не должно.

## Установка

В `.npmrc` приложения:

```ini
@carclickru:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_PACKAGES_TOKEN}
```

```bash
npm install @carclickru/oauth
```

## React

Оберните приложение в provider:

```tsx
import {
  CarClickAuthProvider,
  CarClickOAuthButton,
  useCarClickAuth
} from "@carclickru/oauth";
import "@carclickru/oauth/styles.css";

export function App() {
  return (
    <CarClickAuthProvider
      clientId="partner-application"
      callbackUrl="https://partner.example.com/auth/carclick/callback"
      logoutRedirectUrl="https://partner.example.com/"
      onSession={session => {
        console.log("CarClick session", session);
      }}
    >
      <Page />
    </CarClickAuthProvider>
  );
}

function Page() {
  const { session, signOut } = useCarClickAuth();

  if (!session) return <CarClickOAuthButton />;

  return (
    <>
      <div>Пользователь: {session.profile.email}</div>
      <button onClick={() => void signOut()}>Выйти</button>
    </>
  );
}
```

На маршруте `/auth/carclick/callback`:

```tsx
import { CarClickAuthCallback } from "@carclickru/oauth";

export function CarClickCallbackPage() {
  return (
    <CarClickAuthCallback
      loading={<div>Завершаем вход…</div>}
      onSuccess={(_session, returnTo) => {
        window.location.replace(returnTo ?? "/");
      }}
      errorFallback={error => <div>Ошибка входа: {error.message}</div>}
    />
  );
}
```

## Next.js App Router

Provider должен находиться в Client Component:

```tsx
"use client";

import { CarClickAuthProvider } from "@carclickru/oauth";
import "@carclickru/oauth/styles.css";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <CarClickAuthProvider
      clientId={process.env.NEXT_PUBLIC_CARCLICK_CLIENT_ID!}
      callbackUrl={process.env.NEXT_PUBLIC_CARCLICK_CALLBACK_URL!}
      logoutRedirectUrl={process.env.NEXT_PUBLIC_APP_URL!}
    >
      {children}
    </CarClickAuthProvider>
  );
}
```

Callback page:

```tsx
"use client";

import { CarClickAuthCallback } from "@carclickru/oauth";
import { useRouter } from "next/navigation";

export default function CallbackPage() {
  const router = useRouter();

  return (
    <CarClickAuthCallback
      loading="Завершаем вход…"
      onSuccess={(_session, returnTo) => router.replace(returnTo ?? "/")}
    />
  );
}
```

## Данные сессии

`useCarClickAuth().session` и `onSession` возвращают:

```ts
type CarClickSession = {
  accessToken: string;
  idToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  expired: boolean;
  scopes: string[];
  profile: UserProfile; // sub, email, name и claims Keycloak
  returnTo?: string;
};
```

Для запросов к API используйте `getAccessToken()`. По умолчанию сессия хранится
в `sessionStorage`; при необходимости можно указать `storage="local"`.

> Этот SDK реализует браузерную OIDC-сессию. Если Next.js-приложению нужна
> серверная HttpOnly-cookie сессия, callback должен обрабатываться backend/BFF
> (например Auth.js), а кнопка SDK должна вызывать его login endpoint.

## Публикация

Обновите `version` в `package.json` и отправьте совпадающий тег:

```bash
git tag v1.0.3
git push origin master --tags
```

GitHub Actions соберёт пакет и опубликует его в GitHub Packages.
