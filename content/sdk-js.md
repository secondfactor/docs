---
title: Browser SDK
description: The @secondfactor/js package for browsers and React Native. Draw your own verification screens against a headless session your server created.
order: 12
---

# Browser SDK

The `@secondfactor/js` package sends and checks codes from your own UI. It
works in React, React Native, Expo, Vue, Svelte and plain JavaScript, anywhere
with `fetch`. It has no dependencies and includes type declarations.

It runs on the **user's device**, so it never holds your API key. Your server
holds the key and creates the session with the [Node.js](./sdk-node.md) or
[Python](./sdk-python.md) SDK.

```bash
npm install @secondfactor/js
```

**Act on the result on your server. Never trust `verified` in the browser.**
Anything running on the user's device can be changed by the user. The browser
only drives the screens; your server confirms the session it stored, and that
answer is the proof.

## How a headless session works

1. **Your server** creates a headless session for the number it wants
   verified, stores the session's `sid`, and hands the session's
   `client_token` to your frontend.
2. **Your frontend** calls `SecondFactor.withSession(clientToken)` and uses the
   returned [`VerificationSession`](#verificationsession) to send codes and
   check what the user types.
3. When `check` resolves with `verified: true`, your frontend tells your
   server, and **your server** calls `verifySession` (Node.js) or
   `verify_session` (Python) with the `sid` it stored. Act on that answer only.

The client token reaches only this one session: one number, at most three
codes, for fifteen minutes. That is why it is safe in the browser, and it is
useless once the session ends.

## SecondFactor.withSession(clientToken, options?)

Returns a [`VerificationSession`](#verificationsession) for the session whose
client token your server handed to this frontend.

| Param | Type | Default | Description |
|---|---|---|---|
| `clientToken` | string | — | Required. The `client_token` from your server's `createSession`. |
| `options.baseUrl` | string | `https://api.secondfactor.ai` | The API origin. Must be `https://`; plain `http://` is accepted only for `localhost`, `127.0.0.1` and `[::1]`. |
| `options.timeoutMs` | number | `10000` | Per request. |
| `options.fetch` | function | `globalThis.fetch` | A `fetch` to use instead of the global one. |

Throws `TypeError` when the token is missing or could not be a header value,
or when `baseUrl` is not allowed. The message never repeats the token.

```js
import { SecondFactor, SecondFactorError } from "@secondfactor/js";

const { clientToken } = await fetch("/verification/start", { method: "POST" }).then((r) => r.json());
const session = SecondFactor.withSession(clientToken);
```

## VerificationSession

One headless session, reached with its client token. Every method resolves with
the [session state](#the-session-state). The token is held in a private field,
so it never appears when the session is logged or serialized.

### send(options?)

Sends a code to the number your server fixed for this session, and resolves
with the session state plus `sent`.

`sent` is `false` when the press fell inside the resend cooldown and nothing
was sent; that is not an error. Read `resend_available_in` to show when the
user may try again.

Each call is one press of your button and gets its own idempotency key, so a
request the network retries sends at most one code. To retry a press yourself,
pass the key you used the first time as `options.idempotencyKey`.

```js
const state = await session.send();
if (!state.sent) showCountdown(state.resend_available_in);
```

### resend(options?)

The same as `send`, named for the button it serves.

### check(code)

Checks the code the user typed, and resolves with the session state plus
`verified`. The code is trimmed before it is sent.

**A wrong code is not an error.** It resolves with `verified: false` and
`attempts_remaining`. `check` throws when the session can no longer succeed
this way: with `code_expired` when only a resend helps, or with
`max_attempts`, `expired` and the other codes in [Errors](#secondfactorerror).

`verified` is `true` only when the API answered that the session is now
`VERIFIED`. Use it to move your screens on, never as proof.

```js
const result = await session.check(code);
if (result.verified) {
  await fetch("/verification/done", { method: "POST" }); // your server confirms
} else {
  showWrongCode(result.attempts_remaining);
}
```

### status()

Resolves with the session state alone. It is cheap enough to poll every few
seconds while a code is out, for example to show the channel changing.

### cancel()

Ends the session, for a "Not your number?" link. Resolves with the final state.

## The session state

Every `VerificationSession` method resolves with this object.

| Field | Type | Description |
|---|---|---|
| `status` | string | `OPEN`, `VERIFIED`, `CANCELED`, `FAILED` or `EXPIRED`. |
| `failure_reason` | string or null | Why a `FAILED` session failed: `max_sends`, `max_attempts` or `send_refused`. |
| `channel` | string or null | The channel the newest code went out on, such as `sms` or `whatsapp`. It can change while a code is out, when delivery moves to the next channel. |
| `sends_remaining` | number | Codes the session may still send. |
| `resend_available_in` | number | Seconds until another code may be sent, for a "Resend in 27s" button. |
| `attempts_remaining` | number or null | Wrong guesses left on the newest code. `null` until a code is sent. |
| `code_expires_at` | string or null | When the newest code stops working. `null` until a code is sent. |
| `expires_at` | string | When the session stops working. |
| `sent` | boolean | `send` and `resend` only: whether a code went out. |
| `verified` | boolean | `check` only: whether the session is now `VERIFIED`. |

## SecondFactorError

A wrong code is not an error. Everything else throws a `SecondFactorError`, a
subclass of `Error`.

| Property | Type | Description |
|---|---|---|
| `code` | string or null | The stable string to branch on. `null` for an answer with no recognisable body, or a refused redirect. |
| `status` | number or null | The HTTP status, or `null` when no answer arrived. |
| `state` | object or null | The [session state](#the-session-state) when the session refused, so the screen can be redrawn from it. |
| `message` | string | For developers. Show your users your own words. |

| `code` | What happened | What to offer |
|---|---|---|
| `code_expired` | No code is live any more. | A resend. |
| `max_attempts` | Too many wrong codes. | Start again. |
| `max_sends` | The session has sent all its codes. | Start again. |
| `send_refused` | We could not send to this number. Your server can read why from the session's `failure_reason`. | Another way in. |
| `expired` | The session timed out. | Start again. |
| `canceled` | The session was canceled. | Start again. |
| `already_verified` | The session is already verified. | Carry on. |
| `unauthorized` | The client token is unknown, or the session ended over an hour ago. | Start again. |
| `rate_limited` | Too many requests. | Wait a little. |
| `network_error` | No answer arrived, or the request timed out. | Try again. |

New codes may be added in minor versions, so keep a default branch.

```js
try {
  await session.check(code);
} catch (error) {
  if (!(error instanceof SecondFactorError)) throw error;
  switch (error.code) {
    case "code_expired":
      setMessage("That code expired. Send a new one.");
      break;
    case "network_error":
      setMessage("Check your connection and try again.");
      break;
    default:
      setMessage("Verification failed. Start again.");
  }
}
```

## React example

```tsx
import { useMemo, useState } from "react";
import { SecondFactor, SecondFactorError } from "@secondfactor/js";

export function VerifyPhone({ clientToken, onDone }: { clientToken: string; onDone: () => void }) {
  const session = useMemo(() => SecondFactor.withSession(clientToken), [clientToken]);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");

  async function check() {
    try {
      const result = await session.check(code);
      if (result.verified) onDone(); // onDone tells your server, which confirms the session
      else setMessage(`Wrong code. ${result.attempts_remaining} attempts left.`);
    } catch (error) {
      if (error instanceof SecondFactorError && error.code === "code_expired") setMessage("That code expired. Send a new one.");
      else setMessage("Verification failed. Start again.");
    }
  }

  return (
    <>
      <button onClick={() => session.send().catch(() => setMessage("Could not send a code."))}>Send code</button>
      <input value={code} onChange={(e) => setCode(e.target.value)} autoComplete="one-time-code" inputMode="numeric" />
      <button onClick={check}>Verify</button>
      <p>{message}</p>
    </>
  );
}
```

## Proxy mode

For apps already built on three endpoints of their own that forward to
secondfactor.ai. New apps should use a headless session, which needs no proxy.

Your proxy serves `POST {base}/start`, `/verify` and `/resend`, and passes our
answer through with its status code.

### new SecondFactor(proxyBaseUrl, resendCooldownSeconds?, options?)

| Param | Type | Default | Description |
|---|---|---|---|
| `proxyBaseUrl` | string | — | Required. Your endpoints' base: a path on the page's own origin, such as `/auth/otp`, or an `https://` URL. Plain `http://` only for `localhost`, `127.0.0.1` and `[::1]`. |
| `resendCooldownSeconds` | number | `30` | Used for `resendAvailableIn`. The API's own cooldown is 30 seconds. |
| `options.timeoutMs` | number | `10000` | Per request. |
| `options.fetch` | function | `globalThis.fetch` | A `fetch` to use instead of the global one. |

| Member | Returns | Description |
|---|---|---|
| `send(phone)` | `Promise<string>` | Sends a code and resolves with the verification SID to check against. |
| `check(sid, code)` | `Promise<Verification>` | Resolves with the verification your proxy passed through, plus `verified`. A wrong code resolves with `verified: false`. Throws `expired`, `locked` or `already_verified` when the verification can never succeed. |
| `resend(sid)` | `Promise<string>` | Sends a fresh code. A resend is a new verification, so check against the SID this resolves with, not the old one. |
| `resendAvailableIn` | number | Seconds until `resend` is allowed again, counted from the last send on this client. |
| `start(phone)` | `Promise<string>` | Deprecated: use `send`. |
| `verify(sid, code)` | `Promise<boolean>` | Deprecated: use `check`, which also says how many attempts are left. |

```js
const sf = new SecondFactor("/auth/otp");

let sid = await sf.send("+9779841000001");
const result = await sf.check(sid, code); // { verified, … }
sid = await sf.resend(sid);               // check against the new sid from now on
```

As with sessions, `verified` only drives the screens. Your proxy sees our
answer itself, so record the verification there and act on that record.

## Security

- The client token is the only credential this library holds. It is sent in
  the `Authorization` header, never in a URL, and no cookie is sent with it.
  Never give this library your API key.
- Redirects are never followed: a redirect throws `SecondFactorError` with
  `code` null. React Native's `fetch` follows redirects regardless, so there an
  answer from a different URL is refused instead.
- A successful answer that is not the expected JSON, such as a captive
  portal's page, throws `SecondFactorError` and is never taken as a result.
