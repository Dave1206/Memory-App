import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useAxios } from '../auth/AxiosProvider';
import ModerationQueue from './ModerationQueue';
import '../../styles/ModeratorTools.css';

function ModeratorTools() {
    const { user } = useAuth();
    const axiosInstance = useAxios();
    const [bannedUsername, setBannedUsername] = useState('');
    const [banDuration, setBanDuration] = useState('');
    const [banReason, setBanReason] = useState('');
    const [notes, setNotes] = useState('');
    const [auditLog, setAuditLog] = useState([]);
    const [modNotes, setModNotes] = useState([]);

    const fetchAuditLog = useCallback(async () => {
        if (user.role === 'admin') {
            try {
                const response = await axiosInstance.get('/admin/audit-log');
                setAuditLog(response.data);
            } catch (error) {
                console.error("Error fetching audit log:", error);
            }
        }
    }, [axiosInstance, user.role]);

    const fetchModeratorNotes = useCallback(async () => {
        try {
            const response = await axiosInstance.get('/moderate/notes');
            setModNotes(response.data);
        } catch (error) {
            console.error("Error fetching moderator notes:", error);
        }
    }, [axiosInstance]);

    useEffect(() => {
        fetchAuditLog();
    }, [fetchAuditLog]);

    useEffect(() => {
        fetchModeratorNotes();
    }, [fetchModeratorNotes]);

    const handleBanUser = async () => {
        try {
            const durationDays = parseBanDuration(banDuration);
            await axiosInstance.post('/moderate/ban', { username: bannedUsername, duration: durationDays, reason: banReason });
            setBannedUsername('');
            setBanDuration('');
            setBanReason('');
            alert(`User ${bannedUsername} has been banned for ${banDuration}.`);
        } catch (error) {
            console.error("Error banning user:", error);
        }
    };

    const parseBanDuration = (input) => {
        const durationMatch = input.match(/(\d+)\s*(day|days|week|weeks|month|months|permanent)/i);
        if (!durationMatch) return 0; 
        const quantity = parseInt(durationMatch[1], 10);
        const unit = durationMatch[2].toLowerCase();
        switch (unit) {
            case 'day': case 'days': return quantity;
            case 'week': case 'weeks': return quantity * 7;
            case 'month': case 'months': return quantity * 30;
            default: return 0;
        }
    };

    const handleAddNote = async () => {
        try {
            await axiosInstance.post('/moderate/notes', { note: notes });
            setNotes('');
            fetchModeratorNotes();
        } catch (error) {
            console.error("Error adding moderator note:", error);
        }
    };

    const handleClearModNotes = async () => {
        try {
            await axiosInstance.delete('/admin/clear-moderator-notes');
            fetchModeratorNotes();
            alert("Moderator notes cleared.");
        } catch (error) {
            console.error("Error clearing moderator notes:", error);
        }
    };

    const handleClearAuditLog = async () => {
        try {
            await axiosInstance.delete('/admin/clear-audit-logs');
            fetchAuditLog();
            alert("Audit log cleared.");
        } catch (error) {
            console.error("Error clearing audit log:", error);
        }
    };

    return (
        <>
        <h2 className="moderator-tools-header">Moderator Tools</h2>
        <div className="moderator-tools">
            <div className="moderator-tools-group">
                <section className="audit-log-wrapper">
                    {user.role === 'admin' && (
                        <>
                            <h3>Audit Log</h3>
                            <div className="audit-log">
                                {auditLog.map((log, index) => (
                                    <div key={index} className="audit-log-entry">
                                        <p><strong>{log.moderator_username}</strong> {log.action} on {new Date(log.date).toLocaleString()}</p>
                                    </div>
                                ))}
                            </div>
                            <button className="admin-button" onClick={handleClearAuditLog}>Clear Audit Log</button>
                        </>
                    )}
                </section>
                <section>
                    <h3>Moderator Notes</h3>
                    <div className="mod-notes">
                        {modNotes.map((note, index) => (
                            <div key={index} className="mod-note">
                                <p><strong>{note.moderator_username}</strong>: {note.note}</p>
                            </div>
                        ))}
                    </div>
                    <textarea 
                        placeholder="Leave a note for other moderators..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                    />
                    <button className="mod-button" onClick={handleAddNote}>Add Note</button>
                    {user.role === 'admin' && (
                        <button className="admin-button" onClick={handleClearModNotes}>Clear Moderator Notes</button>
                    )}
                </section>
            </div>
            <div className="moderator-tools-group">
                <section id="ban-user-section">
                    <h3>Ban User</h3>
                    <div className="ban-user-form">
                        <input 
                            type="text"
                            placeholder="Username"
                            value={bannedUsername}
                            onChange={(e) => setBannedUsername(e.target.value)}
                        />
                        <input 
                            type="text"
                            placeholder="Ban Duration (e.g., '7 days', 'permanent')"
                            value={banDuration}
                            onChange={(e) => setBanDuration(e.target.value)}
                        />
                        <textarea 
                            id="reason-input"
                            placeholder="Reason..."
                            value={banReason}
                            onChange={(e) => setBanReason(e.target.value)}
                        />
                        <button className="mod-button" onClick={handleBanUser}>Ban User</button>
                    </div>
                </section>
                <section id="picture-mod-queue-section">
                    <h3>Profile Picture Moderation Queue</h3>
                    <ModerationQueue />
                </section>
            </div>
        </div>
        </>
    );
}

export default ModeratorTools;
