import { defineConfig } from "drizzle-kit";
import dotenv from "dotenv";
import path from "path";
import { dbConfig } from "./src/db"

dotenv.config({ path: path.join(process.cwd(), ".env") });

export default defineConfig({
    dialect: 'postgresql',
    schema: './src/db/schema.ts',
    out: './drizzle',
    dbCredentials: {
        user: dbConfig.user,
        password: dbConfig.password,
        host: dbConfig.host!,
        port: dbConfig.port!,
        database: dbConfig.database!,
        ssl: false
    },
});