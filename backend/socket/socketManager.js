import { Server } from 'socket.io';

// In-memory storage
const rooms = {};
// In-memory storage for room metadata
const roomMetadata = {};

const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*", 
      methods: ["GET", "POST"]
    }
  });

  const broadcastRoomUpdate = (roomId) => {
    if (rooms[roomId]) {
      // Send array of objects with name and ready status
      const players = rooms[roomId].map(p => ({ 
        name: p.name, 
        ready: p.ready || false 
      }));
      io.to(roomId).emit("roomPlayersUpdate", players);
      console.log(`Broadcasted update for room ${roomId}:`, players);
    }
  };

  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on("createRoom", ({ roomId, playerName }) => {
      // Validate playerName
      if (!playerName || playerName.trim() === "") {
        console.log("Create Room rejected: Missing player name");
        return;
      }

      console.log("Joining:", roomId, playerName);
      
      // Initialize room as an array of player objects with ready status
      rooms[roomId] = [{ name: playerName, socketId: socket.id, ready: false }];
      
      // Reset room metadata
      roomMetadata[roomId] = { matchStarted: false };
      
      socket.join(roomId);
      socket.emit("roomJoined", { roomId, status: "Room created successfully" });
      broadcastRoomUpdate(roomId);
    });

    socket.on("joinRoom", ({ roomId, playerName }) => {
      // Validate playerName
      if (!playerName || playerName.trim() === "") {
        console.log("Join Room rejected: Missing player name");
        return;
      }

      console.log("Joining:", roomId, playerName);
      
      if (!rooms[roomId]) {
        rooms[roomId] = [];
        roomMetadata[roomId] = { matchStarted: false };
      }

      // Check for duplicates to prevent same socket from joining multiple times
      const isAlreadyIn = rooms[roomId].find(p => p.socketId === socket.id);
      if (!isAlreadyIn) {
        rooms[roomId].push({ name: playerName, socketId: socket.id, ready: false });
      }

      socket.join(roomId);
      socket.emit("roomJoined", { roomId, status: "Joined room successfully" });
      
      // BROADCAST to everyone in the room (including the new joiner)
      broadcastRoomUpdate(roomId);
    });

    socket.on("playerReady", ({ roomId, playerName }) => {
      console.log(`Player ${playerName} ready in room ${roomId}`);
      if (rooms[roomId]) {
        const player = rooms[roomId].find(p => p.socketId === socket.id);
        if (player) {
          player.ready = true;
          broadcastRoomUpdate(roomId);

          // Check if ALL are ready and we have at least 2 players
          const allReady = rooms[roomId].length >= 2 && rooms[roomId].every(p => p.ready);
          const meta = roomMetadata[roomId] || { matchStarted: false };

          if (allReady && !meta.matchStarted) {
            console.log(`Match starting in room ${roomId}`);
            meta.matchStarted = true;

            // Randomly select batter and bowler for the toss
            const playerList = rooms[roomId]; // { name, socketId, ready }
            const batterIndex = Math.floor(Math.random() * playerList.length);
            const batterName = playerList[batterIndex].name;

            let bowlerIndex;
            do {
              bowlerIndex = Math.floor(Math.random() * playerList.length);
            } while (bowlerIndex === batterIndex);
            
            const bowlerName = playerList[bowlerIndex].name;

            // Store in room
            meta.matchState = {
              batter: batterName,
              bowler: bowlerName
            };

            roomMetadata[roomId] = meta;
            
            io.to(roomId).emit("startMatch", { 
              roomId, 
              message: "All players ready",
              batter: batterName,
              bowler: bowlerName
            });


            // Emit new tossResult event
            io.to(roomId).emit("tossResult", {
              batter: batterName,
              bowler: bowlerName
            });
          }
        }
      }
    });


    socket.on("getRoomPlayers", (roomId) => {
      if (rooms[roomId]) {
        const players = rooms[roomId].map(p => ({ 
          name: p.name, 
          ready: p.ready || false 
        }));
        // Only sends back to the requesting socket to avoid redundant broadcasts
        socket.emit("roomPlayersUpdate", players);
      }
    });
    
    socket.on("bowlBall", ({ roomId, direction }) => {
      if (rooms[roomId]) {
        console.log(`Bowl received: ${roomId}, ${direction}`);
        
        // Broadcast to everyone in the room
        io.to(roomId).emit("ballBowled", {
          direction
        });
      }
    });

    socket.on("hitBall", ({ roomId, timing }) => {
      if (rooms[roomId]) {
        console.log(`Hit received: ${roomId}, timing: ${timing}`);
        
        let result;
        const rand = Math.random();
        
        if (timing === "perfect") {
          result = rand < 0.8 ? 6 : 4;
        } else if (timing === "good") {
          if (rand < 0.4) result = 4;
          else if (rand < 0.7) result = 2;
          else result = 1;
        } else {
          // Late or missed timing
          result = rand < 0.7 ? 0 : "wicket";
        }
        
        console.log(`Result decided: ${result}`);
        
        // Broadcast the outcome to everyone in the room
        io.to(roomId).emit("ballResult", {
          result,
          timing
        });
      }
    });

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`);
      
      // Remove player from rooms and notify others
      for (const roomId in rooms) {
        const index = rooms[roomId].findIndex(p => p.socketId === socket.id);
        if (index !== -1) {
          console.log(`Removing player from room ${roomId}`);
          rooms[roomId].splice(index, 1);
          
          // Notify remaining players
          broadcastRoomUpdate(roomId);
          
          // Optional: delete empty rooms and metadata
          if (rooms[roomId].length === 0) {
            delete rooms[roomId];
            delete roomMetadata[roomId];
          } else {
            // Reset match start status if someone leaves? 
            // For now, keep it simple as requested.
          }
          break; // Socket can only be in one room in this simple model
        }
      }
    });
  });

  return io;
};

export default initializeSocket;


