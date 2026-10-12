---
title: Hosted verification
description: Redirect your user to our verification page, which sends and checks the code, then confirm the result once from your server.
order: 1
---

# Hosted verification

There are two ways to add secondfactor.ai to your app:

- **The API.** Your server calls [Send OTP](./send-otp.md) and
  [Verify OTP](./check-otp.md), and your app draws its own screens.
- **The hosted page**, described here. You redirect the user to our
  verification page, much like Stripe Checkout. We send the code, the user
  types it on our page, and we redirect them back to you.

There is no third, "headless" way in which your browser or app calls our API
with a token. If you want your own screens, use the API from your server.

A **verification session** proves that one person controls one phone number.
Your server creates the session with your API key and fixes the number, and
finishes by **confirming** the session. Confirmation succeeds once. Until it
does, nothing a browser tells you counts.

**There is no sandbox.** Each code sent is a real message and is charged. To
try the flow without sending anything, open the hosted page and press
**Not your number?**, which ends the session at no cost. The dashboard's
**Playground** can also create a hosted session without an API key.

## Before you start

You need your API key and your Service SID (`VA…`), as for every other call.
You also need at least one **return origin**: the origin your users come back
to, such as `https://app.example.com`. Add it under
**Settings → Hosted verification**. Only Owners and Admins can change the list.
`http://localhost` origins are allowed for development.

Until the list has an origin, creating a session fails with `400
no_return_origin`. A `ReturnUrl` on any other origin fails with `400
origin_not_allowed`. The path and query of a `ReturnUrl` are up to you; the
origin is fixed by the list. This means a `?next=` parameter in your own app
can never turn our page into an open redirect.

## Quickstart

**1. Create the session on your server**, when the user reaches the step that
needs a verified number. Store the returned `sid` against this user's
pre-sign-in state, then redirect the browser to `url`.

```bash
curl -X POST "https://api.secondfactor.ai/v2/Services/$SERVICE_SID/VerificationSessions" \
  -H "X-API-Key: $SF_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"To": "+9779841000000", "ReturnUrl": "https://app.example.com/verified", "ClientReferenceId": "signup-8812"}'
```

```json
{
  "sid": "VSN26H7K3MQ2XWZ8RT4",
  "status": "OPEN",
  "to": "+9779841000000",
  "client_reference_id": "signup-8812",
  "return_url": "https://app.example.com/verified",
  "url": "https://verify.secondfactor.ai/#vst_Qm9yZWFsaXMgb2YgdGhlIG5vcnRo…",
  "expires_at": "2026-10-08T10:15:00Z"
}
```

`url` is shown **once**. We keep only a hash of the token inside it.

**2. The user verifies on our page.** The page shows your app name and accent
colour, confirms the masked number, sends the code when the user presses
**Send code**, and checks what they type. Opening the link never sends
anything, so link previews and email scanners cannot cost you money.

**3. The user comes back** to your `ReturnUrl` with two parameters added:

```
https://app.example.com/verified?sf_session_id=VSN26H7K3MQ2XWZ8RT4&sf_return_token=vsr_…
```

`sf_return_token` is present only when the user verified. It is handed only to
the browser that typed the right code.

**4. Confirm on your server**, using the `sid` you stored in step 1. Do not use
`sf_session_id` from the URL: it only tells you which stored session to look
up, and anyone can edit a URL.

```bash
curl -X POST "https://api.secondfactor.ai/v2/Services/$SERVICE_SID/VerificationSessions/VSN26H7K3MQ2XWZ8RT4/Confirm" \
  -H "X-API-Key: $SF_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"ReturnToken": "vsr_…"}'
```

`200` with `"confirmed": true` means the number in `to` is proven. Sign the
user in. Any other answer means it is not:

| Status | `code` | Meaning |
|---|---|---|
| `400` | `missing_return_token` | The return URL had no `sf_return_token`: the user did not verify, or reloaded the page after verifying. Start a new session. |
| `409` | `not_verified` | The session is `OPEN`, `CANCELED`, `FAILED` or `EXPIRED`. |
| `409` | `already_confirmed` | This session was confirmed before. Treat a repeat as a replayed URL. |
| `422` | `invalid_return_token` | The token does not belong to this session. |
| `404` | `not_found` | Not one of your sessions. |

## Limits and billing

- A session lasts **15 minutes** and sends at most **3 codes**, at least
  **30 seconds** apart.
- Each code accepts 5 attempts and expires as your template says.
- Each code sent is charged exactly like a send through `Verifications`, at the
  same price, and is never refunded. Creating, checking, cancelling and
  confirming a session cost nothing.
- Sessions of one organization may send at most 6 codes an hour to one number,
  on top of the [per-number limits](./errors.md) every send obeys.
- After a session ends, our page can still show it for one hour, so Back or
  a reload can still find the way back to you. After that the link is
  refused.
- The page resends a code only when the user asks, at most every 30 seconds,
  and a code from an earlier send that is still valid is accepted, so a slow
  SMS still works after a resend.
- Revoking the API key that created a session ends the session.

## Session states

| `status` | Meaning |
|---|---|
| `OPEN` | Created; codes may have been sent; not verified yet. |
| `VERIFIED` | The user typed a right code. Confirm it. |
| `CANCELED` | The user pressed **Not your number?**. |
| `FAILED` | It can no longer succeed. `failure_reason` is `max_sends`, `max_attempts`, or `send_refused:<code>` where `<code>` is the [send error](./errors.md) that stopped it, such as `send_refused:insufficient_funds`. The hosted page tells the user only that sending failed. |
| `EXPIRED` | Fifteen minutes passed before it was verified. |

Retrieve a session at any time with
`GET /v2/Services/{ServiceSid}/VerificationSessions/{sid}`. Reading a session is
not proof of anything; only Confirm is.

## Webhooks

Codes sent by a session raise the usual `otp.*` events. Their payload carries
`verification_session` with the session `sid`, so you can match an event to the
session you stored.

## Mobile apps

Open the hosted `url` in `ASWebAuthenticationSession` on iOS or a Custom Tab on
Android, with a universal link or app link on one of your return origins as the
`ReturnUrl`. Custom URL schemes are not accepted as return origins yet.
