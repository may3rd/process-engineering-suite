"""Central logging configuration helpers."""
from __future__ import annotations

import logging
import os
from typing import Optional

_CONFIGURED = False


def configure_logging(*, level: Optional[str | int] = None, force: bool = False) -> None:
    """Configure project-wide logging once.

    Parameters
    ----------
    level:
        Optional log level override. When omitted we respect the
        ``NETWORK_HYDRAULIC_LOG_LEVEL`` environment variable and fall back
        to ``INFO``.
    force:
        When True, reconfigure logging even if it was already configured.
    """
    global _CONFIGURED
    if _CONFIGURED and not force:
        return

    resolved_level = level
    if resolved_level is None:
        env_level = os.getenv("NETWORK_HYDRAULIC_LOG_LEVEL", "INFO")
        resolved_level = env_level.upper()

    logging.basicConfig(
        level=resolved_level,
        format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    )
    _CONFIGURED = True
