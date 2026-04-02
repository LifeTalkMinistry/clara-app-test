const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("CLARA backend running 🚀");
});

app.post("/api/task-submission", (req, res) => {
  console.log("Received submission:", req.body);

  res.status(200).json({
    success: true,
    submission: req.body,
    message: "Backend received data successfully"
  });
});

app.listen(5000, "127.0.0.1", () => {
  console.log("Server running on http://127.0.0.1:5000");
});