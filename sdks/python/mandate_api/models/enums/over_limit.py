from enum import Enum
from typing import Annotated, TypeAlias

from ...core import open_enum_validator


class OverLimit(str, Enum):
    ASK = "ask"
    BLOCK = "block"

    __str__ = str.__str__


OverLimitOrStr: TypeAlias = Annotated[OverLimit | str, open_enum_validator(OverLimit)]
