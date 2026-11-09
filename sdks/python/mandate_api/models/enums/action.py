from enum import Enum
from typing import Annotated, TypeAlias

from ...core import open_enum_validator


class Action(str, Enum):
    PAUSE = "pause"
    RESUME = "resume"
    REVOKE = "revoke"

    __str__ = str.__str__


ActionOrStr: TypeAlias = Annotated[Action | str, open_enum_validator(Action)]
