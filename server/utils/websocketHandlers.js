import db from '../server.js';

const debounceTimers = new Map();
const pendingMarkSeenEvents = new Map();

export async function handleSendMessage(message, senderId, connectedClients) {
    const { conversation_id, content, media_url } = message;
    console.log(message);

    try {
        const newMessage = await db.query(
            `INSERT INTO messages (conversation_id, sender_id, content, media_url, sent_at) 
             VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) 
             RETURNING *`,
            [conversation_id, senderId, content, media_url]
        );

        const participants = await db.query(
            `SELECT user_id FROM conversation_participants WHERE conversation_id = $1`,
            [conversation_id]
        );

        const messageId = newMessage.rows[0].message_id;
        const recipientIds = participants.rows.map(row => row.user_id);

        await db.query(
            `INSERT INTO message_status (message_id, user_id, seen, seen_at)
             SELECT $1, unnest($2::int[]), FALSE, NULL`,
            [messageId, recipientIds]
        );

        recipientIds.forEach(recipientId => {
            if (connectedClients[recipientId]) {
                connectedClients[recipientId].forEach(client => {
                    client.send(JSON.stringify({
                        type: 'new_message',
                        data: newMessage.rows[0]
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
                data: { conversationId, messageIds: idsToUpdate }
              }));
            });
          }
        });
      } catch (error) {
        console.error("Error broadcasting message_seen:", error);
      }
    }, 300);
  
    debounceTimers.set(key, timer);
  }
