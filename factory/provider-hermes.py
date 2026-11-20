"""Trusted, single-request bridge to Nous using the user's Hermes OAuth session."""
import decimal
import json
import sys

import httpx
from hermes_cli.proxy.adapters.nous_portal import NousPortalAdapter

BASE = "https://inference-api.nousresearch.com/v1"
MODEL = "tencent/hy4-flash:free"


def read_json(client, method, route, limit, **kwargs):
    with client.stream(method, BASE + route, **kwargs) as response:
        response.raise_for_status()
        body = bytearray()
        for chunk in response.iter_bytes():
            body.extend(chunk)
            if len(body) > limit:
                raise ValueError("response_limit")
        return json.loads(body)


def run():
    request = json.load(sys.stdin)
    if request["model"] != MODEL:
        raise ValueError("model_rejected")
    credential = NousPortalAdapter().get_credential()
    if credential.base_url.rstrip("/") != BASE:
        raise ValueError("endpoint_rejected")
    with httpx.Client(
        headers={"Authorization": credential.token_type + " " + credential.bearer},
        timeout=20, follow_redirects=False, trust_env=False,
    ) as client:
        models = read_json(client, "GET", "/models", 2_000_000)["data"]
        matches = [model for model in models if model.get("id") == MODEL]
        if len(matches) != 1:
            raise ValueError("model_unavailable")
        model = matches[0]
        pricing = model.get("pricing", {})
        if (
            not {"prompt", "completion"} <= pricing.keys()
            or any(decimal.Decimal(str(value)) != 0 for value in pricing.values())
            or "structured_outputs" not in model.get("supported_parameters", [])
        ):
            raise ValueError("free_schema_model_unavailable")
        result = read_json(client, "POST", "/chat/completions", request["maxBytes"], json={
            "model": MODEL,
            "stream": False,
            "max_tokens": request["maxOutputTokens"],
            "reasoning": {"enabled": False},
            "messages": [{"role": "user", "content": request["prompt"]}],
            "response_format": {"type": "json_schema", "json_schema": {
                "name": "factory_proposal", "strict": True, "schema": request["schema"],
            }},
        })
    usage = result.get("usage") or {}
    choices = result.get("choices") or []
    if len(choices) != 1:
        raise ValueError("unexpected_choices")
    choice = choices[0]
    message = choice["message"]
    return {
        "model": result.get("model"),
        "finishReason": choice.get("finish_reason"),
        "toolsRequested": bool(message.get("tool_calls") or message.get("function_call")),
        "costZero": type(usage.get("cost")) in (int, float) and usage["cost"] == 0,
        "promptEval": usage.get("prompt_tokens"),
        "completionEval": usage.get("completion_tokens"),
        "content": message.get("content"),
    }


if __name__ == "__main__":
    try:
        print(json.dumps(run(), allow_nan=False))
    except Exception:
        # Authentication or inference failures must never print secrets or upstream bodies.
        print('{"failed":true}')
