const express = require("express");
const router = express.Router({ mergeParams: true });
const userController = require("../controllers/userController");

router.post("/", userController.createUser);
router.get("/", userController.getUsers);

module.exports = router;
