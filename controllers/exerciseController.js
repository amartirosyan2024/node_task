const db = require("../config/db");
const dayjs = require("dayjs");

exports.addExercise = (req, res) => {
  const userId = req.params._id;
  const { description, duration, date } = req.body;

  if (!description || description.trim() === "") {
    return res.status(400).json({ error: "Description is required" });
  }

  if (!duration || isNaN(duration) || Number(duration) <= 0) {
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
    if (err) return res.status(500).json({ error: "Database error" });
    if (!row)
      return res
        .status(404)
        .json({ error: `User with ID ${userId} not found` });

    const username = row.username;
    const formattedDate = date ? new Date(date) : new Date();

    if (formattedDate.toString() === "Invalid Date") {
      return res.status(400).json({ error: "Invalid Date is submitted" });
    }

    const insertQuery = `
      INSERT INTO exercises (user_id, username, date, duration, description)
      VALUES (?, ?, ?, ?, ?)
    `;

    db.run(
      insertQuery,
      [userId, username, formattedDate, duration, description],
      function (err) {
        if (err)
          return res.status(500).json({ error: "Failed to add exercise" });
        return res.json({
          _id: userId,
          username,
          date: formattedDate.toDateString(),
          duration,
          description,
        });
      }
    );
  });
};

exports.getExerciseLogs = (req, res) => {
  const userId = req.params._id;
  const limit = parseInt(req.query.limit, 10);
  const from = req.query.from;
  const to = req.query.to;

  const userQuery = "SELECT * FROM users WHERE id = ?";
  db.get(userQuery, [userId], (err, user) => {
    if (err)
      return res
        .status(500)
        .json({ error: "Database error: Failed to fetch user" });
    if (!user)
      return res
        .status(404)
        .json({ error: `User with ID ${userId} not found` });

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

    exercisesQuery += " ORDER BY date ASC";

    db.all(exercisesQuery, queryParams, (err, exercisesCount) => {
      if (err)
        return res
          .status(500)
          .json({ error: "Database error: Failed to fetch exercise count" });

      if (limit && !isNaN(limit)) {
        exercisesQuery += " LIMIT ?";
        queryParams.push(limit);
      }

      db.all(exercisesQuery, queryParams, (err, exercises) => {
        if (err)
          return res
            .status(500)
            .json({ error: "Database error: Failed to fetch exercises" });

        return res.json({
          _id: user.id,
          username: user.username,
          count: exercisesCount.length,
          log: exercises.map((exercise) => ({
            description: exercise.description,
            duration: exercise.duration,
            date: new Date(exercise.date).toDateString(),
          })),
        });
      });
    });
  });
};
