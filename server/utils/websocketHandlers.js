import db from '../server.js';

const debounceTimers = new Map();
const notificationTimers = new Map();
const pendingMarkSeenEvents = new Map();

export async function handleSendMessage(message, senderId, connectedClients) {
  const { conversation_id, content, media_url } = message;
  try {
    const newMessageResult = await db.query(
      `INSERT INTO messages (conversation_id, sender_id, content, media_url, sent_at) 
             VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) 
             RETURNING *`,
      [conversation_id, senderId, content, media_url]
    );

    const newMessage = newMessageResult.rows[0];

    const participants = await db.query(
      `SELECT user_id FROM conversation_participants WHERE conversation_id = $1`,
      [conversation_id]
    );

    const messageId = newMessage.message_id;
    const recipientIds = participants.rows
      .map(row => row.user_id)
      .filter(id => parseInt(id) !== parseInt(senderId));

    await db.query(
      `INSERT INTO message_status (message_id, user_id, seen, seen_at)
             SELECT $1, unnest($2::int[]), FALSE, NULL`,
      [messageId, recipientIds]
    );

    const senderResult = await db.query(
      `SELECT username FROM users WHERE id = $1`,
      [senderId]
    );
    const senderUsername = senderResult.rows[0]?.username || "Unknown";

    const conversationUpdate = {
      conversation_id,
      last_message_content: newMessage.content,
      last_message_sender: senderUsername,
      last_message_time: newMessage.sent_at,
    };

    const allParticipantIds = participants.rows.map(row => row.user_id);

    allParticipantIds.forEach(participantId => {
      if (connectedClients.messenger[participantId]) {
        connectedClients.messenger[participantId].forEach(client => {
          client.send(JSON.stringify({
            type: 'new_message',
            data: newMessage
          }));
          client.send(JSON.stringify({
            type: 'conversation_update',
            data: conversationUpdate
          }));
        });
      }
    });

    recipientIds.forEach(async (recipientId) => {
      if (!connectedClients.messenger[recipientId]) {
        console.log(`📩 User ${recipientId} is not in Messenger, sending notification...`);
        await handleSendNotification(
          {
            recipientId,
            message: `${senderUsername} sent you a new message`,
            type: "message",
          },
          senderId,
          connectedClients
        );
      } else {
        console.log(`✅ User ${recipientId} is already in Messenger, skipping notification.`);
      }
    });

  } catch (error) {
    console.error("Error handling send_message WebSocket event:", error);
  }
}

export async function handleMarkSeen(message, userId, connectedClients) {
  const { conversationId, messageIds } = message;
  const key = `${userId}-${conversationId}`;

  let pendingIds = pendingMarkSeenEvents.get(key) || new Set();
  messageIds.forEach(id => pendingIds.add(id));
  pendingMarkSeenEvents.set(key, pendingIds);

  if (debounceTimers.has(key)) {
    clearTimeout(debounceTimers.get(key));
  }

  const timer = setTimeout(async () => {
    const idsToUpdate = Array.from(pendingMarkSeenEvents.get(key));
    pendingMarkSeenEvents.delete(key);
    debounceTimers.delete(key);

    try {
      await db.query(
        `UPDATE message_status
         SET seen = TRUE, seen_at = CURRENT_TIMESTAMP
         WHERE user_id = $1
           AND message_id = ANY($2::int[])
           AND message_id NOT IN (
             SELECT message_id FROM messages WHERE sender_id = $1
           )`,
        [userId, idsToUpdate]
      );
    } catch (error) {
      console.error("Error updating message_status:", error);
    }

    const numMessagesSeen = messageIds.length;

    try {
      const participantsResult = await db.query(
        `SELECT user_id FROM conversation_participants 
         WHERE conversation_id = $1`,
        [conversationId]
      );
      const participants = participantsResult.rows;
      participants.forEach(participant => {
        if (connectedClients.messenger[participant.user_id]) {
          connectedClients.messenger[participant.user_id].forEach(client => {
            client.send(JSON.stringify({
              type: 'message_seen',
              data: { conversationId, messageIds: idsToUpdate, seenUser: userId }
            }));
          });
        }
      });
    } catch (error) {
      console.error("Error broadcasting message_seen:", error);
    }

    let lastSeenMessageId = null;
    try {
      const lastSeenResult = await db.query(
        `SELECT CASE 
                 WHEN (
                   SELECT m_last.sender_id 
                   FROM messages m_last 
                   WHERE m_last.conversation_id = $1 
                   ORDER BY m_last.sent_at DESC 
                   LIMIT 1
                 ) = $2
                 THEN (
                   SELECT m_last2.message_id 
                   FROM messages m_last2 
                   WHERE m_last2.conversation_id = $1 
                   ORDER BY m_last2.sent_at DESC 
                   LIMIT 1
                 )
                 ELSE (
                   SELECT m3.message_id
                   FROM messages m3
                   JOIN message_status ms2 ON m3.message_id = ms2.message_id
                   WHERE m3.conversation_id = $1
                     AND m3.sender_id <> $2
                     AND ms2.user_id = $2
                     AND ms2.seen = TRUE
                   ORDER BY m3.sent_at DESC
                   LIMIT 1
                 )
               END AS last_seen_message_id`,
        [conversationId, userId]
      );
      if (lastSeenResult.rows.length > 0) {
        lastSeenMessageId = lastSeenResult.rows[0].message_id;
      }
    } catch (error) {
      console.error("Error recalculating last seen message:", error);
    }

    const conversationUpdate = {
      conversation_id: conversationId,
      last_seen_message_id: lastSeenMessageId,
      seen_messages: idsToUpdate,
      seen_user: userId,
    };

    try {
      const partsResult = await db.query(
        `SELECT user_id FROM conversation_participants WHERE conversation_id = $1`,
        [conversationId]
      );
      const participantIds = partsResult.rows
      .map(row => row.user_id)
      .filter(id => id !== null && id !== userId);
      participantIds.forEach(participantId => {
        if (connectedClients.messenger[participantId]) {
          connectedClients.messenger[participantId].forEach(client => {
            client.send(JSON.stringify({
              type: 'conversation_update',
              data: conversationUpdate
            }));
          });
        }
      });

      if (numMessagesSeen > 0) {
        handleSendNotification({
            recipientId: userId,
            message: "Updated unread message count",
            type: "message_seen",
            read_messages: numMessagesSeen
        }, userId, connectedClients);
    }

    } catch (error) {
      console.error("Error broadcasting conversation update:", error);
    }
  }, 300);

  debounceTimers.set(key, timer);
}

export async function handleSendNotification(notification, senderId, connectedClients) {
  const { recipientId, message, type = "general", eventId = null, memoryId = null, read_messages = null } = notification;

  if (notificationTimers.has(recipientId)) {
    clearTimeout(notificationTimers.get(recipientId));
  }

  const timer = setTimeout(async () => {
    console.log(`📩 Sending ${type} notification to user ${recipientId}: ${message}`);

    try {
      let newNotification;
      if (type !== 'message_seen') {
      const insertNotification = await db.query(
        `INSERT INTO notifications (user_id, message, event_id, memory_id, read, created_at) 
           VALUES ($1, $2, $3, $4, FALSE, NOW()) 
           RETURNING *`,
        [recipientId, message, eventId, memoryId]
      );
      newNotification = insertNotification.rows[0];
    } else {
      newNotification = {
        user_id: recipientId,
        message: message,
      }
    }

      newNotification.type = type;
      newNotification.read_messages = read_messages;
      if (connectedClients.navbar[recipientId]) {
        console.log(`📡 Sending WebSocket notification to user ${recipientId}`);
        connectedClients.navbar[recipientId].forEach(client => {
          client.send(JSON.stringify({
            type: 'new_notification',
            data: newNotification
          }));
        });
      } else {
        console.log(`❌ User ${recipientId} is not connected via WebSocket`);
      }

    } catch (error) {
      console.error("Error sending notification:", error);
    } finally {
      notificationTimers.delete(recipientId);
    }
  }, 300);

  notificationTimers.set(recipientId, timer);

}

export async function handleConversationUpdate(message, userId, connectedClients) {
  try {
    const { conversation_id, unread_messages } = message;
    const conversationUpdate = {
      conversation_id,
      unread_messages,
    };

    const participantsResult = await db.query(
      `SELECT user_id FROM conversation_participants WHERE conversation_id = $1`,
      [conversation_id]
    );

    const participantIds = participantsResult.rows
    .map(row => row.user_id)
    .filter(id => id !== null && id !== userId);

    participantIds.forEach(participantId => {
      if (!participantId || isNaN(participantId)) {
        console.warn(`⚠️ Skipping invalid participantId:`, participantId);
        return;
      }

      if (connectedClients.messenger[participantId]) {
        connectedClients.messenger[participantId].forEach(client => {
          try {
            client.send(JSON.stringify({
              type: 'conversation_update',
              data: conversationUpdate
            }));
          } catch (sendError) {
            console.error(`❌ Error sending WebSocket message to participant ${participantId}:`, sendError);
          }
        });
      } else {
        console.warn(`⚠️ No active WebSocket connection for participant ${participantId}`);
      }
    });

  } catch (error) {
    console.error("❌ Error handling conversation update:", error);
  }
}