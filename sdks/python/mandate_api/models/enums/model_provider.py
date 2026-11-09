from enum import Enum
from typing import Annotated, TypeAlias

from ...core import open_enum_validator


class ModelProvider(str, Enum):
    META_MODEL_API = "Meta Model API"
    CLAUDE_API = "Claude API"
    OFFLINE = "offline"

    __str__ = str.__str__


ModelProviderOrStr: TypeAlias = Annotated[ModelProvider | str, open_enum_validator(ModelProvider)]
