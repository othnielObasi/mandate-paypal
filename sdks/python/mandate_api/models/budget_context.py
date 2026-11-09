from __future__ import annotations

from pydantic import Field
from typing_extensions import NotRequired, TypedDict

from ..core import UNSET, Optional, SdkBaseModel


class BudgetContext(SdkBaseModel):
    """Budget already used in the period, for the budget constraint"""

    total_amount: Optional[int] = Field(default=UNSET, alias="totalAmount")
    total_uses: Optional[int] = Field(default=UNSET, alias="totalUses")


class BudgetContextDict(TypedDict):
    total_amount: NotRequired[int]
    total_uses: NotRequired[int]
