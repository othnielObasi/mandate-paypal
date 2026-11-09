from __future__ import annotations

from dataclasses import dataclass
from typing import Final, TypeAlias

from ..core import ErrorMapper, RawError, decode_json
from ..models.error import Error

DecideApprovalErrorBody: TypeAlias = Error | RawError


@dataclass(frozen=True, slots=True)
class _DecideApprovalError:
    def map(self, status_code: int, content: bytes) -> DecideApprovalErrorBody:
        match status_code:
            case 403 | 404 | 409 | 410:
                return decode_json[Error](content)
            case _:
                return RawError(status_code, content)


decide_approval_error_mapper: Final[ErrorMapper[DecideApprovalErrorBody]] = _DecideApprovalError()
