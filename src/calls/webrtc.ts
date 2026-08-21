import { Server } from "socket.io";

export function setupWebRTC(io: Server) {

  io.on("connection", (socket) => {

    const userId = socket.handshake.auth.userId;

    if (!userId) {
      socket.disconnect();
      return;
    }

    socket.join(`user:${userId}`);


    // Start call
    socket.on("call:start", ({
      receiverId,
      type
    }) => {

      io.to(`user:${receiverId}`).emit(
        "call:incoming",
        {
          callerId: userId,
          type, // audio or video
          socketId: socket.id
        }
      );

    });


    // Accept call
    socket.on("call:accept", ({
      callerId
    }) => {

      io.to(`user:${callerId}`).emit(
        "call:accepted",
        {
          userId
        }
      );

    });


    // Reject call
    socket.on("call:reject", ({
      callerId
    }) => {

      io.to(`user:${callerId}`).emit(
        "call:rejected"
      );

    });


    // WebRTC offer
    socket.on("webrtc:offer", ({
      receiverId,
      offer
    }) => {

      io.to(`user:${receiverId}`).emit(
        "webrtc:offer",
        {
          offer,
          senderId:userId
        }
      );

    });


    // WebRTC answer
    socket.on("webrtc:answer", ({
      receiverId,
      answer
    }) => {

      io.to(`user:${receiverId}`).emit(
        "webrtc:answer",
        {
          answer,
          senderId:userId
        }
      );

    });


    // ICE candidates
    socket.on("webrtc:ice", ({
      receiverId,
      candidate
    }) => {

      io.to(`user:${receiverId}`).emit(
        "webrtc:ice",
        {
          candidate,
          senderId:userId
        }
      );

    });


    socket.on("call:end", ({
      receiverId
    }) => {

      io.to(`user:${receiverId}`).emit(
        "call:ended"
      );

    });

  });

}