from __future__ import annotations

from dataclasses import dataclass
from typing import Final, TypeAlias

from ..core import ErrorMapper, RawError, decode_json
from ..models.error import Error

CreateMandateErrorBody: TypeAlias = Error | RawError


@dataclass(frozen=True, slots=True)
class _CreateMandateError:
    def map(self, status_code: int, content: bytes) -> CreateMandateErrorBody:
        match status_code:
            case 400 | 422 | 429:
                return decode_json[Error](content)
            case _:
                return RawError(status_code, content)


create_mandate_error_mapper: Final[ErrorMapper[CreateMandateErrorBody]] = _CreateMandateError()
