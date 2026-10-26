const { defineConfig, devices } = require("@playwright/test");

module.exports = defineConfig({
  expect: {
    timeout: 8000,
  },
  fullyParallel: false,
  reporter: [["list"]],
  testDir: "./tests/e2e",
  timeout: 45000,
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:3000",
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "npm run api",
      env: {
        API_PORT: process.env.API_PORT || "4100",
        HOST: "0.0.0.0",
        MONGODB_DB: process.env.MONGODB_DB || "uytop",
        MONGODB_URI: process.env.MONGODB_URI || "mongodb://localhost:27017/",
        UYTOP_ALLOWED_ORIGINS: "*",
        UYTOP_DB_DRIVER: "mongo",
        UYTOP_DISABLE_RATE_LIMIT: "true",
      },
      reuseExistingServer: true,
      timeout: 30000,
      url: "http://127.0.0.1:4100/listings",
    },
    {
      command: "npm start",
      env: {
        BROWSER: "none",
        PORT: "3000",
        REACT_APP_UYTOP_API_URL: "http://127.0.0.1:4100",
      },
      reuseExistingServer: true,
      timeout: 60000,
      url: "http://localhost:3000",
    },
  ],
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 5"] },
    },
  ],
});
