import React, { useState, useEffect, useRef } from 'react';
import NewLoginRequired from '../components/auth/NewLoginRequired';
import AppLayout from '../components/app/AppLayout';
import { agentSDK } from "@/agents";
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { UploadFile } from '@/api/integrations';
import { toast } from 'sonner';
import { Bot, Send, Paperclip, Loader2, Info } from 'lucide-react';
import MessageBubble from '../components/agent/MessageBubble';

function ChatInput({ onSendMessage, isSending }) {
    const [inputValue, setInputValue] = useState('');
    const fileInputRef = useRef(null);

    const handleSend = async () => {
        if (!inputValue.trim() && !fileInputRef.current?.files?.length) return;
        
        let file_urls = [];
        if (fileInputRef.current?.files?.length) {
            toast.info('Uploading file...');
            try {
                const { file_url } = await UploadFile({ file: fileInputRef.current.files[0] });
                file_urls.push(file_url);
                toast.success('File uploaded!');
            } catch (error) {
                toast.error('File upload failed.');
                return;
            }
        }

        onSendMessage(inputValue, file_urls);
        setInputValue('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="p-4 bg-white border-t border-slate-200">
            <div className="relative">
                <Textarea
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask Ava about your properties, bookings, or availability..."
                    className="pr-20 pl-10"
                    rows={1}
                    disabled={isSending}
                />
                <button
                    onClick={() => fileInputRef.current.click()}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800"
                    disabled={isSending}
                >
                    <Paperclip className="w-5 h-5" />
                </button>
                <input type="file" ref={fileInputRef} className="hidden" />
                <Button
                    onClick={handleSend}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    size="icon"
                    disabled={isSending || (!inputValue.trim() && !fileInputRef.current?.files?.length)}
                >
                    {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
            </div>
        </div>
    );
}

export default function AgentPage() {
    const [conversation, setConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef(null);
    const AGENT_NAME = "channels_connect_assistant";

    useEffect(() => {
        const initConversation = async () => {
            let conv;
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
            setMessages(conv.messages);
        };
        initConversation();
    }, []);

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
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (content, file_urls = []) => {
        if (!conversation) return;
        setIsSending(true);
        
        await agentSDK.addMessage(conversation, {
            role: "user",
            content: content,
            file_urls: file_urls,
        });
    };

    return (
        <NewLoginRequired>
            <AppLayout>
                <div className="flex flex-col h-full">
                    <header className="p-4 border-b border-slate-200">
                        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <Bot className="w-6 h-6 text-blue-600" />
                            AI Assistant
                        </h1>
                        <p className="text-sm text-slate-500">Your expert on all your property data.</p>
                    </header>
                    
                    <div className="flex-1 overflow-y-auto p-4">
                        <Card className="max-w-2xl mx-auto mb-4 bg-blue-50 border-blue-200">
                            <CardContent className="p-4 text-sm text-blue-800 flex items-start gap-3">
                                <Info className="w-5 h-5 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="font-semibold">Welcome to your AI Assistant!</p>
                                    <p>You can ask questions like "How many listings do I have in New York?" or "What bookings do I have next week?". The assistant can read your data to find answers.</p>
                                </div>
                            </CardContent>
                        </Card>
                        
                        <div className="max-w-2xl mx-auto">
                            {messages.filter(m => m.role !== 'system').map((message, index) => (
                                <MessageBubble key={index} message={message} />
                            ))}
                            <div ref={messagesEndRef} />
                        </div>
                    </div>
                    
                    <div className="max-w-2xl mx-auto w-full">
                        <ChatInput onSendMessage={handleSendMessage} isSending={isSending} />
                    </div>
                </div>
            </AppLayout>
        </NewLoginRequired>
    );
}