from enum import Enum
from typing import Annotated, TypeAlias

from ...core import open_enum_validator


class KillSwitch(str, Enum):
    ON = "on"
    OFF = "off"

    __str__ = str.__str__


KillSwitchOrStr: TypeAlias = Annotated[KillSwitch | str, open_enum_validator(KillSwitch)]
