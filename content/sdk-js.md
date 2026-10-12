---
title: Browser SDK
description: The @secondfactor/js package for browsers and React Native. Send your user to the hosted verification page and read the result when they come back.
order: 12
---

# Browser SDK

The `@secondfactor/js` package is the client half of
[hosted verification](./hosted-verification.md). It sends your user to our
verification page and reads the result when they come back. It works in React,
React Native, Expo, Vue, Svelte and plain JavaScript, has no dependencies, and
includes type declarations.

It runs on the **user's device**. It never calls the secondfactor.ai API, and
never holds your API key, a phone number or a code. Your server creates and
confirms the session with the [Node.js](./sdk-node.md) or
[Python](./sdk-python.md) SDK.

```bash
npm install @secondfactor/js
```

**Act on the result on your server.** What this library reads from a URL is
not proof of anything, because anyone can edit a URL. Your server's
`verifySession` call is the proof.

## How it fits together

1. **Your server** creates a session, stores its `sid` and gives the page's
   `url` to your frontend.
2. **Your frontend** calls `redirectToVerification(url)`. We send the code,
   the user types it on our page, and we send them back to your return URL.
3. **Your return page** calls `takeVerificationReturn()` and posts the
   `returnToken` to your server.
4. **Your server** calls `verifySession` with the `sid` it stored and that
   return token, once, and acts on the answer.

```js
import { redirectToVerification, takeVerificationReturn } from "@secondfactor/js";

// The page that starts verification.
const { url } = await fetch("/verification/start", { method: "POST" }).then((r) => r.json());
redirectToVerification(url);

// The return page.
const back = takeVerificationReturn();
if (back?.returnToken) {
  await fetch("/verification/finish", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ returnToken: back.returnToken }),
  });
}
```

If your return page is rendered by your server, you do not need step 3: the
server reads `sf_return_token` from the request itself.

## redirectToVerification(url)

Sends the browser to the hosted page in the same tab, so Back returns to your
app. Browsers only.

| Param | Type | Description |
|---|---|---|
| `url` | string | The `url` your server got when it created the session. |

Throws `TypeError`, without navigating, when `url` is not a verification page:
not `https://` (plain `http://` is accepted only for `localhost`, `127.0.0.1`,
`[::1]` and `*.localhost`), carrying a user name or password, or without the
session's token in its fragment. A `javascript:` URL that reached your frontend
some other way is never followed.

## takeVerificationReturn()

Reads the two parameters the hosted page adds to your return URL from the
current page, and removes them from the address bar, so the single-use return
token stays out of the history and out of anything the user copies. Other
query parameters and the fragment are kept. Call it once, when your return
page loads. Browsers only.

Returns `null` when the page carries no `sf_session_id`, and otherwise:

| Field | Type | Description |
|---|---|---|
| `sessionId` | string | `sf_session_id`. Which stored session the user came back from. Always confirm the `sid` your server stored, never this one. |
| `returnToken` | string or null | `sf_return_token`. Present only when the user verified; `null` when they canceled, ran out of attempts or the session expired. |

## parseVerificationReturn(url)

The same as `takeVerificationReturn`, for any URL string, and without touching
the address bar. Use it in React Native, or wherever you already have the URL.

## React Native

Open the page outside your app, and read the result from the URL your app is
opened with. The session's `ReturnUrl` must be a universal link (iOS) or app
link (Android) on one of your return origins; custom URL schemes are not
accepted.

```js
import { Linking } from "react-native";
import { parseVerificationReturn } from "@secondfactor/js";

Linking.addEventListener("url", async ({ url }) => {
  const back = parseVerificationReturn(url);
  if (back?.returnToken) await api.post("/verification/finish", { returnToken: back.returnToken });
});

const { url } = await api.post("/verification/start");
await Linking.openURL(url);
```

An in-app authentication browser (`ASWebAuthenticationSession` on iOS, a
Custom Tab on Android) works the same way: open `url` in it, and pass the URL
it returns to `parseVerificationReturn`.
