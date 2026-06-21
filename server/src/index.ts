import "dotenv/config";
import { createApp } from "./app.js";

for (const key of ["DATABASE_URL", "JWT_SECRET"]) {
  if (!process.env[key]) {
    console.error(`Missing required env: ${key}`);
    process.exit(1);
  }
}

const port = Number(process.env.PORT) || 4000;
createApp().listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
