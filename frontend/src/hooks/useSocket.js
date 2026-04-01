/**
 * useSocket.js
 *
 * A custom hook that opens (and cleans up) a Socket.io connection.
 *
 * WHY WEBSOCKETS instead of polling?
 *   Polling (old approach in Navbar.js + MessagesPage.js) sent a new HTTP
 *   request every 3-10 seconds per open tab.  With 1 000 users that is
 *   ~6 000-20 000 requests/minute just to check "anything new?" — most of
 *   which return empty responses.
 *
 *   WebSockets keep a single persistent TCP connection open.  The server
 *   pushes data ONLY when something actually changes, dropping those wasted
 *   round-trips to essentially zero.
 *
 * EVENTS emitted BY THE SERVER (listen with socket.on):
 *   'notification:new'   — a new notification arrived for this user
 *   'notification:count' — updated unread notification count  { count: number }
 *   'dm:new'             — a new direct message arrived        { message }
 *   'dm:count'           — updated unread DM count             { count: number }
 *
 * EVENTS emitted BY THE CLIENT (emit with socket.emit):
 *   'join'               — authenticate the socket             { token }
 *
 * USAGE:
 *   const socket = useSocket(token);
 *   useEffect(() => {
 *     if (!socket) return;
 *     socket.on('notification:count', ({ count }) => setUnread(count));
 *     return () => socket.off('notification:count');
 *   }, [socket]);
 */

import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export function useSocket(token) {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!token) return;

    const s = io(SOCKET_URL, {
      // Send the JWT as a query param so the server can authenticate
      // the socket before the 'join' event is even needed.
      auth: { token },
      transports: ['websocket'],   // skip long-polling fallback for performance
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    s.on('connect', () => {
      // Belt-and-suspenders: also emit 'join' for servers that check it explicitly
      s.emit('join', { token });
    });

    setSocket(s);

    return () => {
      s.disconnect();
      setSocket(null);
    };
  }, [token]);

  return socket;
}
