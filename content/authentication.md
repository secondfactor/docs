---
title: Authentication
description: Send your API key in the X-API-Key header on every request.
order: 1
---

# Authentication

Send your API key in the `X-API-Key` header on every request.

```bash
curl "https://api.secondfactor.ai/v2/Services" \
  -H "X-API-Key: $SF_API_KEY"
```

```python
import os

import requests

res = requests.get(
    "https://api.secondfactor.ai/v2/Services",
    headers={"X-API-Key": os.environ["SF_API_KEY"]},
)
```

```js
const res = await fetch("https://api.secondfactor.ai/v2/Services", {
  headers: { "X-API-Key": process.env.SF_API_KEY },
});
```

```java
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

HttpRequest request = HttpRequest.newBuilder()
    .uri(URI.create("https://api.secondfactor.ai/v2/Services"))
    .header("X-API-Key", System.getenv("SF_API_KEY"))
    .GET()
    .build();
HttpResponse<String> response = HttpClient.newHttpClient().send(request, HttpResponse.BodyHandlers.ofString());
```

```rust
// Crates: reqwest and tokio.
let res = reqwest::Client::new()
    .get("https://api.secondfactor.ai/v2/Services")
    .header("X-API-Key", std::env::var("SF_API_KEY")?)
    .send()
    .await?;
```

```go
import (
	"net/http"
	"os"
)

req, err := http.NewRequest(http.MethodGet, "https://api.secondfactor.ai/v2/Services", nil)
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

The key alone identifies your account. There is nothing to send with it and no
HTTP Basic authentication.

## Keys

- Create and revoke keys on the dashboard's **API keys** page.
- A key looks like `sf_4f8a1c9b2e7d.xN3qR7vK2mZpL9wYcB4tH6jF8sD1aG5u`. Send the
  whole string.
- The full key is shown once, when you create it. We keep only a hash, so a
  lost key cannot be recovered: create a new one and revoke the old one.
- Revoking a key takes effect immediately and does not affect your other keys.

**Never put the key in a mobile app, a browser bundle, or anything a user can
download.** Anyone who extracts it can send codes on your bill.

## IP allowlist

A key can be restricted to IP addresses or CIDR ranges on the **API keys**
page. With an empty list, the key works from any address. If your servers sit
behind a proxy or NAT, allow the address your requests leave from.

## When authentication fails

These all answer `401` with the code `unauthorized`:

- The `X-API-Key` header is missing, or the key is wrong or revoked.
- The request comes from an address outside the key's allowlist.
- Your account is suspended.

The `message` says which. Branch on the `code`, not the `message`.

Each key may make 120 requests per minute; beyond that, see
[`rate_limited`](./errors.md).
