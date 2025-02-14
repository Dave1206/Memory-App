import db from '../server.js';

const debounceTimers = new Map();
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

        const conversationUpdate = {
          conversation_id,
          last_message_content: newMessage.content,
          last_message_sender: '',
          last_message_time: newMessage.sent_at,
        };
    
        const senderResult = await db.query(
          `SELECT username FROM users WHERE id = $1`,
          [senderId]
        );
        if (senderResult.rows.length > 0) {
          conversationUpdate.last_message_sender = senderResult.rows[0].username;
        }

        const allParticipantIds = participants.rows.map(row => row.user_id);

        allParticipantIds.forEach(participantId => {
            if (connectedClients[participantId]) {
                connectedClients[participantId].forEach(client => {
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

    try {
      // Optionally broadcast the regular "message_seen" event...
      const participantsResult = await db.query(
        `SELECT user_id FROM conversation_participants 
         WHERE conversation_id = $1 AND user_id != $2`,
        [conversationId, userId]
      );
      const participants = participantsResult.rows;
      participants.forEach(participant => {
        if (connectedClients[participant.user_id]) {
          connectedClients[participant.user_id].forEach(client => {
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

    // Recalculate the last seen message for the conversation (ignoring messages sent by the user)
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

    // Build the conversation update payload. You can also include updated preview data if desired.
    const conversationUpdate = {
      conversation_id: conversationId,
      last_seen_message_id: lastSeenMessageId,
    };

    // Broadcast this conversation update event to all participants in the conversation.
    try {
      const partsResult = await db.query(
        `SELECT user_id FROM conversation_participants WHERE conversation_id = $1`,
        [conversationId]
      );
      const participantIds = partsResult.rows.map(row => row.user_id);
      participantIds.forEach(participantId => {
        if (connectedClients[participantId]) {
          connectedClients[participantId].forEach(client => {
            client.send(JSON.stringify({
              type: 'conversation_update',
              data: conversationUpdate
            }));
          });
        }
      });
    } catch (error) {
      console.error("Error broadcasting conversation update:", error);
    }
  }, 300);

  debounceTimers.set(key, timer);
}
