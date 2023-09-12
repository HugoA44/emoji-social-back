const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const axios = require("axios");
const cors = require("cors");

require("dotenv").config();

const app = express();
const port = process.env.PORT || 3001;

const db = new sqlite3.Database("database.db");
db.serialize(() => {
  db.run(
    "CREATE TABLE IF NOT EXISTS posts (id INTEGER PRIMARY KEY, username TEXT, text TEXT)"
  );
});

app.use(express.json());
app.use(cors());

app.get("/posts", (req, res) => {
  db.all("SELECT * FROM posts", (err, rows) => {
    if (err) {
      console.error("Error retrieving posts:", err);
      res.status(500).json({ error: "Internal server error" });
    } else {
      res.status(200).json(rows);
    }
  });
});

app.post("/posts", async (req, res) => {
  const { username, text } = req.body;

  const openaiApiKey = process.env.OPEN_API_KEY;

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/completions",
      {
        model: "text-davinci-003",
        prompt: `Translate the following text to emojis: ${text}`,
        max_tokens: 50,
      },
      {
        headers: {
          Authorization: `Bearer ${openaiApiKey}`,
        },
      }
    );

    const emojiText = response.data.choices[0].text;

    const stmt = db.prepare("INSERT INTO posts (username, text) VALUES (?, ?)");
    stmt.run(username, emojiText);
    stmt.finalize();

    res
      .status(201)
      .json({
        message: "Post created successfully",
        username,
        text: emojiText,
      });
  } catch (error) {
    console.error("Error translating text to emojis:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
