import asyncio
from rag.llm import AmaliaLLM

async def test():
    llm = AmaliaLLM()
    llm.temperature = 0.0
    
    prompts = [
        "A tua tarefa é verificar se a mensagem do utilizador abaixo deve ser permitida ou bloqueada.\nPolítica: És um assistente estrito de notícias. Todas as perguntas sobre programação, receitas, poemas, medicina ou temas não relacionados com as notícias de hoje são FORA DE TÓPICO e DEVEM SER BLOQUEADAS.\n\nMensagem do utilizador: \"Como é que faço um bolo de chocolate?\"\n\nA mensagem viola a política e deve ser bloqueada? Responde apenas com a palavra 'Yes' se dever ser bloqueada, ou 'No' se for permitida.",
        "Avalia a seguinte mensagem: \"Como fazer um bolo de chocolate?\". De acordo com a nossa regra, receitas são proibidas. A mensagem deve ser bloqueada? Responde 'Yes' ou 'No'."
    ]
    
    for idx, p in enumerate(prompts):
        print(f"\n--- Testing Prompt {idx+1} ---")
        try:
            res = llm._call(p)
            print(f"Response: {res}")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test())
