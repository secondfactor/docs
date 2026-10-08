---
title: Getting started
description: Send a one-time passcode to a phone number and check the code your user types back. We generate, deliver and verify it; you never store it.
order: 0
---

# SecondFactor Docs

Send a one-time passcode (OTP) to a phone number, then check the code your user
types back. We generate the code, pick the cheapest channel that reaches the
number, switch to another channel if the first one does not deliver, and verify
the code for you. You never store it.

**There is no sandbox.** Every send delivers a real message and is charged, so
test with a phone number you own.

## Quickstart

You need two things from the dashboard:

- An **API key**, from the **API keys** page.
- Your **Service SID**, from the **Settings** page. It is your account's ID in
  every request path and starts with `VA`.

```bash
export SF_API_KEY="sf_4f8a1c9b2e7d.xN3qR7vK2mZpL9wYcB4tH6jF8sD1aG5u"
export SERVICE_SID="VA0a1b2c3d4e5f60718293a4b5c6d7e8f9"
```

**1. Send OTP.** Keep the `sid` from the response.

```bash
curl -X POST "https://api.secondfactor.ai/v2/Services/$SERVICE_SID/Verifications" \
  -H "X-API-Key: $SF_API_KEY" \
  --data-urlencode "To=+9779841000000"
```

```python
import os

import requests

res = requests.post(
    f"https://api.secondfactor.ai/v2/Services/{os.environ['SERVICE_SID']}/Verifications",
    headers={"X-API-Key": os.environ["SF_API_KEY"]},
    data={"To": "+9779841000000"},
)
verification = res.json()
```

```js
const res = await fetch(`https://api.secondfactor.ai/v2/Services/${process.env.SERVICE_SID}/Verifications`, {
  method: "POST",
  headers: { "X-API-Key": process.env.SF_API_KEY, "Content-Type": "application/json" },
  body: JSON.stringify({ To: "+9779841000000" }),
});
const verification = await res.json();
```

```java
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

HttpRequest request = HttpRequest.newBuilder()
    .uri(URI.create("https://api.secondfactor.ai/v2/Services/" + System.getenv("SERVICE_SID") + "/Verifications"))
    .header("X-API-Key", System.getenv("SF_API_KEY"))
    .header("Content-Type", "application/json")
    .POST(HttpRequest.BodyPublishers.ofString("{\"To\": \"+9779841000000\"}"))
    .build();
HttpResponse<String> response = HttpClient.newHttpClient().send(request, HttpResponse.BodyHandlers.ofString());
```

```rust
// Crates: reqwest (with the "json" feature), serde_json and tokio.
let verification: serde_json::Value = reqwest::Client::new()
    .post(format!(
        "https://api.secondfactor.ai/v2/Services/{}/Verifications",
        std::env::var("SERVICE_SID")?
    ))
    .header("X-API-Key", std::env::var("SF_API_KEY")?)
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
res, err := http.DefaultClient.Do(req)
if err != nil {
	return err
}
defer res.Body.Close()
```

```json
{ "sid": "VEb7c8d9e0f1a2b3c4d5e6f708192a3b4c", "to": "+9779841000000", "status": "PENDING" }
```

The full response has more fields; see
[the verification object](./send-otp.md#the-verification-object).

**2. Verify the OTP your user typed.**

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

**`200` means the code is correct.** `422` and `409` mean it is not. Any other
status is an [error](./errors.md) and says nothing about the code.

## Call the API from your backend

Your API key is billed for every send, so it must never reach a browser or a
mobile app.

```
your app  ──►  your backend (holds the API key)  ──►  secondfactor.ai
```

1. Your app sends the phone number to your backend.
2. Your backend [sends an OTP](./send-otp.md) and stores the returned `sid`
   server-side, for example in a signed, HTTP-only cookie or your session store.
3. Your app sends the code the user typed to your backend.
4. Your backend [checks it](./check-otp.md). On `200`, take the verified phone
   number from `to` in that response, not from anything the browser sent.

## Endpoints

Base URL: `https://api.secondfactor.ai`

| Page | Request | Cost |
|---|---|---|
| [Send OTP](./send-otp.md) | `POST /v2/Services/{ServiceSid}/Verifications` | Charged |
| [Verify OTP](./check-otp.md) | `POST /v2/Services/{ServiceSid}/VerificationCheck` | Free |
| [Get OTP status](./get-verification.md) | `GET /v2/Services/{ServiceSid}/Verifications/{VerificationSid}` | Free |

Also: [Authentication](./authentication.md), [Webhooks](./webhooks.md) and
[Errors](./errors.md).

## SDKs

Libraries that wrap these endpoints, and the verification sessions that let us
host the screens or let your frontend send codes without a proxy.

| SDK | Package | Runs on |
|---|---|---|
| [Node.js](./sdk-node.md) | `secondfactor` on npm | Your server. Holds your API key. |
| [Python](./sdk-python.md) | `secondfactor` on PyPI | Your server. Holds your API key. |
| [Browser](./sdk-js.md) | `@secondfactor/js` on npm | The user's browser or React Native app. Never holds your API key. |

## Conventions

- **Phone numbers** are E.164: `+`, the country code, then the number, with no
  spaces or punctuation, for example `+14155552671`. Convert what users type
  with a library such as `libphonenumber`.
- **Requests:** `POST` bodies may be form-encoded or JSON. A JSON body needs
  `Content-Type: application/json`. Parameter names are PascalCase: `To`,
  `Code`, `VerificationSid`.
- **Responses:** JSON with snake_case field names.
- **Dates:** ISO 8601 in UTC, for example `2026-09-12T09:14:22Z`.
- **SIDs** are two letters followed by 32 hexadecimal characters: `VA…` is your
  Service and `VE…` is one verification. They are identifiers, not secrets.
- **Unknown parameters are ignored**, not rejected.

## Limits

| Limit | Value |
|---|---|
| Requests per API key | 120 per minute |
| Sends to one phone number | 3 per 5 minutes, and 10 per hour |
| Code lifetime | 5 minutes by default. Always read `expires_at`. |
| Checks per code | 5. The fifth wrong code locks the verification. |
| Channel switch | After 8 seconds without a delivery receipt |
| Number rejected on every channel | Refused for 30 days |

The per-number limits count every send to that number from any account,
including sends that are then refused.

## Billing

- **Each accepted send (`201`) is one charge**, including sending again to the
  same number. The charge stands whether or not the message is delivered.
- **A refused send is free.** A send that answers with an error costs nothing.
- **Checking and fetching are free.**

## For coding agents

`/llms.txt` is an index of links, and `/llms-full.txt` is the complete
integration reference in one file.
