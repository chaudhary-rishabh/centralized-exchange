import express from "express";

const app = express();
const PORT = process.env.PORT;

app.listen(PORT, () => {
    console.log(`port listening on port ${5000}`)
})