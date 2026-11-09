from __future__ import annotations

from typing_extensions import NotRequired, TypedDict

from ..core import UNSET, Optional, SdkBaseModel
from .jwks import Jwks, JwksDict
from .trusted_merchant import TrustedMerchant, TrustedMerchantDict


class Trust(SdkBaseModel):
    users: Optional[dict[str, str]] = UNSET
    merchants: Optional[dict[str, TrustedMerchant]] = UNSET
    platform: Optional[str] = UNSET
    """Ed25519 PEM"""

    ap2: Optional[Jwks] = UNSET


class TrustDict(TypedDict):
    users: NotRequired[dict[str, str]]
    merchants: NotRequired[dict[str, TrustedMerchantDict]]
    platform: NotRequired[str]
    ap2: NotRequired[JwksDict]
