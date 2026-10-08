---
title: Verify OTP
description: POST /v2/Services/{ServiceSid}/VerificationCheck — verify the OTP your user typed. 200 means it is correct.
order: 3
---

# Verify OTP

```
POST /v2/Services/{ServiceSid}/VerificationCheck
```

Verifies the OTP your user typed. **`200` means the code is correct**, and no
other status does. Free.

## Parameters

| Name | In | Required | Description |
|---|---|---|---|
| `ServiceSid` | path | Yes | Your Service SID (`VA…`). |
| `VerificationSid` | body | Yes | The `sid` returned when you [sent the OTP](./send-otp.md). |
| `Code` | body | Yes | The code your user typed, up to 10 characters. It is compared exactly, so strip spaces and dashes first. |

## Request

```bash
curl -X POST "https://api.secondfactor.ai/v2/Services/$SERVICE_SID/VerificationCheck" \
  -H "X-API-Key: $SF_API_KEY" \
  -d "VerificationSid=VEb7c8d9e0f1a2b3c4d5e6f708192a3b4c" \
  -d "Code=482915"
```

```python
import os

import requests

res = requests.post(
    f"https://api.secondfactor.ai/v2/Services/{os.environ['SERVICE_SID']}/VerificationCheck",
    headers={"X-API-Key": os.environ["SF_API_KEY"]},
    data={"VerificationSid": "VEb7c8d9e0f1a2b3c4d5e6f708192a3b4c", "Code": "482915"},
)
verified = res.status_code == 200
```

```js
const res = await fetch(`https://api.secondfactor.ai/v2/Services/${process.env.SERVICE_SID}/VerificationCheck`, {
  method: "POST",
  headers: { "X-API-Key": process.env.SF_API_KEY, "Content-Type": "application/json" },
  body: JSON.stringify({ VerificationSid: "VEb7c8d9e0f1a2b3c4d5e6f708192a3b4c", Code: "482915" }),
});
const verified = res.status === 200;
```

```java
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

HttpRequest request = HttpRequest.newBuilder()
    .uri(URI.create("https://api.secondfactor.ai/v2/Services/" + System.getenv("SERVICE_SID") + "/VerificationCheck"))
    .header("X-API-Key", System.getenv("SF_API_KEY"))
    .header("Content-Type", "application/json")
    .POST(HttpRequest.BodyPublishers.ofString(
        "{\"VerificationSid\": \"VEb7c8d9e0f1a2b3c4d5e6f708192a3b4c\", \"Code\": \"482915\"}"))
    .build();
HttpResponse<String> response = HttpClient.newHttpClient().send(request, HttpResponse.BodyHandlers.ofString());
boolean verified = response.statusCode() == 200;
```

```rust
// Crates: reqwest and tokio.
let res = reqwest::Client::new()
    .post(format!(
        "https://api.secondfactor.ai/v2/Services/{}/VerificationCheck",
        std::env::var("SERVICE_SID")?
    ))
    .header("X-API-Key", std::env::var("SF_API_KEY")?)
    .form(&[("VerificationSid", "VEb7c8d9e0f1a2b3c4d5e6f708192a3b4c"), ("Code", "482915")])
    .send()
    .await?;
let verified = res.status() == reqwest::StatusCode::OK;
```

```go
import (
	"net/http"
	"net/url"
	"os"
	"strings"
)

form := url.Values{"VerificationSid": {"VEb7c8d9e0f1a2b3c4d5e6f708192a3b4c"}, "Code": {"482915"}}
req, err := http.NewRequest(http.MethodPost,
	"https://api.secondfactor.ai/v2/Services/"+os.Getenv("SERVICE_SID")+"/VerificationCheck",
	strings.NewReader(form.Encode()))
if err != nil {
	return err
}
req.Header.Set("X-API-Key", os.Getenv("SF_API_KEY"))
req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
res, err := http.DefaultClient.Do(req)
if err != nil {
	return err
}
defer res.Body.Close()
verified := res.StatusCode == http.StatusOK
```

## Response

| HTTP | Body | Meaning | What to do |
|---|---|---|---|
| `200` | verification, `status: VERIFIED` | The code is correct. | Mark the phone number in `to` as verified. |
| `422` | verification, `status: PENDING` | Wrong code, with tries left. | Show `attempts_remaining` and let the user retry. |
| `409` | verification, `status: LOCKED` | Wrong code and no tries left, or it was already locked. | [Send a new OTP](./send-otp.md#sending-again). |
| `409` | verification, `status: EXPIRED` | The code expired. | [Send a new OTP](./send-otp.md#sending-again). |
| `409` | verification, `status: VERIFIED` | Already verified by an earlier check, for example a double-submitted form. | **Do not log the user in on this response.** Rely on the earlier `200`, or send a new OTP. |
| `409` | error, `code: client_code` | You supplied this code with `Code`, so we do not check it. | Compare it on your server. |

The verification object is described under
[Send OTP](./send-otp.md#the-verification-object). A correct code:

```json
{
  "sid": "VEb7c8d9e0f1a2b3c4d5e6f708192a3b4c",
  "to": "+9779841000000",
  "status": "VERIFIED",
  "delivery_status": "DELIVERED",
  "channel": "whatsapp",
  "price": "0.0120",
  "price_unit": "USD",
  "attempts_remaining": 4,
  "expires_at": "2026-09-12T09:19:22Z",
  "date_created": "2026-09-12T09:14:22Z"
}
```

Each `200` or `422` uses one of the code's 5 attempts. A `409` uses none.

**Trust `to` from the `200` response**, not a phone number the browser sends
with the code. SIDs are not secret, so the response is the only proof of which
number was verified.

```js
const res = await fetch(`https://api.secondfactor.ai/v2/Services/${SERVICE_SID}/VerificationCheck`, {
  method: "POST",
  headers: { "X-API-Key": process.env.SF_API_KEY, "Content-Type": "application/json" },
  body: JSON.stringify({ VerificationSid: sid, Code: codeFromUser.replace(/\D/g, "") }),
});
const body = await res.json();

if (res.status === 200) {
  await logIn(body.to);
} else if (res.status === 422) {
  show(`Wrong code. ${body.attempts_remaining} tries left.`);
} else if (res.status === 409) {
  show("This code can no longer be used. Request a new one.");
} else {
  throw new Error(`secondfactor: ${body.code}`);  // see Errors
}
```

## Errors

| HTTP | `code` | Cause |
|---|---|---|
| 400 | `invalid_parameter` | `VerificationSid` or `Code` is missing, or `Code` is longer than 10 characters. |
| 404 | `not_found` | No verification with this SID belongs to you. |

For errors every endpoint can return, see [Errors](./errors.md).
