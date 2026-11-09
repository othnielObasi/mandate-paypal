from __future__ import annotations

from typing import Any

from typing_extensions import TypedDict

from ..core import SdkBaseModel


class VerifyChainRequest(SdkBaseModel):
    intent: Any
    """Intent Mandate as returned in ``chain.intent``"""

    cart: Any
    """Cart Mandate as returned in ``chain.cart``"""

    payment: Any
    """Payment Mandate as returned in ``chain.payment``"""


class VerifyChainRequestDict(TypedDict):
    intent: Any
    cart: Any
    payment: Any
