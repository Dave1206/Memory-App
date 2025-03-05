import express from "express";
import cors from "cors";
import http from 'http';
import pg from "pg";
import bcrypt from "bcrypt";
import session from "express-session";
import pgSession from "connect-pg-simple";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import env from "dotenv";
import nodemailer from "nodemailer";
import crypto from "crypto";
import multer from "multer";
import sharp from "sharp";
import { moderateImageContent } from './contentModeration.js';
import cloudinary from 'cloudinary';
import axios from "axios";
import { WebSocketServer } from "ws";
import { handleSendMessage, handleMarkSeen } from "./utils/websocketHandlers.js";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

env.config();
const app = express();
const port = process.env.PORT || 4747;
const saltRounds = 10;

let db;

if (process.env.NODE_ENV === 'production' && process.env.DATABASE_URL) {
  // In production (Heroku), use DATABASE_URL and enable SSL
  db = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
} else {
  // In local development, use your individual PG_* variables
  db = new pg.Client({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
  });
}

db.connect();

app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(express.json());
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);
app.use(
  session({
    store: new (pgSession(session))({
      conObject: {
        user: process.env.PG_USER,
        host: process.env.PG_HOST,
        database: process.env.PG_DATABASE,
        password: process.env.PG_PASSWORD,
        port: process.env.PG_PORT,
      },
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      maxAge: 1000 * 60 * 30,
      httpOnly: true,
      rolling: true,
      secure: process.env.NODE_ENV === "production", // Enable for HTTPS
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    },
  })
);
app.use(passport.initialize());
app.use(passport.session());

passport.use(
  "local",
  new LocalStrategy(
    { usernameField: "email", passwordField: "password" },
    async function verify(email, password, done) {
      try {
        const result = await db.query("SELECT * FROM users WHERE email = $1", [email]);
        if (result.rows.length > 0) {
          const user = result.rows[0];
          const isValid = await bcrypt.compare(password, user.password);
          if (isValid) {
            return done(null, user);
          } else {
            return done(null, false, { message: "Incorrect password." });
          }
        } else {
          return done(null, false, { message: "User not found." });
        }
      } catch (err) {
        return done(err);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const result = await db.query("SELECT * FROM users WHERE id = $1", [id]);
    const user = result.rows[0];
    done(null, user);
  } catch (err) {
    done(err);
  }
});

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit size to 5MB
  fileFilter(req, file, cb) {
      if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
          return cb(new Error('Please upload an image (jpg, jpeg, png).'));
      }
      cb(null, true);
  }
});

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(__dirname, '../client/build')));

  app.get('*', (req, res) => {
    res.sendFile(join(__dirname, '../client/build', 'index.html'));
  });
}

//server functions
function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized access" });
}

function isModerator(req, res, next) {
  if (req.user && (req.user.role === 'moderator' || req.user.role === 'admin')) {
      return next();
  }
  res.status(403).json({ error: 'Access denied. Moderator status required.' });
}

function isAdmin(req, res, next) {
  if (req.user && req.user.role === 'admin') {
      return next();
  }
  res.status(403).json({ error: 'Access denied. Admin status required.' });
}

async function notifyUser(userId, message) {
  await db.query(
      `INSERT INTO notifications (user_id, message) VALUES ($1, $2)`,
      [userId, message]
  );
}

async function logActivity(userId, actionType, description, relatedId = null, relatedType = null) {
  try {
    await db.query(
      `INSERT INTO activities_log (user_id, activity_type, description, related_id, related_type)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, actionType, description, relatedId, relatedType]
    );
    // console.log(`Activity logged: ${description}`);
  } catch (error) {
    console.error("Error logging activity:", error);
    throw new Error("Failed to log activity");
  }
}

const fetchIP = async() => {
  try{
    const response = await axios.get('https://api64.ipify.org?format=json');
    const data = response.data;
    return data.ip;
  } catch (error) {
    console.error("Error fetching IP:", error.message)
    return null;
  }
};

const fetchUserLocation = async (ip) => {
  try {
    const response = await axios.get(`http://ip-api.com/json/${ip}`);
    if (response.data.status === 'success') {
      return {
        city: response.data.city,
        region: response.data.regionName,
        country: response.data.country,
        lat: response.data.lat,
        lon: response.data.lon,
      };
    } else {
      throw new Error(`Unable to fetch location data: ${response.data.message}`);
    }
  } catch (error) {
    console.error('Error fetching user location:', error.message);
    return null;
  }
};

//auth routes
app.post("/register", async (req, res) => {
  const { username, email, password, confirmPassword } = req.body;
  const date = new Date().toISOString().replace("T", " ").replace("Z", "");

  try {
    const checkEmail = await db.query("SELECT * FROM users WHERE email = $1", [email]);
    const checkUser = await db.query("SELECT * FROM users WHERE username = $1", [username]);

    if (checkEmail.rows.length > 0) {
      return res.status(400).json({ message: "Email already registered." });
    } else if (checkUser.rows.length > 0) {
      return res.status(400).json({ message: "Username is unavailable." });
    } else if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords must match." });
    }

    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const result = await db.query(
      "INSERT INTO users (username, email, password, join_date) VALUES ($1, $2, $3, $4) RETURNING *",
      [username, email, hashedPassword, date]
    );

    const user = result.rows[0];

    await db.query(
      `INSERT INTO user_preferences 
      (user_id, account_settings, notification_settings, privacy_settings, data_settings) 
      VALUES ($1, 
      '{"theme": "dark", "language": "en"}', 
      '{"friend_request": true, "feed_activity": true, "event_invites": true}', 
      '{"profile_visibility": "public"}',
      '{"metadata_enabled": true, "location_enabled": false}')`,
      [user.id]
    );

    req.login(user, (err) => {
      if (err) return res.status(500).send("Server error on login.");
      res.status(201).json({ message: "User registered successfully", user });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error on registration." });
  }
});

app.post("/login", passport.authenticate("local"), (req, res) => {
  res.status(200).json({ message: "Login successful", user: req.user });
});

app.post("/logout", (req, res) => {
  const userId = req.user?.id;

  if (!userId) {
    console.error("User is not authenticated or userId is undefined.");
    return res.status(400).json({ message: "Cannot log out because user is not authenticated." });
  }

  req.logout(async (err) => {
    if (err) {
      return res.status(500).json({ message: "Server error on logout." });
    }

    if (userId) {
      try {
        await db.query("UPDATE users SET last_online = NOW() WHERE id = $1", [userId]);
      } catch (updateErr) {
        console.error("Error updating last_online:", updateErr);
        return res.status(500).json({ message: "Error updating last online status." });
      }
    }

    req.session.destroy((destroyErr) => {
      if (destroyErr) {
        console.error("Error destroying session:", destroyErr);
        return res.status(500).json({ message: "Error destroying session:", destroyErr });
      } else {
      }
      res.clearCookie("connect.sid");
      res.status(200).json({ message: "Logout successful" });
    });
  });
});

app.get('/auth/session', isAuthenticated, (req, res) => {
  if (req.user) {
    res.json({ user: req.user });
  } else {
    res.status(401).json({ message: 'No active session' });
  }
});

//events routes
app.get("/events", isAuthenticated, async(req, res) => {
  const userId = req.user.id;
  try {
    const eventOptIns = await db.query(
      `SELECT e.*, u.username, ep.has_shared_event, ep.has_shared_memory, ep.interaction_count, ep.status, ep.last_checked
      FROM events e
      JOIN users u ON e.created_by = u.id
      JOIN event_participation ep ON e.event_id = ep.event_id 
      WHERE ep.user_id = $1 AND ep.status = 'opted_in'`, [userId]
    );

    const eventInvites = await db.query(
      `SELECT e.*, u.username, ep.has_shared_memory, ep.interaction_count, ep.status, ep.last_checked
      FROM events e
      JOIN users u ON e.created_by = u.id
      JOIN event_participation ep ON e.event_id = ep.event_id 
      WHERE ep.user_id = $1 AND ep.status = 'invited'`, [userId]
    );

    const events = {
      Optins: eventOptIns.rows,
      Invites: eventInvites.rows
    }

    res.json(events)
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

app.post("/events", isAuthenticated, async(req,res) => {
  try {
    const { title, description, invites, eventType, revealDate, visibility, tags, location } = req.body.newEvent;
    const timeStamp = new Date(Date.now()+(1000*60*(-(new Date()).getTimezoneOffset()))).toISOString().replace('T',' ').replace('Z','');
    const newEvent = await db.query(
      `INSERT INTO events (title, description, created_by, creation_date, event_type, reveal_date, visibility, location) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`, 
      [title, description, req.user.id, timeStamp, eventType, revealDate, visibility, location]
    );
    
    const eventId = newEvent.rows[0].event_id;

    await db.query(
      "INSERT INTO event_participation (event_id, user_id, status) VALUES ($1, $2, $3)",
      [eventId, req.user.id, 'opted_in']
    );

    if (invites.length > 0){
      for (const userId of invites) {
        await db.query(
          "INSERT INTO event_participation (event_id, user_id, status) VALUES ($1, $2, $3)",
          [eventId, userId, 'invited']
        );
      }
    }

    if (tags.length > 0) {
      for (const tag of tags) {
        let tagResult = await db.query(`SELECT tag_id FROM event_tags WHERE tag_name = $1`, [tag]);

        if (tagResult.rows.length === 0) {
          tagResult = await db.query(`INSERT INTO event_tags (tag_name) VALUES ($1) RETURNING tag_id`, [tag]);
        }

        const tagId = tagResult.rows[0].tag_id;

        await db.query(`INSERT INTO event_tag_map (event_id, tag_id) VALUES ($1, $2)`, [eventId, tagId]);
      }
    }

    await logActivity(req.user.id, 'created_event', `Created a new event: ${title}`, eventId, 'event');
   
    res.json(newEvent.rows[0]);

  } catch(err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

app.post('/events/:eventId/start-interaction', isAuthenticated, async (req, res) => {
  const { eventId } = req.params;
  const userId = req.user.id;
  const interactionStart = new Date();

  try {
    await db.query(
      `
      INSERT INTO event_participation (user_id, event_id, interaction_count, interaction_start)
      VALUES ($1, $2, 1, $3)
      ON CONFLICT (user_id, event_id)
      DO UPDATE SET
        interaction_count = event_participation.interaction_count + 1,
        interaction_start = $3
      `,
      [userId, eventId, interactionStart]
    );
    res.status(200).json({ message: 'Interaction started successfully' });
  } catch (err) {
    console.error('Error starting interaction:', err.message);
    res.status(500).json({ error: 'Failed to start interaction' });
  }
});

app.post('/events/:eventId/end-interaction', isAuthenticated, async (req, res) => {
  const { eventId } = req.params;
  const userId = req.user.id;
  const interactionEnd = new Date();

  try {
    const { rows } = await db.query(
      `
      SELECT interaction_start, interaction_duration
      FROM event_participation
      WHERE user_id = $1 AND event_id = $2
      `,
      [userId, eventId]
    );

    if (rows.length === 0 || !rows[0].interaction_start) {
      return res.status(400).json({ error: 'Interaction not started' });
    }

    const interactionStart = new Date(rows[0].interaction_start);

    const interactionDuration = new Date(interactionEnd - interactionStart).toISOString().substr(11, 8);

    await db.query(
      `
      UPDATE event_participation
      SET interaction_end = $3,
          interaction_duration = COALESCE(interaction_duration, '00:00:00')::interval + $4::interval
      WHERE user_id = $1 AND event_id = $2
      `,
      [userId, eventId, interactionEnd, interactionDuration]
    );

    res.status(200).json({ message: 'Interaction ended successfully' });
  } catch (err) {
    console.error('Error ending interaction:', err.message);
    res.status(500).json({ error: 'Failed to end interaction' });
  }
});

app.post("/events/:eventId/opt-in", isAuthenticated, async(req,res) => {
  try {
    const userId = req.user.id;
    const eventId = req.params.eventId;

    await db.query(
      `
      INSERT INTO event_participation (event_id, user_id, status) 
      VALUES ($1, $2, 'opted_in')
      ON CONFLICT (event_id, user_id)
      DO UPDATE SET status = 'opted_in'
      `,
      [eventId, userId]
    );

    res.status(200).send("User opted in to event successfully.");
  } catch(err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

app.post("/events/:eventId/reject", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    const eventId = req.params.eventId;

    await db.query(
      "DELETE FROM event_participation WHERE event_id = $1 AND user_id = $2",
      [eventId, userId]
    );

    res.status(200).send("Event invite rejected successfully.");
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

app.post("/invite/:event_id", isAuthenticated, async (req, res) => {
  try {
    const { event_id } = req.params;
    const { usernames } = req.body;
    var users = [];
    for (let username of usernames) {
      const result = await db.query(
        "SELECT * FROM users WHERE username = $1",
        [username]
      )
      users.push(result.rows[0]);
    }
    for (let user of users) {
      await db.query (
        "INSERT INTO event_participation (event_id, user_id, status) VALUES ($1, $2, $3)",
          [event_id, user.id, 'invited']
      );
    }

  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
})

app.post("/deleteevent/:event_id", isAuthenticated, async (req, res) => {
  const { event_id } = req.params;
  const userId = req.user.id;

  try {
    await db.query("BEGIN");

    const eventResult = await db.query("SELECT created_by FROM events WHERE event_id = $1", [event_id]);

    if (eventResult.rows.length === 0) {
      await db.query("ROLLBACK");
      return res.status(404).json({ message: "Event not found" });
    }

    const isCreator = userId === eventResult.rows[0].created_by;

    if (isCreator) {
      await db.query("DELETE FROM event_participation WHERE event_id = $1", [event_id]);
      await db.query("DELETE FROM memories WHERE event_id = $1", [event_id]);
      await db.query("DELETE FROM event_tag_map WHERE event_id = $1", [event_id]);
      await db.query("DELETE FROM events WHERE event_id = $1", [event_id]);

      await db.query("COMMIT");
      return res.status(200).json({ message: "Event deleted successfully" });
    } else {
      await db.query(
        "DELETE FROM event_participation WHERE event_id = $1 AND user_id = $2",
        [event_id, userId]
      );
      await db.query(
        "DELETE FROM memories WHERE event_id = $1 AND user_id = $2",
        [event_id, userId]
      );

      await db.query("COMMIT");
      return res.status(200).json({ message: "Participation removed"});
    }
  } catch (err) {
    await db.query("ROLLBACK");
    console.error("Error deleting event:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/events/:event_id/memories", isAuthenticated, async (req, res) => {
  try {
    const { event_id } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    const invite = await db.query(
      "SELECT * FROM event_participation WHERE event_id = $1 AND user_id = $2",
      [event_id, userId]
    );

    const eventTitle = await db.query(
      "SELECT title FROM events WHERE event_id = $1",
      [event_id]
    );

    if (invite.rows[0].has_shared_memory) {
      return res.status(400).send("You have already shared your memory");
    }

    await db.query(
      "INSERT INTO memories (event_id, user_id, content) VALUES ($1, $2, $3)",
      [event_id, userId, content]
    );

    await db.query(
      "UPDATE event_participation SET has_shared_memory = true WHERE event_id = $1 AND user_id = $2",
      [event_id, userId]
    );

    await logActivity(userId, 'shared_memory', `Shared a memory for event: ${eventTitle.rows[0]}`, event_id, 'memory');

    res.send("Memory shared successfully");
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

app.get("/events/:event_id/memories", isAuthenticated, async (req, res) => {
  try {
    const { event_id: eventId } = req.params;
    const userId = req.user.id;

    await db.query(
      `UPDATE event_participation
       SET last_checked = NOW()
       WHERE user_id = $1 AND event_id = $2`,
      [userId, eventId]
    );  
   
    const invite = await db.query(
      "SELECT * FROM event_participation WHERE event_id = $1 AND user_id = $2",
      [eventId, userId]
    );

    if (invite.rows.length > 0) {
      const memories = await db.query(
        "SELECT u.username, m.content, m.shared_date FROM memories m JOIN users u ON m.user_id = u.id WHERE m.event_id = $1",
        [eventId]
      );

      res.json(memories.rows);
    }

  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

app.post('/events/:eventId/like', isAuthenticated, async (req, res) => {
  const userId = req.user.id;
  const eventId = req.params.eventId;

  try {
    const event = await db.query('SELECT * FROM events WHERE event_id = $1', [eventId]);
    if (event.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const participation = await db.query(`
      SELECT has_liked FROM event_participation 
      WHERE user_id = $1 AND event_id = $2
    `, [userId, eventId]);

    let query, message;
    if (participation.rows.length > 0 && participation.rows[0].has_liked) {
      query = `
        UPDATE event_participation
        SET has_liked = false
        WHERE user_id = $1 AND event_id = $2
      `;
      message = 'Event like removed successfully';
      await logActivity(userId, 'unliked_event', `Unliked an event: ${event.rows[0].title}`, eventId, 'event');
    } else {
      query = `
        INSERT INTO event_participation (user_id, event_id, has_liked)
        VALUES ($1, $2, true)
        ON CONFLICT (user_id, event_id)
        DO UPDATE SET has_liked = true
      `;
      message = 'Event liked successfully';
      await logActivity(userId, 'liked_event', `Liked an event: ${event.rows[0].title}`, eventId, 'event');
    }

    await db.query(query, [userId, eventId]);

    res.status(200).json({ message });
    
  } catch (error) {
    console.error('Error toggling like on event:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


app.post('/events/:eventId/share', isAuthenticated, async (req, res) => {
  const userId = req.user.id;
  const eventId = req.params.eventId;

  try {
      const event = await db.query('SELECT * FROM events WHERE event_id = $1', [eventId]);
      if (event.rows.length === 0) {
          return res.status(404).json({ message: 'Event not found' });
      }

      const participation = await db.query(`
        SELECT has_shared_event FROM event_participation 
        WHERE user_id = $1 AND event_id = $2
    `, [userId, eventId]);

    if (participation.rows.length > 0 && participation.rows[0].has_shared_event) {
        return res.status(200).json({ message: 'You have already shared this event' });
    }

      const query = `
            INSERT INTO event_participation (user_id, event_id, has_shared_event)
            VALUES ($1, $2, true)
            ON CONFLICT (user_id, event_id)
            DO UPDATE SET has_shared_event = true;
        `;

        await db.query(query, [userId, eventId]);

      await logActivity(userId, 'shared_event', `Shared an event: ${event.rows[0].title}`, eventId, 'event');

      res.status(200).json({ message: 'Event successfully shared' });

  } catch (error) {
      console.error('Error sharing event:', error);
      res.status(500).json({ message: 'Internal server error' });
  }
});

// User data routes
app.get("/user/:userId", isAuthenticated, async (req, res) => {
  try {
    const { userId } = req.params;
    const requesterId = req.user.id;
    const { purpose } = req.query;

    const userResult = await db.query("SELECT * FROM users WHERE id = $1", [userId]);
    const userPreferences = await db.query(
      `SELECT privacy_settings FROM user_preferences WHERE user_id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const profileUser = userResult.rows[0];
    const privacySettings = userPreferences.rows[0]?.privacy_settings || {};
    let isBlocked = false;
    let isPrivate = false;

    if (String(userId) !== String(requesterId)) {
      const blockResult = await db.query(
        "SELECT * FROM blocks WHERE blocker_id = $1 AND blocked_id = $2",
        [userId, requesterId]
      );
      isBlocked = blockResult.rows.length > 0 || false;

      if (purpose === "profile" && privacySettings?.profile_visibility === 'private') {
        isPrivate = true;
      }
    }

    if (isBlocked) {
      return res.status(403).json({ blocked: true });
    }
    if (isPrivate) {
      return res.status(403).json({ private: true });
    }

    res.json({ ...profileUser, blocked: isBlocked, private: isPrivate });
    
  } catch (err) {
      console.error("Error fetching user data:", err.message);
      res.status(500).send("Server Error");
  }
});

app.get("/location", isAuthenticated, async (req, res) => {
  try {
    const clientIp = await fetchIP();
    const locationData = await fetchUserLocation(clientIp);

    res.json(locationData);
  } catch (err) {
      console.error("Error fetching user location:", err.message);
      res.status(500).send("Server Error");
  }
});

app.get('/feed', isAuthenticated, async (req, res) => {
  const userId = req.user.id;
  const { search, filters: rawFilters, sortOrder = 'asc', limit = 10, offset = 0 } = req.query;

  let filters;
  try {
      filters = rawFilters ? JSON.parse(rawFilters) : {}; // Parse filters or fallback to empty object
  } catch (err) {
      console.error('Invalid filters:', rawFilters);
      return res.status(400).json({ error: 'Invalid filters format' });
  }
  const validSortFields = ['likes_count', 'memories_count', 'creation_date'];
  const selectedSortField = validSortFields.includes(filters.sortBy) ? filters.sortBy : 'creation_date';
  const selectedSortOrder = sortOrder.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

  let feedQuery = `
      SELECT e.event_id, e.title, e.description, e.creation_date, e.event_type, e.reveal_date, u.username, e.created_by, u.profile_picture, e.visibility, ep.has_shared_memory,
            COUNT(likes.event_id) AS likes_count,
            COUNT(shares.event_id) AS shares_count,
            COUNT(ep.interaction_count) AS interaction_count,
            (SELECT COUNT(*) FROM memories m WHERE m.event_id = e.event_id) AS memories_count,
            MAX(CASE WHEN ep.user_id = $1 THEN CAST(ep.has_liked AS INTEGER) ELSE 0 END) > 0 AS has_liked,
            MAX(CASE WHEN ep.user_id = $1 THEN CAST(ep.has_shared_event AS INTEGER) ELSE 0 END) > 0 AS has_shared_event,
            MAX(CASE WHEN ep.user_id = $1 THEN ep.status ELSE NULL END) AS event_status
      FROM events e
      JOIN users u ON e.created_by = u.id
      LEFT JOIN event_participation ep ON e.event_id = ep.event_id AND ep.user_id = $1
      LEFT JOIN event_participation likes ON e.event_id = likes.event_id AND likes.has_liked = TRUE
      LEFT JOIN event_participation shares ON e.event_id = shares.event_id AND shares.has_shared_event = TRUE
      WHERE (e.created_by = $1 
            OR e.created_by IN (
                SELECT friend_id FROM friends WHERE user_id = $1 AND status = 'accepted'
                UNION
                SELECT user_id FROM friends WHERE friend_id = $1 AND status = 'accepted'
            ))
        AND (e.visibility != 'private' OR (e.visibility = 'private' AND ep.status = 'opted_in'))
  `;

  const queryParams = [userId];
  
  if (search) {
      feedQuery += ` AND (e.title ILIKE $${queryParams.length + 1} OR e.description ILIKE $${queryParams.length + 1} OR u.username ILIKE $${queryParams.length + 1})`;
      queryParams.push(`%${search}%`);
  }

  if (filters) {
      if (filters.type) {
          feedQuery += ` AND e.event_type = $${queryParams.length + 1}`;
          queryParams.push(filters.type);
      }
  }

  feedQuery += `
      GROUP BY e.event_id, u.username, u.profile_picture, e.title, e.description, e.creation_date, e.created_by, e.visibility, e.event_type, e.reveal_date, ep.has_shared_memory
      ORDER BY ${selectedSortField} ${selectedSortOrder}
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
  `;

  queryParams.push(limit, offset);

  try {
      const feedData = await db.query(feedQuery, queryParams);
      await db.query(`UPDATE users SET last_checked = NOW() WHERE id = $1`, [userId]);
      await db.query(
        `UPDATE event_participation 
         SET interaction_count = interaction_count + 1
         WHERE user_id = $1 AND interaction_count = 0`,
        [userId]
      );

      res.json(feedData.rows);
  } catch (err) {
      console.error("Error retrieving feed data:", err.message);
      res.status(500).json({ message: "Server error while retrieving feed data" });
  }
});

app.get('/explore/trending', isAuthenticated, async (req, res) => {
  const { search, filters: rawFilters, sortOrder = 'desc' } = req.query;
  const limit = parseInt(req.query.limit, 10) || 10;
  const offset = parseInt(req.query.offset, 10) || 0;
  const userId = req.user.id;

  let filters;
  try {
    filters = rawFilters ? JSON.parse(rawFilters) : {};
  } catch (err) {
    console.error('Invalid filters:', rawFilters);
    return res.status(400).json({ error: 'Invalid filters format' });
  }

  const validSortFields = ['likes_count', 'shares_count', 'memories_count', 'hot_score'];
  const selectedSortField = validSortFields.includes(filters.sortBy) ? filters.sortBy : 'hot_score';
  const selectedSortOrder = sortOrder.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

  let trendingQuery = `
      SELECT 
          e.event_id, 
          e.title, 
          e.description, 
          e.creation_date, 
          e.event_type, 
          e.reveal_date, 
          u.username, 
          e.created_by, 
          u.profile_picture, 
          e.visibility, 
          ep.has_liked, 
          ep.has_shared_event, 
          ep.has_shared_memory, 
          ep.status,
          COUNT(likes.event_id) AS likes_count,
          COUNT(shares.event_id) AS shares_count,
          (SELECT COUNT(*) FROM memories m WHERE m.event_id = e.event_id) AS memories_count,
          EXTRACT(EPOCH FROM (NOW() - e.creation_date)) / 3600 AS age_in_hours,
          (
            COUNT(likes.event_id) * 1.5 + 
            COUNT(shares.event_id) * 1.2 + 
            COUNT(m.event_id) * 1.0 + 
            COALESCE(SUM(ep.interaction_count), 0) * 1.1 + 
            COALESCE(SUM(EXTRACT(EPOCH FROM ep.interaction_duration)::NUMERIC), 0) * 0.5
          ) / ((EXTRACT(EPOCH FROM (NOW() - e.creation_date)) / 3600)::NUMERIC + 1) AS hot_score
      FROM events e
      JOIN users u ON e.created_by = u.id
      LEFT JOIN event_participation ep ON e.event_id = ep.event_id AND ep.user_id = $1
      LEFT JOIN event_participation likes ON e.event_id = likes.event_id AND likes.has_liked = TRUE
      LEFT JOIN event_participation shares ON e.event_id = shares.event_id AND shares.has_shared_event = TRUE
      LEFT JOIN memories m ON e.event_id = m.event_id
      WHERE e.visibility = 'public'
  `;

  const queryParams = [userId];

  if (search) {
    trendingQuery += ` AND (e.title ILIKE $${queryParams.length + 1} OR e.description ILIKE $${queryParams.length + 1} OR u.username ILIKE $${queryParams.length + 1})`;
    queryParams.push(`%${search}%`);
  }

  if (filters.type) {
    trendingQuery += ` AND e.event_type = $${queryParams.length + 1}`;
    queryParams.push(filters.type);
  }

  trendingQuery += `
      GROUP BY 
          e.event_id, 
          u.username, 
          u.profile_picture, 
          e.title, 
          e.description, 
          e.creation_date, 
          e.created_by, 
          e.visibility, 
          ep.has_liked, 
          ep.has_shared_event, 
          ep.has_shared_memory, 
          ep.status, 
          e.event_type, 
          e.reveal_date
      ORDER BY ${selectedSortField} ${selectedSortOrder}
      LIMIT $${queryParams.length + 1}::int OFFSET $${queryParams.length + 2}::int
  `;

  queryParams.push(limit, offset);

  try {
    const trendingEvents = await db.query(trendingQuery, queryParams);
    res.json(trendingEvents.rows);
  } catch (err) {
    console.error("Error retrieving trending events:", err.message);
    res.status(500).json({ error: "Failed to fetch trending events." });
  }
});

app.get('/explore/personalized', isAuthenticated, async (req, res) => {
  const userId = req.user.id;
  const { search, filters: rawFilters, sortOrder = 'desc', limit = 10, offset = 0 } = req.query;

  let filters;
  try {
    filters = rawFilters ? JSON.parse(rawFilters) : {};
  } catch (err) {
    console.error('Invalid filters:', rawFilters);
    return res.status(400).json({ error: 'Invalid filters format' });
  }

  const validSortFields = ['likes_count', 'shares_count', 'memories_count', 'interaction_count'];
  const selectedSortField = validSortFields.includes(filters.sortBy) ? filters.sortBy : 'interaction_count';
  const selectedSortOrder = sortOrder.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

  const preferencesQuery = `
      SELECT data_settings->>'location_enabled' AS location_enabled,
             data_settings->>'metadata_enabled' AS metadata_enabled,
             city, region, country
      FROM user_preferences
      JOIN users ON users.id = user_preferences.user_id
      WHERE user_preferences.user_id = $1
  `;
  let locationEnabled = false;
  let userLocation = {};
  try {
    const preferencesResult = await db.query(preferencesQuery, [userId]);
    if (preferencesResult.rows.length > 0) {
      const { location_enabled, city, region, country } = preferencesResult.rows[0];
      locationEnabled = location_enabled === 'true';
      userLocation = { city, region, country };
    }
  } catch (err) {
    console.error("Error fetching user preferences:", err.message);
    return res.status(500).json({ error: "Failed to fetch user preferences." });
  }

  let personalizedQuery = `
      SELECT e.event_id, e.title, e.description, e.creation_date, e.event_type, e.reveal_date, e.location, u.username, e.created_by, u.profile_picture, e.visibility, ep.has_liked, ep.has_shared_event, ep.has_shared_memory, ep.status,
            COUNT(likes.event_id) AS likes_count,
            COUNT(shares.event_id) AS shares_count,
            (SELECT COUNT(*) FROM memories m WHERE m.event_id = e.event_id) AS memories_count,
            COUNT(ep.interaction_count) AS interaction_count,
            ARRAY_AGG(DISTINCT t.tag_name) AS event_tags,
            SUM(CASE WHEN t.tag_name IN (
                SELECT t_user.tag_name
                FROM event_participation ep_user
                JOIN event_tag_map etm_user ON ep_user.event_id = etm_user.event_id
                JOIN event_tags t_user ON etm_user.tag_id = t_user.tag_id
                WHERE ep_user.user_id = $1
                  AND ep_user.interaction_count > 0
            ) THEN 1 ELSE 0 END) AS matching_tag_count
      FROM events e
      JOIN users u ON e.created_by = u.id
      LEFT JOIN event_participation ep ON e.event_id = ep.event_id AND ep.user_id = $1
      LEFT JOIN event_participation likes ON e.event_id = likes.event_id AND likes.has_liked = TRUE
      LEFT JOIN event_participation shares ON e.event_id = shares.event_id AND shares.has_shared_event = TRUE
      LEFT JOIN event_tag_map etm ON e.event_id = etm.event_id
      LEFT JOIN event_tags t ON etm.tag_id = t.tag_id
      WHERE e.visibility = 'public'
  `;

  const queryParams = [userId];

  if (locationEnabled && userLocation.city && userLocation.region && userLocation.country) {
    personalizedQuery += `
      AND e.location = $${queryParams.length + 1} || ', ' || $${queryParams.length + 2} || ', ' || $${queryParams.length + 3}
    `;
    queryParams.push(userLocation.city, userLocation.region, userLocation.country);
  }

  if (search) {
    personalizedQuery += ` AND (e.title ILIKE $${queryParams.length + 1} OR e.description ILIKE $${queryParams.length + 1} OR u.username ILIKE $${queryParams.length + 1})`;
    queryParams.push(`%${search}%`);
  }

  if (filters.type) {
    personalizedQuery += ` AND e.event_type = $${queryParams.length + 1}`;
    queryParams.push(filters.type);
  }

  personalizedQuery += `
      GROUP BY e.event_id, u.username, u.profile_picture, e.title, e.description, e.creation_date, e.created_by, e.visibility, ep.has_liked, ep.has_shared_event, ep.has_shared_memory, ep.status, e.event_type, e.reveal_date, e.location
      ORDER BY ${selectedSortField} ${selectedSortOrder}
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
  `;

  queryParams.push(limit, offset);

  try {
    const personalizedEvents = await db.query(personalizedQuery, queryParams);
    res.json(personalizedEvents.rows);
  } catch (err) {
    console.error("Error retrieving personalized events:", err.message);
    res.status(500).json({ error: "Failed to fetch personalized events." });
  }
});

app.get('/notifications/:userId', isAuthenticated, async (req, res) => {
  const { userId } = req.params;
  try {
    const fetchFriends = await db.query(
      `SELECT u.id, u.username 
       FROM friends f
       JOIN users u ON (u.id = f.friend_id OR u.id = f.user_id)
       WHERE (f.user_id = $1 OR f.friend_id = $1) AND f.status = 'accepted'
       AND u.id != $1`,
      [userId]
    );

    const friends = fetchFriends.rows;

    const friendIds = friends.map(friend => friend.id);

    const fetchStatuses = await db.query(
      `SELECT s.sess -> 'passport' ->> 'user' AS userId
       FROM session s
       WHERE (s.sess -> 'passport' ->> 'user')::int = ANY($1::int[])`,
       [friendIds]
    );
      const fetchRequests = await db.query(
        'SELECT * FROM friends JOIN users ON friends.user_id = users.id WHERE friend_id = $1 AND status = $2',
        [userId, 'pending']);
      
      const fetchInvites = await db.query (
        `SELECT * FROM event_participation WHERE user_id = $1 AND status = 'invited'`,
        [userId]
      );

      const fetchVisibleEvents = await db.query(
        `SELECT e.event_id, e.title, e.created_by, e.visibility
         FROM events e
         LEFT JOIN event_participation ep ON e.event_id = ep.event_id AND ep.user_id = $1
         WHERE 
           (e.visibility = 'public' 
           OR (e.visibility = 'friends_only' AND e.created_by = ANY($2::int[])) 
           OR (e.visibility = 'private' AND ep.user_id IS NOT NULL))
           AND e.creation_date > (SELECT last_checked FROM users WHERE id = $1)`,
        [userId, friendIds]
      );

      const fetchNewMemories = await db.query(
        `SELECT m.memory_id, m.event_id, m.user_id, m.shared_date
         FROM memories m
         JOIN event_participation ep ON m.event_id = ep.event_id AND ep.user_id = $1
         WHERE ep.status = 'opted_in' 
         AND m.shared_date > ep.last_checked`,
        [userId]
      );

      const fetchModNotifications = await db.query(
        `SELECT * FROM notifications 
        WHERE user_id = $1 
        ORDER BY created_at DESC`, 
        [userId]
      );

      const friendRequests = fetchRequests.rows;
      const statuses = fetchStatuses.rows;
      const invites = fetchInvites.rows;
      const visibleEvents = fetchVisibleEvents.rows;
      const newMemories = fetchNewMemories.rows;
      const modNotifications = fetchModNotifications.rows;

      const notifications = {
        invites: invites, 
        visibleEvents: visibleEvents,
        friendRequests: friendRequests,
        onlineFriends: statuses,
        newMemories: newMemories,
        modNotifications: modNotifications
      };

      res.status(200).json(notifications);
  } catch (error) {
      res.status(500).json({ error: 'Error retrieving notifications' });
  }
});

app.get('/user/preferences/:userId', isAuthenticated, async (req, res) => {
  try {
      const { userId } = req.params;
      const result = await db.query("SELECT * FROM user_preferences WHERE user_id = $1", [userId]);
      res.json(result.rows[0]);
  } catch (error) {
      res.status(500).send("Error retrieving preferences");
  }
});

app.put('/user/preferences/:userId', isAuthenticated, async (req, res) => {
  try {
      const { userId } = req.params;
      const { accountSettings, notificationSettings, privacySettings, dataSettings } = req.body;
      const clientIp = await fetchIP();

      if (dataSettings?.location_enabled) {
        const locationData = await fetchUserLocation(clientIp);
        if (locationData) {
          await db.query(`
            UPDATE users
            SET
              city = $1,
              region = $2,
              country = $3
            WHERE id = $4
            `,[locationData.city, locationData.region, locationData.country, userId]);
        } else {
          console.error("Location data is null, skipping update.");
        }
      } else {
        await db.query(`
          UPDATE users
          SET 
            city = NULL,
            region = NULL,
            country = NULL
          WHERE id = $1
          `, [userId]);
      }

      await db.query(`
          UPDATE user_preferences
          SET 
              account_settings = COALESCE(account_settings || $1::jsonb, account_settings),
              notification_settings = COALESCE(notification_settings || $2::jsonb, notification_settings),
              privacy_settings = COALESCE(privacy_settings || $3::jsonb, privacy_settings),
              data_settings = COALESCE(data_settings || $4::jsonb, data_settings),
              updated_at = CURRENT_TIMESTAMP
          WHERE user_id = $5
      `, [accountSettings, notificationSettings, privacySettings, dataSettings, userId]);

      res.send("Preferences saved");
  } catch (error) {
      res.status(500).send("Error updating preferences:", error.message);
  }
});

app.put('/user/change-password', isAuthenticated, async (req, res) => {
  try {
      const { userId, currentPassword, newPassword } = req.body;

      

      res.send("Password updated successfully");
  } catch (error) {
      res.status(500).send("Error updating preferences");
  }
});

app.put('/user/:userId/bio', isAuthenticated, async (req, res) => {
  try {
      const { userId } = req.params;
      const { bio, profilePic } = req.body;

      await db.query(`
          UPDATE users
          SET 
              profile_picture = $1,
              bio = $2
          WHERE id = $3
      `, [profilePic, bio, userId]);

      res.send("Preferences saved");
  } catch (error) {
      res.status(500).send("Error updating preferences");
  }
});

app.get('/users/:userId/activities', isAuthenticated, async (req, res) => {
  const { userId } = req.params;

  try {
      const { rows } = await db.query(`
          SELECT * FROM activities_log 
          WHERE user_id = $1
          ORDER BY created_at DESC
          LIMIT 20
      `, [userId]);

      res.json(rows);
  } catch (error) {
      console.error("Error fetching activities:", error);
      res.status(500).json({ error: 'Failed to fetch activities.' });
  }
});

//messenger routes
app.get('/conversations', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    const conversations = await db.query(`
      SELECT 
        c.conversation_id, 
        c.title, 
        c.creator_id, 
        MAX(m.sent_at) AS last_message_time,
        (
          SELECT m2.content 
          FROM messages m2 
          WHERE m2.conversation_id = c.conversation_id 
          ORDER BY m2.sent_at DESC 
          LIMIT 1
        ) AS last_message_content,
        (
          SELECT u2.username
          FROM messages m2
          JOIN users u2 ON m2.sender_id = u2.id
          WHERE m2.conversation_id = c.conversation_id
          ORDER BY m2.sent_at DESC
          LIMIT 1
        ) AS last_message_sender,
        (
          SELECT CASE 
                   WHEN (
                     SELECT m_last.sender_id 
                     FROM messages m_last 
                     WHERE m_last.conversation_id = c.conversation_id 
                     ORDER BY m_last.sent_at DESC 
                     LIMIT 1
                   ) = $1
                   THEN (
                     SELECT m_last2.message_id 
                     FROM messages m_last2 
                     WHERE m_last2.conversation_id = c.conversation_id 
                     ORDER BY m_last2.sent_at DESC 
                     LIMIT 1
                   )
                   ELSE (
                     SELECT m3.message_id
                     FROM messages m3
                     JOIN message_status ms2 ON m3.message_id = ms2.message_id
                     WHERE m3.conversation_id = c.conversation_id
                       AND m3.sender_id <> $1
                       AND ms2.user_id = $1
                       AND ms2.seen = TRUE
                     ORDER BY m3.sent_at DESC
                     LIMIT 1
                   )
                 END
        ) AS last_seen_message_id,
        COUNT(ms.message_id) FILTER (
          WHERE ms.user_id = $1 
            AND ms.seen = FALSE
            AND m.sender_id <> $1
        ) AS unread_messages,
        (
          json_agg(
            DISTINCT jsonb_build_object(
              'user_id', cp.user_id,
              'username', u.username,
              'profile_picture', u.profile_picture
            )
          )
        )::json AS participants
      FROM conversations c
      JOIN conversation_participants cp ON c.conversation_id = cp.conversation_id
      JOIN users u ON cp.user_id = u.id
      LEFT JOIN messages m ON c.conversation_id = m.conversation_id
      LEFT JOIN message_status ms ON m.message_id = ms.message_id
      WHERE c.conversation_id IN (
          SELECT conversation_id 
          FROM conversation_participants 
          WHERE user_id = $1
      )
      GROUP BY c.conversation_id
      ORDER BY last_message_time DESC
    `, [userId]);
    res.json(conversations.rows);
  } catch (error) {
    console.error("Error fetching conversations:", error);
    res.status(500).json({ message: "Server error fetching conversations" });
  }
});

app.post('/conversations', isAuthenticated, async (req, res) => {
  const { participantIds, title } = req.body;
  const userId = req.user.id;

  try {
      if (!participantIds.includes(userId)) {
          participantIds.push(userId);
      }

      const sortedParticipantIds = [...participantIds].sort((a, b) => a - b);
      const participantKey = participantIds.length === 2
          ? `${sortedParticipantIds[0]}_${sortedParticipantIds[1]}`
          : null;

      if (participantKey) {
          const existingConversation = await db.query(`
              SELECT conversation_id
              FROM conversations
              WHERE participant_key = $1 AND is_group = FALSE
          `, [participantKey]);

          if (existingConversation.rows.length > 0) {
              return res.json({ conversation_id: existingConversation.rows[0].conversation_id });
          }
      }

      const newConversation = await db.query(`
          INSERT INTO conversations (title, creator_id, is_group, participant_key) 
          VALUES ($1, $2, $3, $4) RETURNING conversation_id
      `, [
          title || null,
          userId,
          participantIds.length > 2,
          participantKey,
      ]);

      const conversationId = newConversation.rows[0].conversation_id;

      await db.query(`
          INSERT INTO conversation_participants (conversation_id, user_id, joined_at)
          SELECT $1, unnest($2::int[]), CURRENT_TIMESTAMP
      `, [conversationId, participantIds]);

      res.status(201).json({ conversation_id: conversationId });
  } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ message: "Server error creating conversation" });
  }
});

app.get('/conversations/:conversationId/messages', isAuthenticated, async (req, res) => {
  const { conversationId } = req.params;
  const { limit = 20, offset = 0, before } = req.query;

  try {
    const messages = await db.query(`
      SELECT m.message_id, m.content, m.media_url, m.sent_at, m.sender_id,
             json_agg(
               json_build_object(
                 'user_id', ms.user_id,
                 'seen_at', ms.seen_at
               )
             ) FILTER (WHERE ms.seen = TRUE) AS seen_status
      FROM messages m
      LEFT JOIN message_status ms ON m.message_id = ms.message_id
      WHERE m.conversation_id = $1
        AND ($2::timestamp IS NULL OR m.sent_at < $2)
      GROUP BY m.message_id
      ORDER BY m.sent_at DESC
      LIMIT $3 OFFSET $4
    `, [conversationId, before, limit, offset]);

    res.json(messages.rows.reverse());
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ message: "Server error fetching messages" });
  }
});

app.post('/conversations/:conversationId/messages', isAuthenticated, async (req, res) => {
  const { conversationId } = req.params;
  const { content, mediaUrl } = req.body;
  const userId = req.user.id;

  try {
    const newMessageResult = await db.query(`
      INSERT INTO messages (conversation_id, sender_id, content, media_url, sent_at) 
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) 
      RETURNING *
    `, [conversationId, userId, content, mediaUrl]);

    const newMessage = newMessageResult.rows[0];

    const participants = await db.query(`
      SELECT user_id 
      FROM conversation_participants 
      WHERE conversation_id = $1
    `, [conversationId]);

    await db.query(`
      INSERT INTO message_status (message_id, user_id, seen, seen_at)
      SELECT $1, unnest($2::int[]), FALSE, NULL 
    `, [newMessage.message_id, participants.rows.map(p => p.user_id)]);

    newMessage.seen_status = [];

    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Error posting message:", error);
    res.status(500).json({ message: "Server error posting message" });
  }
});

app.post('/conversations/:conversationId/media', isAuthenticated, upload.single('media'), async (req, res) => {
  try {
    const isSafe = await moderateImageContent(req.file.buffer);
    if (!isSafe) {
      return res.status(400).json({ error: 'Uploaded media contains inappropriate content' });
    }

    const uploadResult = await cloudinary.v2.uploader.upload_stream({ resource_type: 'auto' }).end(req.file.buffer);
    res.status(201).json({ mediaUrl: uploadResult.secure_url });
  } catch (error) {
    console.error("Error uploading media:", error);
    res.status(500).json({ message: "Error uploading media" });
  }
});

//friend routes
app.post('/friends/request', isAuthenticated, async (req, res) => {
  const { userId, friendUsername } = req.body;
  try {
      const friendData = await db.query(
        'SELECT * FROM users WHERE username = $1',
        [friendUsername]
      );
      const friend = friendData.rows[0];

      if (!friend) {
      
        return res.status(404).json({ message: 'User not found' });
    }
      
      const existingRequest = await db.query(
          'SELECT * FROM friends WHERE user_id = $1 AND friend_id = $2',
          [userId, friend.id]
      );

      if (existingRequest.rows.length > 0) {
        const status = existingRequest.rows[0].status;
        
        if (status === 'pending') {
            return res.status(400).json({ message: 'Friend request is already pending.' });
        }
        
        if (status === 'rejected') {
            return res.status(400).json({ message: 'You cannot send a friend request to this user.' });
        }

        if (status === 'accepted') {
            return res.status(400).json({ message: 'You are already friends with this user.' });
        }
    }

      await db.query(
          'INSERT INTO friends (user_id, friend_id, status) VALUES ($1, $2, $3)',
          [userId, friend.id, 'pending']
      );

      res.status(201).json({ message: 'Friend request sent' });
  } catch (error) {
    console.error("error sending friend request:", error);
      res.status(500).json({ error: 'Error sending friend request' });
  }
});

app.get('/friends/requests/:userId', isAuthenticated, async (req, res) => {
  const { userId } = req.params;
  try {
      const fetchRequests = await db.query(
          'SELECT * FROM friends JOIN users ON friends.user_id = users.id WHERE friend_id = $1 AND status = $2',
          [userId, 'pending']
      );
      const friendRequests = fetchRequests.rows;
      res.json(friendRequests);
  } catch (error) {
      res.status(500).json({ error: 'Error sending friend request' });
  }
});

app.post('/friends/accept',  isAuthenticated, async (req, res) => {
  const { userId, friendId } = req.body; //in this case, userId references the user with a request
  try {
      const getFriend = await db.query(`SELECT * FROM users WHERE id =$1`, [friendId]);
      const friend = getFriend.rows[0];
      await db.query(
          'UPDATE friends SET status = $1 WHERE friend_id = $2 AND user_id = $3',
          ['accepted', userId, friendId ]
      );
      await db.query(
          'INSERT INTO friends (user_id, friend_id, status) VALUES ($1, $2, $3)',
          [userId, friendId, 'accepted']
      );
      await logActivity(userId, 'added_friend', `Became friends with ${friend.username}`, friendId, 'user');
      res.status(200).json({ message: 'Friend request accepted' });
  } catch (error) {
      res.status(500).json({ error: 'Error accepting friend request' });
  }
});

app.post('/friends/reject',  isAuthenticated, async (req, res) => {
  const { userId, friendId } = req.body;
  try {
      await db.query(
          'UPDATE friends SET status = $1 WHERE user_id = $2 AND friend_id = $3',
          ['rejected', friendId, userId]
      );
      res.status(200).json({ message: 'Friend request rejected' });
  } catch (error) {
      res.status(500).json({ error: 'Error rejecting friend request' });
  }
});

app.get('/friends/:userId', isAuthenticated, async (req, res) => {
  const { userId } = req.params;
  try {
      const fetchFriends = await db.query(
          `SELECT u.id::text AS id, u.username, u.profile_picture, u.last_online 
           FROM friends f
           JOIN users u ON (u.id = f.friend_id)
           WHERE (f.user_id = $1) AND f.status = 'accepted'
           AND u.id != $1`,
          [userId]
      );

      const friends = fetchFriends.rows;

      const friendIds = friends.map(friend => friend.id);

      const fetchStatuses = await db.query(
        `SELECT s.sess -> 'passport' ->> 'user' AS user_id
          FROM session s
          WHERE (s.sess -> 'passport' ->> 'user')::text = ANY($1::text[])`,
          [friendIds]
      );

      const statuses = fetchStatuses.rows;

      const friendsWithStatus = friends.map(friend => {
        const onlineStatus = statuses.some(status => String(status.user_id) === String(friend.id));
        return { ...friend, online: onlineStatus };
    });    

      res.status(200).json(friendsWithStatus);
  } catch (error) {
      console.error("Error retrieving friends with online status:", error);
      res.status(500).json({ error: 'Error retrieving friends' });
  }
});

app.post('/block-user', isAuthenticated, async (req, res) => {
  const userId = req.user.id; // the user performing the block
  const { blockedId } = req.body; // the user being blocked

  try {
      await db.query(`
          INSERT INTO blocks (blocker_id, blocked_id)
          VALUES ($1, $2)
      `, [userId, blockedId]);

      res.status(200).json({ message: 'User successfully blocked' });
  } catch (error) {
      console.error('Error blocking user:', error);
      res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/unblock-user', isAuthenticated, async (req, res) => {
  const userId = req.user.id;
  const { blockedId } = req.body;

  try {
      const result = await db.query(`
          DELETE FROM blocks 
          WHERE blocker_id = $1 AND blocked_id = $2;
      `, [userId, blockedId]);

      if (result.rowCount === 0) {
          return res.status(404).json({ message: 'User was not blocked.' });
      }

      res.status(200).json({ message: 'User successfully unblocked' });
  } catch (error) {
      console.error('Error unblocking user:', error);
      res.status(500).json({ message: 'Internal server error' });
  }
});

// Password reset routes.
app.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  try {
    const result = await db.query("SELECT * FROM users WHERE email = $1", [email]);
    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Generate a unique token
    const token = crypto.randomBytes(32).toString("hex");

    // Set token expiration time (e.g., 1 hour)
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    // Update user with reset token and expiration time
    await db.query(
      "UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE email = $3",
      [token, expires, email]
    );

    // Send email with the reset link
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Password Reset",
      text: `You requested a password reset. Click the link to reset your password: ${resetLink}`,
      html: `<p>You requested a password reset. Click the link below to reset your password:</p>
             <a href="${resetLink}">${resetLink}</a>`,
    };

    await transporter.sendMail(mailOptions);
    res.json({ message: "Password reset email sent" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    const result = await db.query(
      "SELECT * FROM users WHERE password_reset_token = $1 AND password_reset_expires > NOW()",
      [token]
    );
    const user = result.rows[0];

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    await db.query(
      "UPDATE users SET password = $1, password_reset_token = NULL, password_reset_expires = NULL WHERE id = $2",
      [hashedPassword, user.id]
    );

    res.json({ message: "Password reset successful" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

app.post('/upload-profile-picture', isAuthenticated, upload.single('profilePic'), async (req, res) => {
  try {
      const buffer = await sharp(req.file.buffer)
          .resize({ width: 250, height: 250 })
          .toFormat('jpeg')
          .toBuffer();

      const isSafe = await moderateImageContent(buffer);
      if (!isSafe) {
          return res.status(400).json({ error: 'Uploaded image contains inappropriate content' });
      }

      await cloudinary.v2.uploader.upload_stream({ 
          resource_type: 'image' 
      }, async (error, result) => {
          if (error) {
              return res.status(500).json({ error: 'Failed to upload image to Cloudinary' });
          }

          await db.query(
              `INSERT INTO profile_picture_queue (user_id, image_url, status) VALUES ($1, $2, $3)`,
              [req.user.id, result.secure_url, 'pending']
          );
          res.status(200).json({ message: 'Profile picture uploaded and is pending approval' });
      }).end(buffer); 

  } catch (error) {
      console.error('Error in profile picture upload:', error);
      res.status(500).json({ error: 'Error uploading profile picture' });
  }
});

//moderator routes
app.post('/moderate/profile-picture/:queueId', isAuthenticated, isModerator, async (req, res) => {
  const { queueId } = req.params;
  const { action } = req.body; // 'approve' or 'deny'

  const picture = await db.query(`SELECT * FROM profile_picture_queue WHERE id = $1`, [queueId]);
  if (!picture.rows.length) {
      return res.status(404).json({ error: 'Picture not found' });
  }

  const userId = picture.rows[0].user_id;
  if (action === 'approve') {
      await db.query(`UPDATE users SET profile_picture = $1 WHERE id = $2`, [picture.rows[0].image_url, userId]);
      await db.query(`DELETE FROM profile_picture_queue WHERE id = $1`, [queueId]);
      res.json({ message: 'Profile picture approved and updated' });
  } else if (action === 'deny') {
      await db.query(`DELETE FROM profile_picture_queue WHERE id = $1`, [queueId]);
      res.json({ message: 'Profile picture denied and removed' });
  } else {
      res.status(400).json({ error: 'Invalid action' });
  }
});

app.get('/moderate/profile-picture/queue', isAuthenticated, isModerator, async (req, res) => {
  try {
      const result = await db.query('SELECT * FROM profile_picture_queue');
      res.json(result.rows);
  } catch (error) {
      console.error("Error fetching profile picture queue:", error);
      res.status(500).json({ error: 'Server error fetching moderation queue' });
  }
});


app.delete('/moderate/remove/:type/:contentId', isAuthenticated, isModerator, async (req, res) => {
  const { type, contentId } = req.params;
  let table = '';
  let message = '';
  let queryColumn = '';
  let userId = 0;

  try {
      switch (type) {
          case 'event':
              table = 'events';
              queryColumn = 'event_id';

              const eventResult = await db.query(`SELECT title, created_by FROM events WHERE event_id = $1`, [contentId]);
              const eventTitle = eventResult.rows[0]?.title;
              userId = eventResult.rows[0]?.created_by;

              if (!eventTitle) return res.status(404).json({ error: 'Event not found' });

              message = `Your event titled '${eventTitle}' was deleted by a moderator.`;
              break;

          case 'memory':
              table = 'memories';
              queryColumn = 'memory_id';

              const memoryResult = await db.query(`
                  SELECT e.title AS event_title, m.user_id 
                  FROM memories m 
                  JOIN events e ON m.event_id = e.event_id 
                  WHERE m.memory_id = $1
              `, [contentId]);

              const memoryEventTitle = memoryResult.rows[0]?.event_title;
              userId = memoryResult.rows[0]?.user_id;

              if (!memoryEventTitle) return res.status(404).json({ error: 'Memory or associated event not found' });

              message = `Your shared memory for the event '${memoryEventTitle}' was deleted by a moderator.`;
              break;

          case 'bio':
              table = 'users';
              queryColumn = 'id';
              userId = contentId;

              message = "Your profile bio was removed by a moderator.";
              break;

          case 'profile_picture':
              table = 'users';
              queryColumn = 'id';
              userId = contentId;

          default:
              return res.status(400).json({ error: 'Invalid content type' });
      }

      if (type === 'profile_bio') {
          await db.query(`UPDATE users SET bio = NULL WHERE id = $1`, [contentId]);
      } else if (type ==='profile_picture') {
          await db.query(`UPDATE users SET profile_picture = NULL WHERE id = $1`, [contentId]);
      } else {
          await db.query(`DELETE FROM ${table} WHERE ${queryColumn} = $1`, [contentId]);
      }

      notifyUser(userId, message);

      res.json({ message: `${type.charAt(0).toUpperCase() + type.slice(1)} removed successfully.` });
  } catch (error) {
      console.error("Error removing content:", error);
      res.status(500).json({ error: 'Server error while removing content' });
  }
});


app.post('/moderate/ban/:userId?', isAuthenticated, isModerator, async (req, res) => {
  const { userId } = req.params;
  const { duration, reason, username } = req.body; // Duration in days, 0 for permanent

  let targetUserId = userId;
  try {
    if (!userId && username) {
      const result = await db.query('SELECT id FROM users WHERE username = $1', [username]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      targetUserId = result.rows[0].id;
    }

    if (!targetUserId) {
      return res.status(400).json({ error: 'User ID or username required' });
    }

    const bannedUntil = duration > 0 ? new Date(Date.now() + duration * 24 * 60 * 60 * 1000) : null;

    await db.query(
      `INSERT INTO bans (user_id, banned_until, reason, banned_by) 
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id) 
       DO UPDATE SET banned_until = $2, reason = $3, banned_by = $4`,
      [targetUserId, bannedUntil, reason, req.user.id]
    );

    await db.query(
      `INSERT INTO audit_log (moderator_id, action, date) VALUES ($1, $2, NOW())`,
      [req.user.id, `Banned user ${username || targetUserId} for ${duration} days. Reason: ${reason}`]
    );

    res.json({ message: `User ${username || targetUserId} has been banned for ${duration} days` });
  } catch (error) {
    console.error("Error in ban route:", error);
    res.status(500).json({ error: 'Server error while banning user' });
  }
});

app.post('/moderate/notes', isAuthenticated, isModerator, async (req, res) => {
  const { note } = req.body;
  await db.query(`INSERT INTO moderator_notes (moderator_id, note, date) VALUES ($1, $2, NOW())`, [req.user.id, note]);
  res.status(200).json({ message: "Note added" });
});

app.get('/moderate/notes', isAuthenticated, isModerator, async (req, res) => {
  const result = await db.query(`SELECT m.note, u.username AS moderator_username FROM moderator_notes m JOIN users u ON m.moderator_id = u.id ORDER BY m.date DESC`);
  res.json(result.rows);
});

//admin routes
app.get('/admin/ban-history', isAuthenticated, isAdmin, async (req, res) => {
  try {
      const banHistory = await db.query(`
          SELECT b.user_id, b.banned_until, b.reason, b.banned_by, u.username AS banned_by_username
          FROM bans b
          LEFT JOIN users u ON b.banned_by = u.id
          ORDER BY b.banned_until DESC
      `);
      
      res.json(banHistory.rows);
  } catch (error) {
      res.status(500).json({ error: 'Error retrieving ban history' });
  }
});

app.get('/admin/audit-log', isAuthenticated, isAdmin, async (req, res) => {
  const result = await db.query(`SELECT a.action, a.date, u.username AS moderator_username FROM audit_log a JOIN users u ON a.moderator_id = u.id ORDER BY a.date DESC`);
  res.json(result.rows);
});

app.delete('/admin/clear-moderator-notes', isAuthenticated, isAdmin, async (req, res) => {
  try {
    await db.query(`
      INSERT INTO archived_moderator_notes (original_id, moderator_username, note, date)
      SELECT note_id, moderator_id, note, date
      FROM moderator_notes
      WHERE date < NOW() - INTERVAL '1 year'
    `);

    await db.query(`DELETE FROM moderator_notes WHERE date < NOW() - INTERVAL '1 year'`);

    res.json({ message: 'Moderator notes archived and cleared successfully.' });
  } catch (error) {
    console.error("Error clearing moderator notes:", error);
    res.status(500).json({ error: 'Server error while clearing moderator notes.' });
  }
});

app.delete('/admin/clear-audit-logs', isAuthenticated, isAdmin, async (req, res) => {
  try {
    await db.query(`
      INSERT INTO archived_audit_log (original_id, moderator_username, action, date)
      SELECT log_id, moderator_id, action, date
      FROM audit_log
      WHERE date < NOW() - INTERVAL '1 year'
    `);

    await db.query(`DELETE FROM audit_log WHERE date < NOW() - INTERVAL '1 year'`);

    res.json({ message: 'Audit logs archived and cleared successfully.' });
  } catch (error) {
    console.error("Error clearing audit logs:", error);
    res.status(500).json({ error: 'Server error while clearing audit logs.' });
  }
});

//websocket server and connection
const server = http.createServer(app);

const wss = new WebSocketServer({ server, path: '/ws' });

const connectedClients = {};

wss.on('connection', (ws, req) => {
  console.log(`New WebSocket connection: ${req.url}`);

  const userId = req.url.split('userId=')[1];
  if (!userId) {
    console.error("Invalid connection: Missing userId.");
    ws.close();
    return;
  }

  connectedClients[userId] = connectedClients[userId] || [];
  connectedClients[userId].push(ws);

  ws.on('message', async (message) => {
    try {
        const parsedMessage = JSON.parse(message);
        
        if (!message.type === 'ping'){
          console.log('Message received: ', parsedMessage);
        }
        
        switch (parsedMessage.type) {
            case 'send_message':
                await handleSendMessage(parsedMessage, userId, connectedClients);
                break;
            case 'mark_seen':
                await handleMarkSeen(parsedMessage, userId, connectedClients);
                break;
            case 'ping':
                ws.send(JSON.stringify({ type: 'pong' }));
                break;
            default:
                console.error("Unknown WebSocket message type:", parsedMessage.type);
        }
    } catch (error) {
        console.error("Error processing WebSocket message:", error);
        ws.close(1011, "Internal server error");
    }
  });

  ws.on('error', (error) => {
    console.error("WebSocket error for user:", userId, error);
  });

  ws.on('close', () => {
    connectedClients[userId] = connectedClients[userId].filter(client => client !== ws);
    if (connectedClients[userId].length === 0) {
      delete connectedClients[userId];
    }
    console.log(`WebSocket connection closed for user ${userId}`);
  });
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});

export default db;