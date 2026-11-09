from __future__ import annotations

from pydantic import Field
from typing_extensions import TypedDict

from ..core import SdkBaseModel


class PasskeyAssertion(SdkBaseModel):
    """A WebAuthn assertion over the approval's challenge (base64url fields)."""

    credential_id: str = Field(alias="credentialId")
    client_data_json: str = Field(alias="clientDataJSON")
    authenticator_data: str = Field(alias="authenticatorData")
    signature: str


class PasskeyAssertionDict(TypedDict):
    credential_id: str
    client_data_json: str
    authenticator_data: str
    signature: str
