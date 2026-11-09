from enum import Enum
from typing import Annotated, TypeAlias

from ...core import open_enum_validator


class Mode(str, Enum):
    HUMAN_NOT_PRESENT = "human_not_present"
    HUMAN_PRESENT = "human_present"

    __str__ = str.__str__


ModeOrStr: TypeAlias = Annotated[Mode | str, open_enum_validator(Mode)]
