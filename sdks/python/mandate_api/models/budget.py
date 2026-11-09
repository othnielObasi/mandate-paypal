from __future__ import annotations

from pydantic import Field
from typing_extensions import NotRequired, TypedDict

from ..core import UNSET, Optional, SdkBaseModel
from .enums.period import PeriodOrStr


class Budget(SdkBaseModel):
    amount_minor: Optional[int] = Field(default=UNSET, alias="amountMinor")
    period: Optional[PeriodOrStr] = UNSET


class BudgetDict(TypedDict):
    amount_minor: NotRequired[int]
    period: NotRequired[PeriodOrStr]
