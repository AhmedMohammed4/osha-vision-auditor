"""Remove model and service names from audit text shown to users."""

import re

_PROVIDER_LABEL = re.compile(
    r"\b(?:(?:https?://)?(?:[a-z0-9-]+\.)?openai\.com(?:/[^\s<>()\]]*)?"
    r"|OPENAI_API_KEY|OPENAI_MODEL|Open[ -]?AI|ChatGPT|Codex|GPT-\d+(?:[.-][a-z0-9]+)*)\b",
    re.IGNORECASE,
)


def public_audit_text(text: str | None) -> str | None:
    if text is None:
        return None
    if text.startswith("PIPELINE ERROR:"):
        return "Video analysis could not finish."

    text = text.replace("OpenAI report generation", "Report generation")
    text = text.replace("The OpenAI project", "The analysis service")
    return _PROVIDER_LABEL.sub("the analysis service", text)
