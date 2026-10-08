---
title: Python SDK
description: The secondfactor package for Python servers. Create hosted and headless verification sessions, confirm them, and send and check codes directly.
order: 11
---

# Python SDK

The `secondfactor` package calls the API from your Python server. It is one
module with no dependencies beyond the standard library, and needs Python 3.9
or later.

It runs on **your server** and holds your API key, which must never reach a
browser or a mobile app. For the browser or React Native side of a headless
session, use the [browser SDK](./sdk-js.md).

```bash
pip install secondfactor      # or: uv add secondfactor
```

You need an **API key** from the dashboard's **API keys** page. For the hosted
page you also need a **return origin**, such as `https://app.example.com`,
listed under **Settings → Hosted verification**.

## Choosing a flow

| Flow | Who draws the screens | Methods |
|---|---|---|
| Hosted session | We do. You redirect the user to our page and get them back on your return URL. | `create_session`, `verify_session` |
| Headless session | You do, in your frontend with the [browser SDK](./sdk-js.md). Your API key stays on your server and no proxy is needed. | `create_session` with `mode="headless"`, `verify_session` |
| Direct sends | You do, and every code goes through your server. | `send`, `check` |

Sessions are the recommended way in. They give you one call at the end,
`verify_session`, that says whether the number was proven, and it succeeds
only once, so a replayed request cannot sign anyone in.

## SecondFactor

The client for one organization's API key. Create one and reuse it. Every
method is synchronous and returns the API's JSON answer as a `dict`.

```python
import os

from secondfactor import SecondFactor, SecondFactorError

sf = SecondFactor(api_key=os.environ["SECONDFACTOR_API_KEY"])
```

### SecondFactor(api_key, service_sid=None, base_url=..., timeout=10)

| Argument | Type | Default | Description |
|---|---|---|---|
| `api_key` | str | — | Required. A key from the dashboard. |
| `service_sid` | str | looked up | Your Service SID (`VA…`). Every organization has exactly one, so when it is omitted the client looks it up once, on first use. |
| `base_url` | str | `"https://api.secondfactor.ai"` | Must be `https://`. Plain `http://` is accepted only for `localhost`, `127.0.0.1` and `::1`, for a local stub. |
| `timeout` | float | `10` | Seconds per request. |

Raises `ValueError` when `api_key` is missing or `base_url` is not safe to send
the key to.

### create_session(to, mode="hosted", return_url=None, client_reference_id=None, template_sid=None)

Starts verifying a phone number and returns the
[session object](#the-session-object). Creating a session is free; each code it
sends is charged.

| Argument | Type | Description |
|---|---|---|
| `to` | str | Required. The phone number in E.164, for example `"+9779841000001"`. |
| `mode` | str | `"hosted"` (the default) or `"headless"`: who draws the screens. |
| `return_url` | str | Hosted only, and required there. Where we send the user back. Its origin must be listed under Settings → Hosted verification. |
| `client_reference_id` | str | Your own ID for this sign-in, such as your user's ID. It comes back from `verify_session`. |
| `template_sid` | str | The message template to send the code with. Your default when omitted. |

A hosted session returns `url`: redirect the user there. A headless session
returns `client_token`: give it to your frontend. Either is returned only this
once.

Store the returned `sid` server-side against the user's pending sign-in, for
example in their session. It is what you confirm later.

```python
created = sf.create_session(
    user.phone,
    return_url="https://app.example.com/verified",
    client_reference_id=str(user.id),
)
session["sf_sid"] = created["sid"]
return redirect(created["url"], code=303)
```

### verify_session(stored_sid, return_token=None)

Accepts the outcome of a session, **exactly once**, and returns the number that
was proven.

| Argument | Type | Description |
|---|---|---|
| `stored_sid` | str | The `sid` you stored when you created the session. Never the `sf_session_id` from the return URL: anyone can edit a URL. |
| `return_token` | str | Hosted sessions only: the `sf_return_token` query parameter from the return URL. A headless session needs none. |

Returns a `dict`:

| Key | Type | Description |
|---|---|---|
| `phone` | str | The number that was proven, in E.164. Use this, not anything the browser sent. |
| `client_reference_id` | str or None | The `client_reference_id` you passed to `create_session`. |
| `session` | dict | The full [session object](#the-session-object). |

Raises `SecondFactorError` unless the session is `VERIFIED` and has not been
confirmed before. The usual codes are `missing_return_token`,
`invalid_return_token`, `not_verified`, `already_confirmed` and `not_found`.

```python
# On https://app.example.com/verified?sf_session_id=…&sf_return_token=…
try:
    result = sf.verify_session(session.pop("sf_sid"), request.args.get("sf_return_token"))
except SecondFactorError as error:
    return start_again(reason=error.code)
mark_phone_verified(user, result["phone"])
```

### retrieve_session(sid)

Returns the [session object](#the-session-object) as it stands now. Reading a
session proves nothing about who verified it, and it does not use up the
session; use `verify_session` to act on the outcome.

### send(to, code=None, template_sid=None, idempotency_key=None)

Sends a code directly, without a session, and returns
[the verification object](./send-otp.md#the-verification-object). Keep its
`sid` server-side for the check. Each call is charged.

| Argument | Type | Description |
|---|---|---|
| `to` | str | Required. The phone number in E.164. |
| `idempotency_key` | str | New for each user action. A request retried with the same key is charged at most once. |
| `template_sid` | str | The message template to send the code with. |
| `code` | str | Only if you generate codes yourself. You then check them yourself too. |

There is no resend method. Sending to the same number again is a new
verification, with a new `sid`, and is charged again.

```python
import uuid

verification = sf.send("+9779841000001", idempotency_key=str(uuid.uuid4()))
session["verification_sid"] = verification["sid"]
```

### check(verification_sid, code)

Checks the code your user typed. Returns the verification object with
`verified` added, which is `True` only when the code was right. Checking is
free.

**A wrong code is not an error.** It returns `verified` as `False` with
`attempts_remaining`. A verification that can never succeed raises
`SecondFactorError` with `code` `expired`, `locked` or `already_verified`;
only a new `send` helps.

The code is converted to a string and stripped before it is sent.

```python
result = sf.check(session["verification_sid"], request.form["code"])
if result["verified"]:
    mark_phone_verified(user, result["to"])
else:
    show_wrong_code(result["attempts_remaining"])
```

### service_sid()

Returns your Service SID (`VA…`): the one passed to the constructor, or the
one looked up from the API on first use.

### start(to, code=None, template_sid=None)

Deprecated: use `send`. It still works, and emits a `DeprecationWarning`.

## SecondFactorError

Every refused request raises a `SecondFactorError`, a subclass of `Exception`.

| Attribute | Type | Description |
|---|---|---|
| `code` | str or None | The stable string to branch on. |
| `status` | int or None | The HTTP status of the refusal, including a refused 3xx redirect. `None` when no answer arrived. |
| `str(error)` | str | A message for your logs. It is safe to log; never show it to your users. |

| `code` | Raised by | Meaning |
|---|---|---|
| `no_return_origin`, `origin_not_allowed` | `create_session` | Add the return URL's origin under Settings → Hosted verification. |
| `missing_return_token`, `invalid_return_token` | `verify_session` | The user did not finish verifying in this browser. Start again. |
| `not_verified` | `verify_session` | The session is open, canceled, failed or expired. |
| `already_confirmed` | `verify_session` | The session was confirmed before. Treat it as a replay. |
| `expired`, `locked`, `already_verified` | `check` | This verification can never succeed. Send a new code. |
| `unroutable` | `send`, `create_session` | Not a valid E.164 number. |
| `rate_limited`, `burst` | `send` | Too many codes to this number. Try later. |
| `insufficient_funds` | `send` | Top up your balance. |
| `network_error` | any | The API could not be reached, or the request timed out. |

Other codes come straight from the API; see [Errors](./errors.md). New codes
may appear, so keep a default branch.

The API never redirects, so the client refuses a redirect rather than following
it, which could send your API key to another host.

## The session object

`create_session`, `retrieve_session` and `verify_session` (as `"session"`)
return this object as a `dict`.

| Key | Type | Description |
|---|---|---|
| `sid` | str | The session SID. Store it server-side. |
| `mode` | str | `hosted` or `headless`. |
| `status` | str | `OPEN`, `VERIFIED`, `CANCELED`, `FAILED` or `EXPIRED`. |
| `failure_reason` | str or None | Why a `FAILED` session failed: `max_sends`, `max_attempts`, or `send_refused:<code>` when we could not send to the number. |
| `to` | str | The phone number being verified, in E.164. |
| `client_reference_id` | str or None | Your own ID, as passed to `create_session`. |
| `verification_sid` | str or None | The newest code the session sent (`VE…`). [Get OTP status](./get-verification.md) answers price and delivery questions about it. |
| `sends` | int | How many codes the session has sent. |
| `return_url` | str or None | Hosted sessions: where the user is sent back. |
| `confirmed` | bool | Whether `verify_session` has accepted this session. |
| `expires_at` | str | When the session stops working. |
| `date_created` | str | When the session was created. |
| `date_completed` | str or None | When the session reached its final status. |
| `url` | str | Hosted sessions, on creation only: the page to redirect the user to. |
| `client_token` | str | Headless sessions, on creation only: the token for your frontend. |

## Headless example

The server half of a headless session, in Flask. The frontend half is on the
[browser SDK](./sdk-js.md) page.

```python
@app.post("/verification/start")
def start_verification():
    created = sf.create_session(current_user.phone, mode="headless")
    session["sf_sid"] = created["sid"]
    return {"client_token": created["client_token"]}


@app.post("/verification/done")
def finish_verification():
    stored_sid = session.pop("sf_sid", None)
    if not stored_sid:
        return {"verified": False}, 400
    try:
        result = sf.verify_session(stored_sid)
    except SecondFactorError as error:
        return {"verified": False, "reason": error.code}, 400
    mark_phone_verified(current_user, result["phone"])
    return {"verified": True}
```

A runnable Flask app with both session flows is in the package repository's
`examples/flask_app.py`.
