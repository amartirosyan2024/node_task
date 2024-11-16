const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const dayjs = require("dayjs");
const app = express();
const cors = require("cors");
require("dotenv").config();

app.use(cors());
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

const db = new sqlite3.Database("./users.db", (err) => {
  if (err) {
    console.error("Error opening database:", err);
  } else {
    console.log("Connected to SQLite database");
  }
});

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL
    )
  `);

  db.run(`
  CREATE TABLE IF NOT EXISTS exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    username TEXT NOT NULL,
    date DATE NOT NULL, 
    duration INTEGER NOT NULL,
    description TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`);
});

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app.post("/api/users", (req, res) => {
  const { username } = req.body;

  if (!username) {
    const error = new Error(
      "Users validation failed: username: Path `username` is required."
    );
    error.name = "ValidationError";
    return res.status(400).json(`${error.name}: ${error.message}`);
  }

  const usernameQuery = "SELECT * FROM users WHERE username = ?";

  db.get(usernameQuery, [username], (err, row) => {
    if (err) {
      return res.status(500).json({ error: "Database error" });
    }

    if (row) {
      const error = new Error("User already exists");
      return res.status(400).json(`${error.name}: ${error.message}`);
    }

    const insertQuery = db.prepare("INSERT INTO users (username) VALUES (?)");
    insertQuery.run(username, function (err) {
      if (err) {
        return res.status(500).json({ error: "Failed to create user" });
      }

      return res.json({ username, _id: this.lastID, username });
    });
  });
});

app.get("/api/users", (req, res) => {
  const query = "SELECT * FROM users";
  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: "Failed to fetch users" });
    }

    return res.json(rows);
  });
});

app.post("/api/users/:_id/exercises", (req, res) => {
  const userId = req.body[":_id"];
  const { description, duration, date } = req.body;

  if (!description || description.trim() === "") {
    return res
      .status(400)
      .json({ error: "Description is required in the request body" });
  }

  if (!duration || duration.trim() === "") {
    return res
      .status(400)
      .json({ error: "Duration is required in the request body" });
  }

  if (isNaN(duration) || Number(duration) <= 0) {
    return res
      .status(400)
      .json({ error: "Duration must be a valid number greater than 0" });
  }

  const parsedDate = dayjs(date, "YYYY-MM-DD", true);
  if (date && !parsedDate.isValid()) {
    return res
      .status(400)
      .json({ error: "Date must be in the format YYYY-MM-DD" });
  }

  const userQuery = "SELECT * FROM users WHERE id = ?";
  db.get(userQuery, [userId], (err, row) => {
    if (err) {
      return res.status(500).json({ error: "Database error" });
    }

    if (!row) {
      return res
        .status(404)
        .json({ error: `User with ID ${userId} is not found` });
    }

    const username = row.username;
    const formattedDate = date ? new Date(date) : new Date();

    const insertQuery = `
      INSERT INTO exercises (user_id, username, date, duration, description)
      VALUES (?, ?, ?, ?, ?)
    `;

    db.run(
      insertQuery,
      [userId, username, formattedDate, duration, description],
      function (err) {
        if (err) {
          return res.status(500).json({ error: "Failed to add exercise" });
        }

        return res.json({
          _id: userId,
          username: username,
          date: formattedDate.toDateString(),
          duration: duration,
          description: description,
        });
      }
    );
  });
});

app.post("/api/users//exercises", (req, res) => {
  return res
    .status(400)
    .json({ error: "User ID (_id) is required in the request body" });
});

app.get("/api/users/:_id/logs", (req, res) => {
  const userId = req.params._id;

  if (!userId || isNaN(userId)) {
    return res.status(400).json({ error: "Invalid user ID" });
  }

  const limit = parseInt(req.query.limit, 10);
  const from = req.query.from;
  const to = req.query.to;

  const userQuery = "SELECT * FROM users WHERE id = ?";

  db.get(userQuery, [userId], (err, user) => {
    if (err) {
      return res
        .status(500)
        .json({ error: "Database error: Failed to fetch user" });
    }

    if (!user) {
      return res
        .status(404)
        .json({ error: `User with ID ${userId} not found` });
    }

    let exercisesQuery =
      "SELECT description, duration, date FROM exercises WHERE user_id = ?";
    let queryParams = [userId];

    if (from && dayjs(from, "YYYY-MM-DD", true).isValid()) {
      exercisesQuery += " AND date >= ?";
      queryParams.push(new Date(from));
    }

    if (to && dayjs(to, "YYYY-MM-DD", true).isValid()) {
      exercisesQuery += " AND date <= ?";
      queryParams.push(new Date(to));
    }

    if (limit && !isNaN(limit)) {
      exercisesQuery += " LIMIT ?";
      queryParams.push(limit);
    }

    db.all(exercisesQuery, queryParams, (err, exercises) => {
      if (err) {
        return res
          .status(500)
          .json({ error: "Database error: Failed to fetch exercises" });
      }

      const response = {
        _id: user.id,
        username: user.username,
        count: exercises.length,
        log: exercises.map((exercise) => ({
          description: exercise.description,
          duration: exercise.duration,
          date: new Date(Number(exercise.date)).toDateString(),
        })),
      };

      return res.json(response);
    });
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
