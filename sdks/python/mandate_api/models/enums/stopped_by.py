from enum import Enum
from typing import Annotated, TypeAlias

from ...core import open_enum_validator


class StoppedBy(str, Enum):
    END = "end"
    STEP_LIMIT = "step_limit"
    MODEL_ERROR = "model_error"

    __str__ = str.__str__


StoppedByOrStr: TypeAlias = Annotated[StoppedBy | str, open_enum_validator(StoppedBy)]
