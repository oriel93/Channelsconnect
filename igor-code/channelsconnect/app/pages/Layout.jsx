

import React, { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import MarketingHeader from "@/components/marketing/MarketingHeader";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import PWAInstaller from "@/components/pwa/PWAInstaller";
import { InvokeLLM } from "@/api/integrations";
import { X, Bot } from "lucide-react";

// ─── Contact FAB ─────────────────────────────────────────────────────────────
// Update COMPANY_PHONE to enable the Call Us and WhatsApp buttons.
const COMPANY_PHONE = ""; // e.g. "12125551234" (digits only, no + or spaces)

function ContactFAB() {
  const [open, setOpen] = useState(false);

  // WhatsApp SVG (official brand colours)
  const WhatsAppIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );

  // Phone SVG
  const PhoneIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8a19.79 19.79 0 01-3.07-8.67A2 2 0 012 .84h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
    </svg>
  );

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Flyout buttons */}
      {open && (
        <div className="flex flex-col gap-2 mb-1 animate-in slide-in-from-bottom-2">
          {COMPANY_PHONE ? (
            <>
              <a
                href={`https://wa.me/${COMPANY_PHONE}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-[#25D366] hover:bg-[#1ebe5d] text-white text-sm font-semibold px-4 py-2.5 rounded-full shadow-lg transition-all duration-150 whitespace-nowrap"
              >
                <WhatsAppIcon />
                WhatsApp
              </a>
              <a
                href={`tel:${COMPANY_PHONE}`}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-full shadow-lg transition-all duration-150 whitespace-nowrap"
              >
                <PhoneIcon />
                Call Us
              </a>
            </>
          ) : (
            <div className="bg-white border border-slate-200 text-slate-500 text-xs px-4 py-2 rounded-full shadow">
              Phone not configured
            </div>
          )}
        </div>
      )}

      {/* Main FAB toggle */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close contact options' : 'Contact us'}
        className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-xl flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
      >
        {open ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8a19.79 19.79 0 01-3.07-8.67A2 2 0 012 .84h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
          </svg>
        )}
      </button>
    </div>
  );
}

export default function Layout({ children, currentPageName }) {
  const location = useLocation();

  // Use the Channels Connect logo for the chatbot
  const channelConnectLogoUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/f50093011_channelsconnectlogo.png";
  const assistantAvatarUrl = channelConnectLogoUrl;

  // Enhanced Knowledge Base with Competitive Intelligence
  const enhancedKnowledgeBase = `
    CHANNELS CONNECT - SUPERIOR VALUE PROPOSITION:
    Channels Connect is the only completely FREE distribution platform that generates instant bookings with immediate guest payment. We work seamlessly with ANY PMS system including Guesty, Siteminder, Rentals United, Hostfully, OwnerRez, and others.

    COMPETITIVE ADVANTAGES:
    - Guesty: Charges $2.40+ per unit monthly plus transaction fees. We're 100% FREE.
    - Siteminder: Enterprise pricing starts at $50+ monthly with setup fees. We're FREE with zero setup costs.
    - Rentals United: Monthly fees plus commission structure. We take ZERO commissions.
    - Traditional Channel Managers: Charge 3-15% commissions. We keep 100% of your revenue.

    KEY DIFFERENTIATORS:
    - FREE instant bookings with immediate guest payment (competitors charge fees)
    - Works WITH your existing PMS workflow (we don't replace, we enhance)
    - Bookings appear automatically in your current system
    - No contracts, no commitments, no hidden costs
    - We distribute inventory to generate MORE bookings, not compete with your PMS

    INTEGRATION CAPABILITIES:
    - Guesty: Seamless API integration, real-time availability sync, automated booking import
    - Siteminder: Direct channel connection, rate and inventory management
    - Rentals United: Full property sync, automated listing distribution
    - Universal PMS Support: Works with 200+ property management systems

    PROVEN RESULTS:
    - Property owners typically see 15-30% more bookings within 30 days
    - Zero cost means 100% profit increase on additional bookings
    - 5-minute setup process with immediate results
    - Trusted by 10,000+ properties worldwide
  `;

  // Chatbot State & Logic
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const messagesEndRef = useRef(null);

  // Live Chat Enhancement State
  const [showLiveChatOption, setShowLiveChatOption] = useState(false);
  const [isLiveChatActive, setIsLiveChatActive] = useState(false);
  const [userEngagementLevel, setUserEngagementLevel] = useState('new');
  const [liveChatRequested, setLiveChatRequested] = useState(false);
  const [contactInfo, setContactInfo] = useState({ name: '', email: '', phone: '', urgency: 'normal' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Smart Follow-Up Enhancement State
  const [hasSeenDemo, setHasSeenDemo] = useState(false);
  const [followUpsSent, setFollowUpsSent] = useState(new Set());


  // This will run every time the page URL changes
  useEffect(() => {
    // Using a timeout ensures the page has rendered before we try to scroll
    const timer = setTimeout(() => {
      if (location.hash) {
        // If there's an anchor link (e.g., #guesty), scroll to that section
        const id = location.hash.substring(1);
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      } else {
        // Otherwise, scroll to the top of the new page
        window.scrollTo(0, 0);
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [location]); // Re-run this effect when the location changes

  useEffect(() => {
    document.title = "Channels Connect";

    // Create and inject PWA manifest inline
    const createManifest = () => {
      const baseUrl = window.location.origin;
      const manifestData = {
        "name": "Channels Connect",
        "short_name": "Channels",
        "description": "Get FREE instant bookings for your vacation rental properties",
        "start_url": `${baseUrl}/`,
        "scope": `${baseUrl}/`,
        "display": "standalone",
        "background_color": "#ffffff",
        "theme_color": "#2563eb",
        "orientation": "portrait-primary",
        "icons": [
          {
            "src": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/f50093011_channelsconnectlogo.png",
            "sizes": "192x192",
            "type": "image/png",
            "purpose": "any maskable"
          },
          {
            "src": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/f50093011_channelsconnectlogo.png",
            "sizes": "512x512",
            "type": "image/png",
            "purpose": "any maskable"
          }
        ],
        "categories": ["business", "productivity", "travel"],
        "shortcuts": [
          {
            "name": "Dashboard",
            "short_name": "Dashboard",
            "description": "View your property dashboard",
            "url": `${baseUrl}/Dashboard`,
            "icons": [
              {
                "src": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/f50093011_channelsconnectlogo.png",
                "sizes": "96x96",
                "type": "image/png"
              }
            ]
          }
        ]
      };

      const manifestBlob = new Blob([JSON.stringify(manifestData)], { type: 'application/json' });
      const manifestURL = URL.createObjectURL(manifestBlob);
      
      const existingManifest = document.querySelector('link[rel="manifest"]');
      if (existingManifest) {
        existingManifest.remove();
      }
      
      const manifestLink = document.createElement('link');
      manifestLink.rel = 'manifest';
      manifestLink.href = manifestURL;
      document.head.appendChild(manifestLink);
    };

    // PWA Meta Tags
    const appendMetaTag = (name, content, tagName = 'meta', rel = '') => {
      let element = document.querySelector(`${tagName}[${name ? `name="${name}"` : rel ? `rel="${rel}"` : ''}]`);
      if (!element) {
        element = document.createElement(tagName);
        if (name) element.name = name;
        if (rel) element.rel = rel;
        document.head.appendChild(element);
      }
      if (tagName === 'meta' && content) {
        element.content = content;
      } else if (tagName === 'link' && content) {
        element.href = content;
      }
    };

    appendMetaTag('viewport', 'width=device-width, initial-scale=1, shrink-to-fit=no, user-scalable=no, viewport-fit=cover');
    appendMetaTag('theme-color', '#2563eb');
    appendMetaTag('', 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/f50093011_channelsconnectlogo.png', 'link', 'apple-touch-icon');
    appendMetaTag('mobile-web-app-capable', 'yes');
    appendMetaTag('apple-mobile-web-app-capable', 'yes');
    appendMetaTag('apple-mobile-web-app-status-bar-style', 'black-translucent');
    appendMetaTag('apple-mobile-web-app-title', 'Channels Connect');

    // Create manifest
    createManifest();

    // ── Service Worker: REMOVED ─────────────────────────────────────────────────
    // Blob-URL-based SW registration is blocked by browsers in production
    // (blob: protocol not supported for SW scope) and caused white-screen
    // flicker + fetch-interception bugs. Channels Connect is a Channel Manager,
    // not a PWA — we don't need offline caching.
    //
    // Unregister ALL service workers unconditionally.
    // We are a Channel Manager, not a PWA — no offline caching needed.
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((reg) => reg.unregister());
      });
    }

    // (Blob-based Service Worker removed — see commit b23a10d)

    // --- SEO IMPLEMENTATION ---

    const appendOrUpdateMetaTag = (name, content, property = 'name') => {
      let element = document.querySelector(`meta[${property}='${name}']`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(property, name);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
      return element;
    };
    
    const appendOrUpdateLinkTag = (rel, href) => {
        let element = document.querySelector(`link[rel='${rel}']`);
        if (!element) {
            element = document.createElement('link');
            element.rel = rel;
            document.head.appendChild(element);
        }
        element.href = href;
        return element;
    };

    // Site-wide default meta tags
    appendOrUpdateMetaTag('description', 'Channels Connect is a free, powerful channel manager for vacation rentals. Sync with Airbnb, Booking.com, and Vrbo, manage bookings, and increase revenue with our all-in-one platform.');
    appendOrUpdateMetaTag('keywords', 'channels connect, channel manager, vacation rental software, pms, property management system, airbnb sync, booking.com sync, vrbo sync');
    appendOrUpdateMetaTag('robots', 'index, follow');
    appendOrUpdateMetaTag('author', 'Channels Connect');
    appendOrUpdateLinkTag('canonical', `https://channelsconnect.com${location.pathname}`);

    // Open Graph (for social sharing)
    appendOrUpdateMetaTag('og:site_name', 'Channels Connect', 'property');
    appendOrUpdateMetaTag('og:type', 'website', 'property');
    appendOrUpdateMetaTag('og:url', `https://channelsconnect.com${location.pathname}`, 'property');
    appendOrUpdateMetaTag('og:title', 'Channels Connect | Free Channel Manager for Vacation Rentals', 'property');
    appendOrUpdateMetaTag('og:description', 'The only completely FREE distribution platform that generates instant bookings with immediate guest payment. Works with ANY PMS system.', 'property');
    appendOrUpdateMetaTag('og:image', 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/og-image-channels-connect.png', 'property');

    // Twitter Card
    appendOrUpdateMetaTag('twitter:card', 'summary_large_image');
    appendOrUpdateMetaTag('twitter:url', `https://channelsconnect.com${location.pathname}`);
    appendOrUpdateMetaTag('twitter:title', 'Channels Connect | Free Channel Manager for Vacation Rentals');
    appendOrUpdateMetaTag('twitter:description', 'Generate instant bookings for your vacation rentals with Channels Connect – completely free, with immediate guest payments.');
    appendOrUpdateMetaTag('twitter:image', 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/og-image-channels-connect.png');
    
    // Google Analytics 4 (Replace with your Measurement ID)
    const gaId = 'YOUR_GA_MEASUREMENT_ID';
    if (gaId && gaId !== 'YOUR_GA_MEASUREMENT_ID' && !document.querySelector(`#ga-script-${gaId}`)) {
        const script = document.createElement('script');
        script.id = `ga-script-${gaId}`;
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
        document.head.appendChild(script);

        const inlineScript = document.createElement('script');
        inlineScript.id = `ga-inline-script-${gaId}`;
        inlineScript.innerHTML = `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('config', '${gaId}');
        `;
        document.head.appendChild(inlineScript);
    }
    
    // Get user location for translation feature
    // Location detection removed

    return () => {
      // You could remove tags here if needed, but for a persistent layout, it's fine
    };

  }, [location]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  // Dynamic Conversion Tracking
  const trackChatEvent = (eventType, data = {}) => {
    // Google Analytics 4 tracking
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', eventType, {
        'event_category': 'chatbot',
        'event_label': 'assistant_interaction',
        'custom_parameters': data
      });
    }
    
    // Console logging for development
    console.log('Chat Event:', eventType, data);
  };

  // Personalized PMS Detection
  const detectPMSMention = (message) => {
    const pmsResponses = {
      'guesty': 'Perfect! Guesty users typically save $2.40+ per unit monthly with us - that adds up to thousands yearly! 🎯',
      'siteminder': 'Great choice with Siteminder! While they charge $50+ monthly plus setup fees, we add bookings completely free! 🆓',
      'rentals united': 'Rentals United is solid for distribution - we just add MORE bookings with zero commissions!💰',
      'hostfully': 'Hostfully handles operations perfectly - we simply generate additional bookings in your existing workflow!📈',
      'ownerrez': 'OwnerRez is excellent for management - we just add free instant bookings to boost your revenue! 🚀'
    };
    
    const lowerMessage = message.toLowerCase();
    for (const [pms, response] of Object.entries(pmsResponses)) {
      if (lowerMessage.includes(pms)) {
        return response;
      }
    }
    return null;
  };

  // Smart Follow-Up Sequences
  useEffect(() => {
    if (messages.length === 3 && userEngagementLevel === 'new' && !followUpsSent.has('engaged')) {
      setUserEngagementLevel('engaged');
      setTimeout(() => {
        const followUp = { 
          type: 'bot', 
          text: "I can see you're interested! Want a quick 2-minute demo showing exactly how we integrate with your PMS? 🎯" 
        };
        setMessages(prev => [...prev, followUp]);
        setChatHistory(prev => [...prev, { role: 'assistant', content: followUp.text }]);
        setFollowUpsSent(prev => new Set([...prev, 'engaged']));
        trackChatEvent('smart_followup_sent', { type: 'engagement_demo' });
      }, 8000);
    }
    
    // High-value follow-up for engaged users
    if (messages.length === 5 && !hasSeenDemo && !followUpsSent.has('value')) {
      setTimeout(() => {
        const valueFollowUp = { 
          type: 'bot', 
          text: "Quick question - how much are you currently paying monthly for your PMS or channel management? Most save $50-200+ monthly with us! 💰" 
        };
        setMessages(prev => [...prev, valueFollowUp]);
        setChatHistory(prev => [...prev, { role: 'assistant', content: valueFollowUp.text }]);
        setHasSeenDemo(true);
        setFollowUpsSent(prev => new Set([...prev, 'value']));
        trackChatEvent('smart_followup_sent', { type: 'value_proposition' });
      }, 10000);
    }
  }, [messages.length, userEngagementLevel, hasSeenDemo, followUpsSent]);

  // Smart trigger logic for live chat offers
  const shouldOfferLiveChat = (messages, userMessage) => {
    // Don't trigger if already shown or if live chat is already requested
    if (showLiveChatOption || liveChatRequested) {
      return false;
    }

    const highIntentKeywords = [
      'speak to someone', 'talk to human', 'real person', 'live chat', 'call me',
      'demo', 'pricing details', 'custom solution', 'integration help', 'technical',
      'enterprise', 'implementation', 'onboarding', 'contract', 'setup', 'sales',
      'consultant', 'specialist', 'help me', 'support'
    ];
    
    const pmsKeywords = ['guesty', 'siteminder', 'rentals united', 'hostfully', 'ownerrez'];
    
    const recentMessages = messages.slice(-3).map(m => m.text.toLowerCase());
    const currentMessage = userMessage.toLowerCase();
    
    // High-intent keyword detection
    const hasHighIntent = highIntentKeywords.some(keyword => 
      currentMessage.includes(keyword) || 
      recentMessages.some(msg => msg.includes(keyword))
    );
    
    // PMS-specific inquiries indicate serious users
    const hasPMSInterest = pmsKeywords.some(pms => 
      currentMessage.includes(pms) || 
      recentMessages.some(msg => msg.includes(pms))
    );
    
    // Engagement-based triggering (4+ messages indicates genuine interest)
    const isHighlyEngaged = messages.length >= 4;
    
    // Repeated questions suggest need for human help
    const hasRepeatedQuestions = messages.filter(m => m.text.includes('?')).length >= 2;
    
    return hasHighIntent || hasPMSInterest || (isHighlyEngaged && hasRepeatedQuestions);
  };

  // Proactive engagement logic
  useEffect(() => {
    if (isChatbotOpen && messages.length === 1) {
      const timer = setTimeout(() => {
        const proactiveMsg = { 
          type: 'bot', 
          text: "Quick question - are you currently paying monthly fees to your PMS or channel manager? I can show you how to get additional bookings for free! 💰" 
        };
        setMessages(prev => [...prev, proactiveMsg]);
        setChatHistory(prev => [...prev, { role: 'assistant', content: proactiveMsg.text }]);
        trackChatEvent('proactive_engagement', { timing: '15_seconds' });
      }, 15000); // 15 seconds after opening
      
      return () => clearTimeout(timer);
    }
  }, [isChatbotOpen, messages.length]);

  const toggleChatbot = () => {
    if (!isChatbotOpen && messages.length === 0) {
      const welcomeText = "Hi! I'm the Channels Connect Assistant 🚀 I help property owners get FREE instant bookings with no fees or commissions. How can I help you today?";
      const welcomeMsg = { type: 'bot', text: welcomeText };
      const welcomeHistory = { role: 'assistant', content: welcomeText };
      
      setMessages([welcomeMsg]);
      setChatHistory([welcomeHistory]);
      trackChatEvent('chatbot_opened', { first_time: true });
    } else if (!isChatbotOpen) {
      trackChatEvent('chatbot_reopened', { message_count: messages.length });
    }
    setIsChatbotOpen(!isChatbotOpen);
  };

  const generateBotReply = async (history) => {
    const lastUserMessage = history[history.length - 1]?.content || '';
    
    // Check for PMS mention first
    const pmsResponse = detectPMSMention(lastUserMessage);
    if (pmsResponse) {
      trackChatEvent('pms_detection', { pms_mentioned: lastUserMessage.toLowerCase() });
      return pmsResponse;
    }

    // Detect user intent for personalized responses
    let responseContext = '';
    if (lastUserMessage.toLowerCase().includes('price') || lastUserMessage.toLowerCase().includes('cost') || lastUserMessage.toLowerCase().includes('fee')) {
      responseContext = 'PRICING_INQUIRY';
    } else if (lastUserMessage.toLowerCase().includes('guesty') || lastUserMessage.toLowerCase().includes('siteminder') || lastUserMessage.toLowerCase().includes('rentals united')) {
      responseContext = 'INTEGRATION_INQUIRY';
    } else if (lastUserMessage.toLowerCase().includes('how') || lastUserMessage.toLowerCase().includes('work')) {
      responseContext = 'FUNCTIONALITY_INQUIRY';
    } else if (lastUserMessage.toLowerCase().includes('better') || lastUserMessage.toLowerCase().includes('different')) {
      responseContext = 'COMPARISON_INQUIRY';
    }

    const historyString = history.map(msg => 
      `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
    ).join('\n');

    const optimizedPrompt = `
      You are the Channels Connect AI Assistant. Your mission is to be helpful, professional, and subtly persuasive while guiding users toward understanding our unique value and encouraging signup.

      CORE RESPONSE PRINCIPLES:
      1. Keep responses to 1-2 sentences maximum (strictly enforced)
      2. Always emphasize we're completely FREE (our biggest competitive advantage)
      3. Highlight how we work WITH existing PMS systems (Guesty, Siteminder, Rentals United)
      4. Create subtle urgency without being pushy
      5. Include soft call-to-action when appropriate
      6. Use specific numbers and comparisons when relevant

      RESPONSE CONTEXT: ${responseContext}

      KNOWLEDGE BASE:
      ${enhancedKnowledgeBase}

      CONVERSATION HISTORY:
      ${historyString}

      RESPONSE GUIDELINES BY CONTEXT:
      - PRICING_INQUIRY: Emphasize we're 100% free vs. competitor costs
      - INTEGRATION_INQUIRY: Highlight seamless integration with their specific PMS
      - FUNCTIONALITY_INQUIRY: Explain how we enhance their existing workflow
      - COMPARISON_INQUIRY: Position advantages over competitors
      - DEFAULT: Focus on free instant bookings and immediate value

      Generate a compelling 1-2 sentence response that moves the user closer to understanding our value:
    `;

    try {
      const answer = await InvokeLLM({ prompt: optimizedPrompt });
      
      // Ensure response length compliance
      if (answer) {
        const sentences = answer.split('. ').filter(s => s.trim() !== '');
        if (sentences.length > 2) {
          return sentences.slice(0, 2).join('. ') + '.';
        }
      }
      
      return answer || "We're the only FREE platform generating instant bookings with immediate payment. Ready to see how we compare to expensive alternatives?";
    } catch (error) {
      console.error('Error generating bot reply:', error);
      return "We're completely FREE and work seamlessly with your existing PMS. Want to see how much you'd save compared to Guesty or Siteminder?";
    }
  };

  const handleSendMessage = async () => {
    const text = inputValue.trim();
    if (!text) return;

    const userMsg = { type: 'user', text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputValue('');

    const updatedHistory = [...chatHistory, { role: "user", content: text }];
    setChatHistory(updatedHistory);

    // Track message sending
    trackChatEvent('chat_message_sent', {
      'message_count': newMessages.length,
      'engagement_level': userEngagementLevel,
      'user_message_length': text.length
    });

    // Smart live chat triggering - only trigger once
    if (shouldOfferLiveChat(newMessages, text)) {
      setShowLiveChatOption(true);
      setUserEngagementLevel('high-intent');
      trackChatEvent('live_chat_triggered', { 
        trigger_reason: 'high_intent_detected',
        message_count: newMessages.length 
      });
    }

    setIsTyping(true);
    
    try {
      const botReply = await generateBotReply(updatedHistory);
      const botMsg = { type: 'bot', text: botReply };
      setMessages(prev => [...prev, botMsg]);
      setChatHistory(prev => [...prev, { role: "assistant", content: botReply }]);
    } catch (error) {
      const errorMsg = { 
        type: 'bot', 
        text: "I'm having trouble right now. Would you like to speak with one of our specialists instead?" 
      };
      setMessages(prev => [...prev, errorMsg]);
      if (!showLiveChatOption && !liveChatRequested) {
        setShowLiveChatOption(true);
      }
    } finally {
      setIsTyping(false);
    }
  };

  const handleLiveChatRequest = () => {
    setLiveChatRequested(true);
    setShowLiveChatOption(false);
    const liveChatMsg = { 
      type: 'bot', 
      text: "Perfect! Let me connect you with our team. Please fill out your details below and we'll reach out within 15 minutes! 🚀" 
    };
    setMessages(prev => [...prev, liveChatMsg]);
    trackChatEvent('live_chat_requested', { 
      conversation_length: messages.length,
      engagement_level: userEngagementLevel 
    });
  };

  const handleCustomLiveChat = async (contactData) => {
    setIsSubmitting(true);
    
    try {
      // Simulate API call to team notification system
      const historyContext = chatHistory.map(msg => 
        `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
      ).join('\n');

      // In a real implementation, you would call your backend API here
      // await fetch('/api/live-chat-request', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     ...contactData,
      //     chatHistory: historyContext,
      //     engagementLevel: userEngagementLevel,
      //     timestamp: new Date().toISOString(),
      //     source: 'Channels Connect Chatbot'
      //   })
      // });

      // For now, simulate success
      setTimeout(() => {
        const successMsg = { 
          type: 'bot', 
          text: `Thanks ${contactData.name}! Our team will contact you within 15 minutes. Check your email for confirmation! ✅` 
        };
        setMessages(prev => [...prev, successMsg]);
        setLiveChatRequested(false);
        setIsSubmitting(false);
        
        // Track successful lead capture
        trackChatEvent('lead_captured', {
          name: contactData.name,
          urgency: contactData.urgency,
          conversation_length: messages.length,
          engagement_level: userEngagementLevel
        });
        
        // Reset form
        setContactInfo({ name: '', email: '', phone: '', urgency: 'normal' });
      }, 2000);

    } catch (error) {
      console.error('Error processing live chat request:', error);
      setIsSubmitting(false);
    }
  };

  const handleContactSubmit = (e) => {
    e.preventDefault();
    handleCustomLiveChat(contactInfo);
  };

  // Enhanced Quick Actions with Conversion Focus
  const handleQuickAction = (query) => {
    const userMsg = { type: 'user', text: query };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    
    const updatedHistory = [...chatHistory, { role: "user", content: query }];
    setChatHistory(updatedHistory);
    
    // Track quick action usage
    trackChatEvent('quick_action_used', { action: query });
    
    // Generate response
    setIsTyping(true);
    generateBotReply(updatedHistory).then(botReply => {
      const botMsg = { type: 'bot', text: botReply };
      setMessages(prev => [...prev, botMsg]);
      setChatHistory(prev => [...prev, { role: "assistant", content: botReply }]);
      setIsTyping(false);
    });
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      handleSendMessage();
    }
  };

  // Track CTA clicks
  const handleCTAClick = (ctaType) => {
    trackChatEvent('chat_cta_clicked', {
      'cta_type': ctaType,
      'conversation_length': messages.length
    });
    window.open('#contact-form', '_self');
  };

  // Live Chat Offer Component
  const LiveChatOffer = () => (
    <div style={{
      background: 'linear-gradient(135deg, #10b981, #059669)',
      color: 'white',
      padding: '16px',
      borderRadius: '12px',
      margin: '12px 0',
      textAlign: 'center',
      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
      animation: 'slideIn 0.3s ease-out'
    }}>
      <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
        🎯 Ready to speak with a specialist?
      </div>
      <div style={{ fontSize: '13px', marginBottom: '12px', opacity: '0.9' }}>
        Get personalized help with your PMS integration and see exactly how much you'll save
      </div>
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
        <button
          onClick={handleLiveChatRequest}
          style={{
            background: 'white',
            color: '#059669',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
          onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
        >
          Connect Now! 📞
        </button>
        <button
          onClick={() => setShowLiveChatOption(false)}
          style={{
            background: 'rgba(255,255,255,0.2)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '8px',
            padding: '8px 16px',
            fontSize: '13px',
            cursor: 'pointer'
          }}
        >
          Continue with Assistant
        </button>
      </div>
    </div>
  );

  // Quick Contact Form Component
  const QuickContactForm = () => (
    <div style={{ 
      padding: '16px', 
      background: '#f8fafc', 
      borderRadius: '12px', 
      margin: '12px 0',
      border: '1px solid #e2e8f0'
    }}>
      <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#1e293b' }}>
        🚀 Connect with our team instantly
      </div>
      <form onSubmit={handleContactSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <input
          type="text"
          placeholder="Your Name"
          value={contactInfo.name}
          onChange={(e) => setContactInfo(prev => ({ ...prev, name: e.target.value }))}
          style={{ 
            padding: '10px', 
            borderRadius: '6px', 
            border: '1px solid #cbd5e1',
            fontSize: '14px'
          }}
          required
        />
        <input
          type="email"
          placeholder="Email Address"
          value={contactInfo.email}
          onChange={(e) => setContactInfo(prev => ({ ...prev, email: e.target.value }))}
          style={{ 
            padding: '10px', 
            borderRadius: '6px', 
            border: '1px solid #cbd5e1',
            fontSize: '14px'
          }}
          required
        />
        <input
          type="tel"
          placeholder="Phone Number (for immediate callback)"
          value={contactInfo.phone}
          onChange={(e) => setContactInfo(prev => ({ ...prev, phone: e.target.value }))}
          style={{ 
            padding: '10px', 
            borderRadius: '6px', 
            border: '1px solid #cbd5e1',
            fontSize: '14px'
          }}
        />
        <select
          value={contactInfo.urgency}
          onChange={(e) => setContactInfo(prev => ({ ...prev, urgency: e.target.value }))}
          style={{ 
            padding: '10px', 
            borderRadius: '6px', 
            border: '1px solid #cbd5e1',
            fontSize: '14px'
          }}
        >
          <option value="normal">Normal Priority</option>
          <option value="high">High Priority - Call ASAP</option>
          <option value="demo">Schedule Demo</option>
        </select>
        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            background: isSubmitting ? '#94a3b8' : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '12px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          {isSubmitting ? 'Connecting...' : 'Connect Me Now! 🚀'}
        </button>
      </form>
    </div>
  );

  // Enhanced Quick Actions Component
  const ConversionQuickActions = () => {
    const quickActions = [
      { text: 'Why Free? 🆓', query: 'Why is Channels Connect completely free?' },
      { text: 'vs Guesty 📊', query: 'How do you compare to Guesty?' },
      { text: 'Integration 🔗', query: 'How does integration work with my PMS?' },
      { text: 'Demo 🎯', query: 'Can I see a quick demo?' }
    ];

    return (
      <div className="quick-actions">
        {quickActions.map((action, index) => (
          <button
            key={index}
            onClick={() => handleQuickAction(action.query)}
            className="quick-action-btn"
          >
            {action.text}
          </button>
        ))}
      </div>
    );
  };

  const isAppPage = ['Dashboard', 'ImportListings', 'Listings', 'ImageManager', 'ListingDetail', 'SelectPMSListings', 'ChannelsDashboard', 'Agent', 'Settings', "FinancialReports"].includes(currentPageName);
  
  // Auth pages should render without Layout wrapper (no header/footer)
  const isAuthPage = ['Login', 'ForgotPassword', 'ResetPassword', 'VerifyEmail'].includes(currentPageName);

  // Auth pages - render without any layout wrapper
  if (isAuthPage) {
    return (
      <>
        {children}
        <PWAInstaller />
      </>
    );
  }

  if (isAppPage) {
    return (
      <>
        <main>{children}</main>
        <PWAInstaller />
      </>
    );
  }

  return (
    <div className="bg-white">
       <style>
        {`
          :root {
            --primary: 15 23 42;
            --primary-foreground: 248 250 252;
            --secondary: 30 41 59;
            --accent: 59 130 246;
            --gold: 251 191 36;
            --muted: 248 250 252;
            --border: 226 232 240;
          }
          
          /* Aggressively hide base44 button */
          .base44-button, [data-base44-button], .base44-chat-button {
            display: none !important;
          }

          /* Hide number input spinners that consume space */
          input[type="number"]::-webkit-outer-spin-button,
          input[type="number"]::-webkit-inner-spin-button {
            -webkit-appearance: none !important;
            margin: 0 !important;
          }

          input[type="number"] {
            -moz-appearance: textfield !important;
          }

          /* Force calendar input visibility */
          .calendar-price-input,
          input[type="number"] {
            background-color: #ffffff !important;
            color: #000000 !important;
            font-size: 18px !important;
            font-weight: 700 !important;
            border: 2px solid #3b82f6 !important;
            text-align: left !important;
          }

          /* Ensure focus states are visible */
          input[type="number"]:focus {
            outline: none !important;
            border-color: #1d4ed8 !important;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3) !important;
          }

          /* CRITICAL FIX FOR BOTTOM TEXT OVERLAPPING */
          
          /* Ensure main content has proper bottom padding */
          main, .main-content, [role="main"] {
            padding-bottom: 120px !important;
            margin-bottom: 40px !important;
            min-height: calc(100vh - 200px) !important;
          }
          
          /* Fix app layout bottom spacing */
          .app-layout, .dashboard-layout {
            padding-bottom: 100px !important;
          }
          
          /* Fix footer and bottom elements positioning */
          footer, .footer {
            position: relative !important;
            margin-top: 60px !important;
            padding: 40px 16px !important;
            clear: both !important;
          }
          
          /* Fix bottom navigation or action bars */
          .bottom-nav, .action-bar, .fixed-bottom {
            position: fixed !important;
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            z-index: 1000 !important;
            background: white !important;
            border-top: 1px solid #e5e7eb !important;
            padding: 16px !important;
            box-shadow: 0 -2px 10px rgba(0,0,0,0.1) !important;
          }
          
          /* Fix sticky elements at bottom */
          .sticky-bottom {
            position: sticky !important;
            bottom: 20px !important;
            margin-top: 40px !important;
            z-index: 100 !important;
          }
          
          /* Fix dashboard content container */
          .dashboard-content, .page-content {
            padding-bottom: 80px !important;
            margin-bottom: 40px !important;
          }
          
          /* Fix tab content bottom spacing */
          .tabs-content, [role="tabpanel"] {
            padding-bottom: 60px !important;
            margin-bottom: 20px !important;
          }
          
          /* Fix card stacking at bottom */
          .card:last-child, .Card:last-child {
            margin-bottom: 40px !important;
          }
          
          /* Fix form bottom spacing */
          form {
            padding-bottom: 40px !important;
            margin-bottom: 20px !important;
          }
          
          /* Fix button groups at bottom */
          .button-group:last-child, .action-buttons:last-child {
            margin-bottom: 40px !important;
            padding-bottom: 20px !important;
          }
          
          /* Fix table bottom spacing */
          table {
            margin-bottom: 40px !important;
          }
          
          /* Fix modal and dialog bottom spacing */
          .modal-content, .dialog-content {
            padding-bottom: 30px !important;
          }
          
          /* Fix mobile bottom spacing */
          @media (max-width: 768px) {
            main, .main-content {
              padding-bottom: 140px !important;
            }
            
            .dashboard-content, .page-content {
              padding-bottom: 100px !important;
            }
            
            footer, .footer {
              margin-top: 80px !important;
              padding: 30px 16px !important;
            }
          }
          
          /* Fix specific app pages bottom spacing */
          .dashboard-page, .listings-page, .channels-page {
            padding-bottom: 100px !important;
          }
          
          /* Fix calendar view bottom spacing */
          .calendar-container, .calendar-view {
            margin-bottom: 60px !important;
            padding-bottom: 40px !important;
          }
          
          /* Fix settings and form pages */
          .settings-page, .form-page {
            padding-bottom: 80px !important;
          }
          
          /* Fix image manager bottom spacing */
          .image-manager, .photo-manager {
            padding-bottom: 60px !important;
          }
          
          /* Fix pricing tools bottom spacing */
          .pricing-tools, .analytics-section {
            margin-bottom: 50px !important;
            padding-bottom: 30px !important;
          }
          
          /* GENERAL TEXT OVERLAP FIXES */
          
          /* Ensure proper line height and spacing for all text */
          * {
            line-height: 1.5 !important;
          }
          
          /* Fix overlapping in cards and components */
          .card, .Card, [class*="card"] {
            padding: 16px !important;
            margin-bottom: 16px !important;
          }
          
          /* Fix text in dashboard stats */
          .text-sm, .text-xs {
            margin-bottom: 4px !important;
            line-height: 1.4 !important;
          }
          
          .text-lg, .text-xl, .text-2xl {
            margin-bottom: 8px !important;
            line-height: 1.3 !important;
          }
          
          /* Fix button text overlapping */
          button, .button, .btn {
            padding: 8px 16px !important;
            line-height: 1.2 !important;
            white-space: nowrap !important;
          }
          
          /* Fix form input spacing */
          input, textarea, select {
            margin-bottom: 8px !important;
            padding: 8px 12px !important;
            line-height: 1.4 !important;
          }
          
          /* Fix dashboard grid spacing */
          .grid {
            gap: 16px !important;
          }
          
          /* Fix navigation menu spacing */
          nav a, .nav-link {
            padding: 8px 12px !important;
            margin-bottom: 4px !important;
            line-height: 1.3 !important;
          }
          
          /* Fix sidebar text */
          .sidebar, [class*="sidebar"] {
            padding: 16px !important;
          }
          
          .sidebar a, .sidebar button {
            margin-bottom: 8px !important;
            padding: 8px 12px !important;
          }
          
          /* Fix modal and dialog text */
          .modal, .dialog, [role="dialog"] {
            padding: 24px !important;
            line-height: 1.5 !important;
          }
          
          /* Fix table text overlapping */
          table td, table th {
            padding: 8px 12px !important;
            line-height: 1.4 !important;
            vertical-align: top !important;
          }
          
          /* Fix badge and tag overlapping */
          .badge, .tag, [class*="badge"] {
            padding: 4px 8px !important;
            margin: 2px !important;
            line-height: 1.2 !important;
            display: inline-block !important;
          }
          
          /* Fix calendar cell text */
          .calendar-cell, [class*="calendar"] td {
            padding: 4px !important;
            line-height: 1.2 !important;
            text-align: center !important;
          }
          
          /* Fix dropdown menu text */
          .dropdown-menu, .select-content, [role="menu"] {
            padding: 8px 0 !important;
          }
          
          .dropdown-item, .select-item, [role="menuitem"] {
            padding: 6px 12px !important;
            line-height: 1.3 !important;
          }
          
          /* Fix action button spacing */
          .action-buttons, .button-group {
            gap: 8px !important;
            margin: 8px 0 !important;
          }
          
          /* Fix property selector and form controls */
          .property-selector, .form-control {
            margin-bottom: 12px !important;
            padding: 8px 12px !important;
          }
          
          /* Fix analytics bar text */
          .analytics-bar, .metrics-bar {
            padding: 12px !important;
            margin: 8px 0 !important;
          }
          
          .analytics-bar span, .metric-item {
            margin-right: 16px !important;
            line-height: 1.3 !important;
          }
          
          /* Fix pricing controls */
          .pricing-controls-row {
            padding: 12px 0 !important;
            gap: 16px !important;
          }
          
          .slider-group label {
            margin-bottom: 4px !important;
            line-height: 1.2 !important;
          }

          /* Live chat animations */
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          /* Chatbot FAB with Brand Logo */
          #chatbot-fab {
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 60px;
            height: 60px;
            background: linear-gradient(135deg, #2563eb, #1d4ed8);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 20px rgba(37, 99, 235, 0.4);
            cursor: pointer;
            transition: all 0.3s ease;
            z-index: 9998;
            overflow: hidden;
            border: 3px solid white;
            padding: 5px;
          }
          #chatbot-fab img {
            width: 100%;
            height: 100%;
            object-fit: contain;
          }
          #chatbot-fab:hover {
            transform: scale(1.1);
            box-shadow: 0 6px 25px rgba(37, 99, 235, 0.6);
          }
          #chatbot-fab::before {
            content: '';
            position: absolute;
            top: -2px;
            left: -2px;
            right: -2px;
            bottom: -2px;
            background: linear-gradient(45deg, #2563eb, #1d4ed8, #2563eb);
            border-radius: 50%;
            z-index: -1;
            animation: pulse 2s infinite;
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
          }

          /* Main Chat Window */
          #chatbot-container {
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 350px;
            height: 500px;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            border-radius: 12px;
            box-shadow: 0 5px 25px rgba(0,0,0,0.2);
            overflow: hidden;
            background: #f8fafc;
            transition: all 0.3s ease;
          }
          #chatbot-container.hidden {
            transform: scale(0);
            opacity: 0;
            pointer-events: none;
            transform-origin: bottom right;
          }

          /* Chat Header with Assistant Info */
          #chatbot-header {
            background: white;
            padding: 12px 16px;
            border-bottom: 1px solid #e2e8f0;
            font-weight: 600;
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-shrink: 0;
          }
          .header-info { 
            display: flex; 
            align-items: center; 
            gap: 10px; 
          }
          /* Chat Header Avatar - Enhanced */
          .header-info .avatar { 
            width: 40px; 
            height: 40px; 
            border-radius: 50%;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid #e2e8f0;
            background: white;
          }
          .header-info .avatar img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
          .close-btn { 
            cursor: pointer; 
            color: #64748b; 
            transition: color 0.2s;
          }
          .close-btn:hover { 
            color: #1e293b; 
          }

          /* Messages Area */
          #chatbot-messages {
            flex: 1;
            padding: 16px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
          .message-row { 
            display: flex; 
            align-items: flex-end; 
            gap: 8px; 
            max-width: 90%; 
          }
          .bot-row { 
            align-self: flex-start; 
          }
          .user-row { 
            align-self: flex-end; 
            flex-direction: row-reverse;
          }
          /* Chat Avatar in Messages - Enhanced */
          .chat-avatar { 
            width: 32px; 
            height: 32px; 
            border-radius: 50%; 
            flex-shrink: 0;
            overflow: hidden;
            border: 1px solid #e2e8f0;
            background: white;
          }
          .chat-avatar img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
          .message-bubble { 
            padding: 10px 14px; 
            border-radius: 18px; 
            line-height: 1.5; 
            font-size: 0.95em;
            max-width: 240px;
            word-wrap: break-word;
          }
          .bot-bubble { 
            background-color: #ffffff; 
            border: 1px solid #e2e8f0; 
            color: #1e293b; 
            border-bottom-left-radius: 4px; 
          }
          .user-bubble { 
            background-color: #2563eb; 
            color: white; 
            border-bottom-right-radius: 4px; 
          }
          
          /* Typing Indicator */
          .typing-indicator { 
            display: flex;
            align-items: center;
            gap: 4px;
            padding: 10px 14px;
            background-color: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 18px;
            border-bottom-left-radius: 4px;
          }
          .typing-indicator span { 
            display: inline-block; 
            width: 6px; 
            height: 6px; 
            border-radius: 50%; 
            background-color: #94a3b8; 
            animation: typing-bounce 1.4s infinite; 
          }
          .typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
          .typing-indicator span:nth-child(3) { animation-delay: 0.4s; }
          @keyframes typing-bounce { 
            0%, 60%, 100% { transform: translateY(0); } 
            30% { transform: translateY(-3px); } 
          }

          /* Enhanced CTA button hover effects */
          .cta-button {
            background: linear-gradient(135deg, #2563eb, #1d4ed8) !important;
            color: white !important;
            border: none !important;
            border-radius: 16px !important;
            padding: 8px 16px !important;
            font-size: 13px !important;
            font-weight: 600 !important;
            cursor: pointer !important;
            box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3) !important;
            transition: all 0.2s ease !important;
          }

          .cta-button:hover {
            transform: scale(1.05) !important;
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4) !important;
          }

          /* Quick actions styling */
          .quick-actions {
            display: flex;
            gap: 6px;
            padding: 8px 12px;
            border-top: 1px solid #e2e8f0;
            background-color: #f8fafc;
            flex-wrap: wrap;
          }

          .quick-action-btn {
            background: #f1f5f9;
            border: 1px solid #cbd5e1;
            border-radius: 12px;
            padding: 4px 8px;
            font-size: 11px;
            cursor: pointer;
            transition: all 0.2s ease;
            white-space: nowrap;
          }

          .quick-action-btn:hover {
            background: #e2e8f0;
            transform: translateY(-1px);
          }

          /* Input Area */
          #chatbot-input-container { 
            padding: 12px; 
            border-top: 1px solid #e2e8f0; 
            background: white; 
            flex-shrink: 0; 
          }
          #chatbot-input { 
            border: 1px solid #cbd5e1; 
            padding: 10px 14px; 
            font-size: 0.9em; 
            outline: none; 
            box-sizing: border-box; 
            width: 100%; 
            border-radius: 18px; 
            transition: border-color 0.2s; 
          }
          #chatbot-input:focus { 
            border-color: #2563eb; 
          }
        `}
      </style>
      <MarketingHeader />
      <main className="pt-16">
        {children}
      </main>
      <MarketingFooter />
      <PWAInstaller />

      {/* ── Contact FAB (Call Us / WhatsApp) ── */}
      <ContactFAB />

      {/* Chatbot UI with Channels Connect Branding */}
      <div id="chatbot-fab" onClick={toggleChatbot} style={{ display: isChatbotOpen ? 'none' : 'flex' }}>
        <img 
          src={assistantAvatarUrl} 
          alt="Channels Connect AI Assistant" 
        />
      </div>

      <div id="chatbot-container" className={!isChatbotOpen ? 'hidden' : ''}>
        <div id="chatbot-header">
          <div className="header-info">
            <div className="avatar p-1">
              <img src={assistantAvatarUrl} alt="Channels Connect" className="object-contain"/>
            </div>
            <div>
              <div className="font-bold text-slate-800">Channels Connect</div>
              <div className="text-xs text-slate-500">AI Assistant</div>
            </div>
          </div>
          <X className="close-btn" onClick={toggleChatbot} />
        </div>
        <div id="chatbot-messages">
          {messages.map((msg, index) => (
            <div key={index}>
              <div className={`message-row ${msg.type === 'user' ? 'user-row' : 'bot-row'}`}>
                {msg.type === 'bot' && (
                  <div className="chat-avatar p-1">
                    <img src={assistantAvatarUrl} alt="Assistant" className="object-contain" />
                  </div>
                )}
                <div className={`message-bubble ${msg.type === 'user' ? 'user-bubble' : 'bot-bubble'}`}>
                  {msg.text}
                </div>
              </div>
              {/* Add conversion-focused CTA button after bot messages */}
              {msg.type === 'bot' && index > 0 && (
                <div style={{ marginTop: '8px', textAlign: 'center' }}>
                  <button
                    className="cta-button"
                    onClick={() => handleCTAClick('start_free')}
                    onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
                    onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                  >
                    Start Free Today 🚀
                  </button>
                </div>
              )}
            </div>
          ))}
          
          {/* Smart live chat offer */}
          {showLiveChatOption && !liveChatRequested && <LiveChatOffer />}
          
          {/* Contact form when live chat is requested */}
          {liveChatRequested && <QuickContactForm />}
          
          {isTyping && (
            <div className="message-row bot-row">
              <div className="chat-avatar p-1">
                <img src={assistantAvatarUrl} alt="Assistant" className="object-contain" />
              </div>
              <div className="typing-indicator">
                <span></span><span></span><span></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        {/* Enhanced Quick Action Buttons */}
        <ConversionQuickActions />
        
        <div id="chatbot-input-container">
          <input
            type="text"
            id="chatbot-input"
            placeholder="Type your question..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
      </div>
    </div>
  );
}

