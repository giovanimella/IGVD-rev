import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Globe, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Button } from './ui/button';

const LanguageSelector = ({ variant = 'icon' }) => {
  const { language, setLanguage, languageNames, availableLanguages, isTranslating } = useLanguage();

  const flagEmojis = {
    'pt-BR': '🇧🇷',
    'en': '🇺🇸',
    'es': '🇪🇸'
  };

  if (variant === 'full') {
    return (
      <div className="flex flex-col gap-2">
        {availableLanguages.map((lang) => (
          <button
            key={lang}
            onClick={() => setLanguage(lang)}
            disabled={isTranslating}
            className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
              language === lang 
                ? 'bg-cyan-50 dark:bg-cyan-900/30 border border-cyan-200 dark:border-cyan-700 text-cyan-700 dark:text-cyan-300' 
                : 'hover:bg-slate-50 dark:hover:bg-white/5 border border-transparent'
            } ${isTranslating ? 'opacity-50 cursor-wait' : ''}`}
          >
            <span className="text-xl">{flagEmojis[lang]}</span>
            <span className="font-medium">{languageNames[lang]}</span>
            {language === lang && !isTranslating && (
              <span className="ml-auto text-cyan-500">✓</span>
            )}
            {language === lang && isTranslating && (
              <Loader2 className="ml-auto h-4 w-4 animate-spin text-cyan-500" />
            )}
          </button>
        ))}
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative" 
          data-testid="language-selector"
          disabled={isTranslating}
        >
          {isTranslating ? (
            <Loader2 className="h-5 w-5 text-cyan-500 animate-spin" />
          ) : (
            <Globe className="h-5 w-5 text-slate-600 dark:text-slate-400" />
          )}
          <span className="absolute -bottom-1 -right-1 text-xs">
            {flagEmojis[language]}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {availableLanguages.map((lang) => (
          <DropdownMenuItem
            key={lang}
            onClick={() => setLanguage(lang)}
            disabled={isTranslating}
            className={`${language === lang ? 'bg-cyan-50 dark:bg-cyan-900/30' : ''} ${isTranslating ? 'opacity-50' : ''}`}
            data-testid={`language-option-${lang}`}
          >
            <span className="mr-2">{flagEmojis[lang]}</span>
            {languageNames[lang]}
            {language === lang && !isTranslating && (
              <span className="ml-auto text-cyan-500">✓</span>
            )}
            {language === lang && isTranslating && (
              <Loader2 className="ml-auto h-4 w-4 animate-spin text-cyan-500" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSelector;
