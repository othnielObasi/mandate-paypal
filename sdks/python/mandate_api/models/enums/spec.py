from enum import Enum
from typing import Annotated, TypeAlias

from ...core import open_enum_validator


class Spec(str, Enum):
    AP2_0_2 = "ap2/0.2"

    __str__ = str.__str__


SpecOrStr: TypeAlias = Annotated[Spec | str, open_enum_validator(Spec)]
