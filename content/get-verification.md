---
title: Get OTP status
description: GET /v2/Services/{ServiceSid}/Verifications/{VerificationSid} — read the current state of a verification.
order: 4
---

# Get OTP status

```
GET /v2/Services/{ServiceSid}/Verifications/{VerificationSid}
```

Returns the current state of a verification, in any state. Free, and it does
not use up a check attempt.

Use it to show delivery progress, or to catch up on events your
[webhook](./webhooks.md) missed. To find out whether a code is correct,
[verify it](./check-otp.md) instead.

## Parameters

| Name | In | Required | Description |
|---|---|---|---|
| `ServiceSid` | path | Yes | Your Service SID (`VA…`). |
| `VerificationSid` | path | Yes | The `sid` returned when you [sent the OTP](./send-otp.md). |

## Request

```bash
curl "https://api.secondfactor.ai/v2/Services/$SERVICE_SID/Verifications/VEb7c8d9e0f1a2b3c4d5e6f708192a3b4c" \
  -H "X-API-Key: $SF_API_KEY"
```

```python
import os

import requests

res = requests.get(
    f"https://api.secondfactor.ai/v2/Services/{os.environ['SERVICE_SID']}/Verifications/VEb7c8d9e0f1a2b3c4d5e6f708192a3b4c",
    headers={"X-API-Key": os.environ["SF_API_KEY"]},
)
verification = res.json()
```

```js
const res = await fetch(
  `https://api.secondfactor.ai/v2/Services/${process.env.SERVICE_SID}/Verifications/VEb7c8d9e0f1a2b3c4d5e6f708192a3b4c`,
  { headers: { "X-API-Key": process.env.SF_API_KEY } },
);
const verification = await res.json();
```

```java
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

HttpRequest request = HttpRequest.newBuilder()
    .uri(URI.create("https://api.secondfactor.ai/v2/Services/" + System.getenv("SERVICE_SID")
        + "/Verifications/VEb7c8d9e0f1a2b3c4d5e6f708192a3b4c"))
    .header("X-API-Key", System.getenv("SF_API_KEY"))
    .GET()
    .build();
HttpResponse<String> response = HttpClient.newHttpClient().send(request, HttpResponse.BodyHandlers.ofString());
```

```rust
// Crates: reqwest (with the "json" feature), serde_json and tokio.
let verification: serde_json::Value = reqwest::Client::new()
    .get(format!(
        "https://api.secondfactor.ai/v2/Services/{}/Verifications/VEb7c8d9e0f1a2b3c4d5e6f708192a3b4c",
        std::env::var("SERVICE_SID")?
    ))
    .header("X-API-Key", std::env::var("SF_API_KEY")?)
    .send()
    .await?
    .json()
    .await?;
```

```go
import (
	"net/http"
	"os"
)

req, err := http.NewRequest(http.MethodGet,
	"https://api.secondfactor.ai/v2/Services/"+os.Getenv("SERVICE_SID")+"/Verifications/VEb7c8d9e0f1a2b3c4d5e6f708192a3b4c",
	nil)
if err != nil {
	return err
}
req.Header.Set("X-API-Key", os.Getenv("SF_API_KEY"))
res, err := http.DefaultClient.Do(req)
if err != nil {
	return err
}
defer res.Body.Close()
```

## Response

`200 OK`, with the [verification object](./send-otp.md#the-verification-object):

```json
{
  "sid": "VEb7c8d9e0f1a2b3c4d5e6f708192a3b4c",
  "to": "+9779841000000",
  "status": "PENDING",
  "delivery_status": "DELIVERED",
  "channel": "whatsapp",
  "price": "0.0120",
  "price_unit": "USD",
  "attempts_remaining": 5,
  "expires_at": "2026-09-12T09:19:22Z",
  "date_created": "2026-09-12T09:14:22Z"
}
```

If you poll for delivery, poll at most once a second. Stop when
`delivery_status` is `DELIVERED` or `FAILED`, or when `expires_at` has passed:
`SENT` can be final.

## Errors

| HTTP | `code` | Cause |
|---|---|---|
| 404 | `not_found` | No verification with this SID belongs to you. |

For errors every endpoint can return, see [Errors](./errors.md).
