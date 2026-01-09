from __future__ import annotations

import json
import re

_INVALID_ESCAPE_PATTERN = re.compile(r"(?<!\\)\\([^\"\\/bfnrtu])")
_CONTROL_ESCAPE_PATTERN = re.compile(r"(?<!\\)\\([btnfrBTNFR])(?=[A-Za-z])")

from typing import Tuple, Any
from json_repair import repair_json

def get_json_str_from_llm(llm, prompt, state, max_try_count: int = 10) -> Tuple[Any, str]:
    json_llm = llm.bind(response_format={"type": "json_object"})
    chain = prompt | json_llm
    try_count = 0
    response: Any = None
    response_content: str = ""

    while True:
        try_count += 1
        if try_count > max_try_count:
            print("+ Max try count reached.", flush=True)
            exit(-1)

        try:
            # print(f"DEBUG: Try to get the output from LLM {try_count}")
            response = chain.invoke({"messages": list(state.get("messages", []))})
            response_content = response.content if isinstance(response.content, str) else str(response.content)
            if len(response_content.strip()) == 0:
                print("response_content is empty.", flush=True)
                continue

            json_dict = json.loads(repair_json(response_content))
            # print(json_dict, flush=True)
            return response, response_content
        except Exception as e:
            print(f"Attempt {try_count} has failed. {e}", flush=True)
            if response_content:
                print(response_content, flush=True)


def extract_first_json_document(raw_text: str) -> tuple[str, object | None]:
    """Strip fences and isolate the first JSON document from a mixed payload."""
    cleaned = raw_text.strip()

    if cleaned.startswith("```"):
        lines = cleaned.splitlines()
        if len(lines) >= 2 and lines[-1].strip() == "```":
            cleaned = "\n".join(lines[1:-1]).strip()

    normalized = _escape_problematic_json_sequences(cleaned)
    decoder = json.JSONDecoder()
    start_index = 0

    while start_index < len(normalized):
        ch = normalized[start_index]
        if ch.isspace():
            start_index += 1
            continue
        if ch not in "{[":
            start_index += 1
            continue
        try:
            payload, end_index = decoder.raw_decode(normalized, start_index)
            sanitized_payload = _sanitize_json_payload(payload)
            sanitized = json.dumps(sanitized_payload, ensure_ascii=False)
            return sanitized, sanitized_payload
        except json.JSONDecodeError:
            start_index += 1

    return normalized, None


def _sanitize_json_payload(node):
    if isinstance(node, dict):
        return {key: _sanitize_json_payload(value) for key, value in node.items()}
    if isinstance(node, list):
        return [_sanitize_json_payload(item) for item in node]
    if isinstance(node, str):
        return _sanitize_string_value(node)
    return node


def _sanitize_string_value(value: str) -> str:
    if "\t" in value:
        value = value.replace("\t", "\\t")
    return value


def _escape_problematic_json_sequences(text: str) -> str:
    text = _CONTROL_ESCAPE_PATTERN.sub(lambda match: "\\\\" + match.group(1), text)
    text = _INVALID_ESCAPE_PATTERN.sub(lambda match: "\\\\" + match.group(1), text)
    return text


def convert_risk_json_to_markdown(risk_json: str) -> str:
    """Render safety risk JSON into Markdown hazard sections."""
    sanitized_json, payload = extract_first_json_document(risk_json)
    if payload is None:
        return sanitized_json

    hazards = None
    overall = None
    if isinstance(payload, dict):
        hazards = payload.get("hazards")
        overall = payload.get("overall_assessment")
    elif isinstance(payload, list):
        hazards = payload

    if not isinstance(hazards, list) or not hazards:
        return sanitized_json

    lines: list[str] = []
    for idx, hazard in enumerate(hazards, start=1):
        if not isinstance(hazard, dict):
            continue
        title = _stringify(hazard.get("title") or hazard.get("name") or f"Hazard {idx}")
        severity = _stringify(hazard.get("severity"))
        likelihood = _stringify(hazard.get("likelihood"))
        risk_score = _stringify(hazard.get("risk_score") or hazard.get("riskScore"))
        lines.append(f"## Hazard {idx}: {title}")
        if severity or likelihood or risk_score:
            lines.append(f"**Severity:** {severity or 'TBD'}")
            lines.append(f"**Likelihood:** {likelihood or 'TBD'}")
            lines.append(f"**Risk Score:** {risk_score or 'TBD'}")
            lines.append("")

        def render_list(header: str, values):
            if isinstance(values, (list, tuple)) and values:
                lines.append(f"### {header}")
                for value in values:
                    value_str = _stringify(value)
                    if value_str:
                        lines.append(f"- {value_str}")
                lines.append("")

        render_list("Causes", hazard.get("causes"))
        render_list("Consequences", hazard.get("consequences"))
        render_list("Mitigations", hazard.get("mitigations"))
        notes = hazard.get("notes") or hazard.get("observations")
        render_list("Notes", notes)

    if isinstance(overall, dict) and overall:
        lines.append("## Overall Assessment")
        risk_level = _stringify(overall.get("risk_level") or overall.get("overall_risk_level"))
        compliance = overall.get("compliance_notes") or overall.get("notes")
        if risk_level:
            lines.append(f"- Overall Risk Level: {risk_level}")
        if isinstance(compliance, (list, tuple)):
            for note in compliance:
                note_str = _stringify(note)
                if note_str:
                    lines.append(f"- {note_str}")
        elif isinstance(compliance, str) and compliance.strip():
            lines.append(f"- {compliance.strip()}")

    markdown = "\n".join(line for line in lines if line is not None).strip()
    return markdown or sanitized_json


def _stringify(value) -> str:
    if value is None:
        return ""
    if isinstance(value, (int, float)):
        return f"{value}"
    return str(value)
