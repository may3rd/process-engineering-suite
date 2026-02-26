from __future__ import annotations

import re


_FENCE_PATTERN = re.compile(r"^\s*```(?:\w+)?\s*(.*?)\s*```\s*$", re.DOTALL)


def jinja_raw(text: str) -> str:
    """Wrap content in a Jinja2 raw block so literal braces pass through."""
    return "{% raw %}" + text + "{% endraw %}"


def strip_markdown_code_fences(text: str | None) -> str | None:
    """Remove leading/trailing triple-backtick fences from LLM output."""
    if text is None:
        return None
    match = _FENCE_PATTERN.match(text)
    if match:
        return match.group(1).strip()
    return text
