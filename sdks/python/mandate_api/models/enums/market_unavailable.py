from enum import Enum
from typing import Annotated, TypeAlias

from ...core import open_enum_validator


class MarketUnavailable(str, Enum):
    ASK = "ask"
    BLOCK = "block"
    ALLOW = "allow"

    __str__ = str.__str__


MarketUnavailableOrStr: TypeAlias = Annotated[MarketUnavailable | str, open_enum_validator(MarketUnavailable)]
