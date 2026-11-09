from __future__ import annotations

from typing import Literal

from typing_extensions import NotRequired, TypedDict

from ..core import UNSET, Optional, SdkBaseModel
from .enums.alg import AlgOrStr
from .enums.use import UseOrStr


class Jwk(SdkBaseModel):
    kty: Literal["EC"] = "EC"
    crv: Literal["P-256"] = "P-256"
    x: str
    y: str
    kid: str
    alg: Optional[AlgOrStr] = UNSET
    use: Optional[UseOrStr] = UNSET


class JwkDict(TypedDict):
    kty: Literal["EC"]
    crv: Literal["P-256"]
    x: str
    y: str
    kid: str
    alg: NotRequired[AlgOrStr]
    use: NotRequired[UseOrStr]
