from __future__ import annotations

from pydantic import Field
from typing_extensions import NotRequired, TypedDict

from ..core import UNSET, Optional, SdkBaseModel


class TrustedMerchant(SdkBaseModel):
    public_key: Optional[str] = Field(default=UNSET, alias="publicKey")
    verified: Optional[bool] = UNSET
    name: Optional[str] = UNSET


class TrustedMerchantDict(TypedDict):
    public_key: NotRequired[str]
    verified: NotRequired[bool]
    name: NotRequired[str]
