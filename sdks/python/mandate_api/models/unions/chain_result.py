from __future__ import annotations

from typing import TypeAlias

from ..chain_broken import ChainBroken, ChainBrokenDict
from ..chain_intact import ChainIntact, ChainIntactDict

ChainResult: TypeAlias = ChainIntact | ChainBroken

ChainResultDict: TypeAlias = ChainIntactDict | ChainBrokenDict
