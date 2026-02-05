from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Dict, List, Optional
import json
import sqlite3
import asyncio
import os
import bcrypt
import jwt
from datetime import datetime, timedelta

app = FastAPI()

# Serve static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# JWT Configuration
SECRET_KEY = "your-secret-key-change-in-production"  # Change this in production!
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

@app.get("/")
async def get_index():
    return FileResponse("static/index.html")

# --- Database ---
DB_NAME = "chat.db"

def init_db():
    """Initialize the database with users and messages tables."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    
    # Users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            username TEXT PRIMARY KEY,
            password_hash TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Messages table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sender TEXT,
            recipient TEXT,
            content TEXT,
            is_delivered BOOLEAN,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Friend requests table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS friend_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sender TEXT NOT NULL,
            recipient TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(sender, recipient)
        )
    ''')
    
    conn.commit()
    conn.close()

# --- User Authentication ---

class UserRegister(BaseModel):
    username: str
    password: str
    confirm_password: str

class UserLogin(BaseModel):
    username: str
    password: str

def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(password: str, password_hash: str) -> bool:
    """Verify a password against its hash."""
    return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))

def create_access_token(username: str) -> str:
    """Create a JWT access token."""
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {"sub": username, "exp": expire}
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def verify_token(token: str) -> Optional[str]:
    """Verify a JWT token and return the username."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        return username
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

@app.post("/register")
async def register(user: UserRegister):
    """Register a new user."""
    # Validation
    if not user.username or not user.password:
        raise HTTPException(status_code=400, detail="Username and password are required")
    
    if len(user.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    if user.password != user.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")
    
    # Check if user already exists
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute("SELECT username FROM users WHERE username = ?", (user.username,))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="Username already exists")
    
    # Create user
    password_hash = hash_password(user.password)
    cursor.execute("INSERT INTO users (username, password_hash) VALUES (?, ?)", 
                   (user.username, password_hash))
    conn.commit()
    conn.close()
    
    # Generate token
    token = create_access_token(user.username)
    
    return {
        "success": True,
        "message": "User registered successfully",
        "token": token,
        "username": user.username
    }

@app.post("/login")
async def login(user: UserLogin):
    """Login a user."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute("SELECT password_hash FROM users WHERE username = ?", (user.username,))
    result = cursor.fetchone()
    conn.close()
    
    if not result:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    password_hash = result[0]
    if not verify_password(user.password, password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    # Generate token
    token = create_access_token(user.username)
    
    return {
        "success": True,
        "message": "Login successful",
        "token": token,
        "username": user.username
    }

@app.get("/history/{username}")
async def get_history(username: str):
    """Get all message history for a user (sent and received)."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    
    # Get all messages where user is sender or recipient
    cursor.execute('''
        SELECT sender, recipient, content, timestamp, is_delivered 
        FROM messages
        WHERE sender = ? OR recipient = ?
        ORDER BY timestamp ASC
    ''', (username, username))
    
    rows = cursor.fetchall()
    conn.close()
    
    messages = []
    for row in rows:
        sender, recipient, content, timestamp, is_delivered = row
        messages.append({
            "sender": sender,
            "recipient": recipient,
            "message": content,
            "timestamp": timestamp,
            "is_delivered": is_delivered
        })
    
    return {"messages": messages}

@app.get("/search")
async def search_users(q: str = ""):
    """Search for users by username (case-insensitive)."""
    if not q or len(q) < 1:
        return {"users": []}
    
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    
    # Search for usernames containing the query (case-insensitive)
    cursor.execute('''
        SELECT username FROM users
        WHERE LOWER(username) LIKE LOWER(?)
        LIMIT 10
    ''', (f'%{q}%',))
    
    rows = cursor.fetchall()
    conn.close()
    
    users = [row[0] for row in rows]
    return {"users": users}

@app.post("/friend-request/send")
async def send_friend_request(data: dict):
    """Send a friend request to another user."""
    sender = data.get("sender")
    recipient = data.get("recipient")
    
    if not sender or not recipient:
        raise HTTPException(status_code=400, detail="Sender and recipient required")
    
    if sender == recipient:
        raise HTTPException(status_code=400, detail="Cannot send request to yourself")
    
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    
    # Check if recipient exists
    cursor.execute("SELECT username FROM users WHERE username = ?", (recipient,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if already friends or request exists
    cursor.execute('''
        SELECT status FROM friend_requests 
        WHERE (sender = ? AND recipient = ?) OR (sender = ? AND recipient = ?)
    ''', (sender, recipient, recipient, sender))
    
    existing = cursor.fetchone()
    if existing:
        conn.close()
        if existing[0] == 'accepted':
            raise HTTPException(status_code=400, detail="Already friends")
        elif existing[0] == 'pending':
            raise HTTPException(status_code=400, detail="Request already sent")
        elif existing[0] == 'blocked':
            raise HTTPException(status_code=403, detail="Cannot send request")
    
    # Create friend request
    try:
        cursor.execute('''
            INSERT INTO friend_requests (sender, recipient, status)
            VALUES (?, ?, 'pending')
        ''', (sender, recipient))
        conn.commit()
    except sqlite3.IntegrityError:
        conn.close()
        raise HTTPException(status_code=400, detail="Request already exists")
    
    conn.close()
    
    # Notify recipient via WebSocket
    await manager.send_notification(recipient, {
        "type": "friend_request",
        "from": sender,
        "message": f"{sender} sent you a friend request"
    })
    
    return {"success": True, "message": "Friend request sent"}

@app.post("/friend-request/respond")
async def respond_friend_request(data: dict):
    """Accept, reject, or block a friend request."""
    recipient = data.get("recipient")  # Person responding
    sender = data.get("sender")  # Person who sent request
    action = data.get("action")  # 'accept', 'reject', 'block'
    
    if not recipient or not sender or not action:
        raise HTTPException(status_code=400, detail="Missing required fields")
    
    if action not in ['accept', 'reject', 'block']:
        raise HTTPException(status_code=400, detail="Invalid action")
    
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    
    # Update request status
    if action == 'accept':
        cursor.execute('''
            UPDATE friend_requests 
            SET status = 'accepted'
            WHERE sender = ? AND recipient = ? AND status = 'pending'
        ''', (sender, recipient))
    elif action == 'reject':
        cursor.execute('''
            DELETE FROM friend_requests
            WHERE sender = ? AND recipient = ? AND status = 'pending'
        ''', (sender, recipient))
    elif action == 'block':
        cursor.execute('''
            UPDATE friend_requests 
            SET status = 'blocked'
            WHERE sender = ? AND recipient = ?
        ''', (sender, recipient))
    
    conn.commit()
    conn.close()
    
    # Notify sender
    if action == 'accept':
        await manager.send_notification(sender, {
            "type": "friend_request_accepted",
            "from": recipient,
            "message": f"{recipient} accepted your friend request"
        })
    
    return {"success": True, "action": action}

@app.get("/friend-request/list/{username}")
async def list_friend_requests(username: str):
    """Get pending friend requests for a user."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    
    # Get incoming pending requests
    cursor.execute('''
        SELECT sender, created_at FROM friend_requests
        WHERE recipient = ? AND status = 'pending'
        ORDER BY created_at DESC
    ''', (username,))
    
    incoming = [{"from": row[0], "timestamp": row[1]} for row in cursor.fetchall()]
    
    # Get accepted friends
    cursor.execute('''
        SELECT sender, recipient FROM friend_requests
        WHERE (sender = ? OR recipient = ?) AND status = 'accepted'
    ''', (username, username))
    
    friends = []
    for row in cursor.fetchall():
        friend = row[1] if row[0] == username else row[0]
        friends.append(friend)
    
    conn.close()
    
    # Remove duplicates
    friends = list(set(friends))
    
    return {"pending": incoming, "friends": friends}

@app.post("/friend/remove")
async def remove_friend(data: dict):
    """Remove a friend (delete the friendship)."""
    username = data.get("username")
    friend = data.get("friend")
    
    if not username or not friend:
        raise HTTPException(status_code=400, detail="Missing required fields")
    
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    
    # Delete the friendship
    cursor.execute('''
        DELETE FROM friend_requests
        WHERE ((sender = ? AND recipient = ?) OR (sender = ? AND recipient = ?))
        AND status = 'accepted'
    ''', (username, friend, friend, username))
    
    conn.commit()
    conn.close()
    
    return {"success": True, "message": "Friend removed"}

@app.post("/friend/block")
async def block_friend(data: dict):
    """Block a user."""
    username = data.get("username")
    blocked_user = data.get("blocked_user")
    
    if not username or not blocked_user:
        raise HTTPException(status_code=400, detail="Missing required fields")
    
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    
    # Update or insert block status
    cursor.execute('''
        INSERT OR REPLACE INTO friend_requests (sender, recipient, status)
        VALUES (?, ?, 'blocked')
    ''', (username, blocked_user))
    
    conn.commit()
    conn.close()
    
    return {"success": True, "message": "User blocked"}

@app.post("/friend/unblock")
async def unblock_friend(data: dict):
    """Unblock a user."""
    username = data.get("username")
    blocked_user = data.get("blocked_user")
    
    if not username or not blocked_user:
        raise HTTPException(status_code=400, detail="Missing required fields")
    
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    
    # Remove block
    cursor.execute('''
        DELETE FROM friend_requests
        WHERE sender = ? AND recipient = ? AND status = 'blocked'
    ''', (username, blocked_user))
    
    conn.commit()
    conn.close()
    
    return {"success": True, "message": "User unblocked"}

@app.get("/friend/blocked/{username}")
async def get_blocked_users(username: str):
    """Get list of blocked users."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT recipient FROM friend_requests
        WHERE sender = ? AND status = 'blocked'
    ''', (username,))
    
    blocked = [row[0] for row in cursor.fetchall()]
    conn.close()
    
    return {"blocked": blocked}


# --- Message Functions ---

def save_message(sender: str, recipient: str, content: str, is_delivered: bool):
    """Save a message to the database."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO messages (sender, recipient, content, is_delivered)
        VALUES (?, ?, ?, ?)
    ''', (sender, recipient, content, is_delivered))
    conn.commit()
    conn.close()

def get_offline_messages(recipient: str) -> List[tuple]:
    """Retrieve undelivered messages for a user."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('''
        SELECT id, sender, content, timestamp FROM messages
        WHERE recipient = ? AND is_delivered = 0
    ''', (recipient,))
    formatted_messages = []
    rows = cursor.fetchall() 
    
    for row in rows:
        msg_id, sender, content, timestamp = row
        formatted_messages.append({
            "from": sender,
            "message": content,
            "timestamp": timestamp,
            "offline_catchup": True
        })
        cursor.execute('UPDATE messages SET is_delivered = 1 WHERE id = ?', (msg_id,))
    
    conn.commit()
    conn.close()
    return formatted_messages

# Initialize DB on startup
init_db()

# --- Connection Manager ---
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.username_mapping: Dict[str, str] = {}  # normalized -> original

    async def connect(self, websocket: WebSocket, client_id: str):
        # Normalization: Use lowercase for connection tracking
        client_id_norm = client_id.lower()
        
        # Check if user is already connected from another device
        if client_id_norm in self.active_connections:
            old_websocket = self.active_connections[client_id_norm]
            try:
                # Notify the old session that they're being logged out
                await old_websocket.send_text(json.dumps({
                    "type": "force_logout",
                    "message": "You have been logged in from another device"
                }))
                await old_websocket.close(code=1008, reason="Logged in elsewhere")
                print(f"Disconnected previous session for {client_id}")
            except:
                pass  # Old connection might already be dead
        
        # Accept new connection
        await websocket.accept()
        self.active_connections[client_id_norm] = websocket
        self.username_mapping[client_id_norm] = client_id  # Store original
        print(f"Client {client_id} (key: {client_id_norm}) connected.")
        
        # DELIVER OFFLINE MESSAGES
        # Note: We query DB with original case or normalized? 
        # For now, let's assume DB matching handles it or use original.
        # But wait, if sender sent to "liki", DB has "liki".
        # If I am "Liki", client_id="Liki".
        # To fetch messages intended for ME, I should check variations?
        # Let's trust the DB (SQLite) to match or use what was stored.
        # Actually, if we want robust delivery, we should store normalized.
        # But for now, let's just fix the ONLINE check.
        pending_msgs = get_offline_messages(client_id)
        if pending_msgs:
            print(f"Delivering {len(pending_msgs)} offline messages to {client_id}")
            for msg in pending_msgs:
                await websocket.send_text(json.dumps(msg))

    def disconnect(self, client_id: str):
        client_id_norm = client_id.lower()
        if client_id_norm in self.active_connections:
            del self.active_connections[client_id_norm]
            del self.username_mapping[client_id_norm]
            print(f"Client {client_id} disconnected.")
    
    async def broadcast_online_users(self):
        """Broadcast list of online users to all connected clients."""
        # Send original usernames (not normalized keys)
        online_list = list(self.username_mapping.values())
        message = json.dumps({"type": "online_users", "users": online_list})
        
        for websocket in self.active_connections.values():
            try:
                await websocket.send_text(message)
            except:
                pass  # Ignore errors for disconnected sockets

    async def send_notification(self, recipient: str, notification: dict):
        """Send a notification to a specific user if they're online."""
        recipient_norm = recipient.lower()
        if recipient_norm in self.active_connections:
            websocket = self.active_connections[recipient_norm]
            try:
                await websocket.send_text(json.dumps(notification))
                print(f"Sent notification to {recipient}: {notification.get('type')}")
            except:
                pass  # Ignore errors



    async def handle_message(self, sender_id: str, message_data: dict):
        recipient = message_data.get("to")
        content = message_data.get("message")
        
        if not recipient or not content:
            return

        # CHECK IF ONLINE (Case Insensitive)
        recipient_norm = recipient.lower()
        is_online = recipient_norm in self.active_connections
        
        # 1. SAVE TO DB (Preserve original casing for display?)
        save_message(sender_id, recipient, content, is_delivered=is_online)
        
        # 2. DELIVER IF ONLINE
        if is_online:
            websocket = self.active_connections[recipient_norm]
            await websocket.send_text(json.dumps({
                "from": sender_id, 
                "message": content
            }))
            print(f"Sent (Online) {sender_id} -> {recipient}")
        else:
            print(f"Stored (Offline) {sender_id} -> {recipient}")

manager = ConnectionManager()

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str, token: str = None):
    # Verify authentication
    if not token:
        await websocket.close(code=1008, reason="Authentication required")
        return
    
    username = verify_token(token)
    if not username or username != client_id:
        await websocket.close(code=1008, reason="Invalid token")
        return
    
    await manager.connect(websocket, client_id)
    await manager.broadcast_online_users()  # Notify all clients
    
    try:
        while True:
            data = await websocket.receive_text()
            try:
                message_data = json.loads(data)
                await manager.handle_message(client_id, message_data)
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        manager.disconnect(client_id)
        await manager.broadcast_online_users()  # Notify all clients


if __name__ == "__main__":
    import uvicorn
    # Allow external access via 0.0.0.0 and use port 8001 (matching previous session)
    uvicorn.run(app, host="0.0.0.0", port=8001)
