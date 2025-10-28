import { Server } from "http";
import app from "./app";
import config from "./config/config";
import { errorlogger, logger } from "./shared/logger";
import { Pool } from 'pg'; // Use import instead of require

// Create database pool
const pool = new Pool({
  connectionString: config.db_url,
  ssl: false
});

async function testDatabaseConnection() {
  try {
    const client = await pool.connect();
    logger.info("✅ Database connected successfully!");
    
    const result = await client.query('SELECT NOW()');
    logger.info(`🗄️ Database time: ${result.rows[0].now}`);
    
    client.release();
    return true;
  } catch (error) {
    errorlogger.error("❌ Database connection failed:", error);
    return false;
  }
}

async function bootstrap() {
  // Test database connection before starting server
  logger.info("🔗 Testing database connection...");
  const dbConnected = await testDatabaseConnection();
  
  if (!dbConnected) {
    errorlogger.error("💥 Cannot start server without database connection");
    process.exit(1);
  }

  const server: Server = app.listen(config.port, () => {
    logger.info(`✅ Server running on port ${config.port}`);
    console.log(`📊 Health check: http://localhost:${config.port}/health`);
    console.log(`🚀 Server ready at http://localhost:${config.port}`);
  });

  const exitHandler = () => {
    if (server) {
      server.close(() => {
        logger.info("🔻 Server closed");
        // Close database pool gracefully
        pool.end().then(() => {
          logger.info("🔻 Database pool closed");
          process.exit(1);
        });
      });
    } else {
      process.exit(1);
    }
  };

  const unexpectedErrorHandler = (error: unknown) => {
    errorlogger.error(error);
    exitHandler();
  };

  process.on("uncaughtException", unexpectedErrorHandler);
  process.on("unhandledRejection", unexpectedErrorHandler);

  process.on("SIGTERM", () => {
    logger.info("📴 SIGTERM received");
    if (server) {
      server.close(async () => {
        logger.info("🔻 Server closed on SIGTERM");
        // Close database pool
        await pool.end();
        logger.info("🔻 Database pool closed on SIGTERM");
      });
    }
  });
}

bootstrap();