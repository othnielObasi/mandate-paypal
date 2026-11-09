from __future__ import annotations

from dataclasses import dataclass
from typing import Final, TypeAlias

from ..core import ErrorMapper, RawError, decode_json
from ..models.error import Error

KillSwitchErrorBody: TypeAlias = Error | RawError


@dataclass(frozen=True, slots=True)
class _KillSwitchError:
    def map(self, status_code: int, content: bytes) -> KillSwitchErrorBody:
        match status_code:
            case 400 | 401 | 404 | 503:
                return decode_json[Error](content)
            case _:
                return RawError(status_code, content)


kill_switch_error_mapper: Final[ErrorMapper[KillSwitchErrorBody]] = _KillSwitchError()
