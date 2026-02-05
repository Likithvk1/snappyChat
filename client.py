import asyncio
import websockets
import json
import sys

# Define the server Address. 
# If running on the same computer, use "localhost".
# If running on different computers, use the Server's IP address (e.g., 192.168.1.5)
SERVER_IP = "localhost" 
SERVER_PORT = 8000

async def receive_messages(websocket):
    """
    Listens for incoming messages from the server indefinitely.
    """
    try:
        async for message in websocket:
            try:
                data = json.loads(message)
                if "from" in data:
                    print(f"\n[NEW MESSAGE] from {data['from']}: {data['message']}")
                    print("You: ", end="", flush=True) # Restore the prompt
                elif "error" in data:
                    print(f"\n[ERROR]: {data['error']}")
            except json.JSONDecodeError:
                print(f"\n[RAW]: {message}")
    except websockets.exceptions.ConnectionClosed:
        print("\nDisconnected from server.")

async def send_messages(websocket):
    """
    Handles user input and sends messages to the server.
    """
    loop = asyncio.get_running_loop()
    
    while True:
        # Use run_in_executor to make input() non-blocking
        recipient = await loop.run_in_executor(None, input, "Target User ID: ")
        content = await loop.run_in_executor(None, input, "Message: ")
        
        if not recipient or not content:
            print("Both Target ID and Message are required.")
            continue
            
        message_data = {
            "to": recipient,
            "message": content
        }
        
        await websocket.send(json.dumps(message_data))
        print(f"Sent to {recipient}.")

async def start_client():
    client_id = input("Enter your Client ID (e.g., alice): ").strip()
    if not client_id:
        print("Client ID is required.")
        return

    uri = f"ws://{SERVER_IP}:{SERVER_PORT}/ws/{client_id}"
    
    print(f"Connecting to {uri}...")
    try:
        async with websockets.connect(uri) as websocket:
            print(f"Connected as '{client_id}'! You can now send messages.")
            
            # Run receive and send tasks concurrently
            receive_task = asyncio.create_task(receive_messages(websocket))
            send_task = asyncio.create_task(send_messages(websocket))
            
            # Wait for either to finish (likely send_task if user quits, or receive_task if disconnected)
            done, pending = await asyncio.wait(
                [receive_task, send_task],
                return_when=asyncio.FIRST_COMPLETED
            )
            
            for task in pending:
                task.cancel()
                
    except Exception as e:
        print(f"Could not connect: {e}")

if __name__ == "__main__":
    try:
        # Standard asyncio entry point
        asyncio.run(start_client())
    except KeyboardInterrupt:
        print("\nExiting...")
