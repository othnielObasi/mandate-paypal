from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

from ..core import UrlTemplate
from .environment import Environment


class ProductionConfig(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid")
    base_url: str = "https://mandate-e13m.onrender.com"


class LocalConfig(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid")
    base_url: str = "http://localhost:3000"


class ServerConfig(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid")
    production: ProductionConfig = Field(default_factory=ProductionConfig)
    local: LocalConfig = Field(default_factory=LocalConfig)

    def resolve(self, environment: Environment, path: str) -> UrlTemplate:
        variant = self.production if environment == "production" else self.local
        return UrlTemplate(base_url=variant.base_url, path=path)
