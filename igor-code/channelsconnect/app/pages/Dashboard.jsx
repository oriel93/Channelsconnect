
import React, { useState, useEffect, useCallback, useRef } from 'react';
import NewLoginRequired from '../components/auth/NewLoginRequired';
import AppLayout from '../components/app/AppLayout';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import {
  DollarSign,
  TrendingUp,
  Calendar as CalendarIcon,
  Shield,
  Eye,
  Network,
  RefreshCw,
  AlertCircle,
  Loader2,
  ImageIcon,
  Building2,
  CalendarDays,
  Upload,
  X,
  Send,
  ClipboardList
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import StatCard from '../components/dashboard/StatCard';
import PropertiesManager from '../components/dashboard/PropertiesManager';
import BookingsManager from '../components/dashboard/BookingsManager';
import CloudinaryImageManager from '../components/dashboard/CloudinaryImageManager';
import PriceLabsIntegration from '../components/pricing/PriceLabsIntegration';
import OptimizedCalendarLayout from '../components/calendar/OptimizedCalendarLayout';
import ICalManager from '../components/calendar/ICalManager';
import { Listing } from '@/api/entities';
import { getDashboardData } from '@/api/functions';
import WelcomeSync from '../components/dashboard/WelcomeSync';

// New imports for AI Assistant
import { agentSDK } from "@/lib/agents";
import MessageBubble from '../components/agent/MessageBubble';

export default function Dashboard() {
  const [dashboardData, setDashboardData] = useState({
    guaranteedRevenue: 0,
    vacantNights: 0,
    activeChannels: 0,
    totalRevenue: 0,
    properties: 0,
    rateGuaranteeActive: false,
    revenueGrowth: 0,
    lastUpdated: null
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [listings, setListings] = useState([]);
  const [selectedListingId, setSelectedListingId] = useState(null);
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState(null);

  // AI Chat Bubble State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);
  const AGENT_NAME = "channels_connect_assistant"; // Renamed from "ai_assistant" to "channels_connect_assistant"

  const fetchDashboardData = useCallback(async () => {
    try {
      const { data } = await getDashboardData({});
      if (data.success) {
        setDashboardData(data);
      } else {
        setError(data.error || 'Failed to load dashboard metrics.');
      }
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
      setError('Failed to load dashboard metrics.');
    }
  }, []);
  
  const fetchListings = useCallback(async () => {
    try {
      const userListings = await Listing.find();
      setListings(userListings || []);
      if (userListings && userListings.length > 0 && !selectedListingId) {
        setSelectedListingId(userListings[0].id);
      }
      return userListings || [];
    } catch (error) {
      console.error("Failed to fetch listings", error);
      setError("Could not load your properties.");
      return [];
    }
  }, [selectedListingId]);

  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      await fetchListings();
      // await fetchDashboardData();
      setIsLoading(false);
    };
    loadInitialData();
  }, [fetchListings, fetchDashboardData]);

  // AI Chat Effects
  useEffect(() => {
    const initConversation = async () => {
      if (!isChatOpen) {
        // When chat closes, reset messages and conversation to allow fresh start next time
        setConversation(null);
        setMessages([]);
        return;
      }
      
      setIsSending(true); // Indicate that AI is loading/initializing
      let conv;
      try {
        const existingConvs = await agentSDK.listConversations({ agent_name: AGENT_NAME });

        if (existingConvs.length > 0) {
          conv = await agentSDK.getConversation(existingConvs[0].id);
        } else {
          conv = await agentSDK.createConversation({
            agent_name: AGENT_NAME,
            metadata: { name: "Property Management Chat" }
          });
        }
        setConversation(conv);
        setMessages(conv.messages || []);
      } catch (err) {
        console.error("Failed to initialize AI conversation:", err);
        setError("Could not load AI Assistant. Please try again.");
      } finally {
        setIsSending(false);
      }
    };
    initConversation();
  }, [isChatOpen]);

  useEffect(() => {
    if (!conversation) return;

    const unsubscribe = agentSDK.subscribeToConversation(conversation.id, (data) => {
      setMessages([...data.messages]);
      if (data.status !== 'running' && data.status !== 'in_progress') {
        setIsSending(false);
      }
    });

    return () => unsubscribe();
  }, [conversation]);
  
  useEffect(() => {
    if (isChatOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isChatOpen]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !conversation) return;
    setIsSending(true);
    
    try {
      await agentSDK.addMessage(conversation, {
        role: "user",
        content: inputValue,
      });
      setInputValue('');
    } catch (err) {
      console.error("Failed to send message:", err);
      setError("Failed to send message. Please try again.");
      setIsSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleManualRefresh = () => {
    fetchDashboardData();
  };

  const handleSyncComplete = async () => {
    setIsLoading(true);
    const updatedListings = await fetchListings();
    if (updatedListings.length > 0) {
       await fetchDashboardData();
    }
    setLastSyncTimestamp(Date.now());
    setIsLoading(false);
  };
  
  // Renamed from onListingSelect to onSelectListing
  const onSelectListing = (id) => { 
    setSelectedListingId(id);
  };

  const selectedListingTitle = listings.find(l => l.id === selectedListingId)?.title || 'Property';

  const refreshButton = (
    <Button variant="outline" size="sm" onClick={handleManualRefresh} disabled={isLoading}>
      {isLoading ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <RefreshCw className="w-4 h-4 mr-2" />
      )}
      Refresh Data
    </Button>
  );

  if (isLoading && listings.length === 0) { // Only show full-screen loader if no listings are loaded yet
    return (
      <NewLoginRequired>
        <AppLayout>
          <div className="flex justify-center items-center h-full">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
          </div>
        </AppLayout>
      </NewLoginRequired>
    );
  }

  // Show welcome/sync screen if no listings are found
  if (listings.length === 0) {
    return (
      <NewLoginRequired>
        <AppLayout headerActions={refreshButton}>
          <WelcomeSync onSyncComplete={handleSyncComplete} />
        </AppLayout>
      </NewLoginRequired>
    );
  }

  // Main dashboard content
  return (
    <NewLoginRequired>
      <AppLayout headerActions={refreshButton}>
        <div className="dashboard-content">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              {dashboardData.lastUpdated && (
                <p className="text-sm text-gray-500 mt-1">
                  Last updated: {new Date(dashboardData.lastUpdated).toLocaleString()}
                </p>
              )}
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Metrics section commented out for now
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard ... />
          </div>
          */}

          <Tabs defaultValue="properties" className="space-y-6">
            <TabsList className="grid grid-cols-3 w-full max-w-xl">
              <TabsTrigger value="properties" className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Properties
              </TabsTrigger>
              <TabsTrigger value="calendar" className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4" />
                Calendar
              </TabsTrigger>
              <TabsTrigger value="bookings" className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4" />
                Bookings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="properties" className="mt-6">
              <Card className="p-0 shadow-lg border-0 bg-gradient-to-br from-blue-50 to-white">
                <PropertiesManager 
                  initialListings={listings}
                  onSelectListing={onSelectListing} 
                  selectedListingId={selectedListingId} 
                  onSyncComplete={handleSyncComplete}
                />
              </Card>
            </TabsContent>

            <TabsContent value="calendar" className="space-y-6 mt-6">
              {selectedListingId ? (
                <div className="space-y-6">
                  <div className="bg-gradient-to-br from-purple-50 to-white rounded-lg shadow-lg">
                    <OptimizedCalendarLayout
                      selectedListingId={selectedListingId}
                      listings={listings}
                      lastSyncTimestamp={lastSyncTimestamp}
                    />
                  </div>
                  {/* <div className="bg-gradient-to-br from-purple-50 to-white rounded-lg shadow-lg">
                    <ICalManager
                      listingId={selectedListingId}
                      listingTitle={selectedListingTitle}
                      onSyncComplete={handleSyncComplete}
                    />
                  </div> */}
                </div>
              ) : (
                <Card className="text-center py-12 text-gray-500 bg-gradient-to-br from-purple-50 to-white shadow-lg">
                  <CalendarDays className="w-12 h-12 mx-auto mb-4 text-purple-400" />
                  <h3 className="text-lg font-medium mb-2 text-purple-700">Select a Property</h3>
                  <p className="text-purple-600">Choose a property from the 'Properties' tab to access the calendar and sync settings.</p>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="bookings" className="mt-6">
              <Card className="p-0 shadow-lg border-0">
                <BookingsManager listingId={selectedListingId} />
              </Card>
            </TabsContent>

          </Tabs>

          {/* AI Chat Bubble - Ava Avatar */}
          {!isChatOpen && (
            <div className="fixed bottom-6 right-6 z-50">
              <Button
                onClick={() => setIsChatOpen(true)}
                size="lg"
                className="rounded-full w-16 h-16 p-0 bg-white hover:bg-gray-50 shadow-lg hover:shadow-xl transition-all duration-300 border-4 border-blue-600"
              >
                <img 
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/bf4faf6cd_ChatGPTImageJul3202504_44_16PM.png" 
                  alt="Ava - AI Assistant" 
                  className="w-full h-full rounded-full object-cover"
                />
              </Button>
            </div>
          )}

          {/* AI Chat Window */}
          {isChatOpen && (
            <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-white rounded-lg shadow-2xl border border-slate-200 flex flex-col z-50">
              {/* Chat Header with Ava */}
              <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-purple-50 rounded-t-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-blue-600">
                    <img 
                      src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/bf4faf6cd_ChatGPTImageJul3202504_44_16PM.png" 
                      alt="Ava" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900">Ava</span>
                    <p className="text-xs text-slate-600">AI Assistant</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsChatOpen(false)}
                  className="text-slate-500 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 && (
                  <div className="text-center text-slate-500 text-sm p-4">
                    <div className="w-12 h-12 rounded-full overflow-hidden mx-auto mb-3 border-2 border-blue-600">
                      <img 
                        src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/bf4faf6cd_ChatGPTImageJul3202504_44_16PM.png" 
                        alt="Ava" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="font-medium text-slate-700">Hi! I'm Ava, your AI assistant.</p>
                    <p className="text-xs text-slate-500 mt-1">Ask me about your properties, bookings, or availability.</p>
                  </div>
                )}
                
                {messages.filter(m => m.role !== 'system').map((message, index) => (
                  <div key={index} className="text-sm">
                    <MessageBubble message={message} />
                  </div>
                ))}
                
                {isSending && (
                  <div className="flex items-center gap-2 text-slate-500 text-sm">
                    <div className="w-6 h-6 rounded-full overflow-hidden">
                      <img 
                        src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/bf4faf6cd_ChatGPTImageJul3202504_44_16PM.png" 
                        alt="Ava" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span>Ava is thinking...</span>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 border-t border-slate-200">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => e.target.value.length <= 250 && setInputValue(e.target.value)} // Restrict input to 250 characters
                    onKeyDown={handleKeyDown}
                    placeholder="Ask Ava about your properties..."
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isSending}
                    maxLength={250} // Add maxLength attribute
                  />
                  <Button
                    onClick={handleSendMessage}
                    size="sm"
                    disabled={isSending || !inputValue.trim()}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isSending ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Send className="w-4 h-4 text-white" />}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </AppLayout>
    </NewLoginRequired>
  );
}
