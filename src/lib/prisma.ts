import { Server, Socket } from "socket.io";
import { getCallConfig } from "./config.js";


export function setupWebRTC(io: Server) {

  io.on(
    "connection",
    (socket: Socket) => {

      const userId =
        socket.handshake.auth?.userId as string | undefined;


      if (!userId) {
        socket.disconnect(true);
        return;
      }


      // Put user into their private call room
      socket.join(`user:${userId}`);


      // Send STUN/TURN configuration
      socket.emit(
        "webrtc:config",
        getCallConfig()
      );



      // ==========================
      // Start Voice/Video Call
      // ==========================

      socket.on(
        "call:start",
        ({
          receiverId,
          type
        }) => {


          if (!receiverId || !type) {
            return;
          }


          io
          .to(`user:${receiverId}`)
          .emit(
            "call:incoming",
            {
              callerId:userId,
              type,
              timestamp:
                new Date().toISOString()
            }
          );

        }
      );



      // ==========================
      // Accept Call
      // ==========================

      socket.on(
        "call:accept",
        ({
          callerId
        }) => {


          io
          .to(`user:${callerId}`)
          .emit(
            "call:accepted",
            {
              acceptedBy:userId
            }
          );

        }
      );



      // ==========================
      // Reject Call
      // ==========================

      socket.on(
        "call:reject",
        ({
          callerId
        }) => {


          io
          .to(`user:${callerId}`)
          .emit(
            "call:rejected",
            {
              rejectedBy:userId
            }
          );

        }
      );



      // ==========================
      // WebRTC Offer
      // ==========================

      socket.on(
        "webrtc:offer",
        ({
          receiverId,
          offer
        }) => {


          io
          .to(`user:${receiverId}`)
          .emit(
            "webrtc:offer",
            {
              senderId:userId,
              offer
            }
          );

        }
      );



      // ==========================
      // WebRTC Answer
      // ==========================

      socket.on(
        "webrtc:answer",
        ({
          receiverId,
          answer
        }) => {


          io
          .to(`user:${receiverId}`)
          .emit(
            "webrtc:answer",
            {
              senderId:userId,
              answer
            }
          );

        }
      );



      // ==========================
      // ICE Candidates
      // ==========================

      socket.on(
        "webrtc:ice",
        ({
          receiverId,
          candidate
        }) => {


          io
          .to(`user:${receiverId}`)
          .emit(
            "webrtc:ice",
            {
              senderId:userId,
              candidate
            }
          );

        }
      );



      // ==========================
      // End Call
      // ==========================

      socket.on(
        "call:end",
        ({
          receiverId
        }) => {


          io
          .to(`user:${receiverId}`)
          .emit(
            "call:ended",
            {
              endedBy:userId
            }
          );

        }
      );



      // ==========================
      // Disconnect
      // ==========================

      socket.on(
        "disconnect",
        () => {

          console.log(
            `Call service disconnected: ${userId}`
          );

        }
      );

    }
  );

}