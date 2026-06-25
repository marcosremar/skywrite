import "dotenv/config";
import { createApp } from "./app.js";

const required = ["DATABASE_URL", "JWT_SECRET"];
if (process.env.NODE_ENV === "production") required.push("CLIENT_ORIGIN");
for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing required env: ${key}`);
    process.exit(1);
  }
}

const parsedPort = Number(process.env.PORT);
const port = Number.isInteger(parsedPort) && parsedPort >= 0 ? parsedPort : 4000;
createApp().listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
