import { Server } from "socket.io";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export function setupMessaging(io: Server) {
  io.on("connection", (socket) => {
    const userId = socket.handshake.auth?.userId as string | undefined;

    if (!userId) {
      socket.disconnect(true);
      return;
    }

    socket.join(`user:${userId}`);

    socket.emit("messaging:connected", {
      userId,
      socketId: socket.id
    });

    socket.on("conversation:join", async (conversationId: string) => {
      try {
        const participant =
          await prisma.conversationParticipant.findFirst({
            where: {
              conversationId,
              userId
            }
          });

        if (!participant) {
          socket.emit("messaging:error", {
            message: "You are not a participant in this conversation."
          });
          return;
        }

        socket.join(`conversation:${conversationId}`);

        socket.emit("conversation:joined", {
          conversationId
        });
      } catch (error) {
        console.error("conversation:join error:", error);
      }
    });

    socket.on(
      "message:send",
      async (payload: {
        conversationId: string;
        body: string;
      }) => {
        try {
          const conversationId = payload?.conversationId;
          const body = payload?.body?.trim();

          if (!conversationId || !body) {
            socket.emit("messaging:error", {
              message: "conversationId and message body are required."
            });
            return;
          }

          if (body.length > 10000) {
            socket.emit("messaging:error", {
              message: "Message is too long."
            });
            return;
          }

          const participant =
            await prisma.conversationParticipant.findFirst({
              where: {
                conversationId,
                userId
              }
            });

          if (!participant) {
            socket.emit("messaging:error", {
              message: "You are not a participant in this conversation."
            });
            return;
          }

          const message = await prisma.message.create({
            data: {
              conversationId,
              senderId: userId,
              body
            }
          });

          io.to(`conversation:${conversationId}`).emit(
            "message:new",
            message
          );

          socket.emit("message:sent", {
            messageId: message.id,
            conversationId
          });
        } catch (error) {
          console.error("message:send error:", error);

          socket.emit("messaging:error", {
            message: "Unable to send message."
          });
        }
      }
    );

    socket.on(
      "typing:start",
      (conversationId: string) => {
        socket
          .to(`conversation:${conversationId}`)
          .emit("typing:start", {
            conversationId,
            userId
          });
      }
    );

    socket.on(
      "typing:stop",
      (conversationId: string) => {
        socket
          .to(`conversation:${conversationId}`)
          .emit("typing:stop", {
            conversationId,
            userId
          });
      }
    );

    socket.on("disconnect", () => {
      console.log(`Messaging disconnected: ${userId}`);
    });
  });
}