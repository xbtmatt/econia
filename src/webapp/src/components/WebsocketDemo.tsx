import React, { useCallback, useEffect, useState } from 'react';
import * as jose from 'jose';
import JsonViewer from './JsonViewer';

interface Message {
  // Define the structure of your message
  // This is an example; adjust according to the actual message structure you expect
  id: string;
  type: string;
  payload: any;
}

const WebSocketDemo: React.FC = () => {
  const [channel, setChannel] = useState<string>("fill_event"); // Or use get_channel() equivalent if dynamic
  const [token, setToken] = useState<string>("");

  // Encode the JWT token
  // NOTE: This is a simple example; should probably generate the token server-side
  const generateAndSetToken = useCallback(async (): Promise<string> => {
    const payload = {
      mode: 'r',
      channels: [
        "market_registration_event",
        "place_limit_order_event",
        "place_market_order_event",
        "place_swap_order_event",
        "fill_event",
        "change_order_size_event",
        "cancel_order_event",
        "recognized_market_event",
        "new_limit_order",
        "updated_limit_order",
        "new_market_order",
        "new_swap_order",
      ], // Or use get_channel() equivalent if dynamic
    };
    const secretKey = new TextEncoder().encode(process.env.NEXT_PUBLIC_JWT_SECRET_KEY!);
    const token = await new jose.SignJWT(payload).setProtectedHeader({ alg: 'HS256' }).sign(secretKey);
    setToken(token);
    return token;
  }, [channel, setToken]);

  useEffect(() => {
    generateAndSetToken();
  } , [generateAndSetToken]);

  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    if (!token) {
      return;
    }
    const websocketURL = `ws://localhost:3001/${token}`;
    console.log('Connecting to WebSocket: ', websocketURL);
    const ws = new WebSocket(websocketURL);

    ws.onopen = () => {
      console.log('WebSocket Connected');
    };

    ws.onmessage = (event) => {
      try {
        const message: Message = JSON.parse(event.data);
        setMessages((prevMessages) => [...prevMessages, message]);
      } catch (error) {
        console.error('Error parsing message', error);
      }
    };

    ws.onerror = (error: Event) => {
      console.error('WebSocket Error: ', error);
    };

    ws.onclose = () => {
      console.log('WebSocket Disconnected');
    };

    // Only close the WebSocket in cleanup if it's open
    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [generateAndSetToken, token]);


  return (
    <div>
      <h2 style={{ marginBottom: '10px', }}>WebSocket Messages</h2>
      <JsonViewer data={messages} />
    </div>
  );
};

export default WebSocketDemo;
