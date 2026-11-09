from __future__ import annotations

from pydantic import Field
from typing_extensions import NotRequired, TypedDict

from ..core import UNSET, Optional, SdkBaseModel


class SellerRules(SdkBaseModel):
    verified_only: Optional[bool] = Field(default=UNSET, alias="verifiedOnly")
    blocked: Optional[list[str]] = UNSET


class SellerRulesDict(TypedDict):
    verified_only: NotRequired[bool]
    blocked: NotRequired[list[str]]
