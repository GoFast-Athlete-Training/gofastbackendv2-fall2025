# Group Wall Messaging - Implementation Guide

## Overview

Group-wall messaging system for RunCrews. This is a static thread per group (not private chat) - shared "crew chatter" posts on each crew's main page.

## Architecture

### Database
- **Model**: `Message` in `prisma/schema.prisma`
  - `id`: String (cuid)
  - `groupId`: String (RunCrew ID)
  - `authorId`: String (Athlete ID)
  - `author`: String (Author name, denormalized)
  - `content`: String (Message content)
  - `createdAt`: DateTime
  - Indexed on `[groupId, createdAt]` for efficient queries

### REST API Endpoints

**GET `/api/messages/:groupId`**
- Fetches recent messages for a group
- Query params: `limit` (default: 50, max: 200)
- Returns messages in chronological order (oldest first)

**POST `/api/messages`**
- Creates a new message (REST fallback)
- Body: `{ groupId, authorId, author, content }`
- Note: Socket.io is preferred for real-time messaging

### Socket.io Events

**Client → Server:**
- `join:group` - Join a group room: `{ groupId: string }`
- `leave:group` - Leave a group room: `{ groupId: string }`
- `message:send` - Send a new message: `{ groupId, authorId, author, content }`

**Server → Client:**
- `joined:group` - Confirmation: `{ groupId, room }`
- `message:new` - New message broadcast: `{ id, groupId, authorId, author, content, createdAt }`
- `message:sent` - Sender confirmation: `{ id }`
- `error` - Error notification: `{ message: string }`

### Socket.io Rooms

- Format: `group-{groupId}`
- All clients in the same room receive `message:new` events
- Rooms are automatically cleaned up when empty

## Files Created

1. **`prisma/schema.prisma`** - Added `Message` model
2. **`src/socket.ts`** - Socket.io event handlers and room logic
3. **`src/routes/messagesRoute.ts`** - REST API endpoints
4. **`index.js`** - Updated to integrate Socket.io HTTP server

## Frontend Integration

### Fetch Initial Messages
```javascript
import api from './api/axiosConfig';

const fetchMessages = async (groupId) => {
  const response = await api.get(`/messages/${groupId}?limit=50`);
  return response.data.messages;
};
```

### Socket.io Client Setup
```javascript
import { io } from 'socket.io-client';

const socket = io('https://gofastbackendv2-fall2025.onrender.com');

// Join group room
socket.emit('join:group', { groupId: 'your-crew-id' });

// Listen for new messages
socket.on('message:new', (message) => {
  // Prepend to message list
  setMessages(prev => [...prev, message]);
});

// Send message
socket.emit('message:send', {
  groupId: 'your-crew-id',
  authorId: 'athlete-id',
  author: 'Athlete Name',
  content: 'Message text'
});
```

## Database Migration

After schema update, run:
```bash
npx prisma generate
npx prisma db push
```

Or create a migration:
```bash
npx prisma migrate dev --name add_message_model
```

## Testing

1. Start backend: `npm run dev`
2. Test REST endpoint: `GET http://localhost:3001/api/messages/{groupId}`
3. Test Socket.io connection: Connect client and emit `join:group` event
4. Verify real-time broadcast: Send message via socket, confirm other clients receive it

## Environment

- Uses existing `DATABASE_URL` (Postgres)
- Uses existing `REDIS_URL` (Redis - not required for messages, but available)
- No new environment variables needed
- Works with existing Render deployment

