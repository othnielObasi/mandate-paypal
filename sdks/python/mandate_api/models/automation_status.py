from __future__ import annotations

from pydantic import Field
from typing_extensions import NotRequired, TypedDict

from ..core import UNSET, Optional, SdkBaseModel
from .enums.alerts import AlertsOrStr
from .enums.kill_switch import KillSwitchOrStr


class AutomationStatus(SdkBaseModel):
    alerts: Optional[AlertsOrStr] = UNSET
    kill_switch: Optional[KillSwitchOrStr] = Field(default=UNSET, alias="killSwitch")


class AutomationStatusDict(TypedDict):
    alerts: NotRequired[AlertsOrStr]
    kill_switch: NotRequired[KillSwitchOrStr]
