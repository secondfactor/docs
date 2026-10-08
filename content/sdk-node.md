---
title: Node.js SDK
description: The secondfactor package for Node.js servers. Create hosted and headless verification sessions, confirm them, and send and check codes directly.
order: 10
---

# Node.js SDK

The `secondfactor` package calls the API from your Node.js server. It has no
dependencies, needs Node 18 or later, and includes type declarations.

It runs on **your server** and holds your API key, which must never reach a
browser or a mobile app. For the browser or React Native side of a headless
session, use the [browser SDK](./sdk-js.md).

```bash
npm install secondfactor
```

You need an **API key** from the dashboard's **API keys** page. For the hosted
page you also need a **return origin**, such as `https://app.example.com`,
listed under **Settings → Hosted verification**.

## Choosing a flow

| Flow | Who draws the screens | Methods |
|---|---|---|
| Hosted session | We do. You redirect the user to our page and get them back on your return URL. | `createSession`, `verifySession` |
| Headless session | You do, in your frontend with the [browser SDK](./sdk-js.md). Your API key stays on your server and no proxy is needed. | `createSession` with `mode: "headless"`, `verifySession` |
| Direct sends | You do, and every code goes through your server. | `send`, `check` |

Sessions are the recommended way in. They give you one call at the end,
`verifySession`, that says whether the number was proven, and it succeeds only
once, so a replayed request cannot sign anyone in.

## SecondFactor

The client for one organization's API key. Create one and reuse it.

```js
const { SecondFactor, SecondFactorError } = require("secondfactor");
// or: import { SecondFactor, SecondFactorError } from "secondfactor";

const sf = new SecondFactor({ apiKey: process.env.SECONDFACTOR_API_KEY });
```

### new SecondFactor(options)

| Option | Type | Default | Description |
|---|---|---|---|
| `apiKey` | string | — | Required. A key from the dashboard. It is held in a private field, so it never appears when the client is logged or serialized. |
| `serviceSid` | string | looked up | Your Service SID (`VA…`). Every organization has exactly one, so when it is omitted the client looks it up once, on first use. |
| `baseUrl` | string | `https://api.secondfactor.ai` | Must be `https://`. Plain `http://` is accepted only for `localhost`, `127.0.0.1` and `[::1]`, for a local stub. |
| `timeoutMs` | number | `10000` | Per request, including reading the answer. |
| `fetch` | function | `globalThis.fetch` | A `fetch` to use instead of the global one, for example to add tracing. It must honour `redirect: "manual"` and `signal`. |

Throws `TypeError` when `apiKey` is missing or is not visible ASCII, or when
`baseUrl` is not safe to send the key to. The message never repeats the key.

### createSession(params)

Starts verifying a phone number and resolves with the
[session object](#the-session-object). Creating a session is free; each code it
sends is charged.

| Param | Type | Default | Description |
|---|---|---|---|
| `to` | string | — | Required. The phone number in E.164, for example `+9779841000001`. |
| `mode` | `"hosted"` or `"headless"` | `"hosted"` | Who draws the screens. |
| `returnUrl` | string | — | Hosted only, and required there. Where we send the user back. Its origin must be listed under Settings → Hosted verification. |
| `clientReferenceId` | string | — | Your own ID for this sign-in, such as your user's ID. It comes back from `verifySession`. |
| `templateSid` | string | your default | The message template to send the code with. |

A hosted session resolves with `url`: redirect the user there. A headless
session resolves with `client_token`: give it to your frontend. Either is
returned only this once.

Store the returned `sid` server-side against the user's pending sign-in, for
example in their session. It is what you confirm later.

```js
const session = await sf.createSession({
  to: user.phone,
  returnUrl: "https://app.example.com/verified",
  clientReferenceId: user.id,
});
req.session.sfSid = session.sid;
res.redirect(303, session.url);
```

### verifySession(storedSid, returnToken?)

Accepts the outcome of a session, **exactly once**, and resolves with the
number that was proven.

| Param | Type | Description |
|---|---|---|
| `storedSid` | string | The `sid` you stored when you created the session. Never the `sf_session_id` from the return URL: anyone can edit a URL. |
| `returnToken` | string | Hosted sessions only: the `sf_return_token` query parameter from the return URL. A headless session needs none. |

Resolves with:

| Field | Type | Description |
|---|---|---|
| `phone` | string | The number that was proven, in E.164. Use this, not anything the browser sent. |
| `clientReferenceId` | string or null | The `clientReferenceId` you passed to `createSession`. |
| `session` | object | The full [session object](#the-session-object). |

Throws `SecondFactorError` unless the session is `VERIFIED` and has not been
confirmed before. The usual codes are `missing_return_token`,
`invalid_return_token`, `not_verified`, `already_confirmed` and `not_found`.

```js
// On https://app.example.com/verified?sf_session_id=…&sf_return_token=…
const storedSid = req.session.sfSid;
delete req.session.sfSid;
try {
  const { phone } = await sf.verifySession(storedSid, req.query.sf_return_token);
  await markPhoneVerified(user, phone);
} catch (error) {
  if (!(error instanceof SecondFactorError)) throw error;
  return startAgain(error.code);
}
```

### retrieveSession(sid)

Resolves with the [session object](#the-session-object) as it stands now.
Reading a session proves nothing about who verified it, and it does not use up
the session; use `verifySession` to act on the outcome.

### send(to, options?)

Sends a code directly, without a session, and resolves with
[the verification object](./send-otp.md#the-verification-object). Keep its
`sid` server-side for the check. Each call is charged.

| Param | Type | Description |
|---|---|---|
| `to` | string | Required. The phone number in E.164. |
| `options.idempotencyKey` | string | New for each user action. A request retried with the same key is charged at most once. |
| `options.templateSid` | string | The message template to send the code with. |
| `options.code` | string | Only if you generate codes yourself. You then check them yourself too. |

There is no resend method. Sending to the same number again is a new
verification, with a new `sid`, and is charged again.

```js
const crypto = require("node:crypto");

const verification = await sf.send("+9779841000001", { idempotencyKey: crypto.randomUUID() });
req.session.verificationSid = verification.sid;
```

### check(verificationSid, code)

Checks the code your user typed. Resolves with the verification object plus
`verified`, which is true only when the code was right. Checking is free.

**A wrong code is not an error.** It resolves with `verified: false` and
`attempts_remaining`. A verification that can never succeed throws
`SecondFactorError` with `code` `expired`, `locked` or `already_verified`;
only a new `send` helps.

The code is trimmed before it is sent, and may be a string or a number.

```js
const result = await sf.check(req.session.verificationSid, req.body.code);
if (result.verified) {
  await markPhoneVerified(user, result.to);
} else {
  showWrongCode(result.attempts_remaining);
}
```

### serviceSid()

Resolves with your Service SID (`VA…`): the one passed to the constructor, or
the one looked up from the API on first use.

## SecondFactorError

Every refused request throws a `SecondFactorError`, a subclass of `Error`.

| Property | Type | Description |
|---|---|---|
| `code` | string or null | The stable string to branch on. |
| `status` | number or null | The HTTP status of the refusal, including a refused 3xx redirect. `null` when no answer arrived or a successful answer could not be trusted. |
| `message` | string | For your logs. It is safe to log; never show it to your users. |

| `code` | Thrown by | Meaning |
|---|---|---|
| `no_return_origin`, `origin_not_allowed` | `createSession` | Add the return URL's origin under Settings → Hosted verification. |
| `missing_return_token`, `invalid_return_token` | `verifySession` | The user did not finish verifying in this browser. Start again. |
| `not_verified` | `verifySession` | The session is open, canceled, failed or expired. |
| `already_confirmed` | `verifySession` | The session was confirmed before. Treat it as a replay. |
| `expired`, `locked`, `already_verified` | `check` | This verification can never succeed. Send a new code. |
| `unroutable` | `send`, `createSession` | Not a valid E.164 number. |
| `rate_limited`, `burst` | `send` | Too many codes to this number. Try later. |
| `insufficient_funds` | `send` | Top up your balance. |
| `invalid_response` | any | A successful answer was not the JSON the API sends. |
| `network_error` | any | The API could not be reached, or the request timed out. |

Other codes come straight from the API; see [Errors](./errors.md). New codes
may appear, so keep a default branch.

The API never redirects, so the client refuses a redirect rather than following
it, which could send your API key to another host. It throws with `status` set
to the redirect's 3xx status.

## The session object

`createSession`, `retrieveSession` and `verifySession` (as `session`) return
this object.

| Field | Type | Description |
|---|---|---|
| `sid` | string | The session SID. Store it server-side. |
| `mode` | string | `hosted` or `headless`. |
| `status` | string | `OPEN`, `VERIFIED`, `CANCELED`, `FAILED` or `EXPIRED`. |
| `failure_reason` | string or null | Why a `FAILED` session failed: `max_sends`, `max_attempts`, or `send_refused:<code>` when we could not send to the number. |
| `to` | string | The phone number being verified, in E.164. |
| `client_reference_id` | string or null | Your own ID, as passed to `createSession`. |
| `verification_sid` | string or null | The newest code the session sent (`VE…`). [Get OTP status](./get-verification.md) answers price and delivery questions about it. |
| `sends` | number | How many codes the session has sent. |
| `return_url` | string or null | Hosted sessions: where the user is sent back. |
| `confirmed` | boolean | Whether `verifySession` has accepted this session. |
| `expires_at` | string | When the session stops working. |
| `date_created` | string | When the session was created. |
| `date_completed` | string or null | When the session reached its final status. |
| `url` | string | Hosted sessions, on creation only: the page to redirect the user to. |
| `client_token` | string | Headless sessions, on creation only: the token for your frontend. |

## Headless example

The server half of a headless session. The frontend half is on the
[browser SDK](./sdk-js.md) page.

```js
app.post("/verification/start", async (req, res) => {
  const session = await sf.createSession({ to: req.user.phone, mode: "headless" });
  req.session.sfSid = session.sid;
  res.json({ clientToken: session.client_token });
});

app.post("/verification/done", async (req, res) => {
  const storedSid = req.session.sfSid;
  delete req.session.sfSid;
  try {
    const { phone } = await sf.verifySession(storedSid);
    await markPhoneVerified(req.user, phone);
    res.json({ verified: true });
  } catch (error) {
    if (!(error instanceof SecondFactorError)) throw error;
    res.status(400).json({ verified: false, reason: error.code });
  }
});
```

A runnable Express app with both session flows is in the package repository's
`examples/express.js`.
