from __future__ import annotations

from dataclasses import dataclass
from typing import Final, TypeAlias

from ..core import ErrorMapper, RawError, decode_json
from ..models.error import Error

GetAp2EvidenceErrorBody: TypeAlias = Error | RawError


@dataclass(frozen=True, slots=True)
class _GetAp2EvidenceError:
    def map(self, status_code: int, content: bytes) -> GetAp2EvidenceErrorBody:
        match status_code:
            case 404:
                return decode_json[Error](content)
            case _:
                return RawError(status_code, content)


get_ap2_evidence_error_mapper: Final[ErrorMapper[GetAp2EvidenceErrorBody]] = _GetAp2EvidenceError()
