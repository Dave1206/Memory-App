import db from '../server.js';

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
    const { conversation_id, seenMessageIds } = message;
    console.log(message);

    try {
        await db.query(
            `UPDATE message_status
             SET seen = TRUE, seen_at = CURRENT_TIMESTAMP
             WHERE user_id = $1 AND message_id = ANY($2::int[])`,
            [userId, seenMessageIds]
        );

        const participants = await db.query(
            `SELECT user_id FROM conversation_participants WHERE conversation_id = $1 AND user_id != $2`,
            [conversation_id, userId]
        );

        participants.rows.forEach(participant => {
            if (connectedClients[participant.user_id]) {
                connectedClients[participant.user_id].forEach(client => {
                    client.send(JSON.stringify({
                        type: 'message_seen',
                        data: { conversation_id, seenMessageIds }
                    }));
                });
            }
        });
    } catch (error) {
        console.error("Error handling mark_seen WebSocket event:", error);
    }
}
