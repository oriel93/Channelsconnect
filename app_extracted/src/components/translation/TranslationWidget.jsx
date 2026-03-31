import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Globe, X, Languages, CheckCircle } from 'lucide-react';

export default function TranslationWidget({ userLocation, onDismiss }) {
  const [isVisible, setIsVisible] = useState(true); // Start visible for testing
  const [isTranslating, setIsTranslating] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState('en');

  const languages = {
    'es': { name: 'Español', flag: '🇪🇸' },
    'fr': { name: 'Français', flag: '🇫🇷' },
    'de': { name: 'Deutsch', flag: '🇩🇪' },
    'pt': { name: 'Português', flag: '🇧🇷' },
    'it': { name: 'Italiano', flag: '🇮🇹' },
    'ja': { name: '日本語', flag: '🇯🇵' },
  };

  const enableGoogleTranslate = (targetLang) => {
    setIsTranslating(true);
    
    // Add Google Translate widget
    const script = document.createElement('script');
    script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    
    // Create the translation function
    window.googleTranslateElementInit = () => {
      new window.google.translate.TranslateElement({
        pageLanguage: 'en',
        includedLanguages: Object.keys(languages).join(','),
        layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
        autoDisplay: false
      }, 'google_translate_element');
      
      // Auto-translate to detected language
      setTimeout(() => {
        const selectElement = document.querySelector('.goog-te-combo');
        if (selectElement) {
          selectElement.value = targetLang;
          selectElement.dispatchEvent(new Event('change'));
        }
      }, 1000);
    };
    
    document.head.appendChild(script);
    setCurrentLanguage(targetLang);
    
    setTimeout(() => {
      setIsTranslating(false);
    }, 2000);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    if (onDismiss) onDismiss();
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-6 left-6 z-50 max-w-sm">
      <Card className="shadow-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Globe className="w-4 h-4 text-blue-600" />
              </div>
              <Badge variant="secondary" className="text-xs">
                {userLocation?.country || 'Unknown'} 
              </Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={handleDismiss}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          <h3 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
            <Languages className="w-4 h-4" />
            Translate this page?
          </h3>
          
          <p className="text-sm text-slate-600 mb-4">
            Would you like to translate this page to your language?
          </p>
          
          {!isTranslating ? (
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(languages).slice(0, 6).map(([code, lang]) => (
                <Button
                  key={code}
                  variant="outline"
                  size="sm"
                  onClick={() => enableGoogleTranslate(code)}
                  className="text-xs flex items-center gap-1"
                >
                  <span>{lang.flag}</span>
                  <span>{lang.name}</span>
                </Button>
              ))}
            </div>
          ) : (
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Languages className="w-5 h-5 text-blue-600 animate-spin" />
                <span className="text-sm font-medium">Translating...</span>
              </div>
            </div>
          )}
          
          {/* Hidden Google Translate Element */}
          <div id="google_translate_element" className="hidden"></div>
        </CardContent>
      </Card>
    </div>
  );
}