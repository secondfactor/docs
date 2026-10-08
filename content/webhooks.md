---
title: Webhooks
description: Receive a signed POST when a code is delivered, fails, is verified or expires, instead of polling.
order: 5
---

# Webhooks

We send a signed `POST` to your URL when something happens to a verification,
so you do not have to poll.

## Setup

On the dashboard's **Settings** page, enter your URL under **DLR webhook** and
save. The card shows your **signing secret**, and **Send test event** sends a
`webhook.test` event to your URL.

Your URL must be `https` and reachable from the public internet.

## Events

| Event | Sent when |
|---|---|
| `otp.delivered` | A carrier confirmed delivery. |
| `otp.failed` | Every channel was tried and each one failed. |
| `otp.verified` | Your user entered the correct code. |
| `otp.expired` | The code expired without being verified. |
| `webhook.test` | You pressed **Send test event**. |

If the last channel accepts the message but never sends a receipt, you get
neither `otp.delivered` nor `otp.failed`. For a code that is never verified,
`otp.expired` is the event you can count on.

## Payload

The `otp.*` events share one body:

```json
{
  "event": "otp.delivered",
  "verification_sid": "VEb7c8d9e0f1a2b3c4d5e6f708192a3b4c",
  "request_id": "OTP26H7K3M9PQRSTVW",
  "phone": "+9779841000000",
  "country": "NP",
  "status": "DELIVERED",
  "channel": "WHATSAPP",
  "charged": "0.01",
  "verified_at": null,
  "requested_at": "2026-09-12T09:14:22.104382+00:00"
}
```

| Field | Description |
|---|---|
| `event` | The event name. Branch on this, not on a header. |
| `verification_sid` | The `sid` the send returned. Match events to your users with it. `null` for a send that did not come through the API, such as a dashboard test send. |
| `request_id` | Our reference for the same send, shown on the dashboard's **OTP logs** page. Quote it to support. |
| `phone` | The phone number, in E.164. |
| `country` | The two-letter country code of `phone`. |
| `status` | The delivery status: the values of `delivery_status` in the API. |
| `channel` | The channel that delivered, in **upper case** (`SMS`, `WHATSAPP`, …), or `null`. |
| `charged` | What the send cost, rounded to 2 decimal places. Use `price` from the API for exact amounts. |
| `verified_at`, `requested_at` | ISO 8601 with a `+00:00` offset. Parse them with an ISO 8601 parser, not a fixed format. |

`webhook.test` has a different body:

```json
{ "event": "webhook.test", "message": "secondfactor.ai webhook test" }
```

## Verifying the signature

`X-SF-Signature` is `sha256=` followed by the lower-case hex HMAC-SHA256 of the
raw request body, keyed with your signing secret. Compute it over the bytes you
received, before parsing the JSON, and compare in constant time:

```python
import hashlib, hmac

def is_valid(raw_body: bytes, signature_header: str, secret: str) -> bool:
    expected = "sha256=" + hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature_header)
```

Only the body is signed. The other headers (`X-SF-Event`, `X-SF-Delivery`,
`X-SF-Timestamp`) are informational: do not base a security decision on them.

## Delivery and retries

- Answer with a `2xx` status within 5 seconds. Otherwise we retry after about
  30 seconds, 1 minute, 2 minutes and 4 minutes, then give up: 5 attempts in all.
- Events can arrive **more than once** and **out of order**, for example
  `otp.delivered` after `otp.expired`. Make your handler idempotent on
  `verification_sid` plus `event`, and do not infer state from arrival order.
- Webhooks are best-effort. If an event matters, confirm it by
  [fetching the verification](./get-verification.md).
