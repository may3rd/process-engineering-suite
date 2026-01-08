"""Routers package init."""
from .hierarchy import router as hierarchy_router
from .psv import router as psv_router
from .supporting import router as supporting_router
from .admin import router as admin_router
from .auth import router as auth_router
from .revisions import router as revisions_router
from .audit import router as audit_router
from .design_agents import router as design_agents_router


__all__ = [
    "hierarchy_router",
    "psv_router",
    "supporting_router",
    "admin_router",
    "auth_router",
    "revisions_router",
    "audit_router",
    "design_agents_router",

]

