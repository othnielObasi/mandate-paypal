from enum import Enum
from typing import Annotated, TypeAlias

from ...core import open_enum_validator


class Alerts(str, Enum):
    ZAPIER = "zapier"
    OFF = "off"

    __str__ = str.__str__


AlertsOrStr: TypeAlias = Annotated[Alerts | str, open_enum_validator(Alerts)]
