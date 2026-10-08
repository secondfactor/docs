---
title: Errors
description: The error object, the errors every endpoint can return, and when to retry.
order: 8
---

# Errors

Every error has the same three fields:

```json
{
  "status": 400,
  "code": "invalid_parameter",
  "message": "To: This field is required."
}
```

| Field | Type | Description |
|---|---|---|
| `status` | integer | The HTTP status, repeated. |
| `code` | string | A stable identifier. **Branch on this.** |
| `message` | string | A sentence for your logs. Its wording can change, so do not parse it or show it to your users. |

A response with a `code` field is an error. A verification object also has a
`status` field, but there it is a string such as `"PENDING"`.

## Errors every endpoint can return

| HTTP | `code` | Cause |
|---|---|---|
| 400 | `invalid_parameter` | A parameter is missing or malformed, or `ServiceSid` is not a valid SID. `message` names the parameter. |
| 401 | `unauthorized` | Missing, wrong or revoked API key, an address outside the key's allowlist, or a suspended account. See [Authentication](./authentication.md). |
| 404 | `not_found` | The `ServiceSid` is not yours. |
| 405 | `invalid_parameter` | The HTTP method is not supported on this path. |
| 415 | `invalid_parameter` | The `Content-Type` is not form, multipart or JSON. |
| 429 | `rate_limited` | Your key made more than 120 requests in a minute. The `Retry-After` header gives the seconds to wait. |

Errors specific to one endpoint are listed on that endpoint's page. If you get
a `code` you do not recognise, handle it by its HTTP status: `4xx` means the
request needs changing, `5xx` means the problem is on our side.

## Retrying

- **Safe to retry** after a network error or a `5xx`: any `GET`, and a send
  that carries the same [`Idempotency-Key`](./send-otp.md#retrying-safely).
- **Do not retry** a send without an `Idempotency-Key`: it may already have been
  accepted and charged.
- **Do not retry** other `4xx` errors unchanged, except `429` after waiting.
- A `502`, `503` or `504` from our network edge may have no JSON body. Branch
  on the HTTP status.
