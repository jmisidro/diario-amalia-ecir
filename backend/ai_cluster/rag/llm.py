import requests
from typing import Any, List, Mapping, Optional
from langchain_core.language_models.llms import LLM
from langchain_core.callbacks.manager import CallbackManagerForLLMRun
from .constants import API_ENDPOINT, AMALIA_VERSION, NODE_ENV

class AmaliaLLM(LLM):
    """Custom Langchain LLM wrapper for AMALIA."""
    
    endpoint: str = API_ENDPOINT
    model_name: str = AMALIA_VERSION
    temperature: float = 0.3
    max_tokens: int = 600

    @property
    def _llm_type(self) -> str:
        return "amalia_custom_llm"

    def _call(
        self,
        prompt: str,
        stop: Optional[List[str]] = None,
        run_manager: Optional[CallbackManagerForLLMRun] = None,
        **kwargs: Any,
    ) -> str:
        
        messages = []
        is_classification = any(x in prompt.lower() for x in [
            "mensagem do utilizador deve ser bloqueada",
            "para bloquear ou",
            "deve ser bloqueada?",
            "verificar se a mensagem",
            "should the user message be blocked",
            "complies with the company policy",
            "yes or no",
            "cumpre a regra (permitida) ou viola a regra e deve ser rejeitada (bloqueada)"
        ])
        
        if is_classification:
            messages.append({
                "role": "system", 
                "content": "És um avaliador de tópicos. Responde APENAS com uma de duas palavras: PERMITIDA ou BLOQUEADA. Não digas mais nada."
            })
            messages.append({"role": "user", "content": prompt})
            temperature_to_use = 0.0
            max_tokens_to_use = 10
        else:
            messages.append({"role": "user", "content": prompt})
            temperature_to_use = self.temperature
            max_tokens_to_use = self.max_tokens

        payload = {
            "model": self.model_name,
            "messages": messages,
            "temperature": temperature_to_use,
            "max_tokens": max_tokens_to_use
        }
        
        try:
            response = requests.post(
                self.endpoint,
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=90,  # 90 seconds — enough for slow inference, avoids indefinite hangs
            )
            response.raise_for_status()
            data = response.json()
            if "choices" in data and len(data["choices"]) > 0:
                answer = data["choices"][0]["message"]["content"]
                
                # Apply stop sequences if any
                if stop is not None:
                    for stop_seq in stop:
                        answer = answer.split(stop_seq)[0]
                
                answer = answer.strip()
                if is_classification:
                    if NODE_ENV == "development":
                        print(f"[AmaliaLLM Classify DEBUG] Raw Response: {repr(answer)} for prompt: {repr(prompt)}")
                    if "BLOQUEADA" in answer.upper():
                        answer = "Yes"
                    else:
                        answer = "No"
                return answer
            else:
                raise ValueError("Erro: Formato de resposta inválido do modelo AMALIA.")
        except Exception as e:
            print(f"[AmaliaLLM Error] API request failed: {e}")
            raise RuntimeError(f"Erro ao comunicar com o modelo AMALIA: {str(e)}") from e

    async def _acall(
        self,
        prompt: str,
        stop: Optional[List[str]] = None,
        run_manager: Optional[Any] = None,
        **kwargs: Any,
    ) -> str:
        import asyncio
        return await asyncio.to_thread(self._call, prompt, stop, run_manager, **kwargs)
