# RunCrew Messaging

**Last Updated**: November 2025  
**Status**: 🚧 MVP1 - In Progress

---

## Premise

RunCrew messaging allows crew members to have **unfiltered banter** in a **WhatsApp-style** chat interface. This is:

- ✅ **Not DM style** - Group chat, not private messages
- ✅ **Not forum style** - Real-time conversation flow, not threaded discussions
- ✅ **WhatsApp style** - Simple, direct, cursor-in-box-and-type functionality

**Vision**: User puts cursor in the message box and just types. No complex UI, no threading, just natural conversation flow.

---

## Schema

### RunCrewMessage Model

**Table**: `run_crew_messages`

```prisma
model RunCrewMessage {
  id        String @id @default(cuid())
  runCrewId String
  athleteId String // Message author

  content String // Message text (just content, no images/likes)

  createdAt DateTime @default(now())

  // Relations
  runCrew RunCrew @relation(fields: [runCrewId], references: [id], onDelete: Cascade)
  athlete Athlete @relation(fields: [athleteId], references: [id], onDelete: Cascade)

  @@map("run_crew_messages")
}
```

**Key Design Decisions**:
- ✅ Simple `content` field - just text (no images, attachments, reactions in MVP1)
- ✅ `athleteId` ties message to author (for display name, avatar)
- ✅ `createdAt` for chronological ordering
- ✅ Cascade delete when RunCrew is deleted
- ❌ No `topic` or `threadId` - flat conversation (WhatsApp style)
- ❌ No `editedAt` or `deletedAt` - MVP1: messages are permanent

---

## API Endpoints

### POST /api/runcrew/:runCrewId/messages

**Purpose**: Create a new message in the RunCrew chat

**Authentication**: Required (Firebase token)

**Request Body**:
```json
{
  "content": "Just crushed a 5.2 mile run! Who else is feeling the Friday energy? 💪"
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "message": "Message created successfully",
  "data": {
    "id": "clx123...",
    "runCrewId": "clx456...",
    "athleteId": "clx789...",
    "content": "Just crushed a 5.2 mile run! Who else is feeling the Friday energy? 💪",
    "createdAt": "2024-12-20T14:30:00Z",
    "athlete": {
      "id": "clx789...",
      "firstName": "Emma",
      "lastName": "Rodriguez",
      "photoURL": "https://..."
    }
  }
}
```

**Validation**:
- `content` is required and must be non-empty after trim
- `content` max length: 2000 characters (MVP1)
- User must be a member of the RunCrew (checked via `RunCrewMembership`)

**Error Responses**:
- `400`: Missing or invalid content
- `403`: User is not a member of the RunCrew
- `404`: RunCrew not found
- `500`: Server error

---

### GET /api/runcrew/:runCrewId/messages

**Purpose**: Get all messages for a RunCrew (for hydration)

**Authentication**: Required (Firebase token)

**Query Parameters**:
- `limit` (optional): Number of messages to return (default: 100, max: 500)
- `before` (optional): ISO timestamp - return messages before this date (for pagination)

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": "clx123...",
      "runCrewId": "clx456...",
      "athleteId": "clx789...",
      "content": "Just crushed a 5.2 mile run!",
      "createdAt": "2024-12-20T14:30:00Z",
      "athlete": {
        "id": "clx789...",
        "firstName": "Emma",
        "lastName": "Rodriguez",
        "photoURL": "https://..."
      }
    },
    // ... more messages (oldest first)
  ]
}
```

**Ordering**: Messages returned in chronological order (oldest first)

**Pagination**: Use `before` parameter with the `createdAt` timestamp of the last message received

**Security**: User must be a member of the RunCrew

---

## Frontend Implementation

### Component: RunCrewMessaging.jsx

**Location**: `src/Pages/RunCrew/RunCrewMessaging.jsx` (or integrated into `RunCrewCentral.jsx`)

**Key Features**:
1. **Simple Input Box**: Cursor-in-box-and-type functionality
2. **Message List**: Chronological display (newest at bottom)
3. **Auto-scroll**: Scroll to bottom when new messages arrive
4. **Real-time Updates**: Polling or WebSocket (MVP1: polling every 5 seconds)

**State Management**:
```javascript
const [messages, setMessages] = useState([]);
const [messageInput, setMessageInput] = useState('');
const [sending, setSending] = useState(false);
```

**Message Display**:
- Show author name and avatar
- Show timestamp (relative: "2 hours ago", absolute: "Dec 20, 2:30 PM")
- Simple bubble-style message (WhatsApp aesthetic)

**Send Message Flow**:
1. User types in input box
2. User presses Enter or clicks Send button
3. Validate: non-empty content
4. Call `POST /api/runcrew/:runCrewId/messages`
5. On success: Add message to local state (optimistic update)
6. Clear input box
7. Scroll to bottom

**Hydration Pattern**:
- On component mount: Call `GET /api/runcrew/:runCrewId/messages`
- Store in `localStorage` as `runCrew_${id}_messages`
- Display from `localStorage` (local-first architecture)
- Poll for new messages every 5 seconds (MVP1)

---

## Real-time Updates (Future)

**MVP1**: Polling every 5 seconds
- Simple `setInterval` to fetch new messages
- Compare `createdAt` timestamps to detect new messages
- Append new messages to existing list

**Future**: WebSocket/Server-Sent Events
- Real-time message delivery
- Typing indicators
- Online/offline status
- Message read receipts

---

## Security & Validation

### Client-Side Validation
- Non-empty content (after trim)
- Max length: 2000 characters
- Sanitize HTML (prevent XSS)

### Server-Side Validation
- Verify Firebase token
- Verify athlete exists
- Verify RunCrew exists
- Verify athlete is a member (via `RunCrewMembership`)
- Validate content: non-empty, max length, sanitize

### Authorization
- Only RunCrew members can send messages
- Only RunCrew members can view messages
- Admin has no special message privileges (unfiltered banter)

---

## Hydration Pattern

**Per RunCrewArchitecture.md**: Messages are hydrated as part of the main RunCrew hydration:

```javascript
// GET /api/runcrew/:id
{
  "success": true,
  "data": {
    "id": "clx456...",
    "name": "Morning Runners",
    "members": [...],
    "messages": [
      {
        "id": "clx123...",
        "content": "Just crushed a 5.2 mile run!",
        "createdAt": "2024-12-20T14:30:00Z",
        "athlete": {
          "id": "clx789...",
          "firstName": "Emma",
          "lastName": "Rodriguez",
          "photoURL": "https://..."
        }
      }
      // ... more messages
    ],
    "runs": [...],
    "events": [...]
  }
}
```

**Frontend Storage**:
- Store in `localStorage` as `runCrew_${id}` (includes messages array)
- Component reads from `localStorage` on mount
- Poll for new messages separately (append to existing)

---

## UI/UX Design

### WhatsApp-Style Aesthetic

**Message Bubbles**:
- Author's messages: Right-aligned, colored background (e.g., orange)
- Other members' messages: Left-aligned, gray background
- Show author name and avatar for other members' messages
- Hide author name for own messages

**Input Box**:
- Fixed at bottom of chat area
- Simple text input with placeholder: "Type a message..."
- Send button (or Enter key)
- No formatting toolbar (MVP1)

**Message List**:
- Scrollable container
- Chronological order (oldest at top, newest at bottom)
- Auto-scroll to bottom on new message
- Timestamp grouping: Show date separator for messages from different days

**Example Layout**:
```
┌─────────────────────────────────┐
│ [Avatar] Emma Rodriguez         │
│ Just crushed a 5.2 mile run! 💪 │
│ 2 hours ago                     │
├─────────────────────────────────┤
│ Sarah Johnson [Avatar]          │
│ Nice! I'm planning a 10K this   │
│ weekend                         │
│ 1 hour ago                      │
├─────────────────────────────────┤
│ [Avatar] You                    │
│ Count me in!                    │
│ 30 minutes ago                  │
├─────────────────────────────────┤
│ [Type a message...] [Send]     │
└─────────────────────────────────┘
```

---

## Future Enhancements

### MVP2+ Features
- **Images/Media**: Support image uploads in messages
- **Message Reactions**: Quick emoji reactions (like WhatsApp)
- **Message Editing**: Edit sent messages (with "edited" indicator)
- **Message Deletion**: Delete own messages
- **Typing Indicators**: Show when someone is typing
- **Read Receipts**: Show message read status
- **Mentions**: @mention other members
- **Message Search**: Search through message history

### Advanced Features
- **Voice Messages**: Record and send voice messages
- **Location Sharing**: Share location in messages
- **Message Pinning**: Pin important messages
- **Admin Announcements**: Distinguish admin announcements from regular messages

---

## Implementation Status

### ✅ Completed
- Schema defined (`RunCrewMessage` model)
- Backend route structure (`runCrewMessageRoute.js`)

### 🚧 In Progress
- Frontend component (`RunCrewMessaging.jsx` or integrated into `RunCrewCentral.jsx`)
- Real-time polling implementation
- Message hydration in main RunCrew hydration endpoint

### 📋 TODO
- Message input box with send functionality
- Message list display (WhatsApp-style bubbles)
- Auto-scroll to bottom
- Timestamp formatting (relative/absolute)
- Error handling and retry logic
- Message validation (client and server)

---

## Related Documentation

- **[RunCrewArchitecture.md](./RunCrewArchitecture.md)** - Overall RunCrew architecture and schema
- **[RunCrewMembership.md](./RunCrewMembership.md)** - Membership system (required for message authorization)
- **[RunCrewAdmin.md](./RunCrewAdmin.md)** - Admin capabilities (no special message privileges)

---

**Last Updated**: November 2025  
**Maintained By**: GoFast Development Team

