const express = require("express");
const router = express.Router({ mergeParams: true });

const exerciseController = require("../controllers/exerciseController");

router.post("/:_id/exercises", exerciseController.addExercise);
router.get("/:_id/logs", exerciseController.getExerciseLogs);

module.exports = router;
