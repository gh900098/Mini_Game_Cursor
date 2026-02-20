---
description: Build and deploy the Mini Game application using Docker Compose (Production Mode)
---

# Deploy to Prod (Configurable)

This workflow builds and deploys the full stack (API, Admin, Web App, Postgres, Redis) using the production configuration.

**Prerequisites:**
- Docker Desktop (or Engine) must be running.
- No other services should be blocking ports 3000, 3100, 3101, 3102, 5432, 6379.

## Steps

1.  **Navigate to Project Root**
    Ensure you are in the root directory: `d:\Google_Antigravity_project\Mini_Game\Mini_Game`.

2.  **Build and Start Services**
    Run the following command to rebuild images and start containers in detached mode:
    // turbo
    ```powershell
    docker-compose -f docker-compose.prod.yml up --build -d
    ```

3.  **Verify Deployment**
    Check the status of running containers:
    // turbo
    ```powershell
    docker ps
    ```
    *Expected Output:* You should see 5 healthy containers:
    -   `minigame-postgres` (Port 5432)
    -   `minigame-redis` (Port 6379)
    -   `minigame-api` (Port 3100 -> 3000)
    -   `minigame-admin` (Port 3101 -> 80)
    -   `minigame-webapp` (Port 3102 -> 80)

4.  **Access Applications**
    -   **Admin Panel:** [http://localhost:3101](http://localhost:3101)
    -   **Game Web App:** [http://localhost:3102](http://localhost:3102)
    -   **API:** [http://localhost:3100](http://localhost:3100)

## Troubleshooting

-   **"The attribute `version` is obsolete"**: This is a warning and can be ignored.
-   **Port Conflicts**: If ports are in use, modify `docker-compose.prod.yml` ports mapping or stop conflicting services.
-   **Database Usage**: The postgres data is persisted in the `postgres_data` volume. To reset, run `docker-compose down -v`.
