import { Server, Socket } from "socket.io";
import { verifyToken } from "../auth/jwt.js";
import { env } from "../config/env.js";

export function setupWebRTC(io: Server) {

  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token;

      if (!token) {
        return next(
          new Error("Authentication required")
        );
      }

      socket.data.user =
        verifyToken(token);

      next();

    } catch {
      next(
        new Error("Invalid authentication")
      );
    }
  });


  io.on(
    "connection",
    (socket: Socket) => {

      const userId =
        socket.data.user.userId;

      socket.join(`user:${userId}`);


      socket.emit(
        "webrtc:config",
        {
          iceServers: [
            {
              urls:
                "stun:stun.l.google.com:19302"
            },

            ...(env.TURN_URL
              ? [{
                  urls: env.TURN_URL,
                  username:
                    env.TURN_USERNAME,
                  credential:
                    env.TURN_PASSWORD
                }]
              : [])
          ]
        }
      );


      socket.on(
        "call:start",
        ({
          receiverId,
          type
        }) => {

          io.to(`user:${receiverId}`)
            .emit(
              "call:incoming",
              {
                callerId: userId,
                type
              }
            );
        }
      );


      socket.on(
        "call:accept",
        ({ callerId }) => {

          io.to(`user:${callerId}`)
            .emit(
              "call:accepted",
              {
                userId
              }
            );
        }
      );


      socket.on(
        "call:reject",
        ({ callerId }) => {

          io.to(`user:${callerId}`)
            .emit(
              "call:rejected",
              {
                userId
              }
            );
        }
      );


      socket.on(
        "webrtc:offer",
        ({
          receiverId,
          offer
        }) => {

          io.to(`user:${receiverId}`)
            .emit(
              "webrtc:offer",
              {
                senderId: userId,
                offer
              }
            );
        }
      );


      socket.on(
        "webrtc:answer",
        ({
          receiverId,
          answer
        }) => {

          io.to(`user:${receiverId}`)
            .emit(
              "webrtc:answer",
              {
                senderId: userId,
                answer
              }
            );
        }
      );


      socket.on(
        "webrtc:ice",
        ({
          receiverId,
          candidate
        }) => {

          io.to(`user:${receiverId}`)
            .emit(
              "webrtc:ice",
              {
                senderId: userId,
                candidate
              }
            );
        }
      );


      socket.on(
        "call:end",
        ({ receiverId }) => {

          io.to(`user:${receiverId}`)
            .emit(
              "call:ended",
              {
                userId
              }
            );
        }
      );
    }
  );
}