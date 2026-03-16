import { app } from "./app";
import { env } from "./config/env";

app.listen(env.PORT, () => {
  console.log(
    `API running on https://pms-backend-p872.onrender.com:${env.PORT}${env.API_PREFIX}`,
  );
});
