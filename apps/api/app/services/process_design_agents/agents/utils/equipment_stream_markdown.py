from __future__ import annotations

from typing import Iterable


def equipments_and_streams_dict_to_markdown(payload: dict) -> tuple[str, str, str]:
    """
    Convert an LLM response dictionary describing equipment and streams into
    Markdown tables.

    Returns a tuple of (combined_markdown, equipment_table_markdown, stream_table_markdown).
    """
    # Check if payload has equipments and streams keys.
    if "equipments" not in payload or "streams" not in payload:
        print("DEBUG: Wrong payload format")
        print(payload)
        return "", "", ""
    
    # Get the list of equipments and streams
    equipments = _ensure_list(payload.get("equipments"))
    streams = _ensure_list(payload.get("streams"))

    # Convert to Markdown
    equipment_md = _format_equipments_table(equipments)
    streams_md = _format_streams_table(streams)

    # Combine sections to complete markdown
    combined_sections: list[str] = []
    if equipment_md:
        combined_sections.append("## Equipment Summary\n")
        combined_sections.append(equipment_md)
    if streams_md:
        if combined_sections:
            combined_sections.append("\n---\n")
        combined_sections.append("## Stream Summary\n")
        combined_sections.append(streams_md)

    combined_md = "\n".join(combined_sections).strip()
    return combined_md, equipment_md, streams_md


def _format_equipments_table(equipments: Iterable[dict]) -> str:
    rows: list[str] = []
    rows.append(
        "| ID | Name | Type | Service | Description | Streams In | Streams Out | Design Criteria | Sizing Parameters | Notes |"
    )
    rows.append("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |")

    has_data = False
    for equipment in equipments:
        has_data = True
        sizing_parameters = _format_sizing_parameters(equipment.get("sizing_parameters"))
        streams_in = ", ".join(_stringify_items(_ensure_list(equipment.get("streams_in"))))
        streams_out = ", ".join(
            _stringify_items(_ensure_list(equipment.get("stream_out") or equipment.get("streams_out")))
        )
        row = (
            f"| {equipment.get('id', '')} "
            f"| {equipment.get('name', '')} "
            f"| {equipment.get('type', '')} "
            f"| {equipment.get('service', '')} "
            f"| {equipment.get('description', '')} "
            f"| {streams_in} "
            f"| {streams_out} "
            f"| {equipment.get('design_criteria', '')} "
            f"| {sizing_parameters} "
            f"| {equipment.get('notes', '')} |"
        )
        rows.append(row)

    if not has_data:
        return ""
    return "\n".join(rows)


def _format_streams_table(streams: Iterable[dict], streams_per_table: int = 8) -> str:
    all_streams = _ensure_list(streams)
    if not all_streams:
        return ""

    lines: list[str] = []
    for index in range(0, len(all_streams), streams_per_table):
        chunk = all_streams[index : index + streams_per_table]
        lines.extend(_build_stream_chunk_table(chunk))
        lines.append("")  # spacer between tables

    # Remove trailing blank line if present
    while lines and not lines[-1].strip():
        lines.pop()
    return "\n".join(lines)


def _format_sizing_parameters(params) -> str:
    if not isinstance(params, list) or not params:
        return ""
    parts = []
    for param in params:
        if not isinstance(param, dict):
            parts.append(str(param))
            continue
        name = param.get("name", "")
        quantity = _format_quantity(param.get("quantity"))
        notes = param.get("notes")
        if notes:
            parts.append(f"{name}: {quantity} ({notes})".strip())
        else:
            parts.append(f"{name}: {quantity}".strip())
    return "<br>".join(parts)


def _format_quantity(entry) -> str:
    if not isinstance(entry, dict):
        return str(entry) if entry is not None else ""
    value = entry.get("value")
    unit = entry.get("unit")
    value_str = "" if value is None else str(value)
    if unit:
        return f"{value_str} {unit}".strip()
    return value_str


def _ensure_list(value) -> list:
    if value is None:
        return []
    if isinstance(value, (list, tuple)):
        return list(value)
    return [value]


def _stringify_items(items: list) -> list[str]:
    return [str(item) for item in items if item is not None]


def _build_stream_chunk_table(streams: list[dict]) -> list[str]:
    property_order = [
        ("temperature", "**Temperature**"),
        ("pressure", "**Pressure**"),
        ("mass_flow", "**Mass Flow**"),
        ("molar_flow", "**Molar Flow**"),
        ("volume_flow", "**Volume Flow**"),
    ]

    # Collect additional property keys that are not in the default order
    extra_property_keys: list[str] = []
    for stream in streams:
        properties = stream.get("properties")
        if not isinstance(properties, dict):
            continue
        for key in properties.keys():
            if key not in {po[0] for po in property_order} and key not in extra_property_keys:
                extra_property_keys.append(key)

    rows: list[str] = []

    header_cells = ["**Attribute**"] + [f"**{stream.get('id', '')}**" for stream in streams]
    rows.append("| " + " | ".join(header_cells) + " |")
    rows.append("| " + " | ".join([":---"] * len(header_cells)) + " |")

    def add_row(label: str, values: list[str]) -> None:
        cells = [label] + values
        rows.append("| " + " | ".join(cells) + " |")

    # Basic attributes
    add_row("**ID**", [stream.get("id", "") for stream in streams])
    add_row("**Name**", [stream.get("name", "") for stream in streams])
    add_row("**Description**", [stream.get("description", "") for stream in streams])
    add_row("**From**", [stream.get("from", stream.get("from_unit", "")) for stream in streams])
    add_row("**To**", [stream.get("to", stream.get("to_unit", "")) for stream in streams])
    add_row("**Phase**", [stream.get("phase", "") for stream in streams])

    # Properties
    for prop_key, label in property_order:
        values = [_format_quantity((stream.get("properties") or {}).get(prop_key)) for stream in streams]
        add_row(label, values)

    for prop_key in extra_property_keys:
        values = [_format_quantity((stream.get("properties") or {}).get(prop_key)) for stream in streams]
        add_row(f"**{prop_key.replace('_', ' ').title()}**", values)

    # Composition sections
    mass_component_keys, mole_component_keys = _collect_component_keys(streams)

    if mass_component_keys:
        add_row("**Mass Fraction**", ["--"] * len(streams))
        for component_key in mass_component_keys:
            display_name = _strip_mass_prefix(component_key)
            values = [
                _format_fraction(
                    _get_component_entry(stream, component_key),
                    target="mass",
                )
                for stream in streams
            ]
            add_row(f"  {display_name}  ", values)

    if mole_component_keys:
        add_row("**Mole Fraction**", ["--"] * len(streams))
        for component_key in mole_component_keys:
            values = [
                _format_fraction(
                    _get_component_entry(stream, component_key),
                    target="mole",
                )
                for stream in streams
            ]
            add_row(f"  {component_key}  ", values)

    add_row("**Notes**", [stream.get("notes", "") for stream in streams])

    return rows


def _collect_component_keys(streams: list[dict]) -> tuple[list[str], list[str]]:
    mass_components: list[str] = []
    mole_components: list[str] = []

    for stream in streams:
        for field in ("compositions", "components"):
            components = stream.get(field)
            if not isinstance(components, dict):
                continue
            for name, entry in components.items():
                if not isinstance(name, str) or name == "":
                    continue
                if name.startswith("m_"):
                    if name not in mass_components:
                        mass_components.append(name)
                    continue

                if isinstance(entry, dict):
                    unit = entry.get("unit")
                    if isinstance(unit, str):
                        unit_lower = unit.lower()
                        if "mass" in unit_lower or "wt" in unit_lower:
                            prefixed = f"m_{name}"
                            if prefixed not in mass_components:
                                mass_components.append(prefixed)
                            continue
                if name not in mole_components:
                    mole_components.append(name)

    return mass_components, mole_components


def _get_component_entry(stream: dict, component_key: str):
    if not isinstance(stream, dict):
        return None
    for field in ("compositions", "components"):
        components = stream.get(field)
        if isinstance(components, dict):
            if component_key in components:
                return components[component_key]
            # Allow looking up base name if the data has not been prefixed
            if component_key.startswith("m_"):
                base_key = component_key[2:]
                if base_key in components:
                    return components[base_key]
    return None


def _strip_mass_prefix(name: str) -> str:
    if isinstance(name, str) and name.startswith("m_"):
        return name[2:]
    return name


def _format_fraction(entry, target: str) -> str:
    if isinstance(entry, dict):
        value = entry.get("value")
        unit = entry.get("unit")
        text = _format_numeric(value)
        if isinstance(unit, str):
            unit_lower = unit.lower()
            if target == "mass" and ("mass" in unit_lower or "wt" in unit_lower):
                return text
            if target == "mole" and ("mol" in unit_lower or "mole" in unit_lower):
                return text
            # Unit does not match target; omit value to avoid confusion.
            return ""
        return text
    if entry is None:
        return ""
    return str(entry)


def _format_numeric(value) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    try:
        return f"{float(value):.4f}"
    except (TypeError, ValueError):
        return str(value)
