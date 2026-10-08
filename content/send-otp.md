---
title: Send OTP
description: POST /v2/Services/{ServiceSid}/Verifications — send a one-time code to a phone number and get back a verification SID.
order: 2
---

# Send OTP

```
POST /v2/Services/{ServiceSid}/Verifications
```

Sends a one-time code to a phone number. Returns a **verification** whose `sid`
you use to [verify the OTP](./check-otp.md). **Charged** on every `201`.

## Parameters

| Name | In | Required | Description |
|---|---|---|---|
| `ServiceSid` | path | Yes | Your Service SID (`VA…`), from the dashboard's **Settings** page. |
| `To` | body | Yes | The phone number in [E.164](./README.md#conventions) format, for example `+9779841000000`. Up to 20 characters. |
| `TemplateSid` | body | No | The ID of one of your message templates, from the **Templates** page. Omit it to use your default template. A Twilio template SID (`HJ…`) is ignored. |
| `Code` | body | No | **Usually omitted.** Only if you generate codes yourself: 4 to 10 letters or digits that we deliver as-is, and [that you check yourself](#sending-your-own-code). Without it, we generate a 6-digit code. |
| `Idempotency-Key` | header | No | A random string up to 191 characters, new for each code you send. See [Retrying safely](#retrying-safely). |

There is no channel parameter; see
[How the code is delivered](#how-the-code-is-delivered).

## Request

```bash
curl -X POST "https://api.secondfactor.ai/v2/Services/$SERVICE_SID/Verifications" \
  -H "X-API-Key: $SF_API_KEY" \
  -H "Idempotency-Key: 3f6c2a1e-8d4b-4e7a-9c0f-5b2d1e8a7c63" \
  --data-urlencode "To=+9779841000000"
```

```python
import os
import uuid

import requests

res = requests.post(
    f"https://api.secondfactor.ai/v2/Services/{os.environ['SERVICE_SID']}/Verifications",
    headers={
        "X-API-Key": os.environ["SF_API_KEY"],
        "Idempotency-Key": str(uuid.uuid4()),
    },
    data={"To": "+9779841000000"},
)
verification = res.json()
```

```js
const res = await fetch(`https://api.secondfactor.ai/v2/Services/${process.env.SERVICE_SID}/Verifications`, {
  method: "POST",
  headers: {
    "X-API-Key": process.env.SF_API_KEY,
    "Content-Type": "application/json",
    "Idempotency-Key": crypto.randomUUID(),
  },
  body: JSON.stringify({ To: "+9779841000000" }),
});
const verification = await res.json();
```

```java
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.UUID;

HttpRequest request = HttpRequest.newBuilder()
    .uri(URI.create("https://api.secondfactor.ai/v2/Services/" + System.getenv("SERVICE_SID") + "/Verifications"))
    .header("X-API-Key", System.getenv("SF_API_KEY"))
    .header("Idempotency-Key", UUID.randomUUID().toString())
    .header("Content-Type", "application/json")
    .POST(HttpRequest.BodyPublishers.ofString("{\"To\": \"+9779841000000\"}"))
    .build();
HttpResponse<String> response = HttpClient.newHttpClient().send(request, HttpResponse.BodyHandlers.ofString());
```

```rust
// Crates: reqwest (with the "json" feature), serde_json, tokio and uuid.
let verification: serde_json::Value = reqwest::Client::new()
    .post(format!(
        "https://api.secondfactor.ai/v2/Services/{}/Verifications",
        std::env::var("SERVICE_SID")?
    ))
    .header("X-API-Key", std::env::var("SF_API_KEY")?)
    .header("Idempotency-Key", uuid::Uuid::new_v4().to_string())
    .form(&[("To", "+9779841000000")])
    .send()
    .await?
    .json()
    .await?;
```

```go
import (
	"net/http"
	"net/url"
	"os"
	"strings"

	"github.com/google/uuid"
)

form := url.Values{"To": {"+9779841000000"}}
req, err := http.NewRequest(http.MethodPost,
	"https://api.secondfactor.ai/v2/Services/"+os.Getenv("SERVICE_SID")+"/Verifications",
	strings.NewReader(form.Encode()))
if err != nil {
	return err
}
req.Header.Set("X-API-Key", os.Getenv("SF_API_KEY"))
req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
req.Header.Set("Idempotency-Key", uuid.NewString())
res, err := http.DefaultClient.Do(req)
if err != nil {
	return err
}
defer res.Body.Close()
```

## Response

`201 Created`, with the verification:

```json
{
  "sid": "VEb7c8d9e0f1a2b3c4d5e6f708192a3b4c",
  "to": "+9779841000000",
  "status": "PENDING",
  "delivery_status": "PENDING",
  "channel": "whatsapp",
  "price": "0.0120",
  "price_unit": "USD",
  "attempts_remaining": 5,
  "expires_at": "2026-09-12T09:19:22Z",
  "date_created": "2026-09-12T09:14:22Z"
}
```

`201` means the send was accepted, not that the message arrived.

### The verification object

Sending, [checking](./check-otp.md) and [fetching](./get-verification.md) all
return this object. Every field is always present.

| Field | Type | Description |
|---|---|---|
| `sid` | string | The verification SID (`VE…`). Store it server-side for the check. |
| `to` | string | The phone number, normalized to E.164. It may differ from the `To` you sent. |
| `status` | string | The state of the **code**: `PENDING`, `VERIFIED`, `EXPIRED` or `LOCKED` (too many wrong codes). |
| `delivery_status` | string | The state of the **message**: `PENDING` (we are still trying channels), `SENT` (our last channel accepted it and there is no receipt yet; this can be final), `DELIVERED` or `FAILED` (every channel failed). |
| `channel` | string or null | `sms`, `whatsapp`, `viber`, `rcs` or `sna`. Before delivery, the first channel we tried; once delivered, the channel that delivered. `null` if no channel is known yet. |
| `price` | string | What this send cost, as a decimal string, for example `"0.0120"`. |
| `price_unit` | string | Always `USD`. |
| `attempts_remaining` | integer | How many more checks the code accepts. |
| `expires_at` | string | When the code stops working. Use it for a countdown in your UI. |
| `date_created` | string | When the send was accepted. |

`status` becomes `EXPIRED` up to a minute after `expires_at`, or at the next
check. Treat a `PENDING` code past its `expires_at` as expired.

## Sending again

There is no resend endpoint. To send another code, call this endpoint again with
the same `To`. Each call:

- creates a **new verification** with a new `sid` and a new code,
- is **charged** again,
- leaves the previous code valid until it expires.

Check against the `sid` from the latest response. Limit your "send again"
button: every press costs money, and the fourth send to a number within 5
minutes is refused with `burst`.

## Retrying safely

If a send times out, you cannot tell whether it was accepted, and a plain retry
can send and charge twice. Send an `Idempotency-Key` to prevent this:

- Generate a **new random key** for each code you mean to send, for example
  with `crypto.randomUUID()`, and reuse it only to retry that same send.
- A key from an accepted send (`201`) returns that same verification again,
  with `201`. Nothing is sent or charged, even if `To` is different.
- A key from a refused send is not remembered. Retrying it runs the send again,
  so after a `402` you can top up and retry with the same key.

**Never use the phone number or user ID as the key.** Every later send to that
user would return the first verification, and no new code would go out.

## Sending your own code

Pass `Code` only if you already generate codes and want us to deliver them. We
deliver your code exactly as given, over the same channels, at the same price.

We do not verify a code you supplied: [verifying](./check-otp.md) it answers
`409` with `client_code`. Compare it on your own server.

## How the code is delivered

We send over the cheapest channel your account has enabled that can reach the
number. If it does not confirm delivery within 8 seconds, we switch to the next
channel. Follow delivery with [webhooks](./webhooks.md) or by
[fetching the verification](./get-verification.md).

## Errors

A refused send is never charged. For errors every endpoint can return, see
[Errors](./errors.md).

| HTTP | `code` | Cause |
|---|---|---|
| 400 | `invalid_parameter` | `To` is missing or longer than 20 characters. |
| 400 | `invalid_code` | `Code` is not 4 to 10 letters or digits. |
| 400 | `unroutable` | `To` is not a valid phone number, or we do not serve its country. |
| 400 | `no_default_template` | No `TemplateSid` was given and you have no default template. |
| 400 | `no_eligible_channel` | None of your enabled channels can reach this number. |
| 400 | `unreachable` | Every channel rejected this number recently. It is refused for up to 30 days. |
| 402 | `insufficient_funds` | Your balance is too low. Top up on the **Billing & credits** page. |
| 403 | `blocked_by_policy` | One of your delivery rules blocks this destination. |
| 404 | `unknown_template` | `TemplateSid` is not one of your templates. |
| 429 | `burst` | More than 3 sends to this number in 5 minutes. |
| 429 | `rate_limited` | More than 10 sends to this number in an hour (no `Retry-After` header), or your key's request limit (with `Retry-After`). |
| 500 | `not_priceable` | We have no price for this destination. Contact support. |
