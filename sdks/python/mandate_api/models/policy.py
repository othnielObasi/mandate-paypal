from __future__ import annotations

from pydantic import Field
from typing_extensions import NotRequired, TypedDict

from ..core import UNSET, Date, Optional, OptionalNullable, SdkBaseModel
from .budget import Budget, BudgetDict
from .enums.market_unavailable import MarketUnavailableOrStr
from .enums.over_limit import OverLimitOrStr
from .seller_rules import SellerRules, SellerRulesDict


class Policy(SdkBaseModel):
    """The signed rules. Money is in minor units (cents)."""

    categories: Optional[list[str]] = UNSET
    currency: Optional[str] = UNSET
    max_item_minor: Optional[int] = Field(default=UNSET, alias="maxItemMinor")
    budget: Optional[Budget] = UNSET
    sellers: Optional[SellerRules] = UNSET
    over_limit: Optional[OverLimitOrStr] = Field(default=UNSET, alias="overLimit")
    max_premium_pct: OptionalNullable[int] = Field(default=UNSET, alias="maxPremiumPct")
    """Fair-price limit, % above market"""

    market_unavailable: Optional[MarketUnavailableOrStr] = Field(default=UNSET, alias="marketUnavailable")
    expires: Optional[Date] = UNSET


class PolicyDict(TypedDict):
    categories: NotRequired[list[str]]
    currency: NotRequired[str]
    max_item_minor: NotRequired[int]
    budget: NotRequired[BudgetDict]
    sellers: NotRequired[SellerRulesDict]
    over_limit: NotRequired[OverLimitOrStr]
    max_premium_pct: NotRequired[int | None]
    market_unavailable: NotRequired[MarketUnavailableOrStr]
    expires: NotRequired[Date]
