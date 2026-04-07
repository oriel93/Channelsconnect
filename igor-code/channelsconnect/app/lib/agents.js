// Agent SDK placeholder
// This was a base44-specific feature for AI agents

export const agentSDK = {
  sendMessage: (message) => {
    console.warn('Agent SDK not available - base44 specific feature');
    return Promise.resolve({ 
      response: 'AI Assistant is not yet configured. This feature is coming soon.',
      message 
    });
  },
  
  getConversationHistory: () => {
    return Promise.resolve([]);
  },
};

export default agentSDK;

