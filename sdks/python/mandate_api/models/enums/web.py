from enum import Enum
from typing import Annotated, TypeAlias

from ...core import open_enum_validator


class Web(str, Enum):
    """KERNEL cloud browser, or only the app's own /demo pages"""

    KERNEL = "kernel"
    OWN_PAGES = "own-pages"

    __str__ = str.__str__


WebOrStr: TypeAlias = Annotated[Web | str, open_enum_validator(Web)]
