import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Globe } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Button } from './ui/button';

const LanguageSelector = ({ variant = 'icon' }) => {
  const { language, setLanguage, languageNames, availableLanguages } = useLanguage();

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
            className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
              language === lang 
                ? 'bg-cyan-50 border border-cyan-200 text-cyan-700' 
                : 'hover:bg-slate-50 border border-transparent'
            }`}
          >
            <span className="text-xl">{flagEmojis[lang]}</span>
            <span className="font-medium">{languageNames[lang]}</span>
            {language === lang && (
              <span className="ml-auto text-cyan-500">✓</span>
            )}
          </button>
        ))}
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" data-testid="language-selector">
          <Globe className="h-5 w-5 text-slate-600" />
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
            className={language === lang ? 'bg-cyan-50' : ''}
            data-testid={`language-option-${lang}`}
          >
            <span className="mr-2">{flagEmojis[lang]}</span>
            {languageNames[lang]}
            {language === lang && (
              <span className="ml-auto text-cyan-500">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSelector;
