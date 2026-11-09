from __future__ import annotations

from typing_extensions import NotRequired, TypedDict

from ..core import UNSET, Optional, SdkBaseModel
from .enums.choice import ChoiceOrStr
from .passkey_assertion import PasskeyAssertion, PasskeyAssertionDict


class DecideApprovalRequest(SdkBaseModel):
    choice: ChoiceOrStr
    passkey: Optional[PasskeyAssertion] = UNSET
    """A WebAuthn assertion over the approval's challenge (base64url fields)."""


class DecideApprovalRequestDict(TypedDict):
    choice: ChoiceOrStr
    passkey: NotRequired[PasskeyAssertionDict]
