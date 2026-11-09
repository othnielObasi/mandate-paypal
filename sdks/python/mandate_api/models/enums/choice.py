from enum import Enum
from typing import Annotated, TypeAlias

from ...core import open_enum_validator


class Choice(str, Enum):
    APPROVE = "approve"
    DECLINE = "decline"

    __str__ = str.__str__


ChoiceOrStr: TypeAlias = Annotated[Choice | str, open_enum_validator(Choice)]
