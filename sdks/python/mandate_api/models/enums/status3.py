from enum import Enum
from typing import Annotated, TypeAlias

from ...core import open_enum_validator


class Status3(str, Enum):
    PAID = "paid"
    AWAITING_BUYER = "awaiting_buyer"
    PENDING_APPROVAL = "pending_approval"
    BLOCKED = "blocked"
    DECLINED = "declined"
    FAILED = "failed"

    __str__ = str.__str__


Status3OrStr: TypeAlias = Annotated[Status3 | str, open_enum_validator(Status3)]
