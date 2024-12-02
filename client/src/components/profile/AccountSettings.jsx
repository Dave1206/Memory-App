import React, { useState, useEffect } from 'react';
import { useAxios } from '../auth/AxiosProvider';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPencilAlt } from '@fortawesome/free-solid-svg-icons';
import '../../styles/AccountSettings.css';

function AccountSettings({ user }) {
    const { axiosInstance } = useAxios();
    const [username, setUsername] = useState(user.username);
    const [email, setEmail] = useState(user.email);
    const [themePreference, setThemePreference] = useState('light');
    const [preferredLanguage, setPreferredLanguage] = useState('en');
    const [password, setPassword] = useState({ current: '', new: '', confirmNew: '' });
    const [languages] = useState(['en', 'es', 'fr', 'de', 'zh']);
    const [statusMessage, setStatusMessage] = useState('');
    const [hasChanges, setHasChanges] = useState(false);

    const [editingField, setEditingField] = useState({
        username: false,
        email: false,
        password: false,
    });
    
    const [originalValues, setOriginalValues] = useState({ username, email });
    const userId = user.id;

    useEffect(() => {
        const fetchAccountSettings = async () => {
            try {
                const response = await axiosInstance.get(`/user/preferences/${userId}`);
                const { account_settings } = response.data;
                setThemePreference(account_settings.theme || 'light');
                setPreferredLanguage(account_settings.language || 'en');
            } catch (error) {
                console.error("Error fetching account settings:", error);
            }
        };

        fetchAccountSettings();
    }, [axiosInstance, userId]);

    const handleSave = async () => {
        try {
            await axiosInstance.put(`/user/preferences/${userId}`, {
                accountSettings: {
                    username,
                    email,
                    theme: themePreference,
                    language: preferredLanguage
                }
            });
            setStatusMessage('Settings saved successfully.');
            setOriginalValues({ username, email });
            setHasChanges(false);
        } catch (error) {
            console.error("Error saving settings:", error);
            setStatusMessage("Failed to save settings");
        }
    };

    const handlePasswordChange = async () => {
        if (password.new !== password.confirmNew) {
            setStatusMessage("New passwords do not match");
            return;
        }
        try {
            await axiosInstance.put(`/user/change-password`, {
                userId,
                currentPassword: password.current,
                newPassword: password.new
            });
            setStatusMessage("Password updated successfully");
            setPassword({ current: '', new: '', confirmNew: '' });
            setEditingField({ ...editingField, password: false });
        } catch (error) {
            console.error("Error updating password:", error);
            setStatusMessage("Failed to update password");
        }
    };

    const handleFieldChange = (field, value) => {
        setHasChanges(true);
        if (field === 'username') setUsername(value);
        if (field === 'email') setEmail(value);
    };

    const handleCancelEdit = (field) => {
        setEditingField({ ...editingField, [field]: false });
        if (field === 'username') setUsername(originalValues.username);
        if (field === 'email') setEmail(originalValues.email);
        if (field === 'password') setPassword({ current: '', new: '', confirmNew: '' });
    };

    return (
        <div className='account-settings-wrapper'>
            <h2>Account Settings</h2>
            <div className="account-settings">
                <div className='settings-group'>
                    {/* Username */}
                    <div className="setting">
                        <label htmlFor="username">Username:</label>
                        {editingField.username ? (
                            <>
                                <input
                                    type="text"
                                    id="username"
                                    value={username}
                                    onChange={(e) => handleFieldChange('username', e.target.value)}
                                />
                                <button
                                    className="settings-button save-button"
                                    onClick={() => setEditingField({ ...editingField, username: false })}
                                >
                                    Save
                                </button>
                                <button
                                    className="settings-button cancel-button"
                                    onClick={() => handleCancelEdit('username')}
                                >
                                    Cancel
                                </button>
                            </>
                        ) : (
                            <>
                                <span>{username}</span>
                                <button
                                    className="settings-button edit-button"
                                    onClick={() => setEditingField({ ...editingField, username: true })}
                                    aria-label="Edit username"
                                >
                                    <FontAwesomeIcon icon={faPencilAlt} />
                                </button>
                            </>
                        )}
                    </div>

                    {/* Email */}
                    <div className="setting">
                        <label htmlFor="email">Email:</label>
                        {editingField.email ? (
                            <>
                                <input
                                    type="email"
                                    id="email"
                                    value={email}
                                    onChange={(e) => handleFieldChange('email', e.target.value)}
                                />
                                <button
                                    className="settings-button save-button"
                                    onClick={() => setEditingField({ ...editingField, email: false })}
                                >
                                    Save
                                </button>
                                <button
                                    className="settings-button cancel-button"
                                    onClick={() => handleCancelEdit('email')}
                                >
                                    Cancel
                                </button>
                            </>
                        ) : (
                            <>
                                <span>{email}</span>
                                <button
                                    className="settings-button edit-button"
                                    onClick={() => setEditingField({ ...editingField, email: true })}
                                    aria-label="Edit email"
                                >
                                    <FontAwesomeIcon icon={faPencilAlt} />
                                </button>
                            </>
                        )}
                    </div>

                    {/* Change Password */}
                    <div className="setting password-form">
                        {editingField.password ? (
                            <>
                                <input
                                    type="password"
                                    placeholder="Current Password"
                                    value={password.current}
                                    onChange={(e) => setPassword({ ...password, current: e.target.value })}
                                />
                                <input
                                    type="password"
                                    placeholder="New Password"
                                    value={password.new}
                                    onChange={(e) => setPassword({ ...password, new: e.target.value })}
                                />
                                <input
                                    type="password"
                                    placeholder="Confirm New Password"
                                    value={password.confirmNew}
                                    onChange={(e) => setPassword({ ...password, confirmNew: e.target.value })}
                                />
                                <div className='button-container'>
                                    <button className="settings-button save-button" onClick={handlePasswordChange}>Save</button>
                                    <button className="settings-button cancel-button" onClick={() => handleCancelEdit('password')}>Cancel</button>
                                </div>
                            </>
                        ) : (
                            <button
                                className="settings-button edit-button"
                                onClick={() => setEditingField({ ...editingField, password: true })}
                            >
                                Change Password
                            </button>
                        )}
                    </div>
                </div>
                
                <div className='settings-group'>
                    {/* Theme Preference */}
                    <div className="setting">
                        <label htmlFor="theme-preference">Theme Preference:</label>
                        <select
                            id="theme-preference"
                            value={themePreference}
                            onChange={(e) => {
                                setThemePreference(e.target.value);
                                setHasChanges(true);
                            }}
                        >
                            <option value="light">Light</option>
                            <option value="dark">Dark</option>
                        </select>
                    </div>

                    {/* Preferred Language */}
                    <div className="setting">
                        <label htmlFor="preferred-language">Preferred Language:</label>
                        <select
                            id="preferred-language"
                            value={preferredLanguage}
                            onChange={(e) => {
                                setPreferredLanguage(e.target.value);
                                setHasChanges(true);
                            }}
                        >
                            {languages.map(lang => (
                                <option key={lang} value={lang}>
                                    {lang.toUpperCase()}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <button
                    className="settings-button save-button"
                    onClick={handleSave}
                    disabled={!hasChanges}
                >
                    Save Settings
                </button>
                <p aria-live="polite">{statusMessage}</p>
            </div>
        </div>
    );
}

export default AccountSettings;
