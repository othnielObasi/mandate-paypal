from enum import Enum
from typing import Annotated, TypeAlias

from ...core import open_enum_validator


class Alg(str, Enum):
    ES256 = "ES256"

    __str__ = str.__str__


AlgOrStr: TypeAlias = Annotated[Alg | str, open_enum_validator(Alg)]
