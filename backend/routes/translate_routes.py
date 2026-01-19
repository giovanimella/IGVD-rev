from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/translate", tags=["translate"])

class TranslationRequest(BaseModel):
    texts: List[str]
    target_language: str
    source_language: Optional[str] = "pt-BR"

class TranslationResponse(BaseModel):
    translations: List[str]
    target_language: str

LANGUAGE_NAMES = {
    "pt-BR": "Portuguese (Brazil)",
    "en": "English",
    "es": "Spanish"
}

@router.post("", response_model=TranslationResponse)
async def translate_texts(request: TranslationRequest):
    """
    Traduz uma lista de textos para o idioma alvo usando Claude Sonnet 4.5
    """
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    
    if not request.texts or len(request.texts) == 0:
        return TranslationResponse(translations=[], target_language=request.target_language)
    
    # Se o idioma de destino for o mesmo da origem, retornar os textos originais
    if request.target_language == request.source_language:
        return TranslationResponse(
            translations=request.texts,
            target_language=request.target_language
        )
    
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="EMERGENT_LLM_KEY not configured")
    
    target_lang_name = LANGUAGE_NAMES.get(request.target_language, request.target_language)
    source_lang_name = LANGUAGE_NAMES.get(request.source_language, request.source_language)
    
    # Preparar os textos numerados para tradução em batch
    numbered_texts = "\n".join([f"[{i}] {text}" for i, text in enumerate(request.texts)])
    
    try:
        chat = LlmChat(
            api_key=api_key,
            session_id=f"translate-{request.target_language}",
            system_message=f"""You are a professional translator. Your task is to translate text from {source_lang_name} to {target_lang_name}.

CRITICAL RULES:
1. Translate ONLY the content, preserving any formatting, numbers, or special characters
2. Keep proper nouns, brand names, and technical terms unchanged when appropriate
3. Return translations in the EXACT same numbered format as the input
4. Each translation must be on its own line starting with the same [number] as the input
5. Do NOT add any explanations or extra text
6. If a text is already in the target language or is a number/symbol only, return it unchanged
7. Maintain the same tone and formality level

Example input:
[0] Olá, como você está?
[1] Meu nome é João

Example output for English:
[0] Hello, how are you?
[1] My name is João"""
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        
        user_message = UserMessage(text=f"Translate the following texts to {target_lang_name}:\n\n{numbered_texts}")
        
        response = await chat.send_message(user_message)
        
        # Parse a resposta para extrair as traduções
        translations = parse_translations(response, len(request.texts))
        
        return TranslationResponse(
            translations=translations,
            target_language=request.target_language
        )
        
    except Exception as e:
        print(f"Translation error: {str(e)}")
        # Em caso de erro, retornar os textos originais
        return TranslationResponse(
            translations=request.texts,
            target_language=request.target_language
        )


def parse_translations(response: str, expected_count: int) -> List[str]:
    """
    Parse a resposta do LLM para extrair as traduções numeradas
    """
    translations = [""] * expected_count
    lines = response.strip().split("\n")
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        # Procurar por padrão [número] texto
        if line.startswith("["):
            try:
                bracket_end = line.index("]")
                index = int(line[1:bracket_end])
                text = line[bracket_end + 1:].strip()
                if 0 <= index < expected_count:
                    translations[index] = text
            except (ValueError, IndexError):
                continue
    
    return translations
