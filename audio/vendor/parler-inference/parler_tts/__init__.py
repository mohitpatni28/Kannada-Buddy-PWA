# Modified by Kannada Buddy for Transformers 5.10 native-DAC inference.
# Compatibility changes and upstream revision are recorded in ../UPSTREAM.md.

__version__ = "0.2.2+kb.inference.1"


from transformers import AutoConfig, AutoModel

from .configuration_parler_tts import ParlerTTSConfig, ParlerTTSDecoderConfig
from .modeling_parler_tts import (
    ParlerTTSForCausalLM,
    ParlerTTSForConditionalGeneration,
    apply_delay_pattern_mask,
    build_delay_pattern_mask,
)

