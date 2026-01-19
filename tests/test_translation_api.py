"""
Test suite for Translation API - Real-time translation using Claude Sonnet 4.5
Tests the POST /api/translate endpoint for batch text translation
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestTranslationAPI:
    """Tests for the translation endpoint"""
    
    def test_translate_single_text_to_english(self):
        """Test translating a single Portuguese text to English"""
        response = requests.post(
            f"{BASE_URL}/api/translate",
            json={
                "texts": ["Olá, como você está?"],
                "target_language": "en",
                "source_language": "pt-BR"
            },
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "translations" in data, "Response should contain 'translations' field"
        assert "target_language" in data, "Response should contain 'target_language' field"
        assert data["target_language"] == "en"
        assert len(data["translations"]) == 1
        
        # Check that translation is not empty and different from original (unless same)
        translation = data["translations"][0]
        assert translation, "Translation should not be empty"
        print(f"✓ Translated 'Olá, como você está?' to: '{translation}'")
    
    def test_translate_single_text_to_spanish(self):
        """Test translating a single Portuguese text to Spanish"""
        response = requests.post(
            f"{BASE_URL}/api/translate",
            json={
                "texts": ["Bem-vindo à plataforma"],
                "target_language": "es",
                "source_language": "pt-BR"
            },
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["target_language"] == "es"
        assert len(data["translations"]) == 1
        
        translation = data["translations"][0]
        assert translation, "Translation should not be empty"
        print(f"✓ Translated 'Bem-vindo à plataforma' to Spanish: '{translation}'")
    
    def test_translate_batch_texts_to_english(self):
        """Test translating multiple texts in a single batch request"""
        texts = [
            "Dashboard",
            "Configurações do Sistema",
            "Usuários",
            "Treinamentos",
            "Vendas"
        ]
        
        response = requests.post(
            f"{BASE_URL}/api/translate",
            json={
                "texts": texts,
                "target_language": "en",
                "source_language": "pt-BR"
            },
            headers={"Content-Type": "application/json"},
            timeout=60
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert len(data["translations"]) == len(texts), f"Expected {len(texts)} translations, got {len(data['translations'])}"
        
        # Verify each translation is not empty
        for i, translation in enumerate(data["translations"]):
            assert translation, f"Translation {i} should not be empty"
            print(f"✓ '{texts[i]}' -> '{translation}'")
    
    def test_translate_same_language_returns_original(self):
        """Test that translating to same language returns original texts"""
        texts = ["Texto original em português"]
        
        response = requests.post(
            f"{BASE_URL}/api/translate",
            json={
                "texts": texts,
                "target_language": "pt-BR",
                "source_language": "pt-BR"
            },
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        assert response.status_code == 200
        
        data = response.json()
        assert data["translations"] == texts, "Same language should return original texts"
        print("✓ Same language translation returns original text")
    
    def test_translate_empty_texts_array(self):
        """Test that empty texts array returns empty translations"""
        response = requests.post(
            f"{BASE_URL}/api/translate",
            json={
                "texts": [],
                "target_language": "en",
                "source_language": "pt-BR"
            },
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        assert response.status_code == 200
        
        data = response.json()
        assert data["translations"] == [], "Empty texts should return empty translations"
        print("✓ Empty texts array handled correctly")
    
    def test_translate_preserves_numbers_and_symbols(self):
        """Test that numbers and special characters are preserved"""
        texts = [
            "Total: R$ 1.500,00",
            "Data: 15/01/2025",
            "Progresso: 75%"
        ]
        
        response = requests.post(
            f"{BASE_URL}/api/translate",
            json={
                "texts": texts,
                "target_language": "en",
                "source_language": "pt-BR"
            },
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        assert response.status_code == 200
        
        data = response.json()
        translations = data["translations"]
        
        # Check that numbers are preserved in translations
        assert "1.500" in translations[0] or "1,500" in translations[0] or "1500" in translations[0], \
            f"Number should be preserved in: {translations[0]}"
        assert "15" in translations[1] and "01" in translations[1] and "2025" in translations[1], \
            f"Date numbers should be preserved in: {translations[1]}"
        assert "75" in translations[2], f"Percentage number should be preserved in: {translations[2]}"
        
        print("✓ Numbers and symbols preserved in translations")
    
    def test_translate_invalid_target_language(self):
        """Test behavior with unsupported target language"""
        response = requests.post(
            f"{BASE_URL}/api/translate",
            json={
                "texts": ["Teste"],
                "target_language": "invalid_lang",
                "source_language": "pt-BR"
            },
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        # Should still return 200 (graceful handling) or 400 for validation
        assert response.status_code in [200, 400, 422], f"Unexpected status: {response.status_code}"
        print(f"✓ Invalid language handled with status {response.status_code}")
    
    def test_translate_missing_required_fields(self):
        """Test validation for missing required fields"""
        # Missing texts field
        response = requests.post(
            f"{BASE_URL}/api/translate",
            json={
                "target_language": "en"
            },
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        assert response.status_code == 422, f"Expected 422 for missing texts, got {response.status_code}"
        print("✓ Missing 'texts' field returns 422")
        
        # Missing target_language field
        response = requests.post(
            f"{BASE_URL}/api/translate",
            json={
                "texts": ["Teste"]
            },
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        assert response.status_code == 422, f"Expected 422 for missing target_language, got {response.status_code}"
        print("✓ Missing 'target_language' field returns 422")


class TestTranslationPerformance:
    """Performance tests for translation API"""
    
    def test_translation_response_time(self):
        """Test that translation completes within reasonable time"""
        texts = ["Olá mundo", "Bem-vindo"]
        
        start_time = time.time()
        response = requests.post(
            f"{BASE_URL}/api/translate",
            json={
                "texts": texts,
                "target_language": "en",
                "source_language": "pt-BR"
            },
            headers={"Content-Type": "application/json"},
            timeout=60
        )
        elapsed_time = time.time() - start_time
        
        assert response.status_code == 200
        assert elapsed_time < 30, f"Translation took too long: {elapsed_time:.2f}s"
        print(f"✓ Translation completed in {elapsed_time:.2f}s")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
