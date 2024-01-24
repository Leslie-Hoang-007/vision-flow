// server.js
const express = require('express');
const app = express();
const cors = require("cors");
const cookieParser = require('cookie-parser');
require("dotenv").config();
const YOUR_DOMAIN = 'http://localhost:3000';
// const YOUR_DOMAIN = 'https://www.mtgcollectionmanager.com';
const port = process.env.PORT;

// MIDDLEWARE
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());// get data from client side from req.body objext
app.use(cookieParser());
app.use(cors({
  origin: YOUR_DOMAIN, // Adjust this to the origin of your frontend application
  // origin: 'https://www.mtgcollectionmanager.com', // Adjust this to the origin of your frontend application
  // origin: `*`, // Adjust this to the origin of your frontend application
  credentials: true
}));
app.options('*', cors()); // Enable preflight requests for all routes

app.get('/', (req, res) => {
  res.send('Hello, World!');
});

// console.log('Key',process.env.DREAMGRAMAPI);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});