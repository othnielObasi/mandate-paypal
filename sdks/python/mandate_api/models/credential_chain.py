from __future__ import annotations

from typing import Any

from typing_extensions import NotRequired, TypedDict

from ..core import UNSET, Optional, SdkBaseModel


class CredentialChain(SdkBaseModel):
    """Mandate v1 credentials (Ed25519 JWS). Post them to ``/api/verify`` to re-check."""

    intent: Optional[Any] = UNSET
    cart: Optional[Any] = UNSET
    payment: Optional[Any] = UNSET


class CredentialChainDict(TypedDict):
    intent: NotRequired[Any]
    cart: NotRequired[Any]
    payment: NotRequired[Any]
