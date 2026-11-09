from __future__ import annotations

from dataclasses import dataclass

from .core import AsyncAuthScheme, AuthScheme


@dataclass(frozen=True, slots=True, kw_only=True)
class AuthSchemes:
    automation_secret: AuthScheme


@dataclass(frozen=True, slots=True, kw_only=True)
class AsyncAuthSchemes:
    automation_secret: AsyncAuthScheme
