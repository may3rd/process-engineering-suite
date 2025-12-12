"""Script to export TypeScript mock data to JSON for Python API.

Run from apps/api directory:
    python scripts/export_mock.py
"""
import json
import re
from pathlib import Path


def parse_ts_object(content: str) -> str:
    """Convert TypeScript object literals to valid JSON."""
    # Remove trailing commas before } or ]
    content = re.sub(r',(\s*[}\]])', r'\1', content)
    
    # Convert single quotes to double quotes (simple cases)
    content = re.sub(r"'([^']*)'", r'"\1"', content)
    
    return content


def extract_array(content: str, array_name: str) -> list:
    """Extract an exported array from TypeScript source."""
    # Match pattern: export const arrayName: Type[] = [...]
    pattern = rf'export const {array_name}:\s*\w+\[\]\s*=\s*(\[[\s\S]*?\n\]);'
    match = re.search(pattern, content)
    
    if not match:
        print(f"Warning: Could not find array '{array_name}'")
        return []
    
    array_str = match.group(1)
    
    # Clean up TypeScript-specific syntax
    array_str = parse_ts_object(array_str)
    
    try:
        return json.loads(array_str)
    except json.JSONDecodeError as e:
        print(f"Error parsing {array_name}: {e}")
        # Save problematic content for debugging
        debug_path = Path(__file__).parent / f"debug_{array_name}.txt"
        debug_path.write_text(array_str)
        print(f"Saved debug content to {debug_path}")
        return []


def main():
    # Paths
    ts_mock_path = Path(__file__).parent.parent.parent.parent / "psv" / "src" / "data" / "mockData.ts"
    json_output_path = Path(__file__).parent.parent / "mock_data.json"
    
    if not ts_mock_path.exists():
        print(f"Error: TypeScript mock data not found at {ts_mock_path}")
        return
    
    print(f"Reading TypeScript mock data from {ts_mock_path}")
    content = ts_mock_path.read_text()
    
    # Extract all arrays
    data = {
        "users": extract_array(content, "users"),
        "credentials": extract_array(content, "credentials"),
        "customers": extract_array(content, "customers"),
        "plants": extract_array(content, "plants"),
        "units": extract_array(content, "units"),
        "areas": extract_array(content, "areas"),
        "projects": extract_array(content, "projects"),
        "equipment": extract_array(content, "equipment"),
        "protectiveSystems": extract_array(content, "protectiveSystems"),
        "scenarios": extract_array(content, "overpressureScenarios"),
        "sizingCases": extract_array(content, "sizingCases"),
        "equipmentLinks": extract_array(content, "equipmentLinks"),
        "attachments": extract_array(content, "attachments"),
        "comments": extract_array(content, "comments"),
        "todos": extract_array(content, "todos"),
    }
    
    # Write JSON
    json_output_path.write_text(json.dumps(data, indent=2))
    print(f"Wrote mock data to {json_output_path}")
    
    # Print summary
    for key, items in data.items():
        print(f"  {key}: {len(items)} items")


if __name__ == "__main__":
    main()
