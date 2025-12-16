"""Export the running database contents to apps/api/mock_data.json.

Usage (inside docker compose, where DATABASE_URL is set):
  docker compose -f infra/docker-compose.yml exec api python /app/apps/api/scripts/export_db_to_mock.py

This hits the internal API endpoint `/admin/export-mock-data?write_to_file=true`
so it works consistently with the API's data-source selection.
"""

from __future__ import annotations

import os
import sys
import urllib.request


def main() -> int:
    base = os.getenv("EXPORT_API_BASE_URL", "http://localhost:8000").rstrip("/")
    url = f"{base}/admin/export-mock-data?write_to_file=true"

    try:
        with urllib.request.urlopen(url, timeout=60) as resp:
            body = resp.read().decode("utf-8", errors="replace")
    except Exception as exc:
        print(f"Failed to export mock data from {url}: {exc}", file=sys.stderr)
        return 1

    print(body)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

