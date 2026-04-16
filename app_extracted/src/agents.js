/**
 * agentSDK stub — placeholder for a real real-time AI agent backend.
 * Replace with your actual agent client (e.g., Base44 agent SDK, OpenAI Assistants, etc.)
 * when integrating a live AI conversation backend.
 *
 * FIX: The original code imported `@/agents` which did not exist, causing a build failure.
 */

const _subscribers = {};

export const agentSDK = {
  async listConversations({ agent_name } = {}) {
    // TODO: Implement with your AI backend SDK
    return [];
  },

  async getConversation(id) {
    // TODO: Implement with your AI backend SDK
    return { id, messages: [], status: 'idle' };
  },

  async createConversation({ agent_name, metadata } = {}) {
    // TODO: Implement with your AI backend SDK
    const id = `conv_${Date.now()}`;
    return { id, messages: [], status: 'idle' };
  },

  subscribeToConversation(id, callback) {
    // TODO: Implement with your AI backend SDK (WebSocket/SSE)
    _subscribers[id] = callback;
    return () => {
      delete _subscribers[id];
    };
  },

  async addMessage(conversation, { role, content }) {
    // TODO: Implement with your AI backend SDK
    console.warn('[agentSDK] addMessage is a stub — no real backend connected.');
    return null;
  },
};
