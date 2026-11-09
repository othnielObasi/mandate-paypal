from enum import Enum
from typing import Annotated, TypeAlias

from ...core import open_enum_validator


class Event(str, Enum):
    APPROVAL_NEEDED = "approval.needed"
    PURCHASE_BLOCKED = "purchase.blocked"
    PURCHASE_PAID = "purchase.paid"
    PAYMENT_FAILED = "payment.failed"
    MANDATE_STATUS_CHANGED = "mandate.status_changed"

    __str__ = str.__str__


EventOrStr: TypeAlias = Annotated[Event | str, open_enum_validator(Event)]
