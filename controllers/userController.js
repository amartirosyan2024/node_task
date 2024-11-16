const db = require("../config/db");

exports.createUser = (req, res) => {
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
    if (err) return res.status(500).json({ error: "Database error" });
    if (row) {
      const error = new Error("User already exists");
      return res.status(400).json(`${error.name}: ${error.message}`);
    }

    const insertQuery = db.prepare("INSERT INTO users (username) VALUES (?)");
    insertQuery.run(username, function (err) {
      if (err) return res.status(500).json({ error: "Failed to create user" });
      return res.json({ username, _id: this.lastID });
    });
  });
};

exports.getUsers = (req, res) => {
  const query = "SELECT * FROM users";
  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: "Failed to fetch users" });
    return res.json(rows);
  });
};
