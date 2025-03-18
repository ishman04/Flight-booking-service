const express = require("express");

const { ServerConfig } = require("./config");


const app = express();

app.listen(ServerConfig.PORT, () => {
  console.log(`Server is running on port ${ServerConfig.PORT}`);
});
