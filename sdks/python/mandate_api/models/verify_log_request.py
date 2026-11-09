from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel
from .receipt import Receipt, ReceiptDict


class VerifyLogRequest(SdkBaseModel):
    receipts: list[Receipt]


class VerifyLogRequestDict(TypedDict):
    receipts: list[ReceiptDict]
