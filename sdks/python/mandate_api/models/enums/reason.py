from enum import Enum
from typing import Annotated, TypeAlias

from ...core import open_enum_validator


class Reason(str, Enum):
    SEQUENCE_GAP = "sequence_gap"
    CHAIN_BREAK = "chain_break"
    PAYLOAD_MISMATCH = "payload_mismatch"
    HASH_MISMATCH = "hash_mismatch"
    BAD_SIGNATURE = "bad_signature"

    __str__ = str.__str__


ReasonOrStr: TypeAlias = Annotated[Reason | str, open_enum_validator(Reason)]
