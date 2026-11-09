from enum import Enum
from typing import Annotated, TypeAlias

from ...core import open_enum_validator


class SigningKey(str, Enum):
    CONFIGURED = "configured"
    EPHEMERAL = "ephemeral"

    __str__ = str.__str__


SigningKeyOrStr: TypeAlias = Annotated[SigningKey | str, open_enum_validator(SigningKey)]
