module.exports = {
  apps: [
    {
      name: "web-app",
      cwd: `${__dirname}/packages/web`,
      // Run Vite dev server — handles both frontend HMR and API live-reload
      // via the hono-dev-plugin. No build step needed.
      script: "bunx",
      args: "vite",
      interpreter: "none",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      restart_delay: 1000,
    },
  ],
};
