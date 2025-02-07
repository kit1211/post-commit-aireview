import express from "express";

const app = express();

app.get("/", (req, res) => {
    res.json({
        message: "Hello World",
        lorem1: "Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, quos. 88888888",
        lorem2: "Lorem ipsum dolor sit ",
    });
});

app.listen(3000, () => {
    console.log("Server is running on port 3000");
});
