"use client";

import React, { useState } from "react";
import ContactsList from "../components/ContactsList";

type Message = {
  role: "user" | "assistant" | "function";
  content: string;
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hello! I can call MCP-based tools if needed." },
  ]);
  const [userInput, setUserInput] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [shouldRefreshContacts, setShouldRefreshContacts] = useState(false);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const text = userInput.trim();
    if (!text) return;

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setUserInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/mcp-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userMessage: text, history: messages }),
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const newMsgs: Message[] = data.newMessages;
      setMessages((prev) => [...prev, ...newMsgs]);
      
      // Check if any of the new messages indicate a contact was created
      const contactCreated = newMsgs.some(msg => 
        msg.content.includes('Contact created successfully')
      );
      if (contactCreated) {
        setShouldRefreshContacts(true);
      }
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <h1 className="text-xl font-bold mb-2">MCP Chat</h1>
            <p className="text-sm text-gray-600 mb-4">
              Ask the MCP agent to perform a CRM task for you, such as creating a contact. 
              The Integration MCP Server will expose a live list of tools (Integration App actions) 
              that the AI can choose to use based on the natural text input in the chat. 
              This way, tools don't have to be statically hard-coded into your application - 
              resulting in a scalable and dynamic AI agent capability.
            </p>
          </div>
          <div className="border p-3 bg-white h-[500px] overflow-y-auto rounded-lg shadow">
            {messages.map((m, idx) => (
              <div key={idx} className="mb-2">
                <b>{m.role === "assistant" ? "AI" : m.role}:</b> {m.content}
              </div>
            ))}
          </div>
          {error && <p className="text-red-500">Error: {error}</p>}

          <form onSubmit={handleSend} className="flex gap-2">
            <input
              className="border rounded p-2 flex-1"
              placeholder="Ask me anything..."
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              disabled={loading}
            />
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
              disabled={loading}
            >
              {loading ? "Thinking..." : "Send"}
            </button>
          </form>
        </div>
        <div>
          <ContactsList 
            shouldRefresh={shouldRefreshContacts} 
            onRefreshComplete={() => setShouldRefreshContacts(false)} 
          />
        </div>
      </div>
    </div>
  );
}
