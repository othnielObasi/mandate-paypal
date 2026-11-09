from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel
from .jwk import Jwk, JwkDict


class Jwks(SdkBaseModel):
    keys: list[Jwk]


class JwksDict(TypedDict):
    keys: list[JwkDict]
