import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const languageNames = {
  'pt-BR': 'Português (Brasil)',
  'en': 'English',
  'es': 'Español'
};

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState(() => {
    const saved = localStorage.getItem('uniozoxx_language');
    return saved || 'pt-BR';
  });
  
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationCache, setTranslationCache] = useState(() => {
    // Carregar cache do localStorage
    try {
      const cached = localStorage.getItem('uniozoxx_translation_cache');
      return cached ? JSON.parse(cached) : {};
    } catch {
      return {};
    }
  });
  
  // Ref para armazenar o observer
  const observerRef = useRef(null);
  const translatedNodesRef = useRef(new WeakSet());
  const originalTextsRef = useRef(new WeakMap());
  const pendingTranslationsRef = useRef(new Map());
  const batchTimeoutRef = useRef(null);

  // Salvar cache no localStorage quando atualizar
  useEffect(() => {
    localStorage.setItem('uniozoxx_translation_cache', JSON.stringify(translationCache));
  }, [translationCache]);

  // Função para criar chave do cache
  const getCacheKey = useCallback((text, targetLang) => {
    return `${targetLang}:${text.substring(0, 100)}`;
  }, []);

  // Função para traduzir textos via API
  const translateTexts = useCallback(async (texts, targetLanguage) => {
    if (!texts.length || targetLanguage === 'pt-BR') {
      return texts;
    }

    try {
      const response = await fetch(`${API_URL}/api/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          texts,
          target_language: targetLanguage,
          source_language: 'pt-BR'
        })
      });

      if (!response.ok) {
        console.error('Translation API error:', response.status);
        return texts;
      }

      const data = await response.json();
      return data.translations || texts;
    } catch (error) {
      console.error('Translation error:', error);
      return texts;
    }
  }, []);

  // Função para processar batch de traduções
  const processBatchTranslations = useCallback(async (targetLang) => {
    const pending = pendingTranslationsRef.current;
    if (pending.size === 0) return;

    const entries = Array.from(pending.entries());
    pendingTranslationsRef.current = new Map();

    const textsToTranslate = [];
    const nodesToUpdate = [];

    entries.forEach(([node, text]) => {
      const cacheKey = getCacheKey(text, targetLang);
      const cached = translationCache[cacheKey];
      
      if (cached) {
        // Usar tradução do cache
        if (node.nodeType === Node.TEXT_NODE && node.parentNode) {
          node.textContent = cached;
        }
      } else {
        textsToTranslate.push(text);
        nodesToUpdate.push({ node, text, cacheKey });
      }
    });

    if (textsToTranslate.length === 0) {
      setIsTranslating(false);
      return;
    }

    setIsTranslating(true);

    try {
      // Processar em batches de 50 para não sobrecarregar a API
      const batchSize = 50;
      const newCacheEntries = {};

      for (let i = 0; i < textsToTranslate.length; i += batchSize) {
        const batch = textsToTranslate.slice(i, i + batchSize);
        const batchNodes = nodesToUpdate.slice(i, i + batchSize);
        
        const translations = await translateTexts(batch, targetLang);
        
        translations.forEach((translation, index) => {
          const { node, cacheKey } = batchNodes[index];
          
          if (translation && translation.trim()) {
            newCacheEntries[cacheKey] = translation;
            
            if (node.nodeType === Node.TEXT_NODE && node.parentNode) {
              node.textContent = translation;
            }
          }
        });
      }

      // Atualizar cache
      setTranslationCache(prev => ({ ...prev, ...newCacheEntries }));
    } catch (error) {
      console.error('Batch translation error:', error);
    } finally {
      setIsTranslating(false);
    }
  }, [translateTexts, translationCache, getCacheKey]);

  // Função para coletar textos de um nó
  const collectTextNodes = useCallback((element, targetLang) => {
    if (!element || targetLang === 'pt-BR') return;

    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          // Ignorar nós já traduzidos
          if (translatedNodesRef.current.has(node)) {
            return NodeFilter.FILTER_REJECT;
          }
          
          // Ignorar scripts e estilos
          const parent = node.parentNode;
          if (!parent) return NodeFilter.FILTER_REJECT;
          
          const tagName = parent.tagName?.toLowerCase();
          if (['script', 'style', 'noscript', 'code', 'pre'].includes(tagName)) {
            return NodeFilter.FILTER_REJECT;
          }
          
          // Ignorar textos vazios ou muito curtos
          const text = node.textContent?.trim();
          if (!text || text.length < 2) {
            return NodeFilter.FILTER_REJECT;
          }
          
          // Ignorar se for apenas números, símbolos ou datas
          if (/^[\d\s\-\/\.\:\,\%\$\€\@\#\*\+\=\(\)\[\]\{\}]+$/.test(text)) {
            return NodeFilter.FILTER_REJECT;
          }
          
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    let node;
    while ((node = walker.nextNode())) {
      const text = node.textContent.trim();
      
      // Salvar texto original
      if (!originalTextsRef.current.has(node)) {
        originalTextsRef.current.set(node, text);
      }
      
      // Marcar como processado
      translatedNodesRef.current.add(node);
      
      // Adicionar à fila de tradução
      pendingTranslationsRef.current.set(node, text);
    }
  }, []);

  // Função para traduzir a página
  const translatePage = useCallback(async (targetLang) => {
    if (targetLang === 'pt-BR') {
      // Restaurar textos originais
      originalTextsRef.current = new WeakMap();
      translatedNodesRef.current = new WeakSet();
      pendingTranslationsRef.current = new Map();
      return;
    }

    // Limpar refs para nova tradução
    translatedNodesRef.current = new WeakSet();
    pendingTranslationsRef.current = new Map();

    // Coletar textos de toda a página
    // 1. Main content
    const mainContent = document.querySelector('main') || document.querySelector('[data-main-content]');
    if (mainContent) {
      collectTextNodes(mainContent, targetLang);
    }

    // 2. Sidebar (aside element)
    const sidebars = document.querySelectorAll('aside');
    sidebars.forEach(sidebar => {
      collectTextNodes(sidebar, targetLang);
    });

    // 3. Header/Topbar
    const headers = document.querySelectorAll('header');
    headers.forEach(header => {
      collectTextNodes(header, targetLang);
    });

    // 4. Navigation elements
    const navs = document.querySelectorAll('nav');
    navs.forEach(nav => {
      collectTextNodes(nav, targetLang);
    });

    // 5. Fallback to body if nothing found
    if (!mainContent && sidebars.length === 0) {
      collectTextNodes(document.body, targetLang);
    }

    // Agendar processamento
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
    }
    
    batchTimeoutRef.current = setTimeout(() => {
      processBatchTranslations(targetLang);
    }, 100);
  }, [collectTextNodes, processBatchTranslations]);

  // Configurar MutationObserver para detectar mudanças no DOM
  useEffect(() => {
    if (language === 'pt-BR') {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      return;
    }

    // Criar observer
    observerRef.current = new MutationObserver((mutations) => {
      let hasNewNodes = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              collectTextNodes(node, language);
              hasNewNodes = true;
            }
          });
        }
      });

      if (hasNewNodes && pendingTranslationsRef.current.size > 0) {
        if (batchTimeoutRef.current) {
          clearTimeout(batchTimeoutRef.current);
        }
        batchTimeoutRef.current = setTimeout(() => {
          processBatchTranslations(language);
        }, 300);
      }
    });

    // Observar mudanças no body
    observerRef.current.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Traduzir página inicial
    translatePage(language);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
      }
    };
  }, [language, translatePage, collectTextNodes, processBatchTranslations]);

  // Função para mudar idioma
  const setLanguage = useCallback((newLang) => {
    setLanguageState(newLang);
    localStorage.setItem('uniozoxx_language', newLang);
    document.documentElement.lang = newLang;
    
    // Forçar refresh para re-renderizar com textos originais
    if (newLang === 'pt-BR') {
      window.location.reload();
    }
  }, []);

  // Limpar cache (útil para admin)
  const clearTranslationCache = useCallback(() => {
    setTranslationCache({});
    localStorage.removeItem('uniozoxx_translation_cache');
  }, []);

  const value = {
    language,
    setLanguage,
    languageNames,
    availableLanguages: Object.keys(languageNames),
    isTranslating,
    clearTranslationCache
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export default LanguageContext;
