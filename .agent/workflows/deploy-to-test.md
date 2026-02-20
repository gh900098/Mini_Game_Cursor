---
description: Build and deploy the Mini Game application for local testing (Localhost Only)
---

# Deploy to Test (Localhost)

This workflow builds and deploys the full stack for local testing using the test configuration.

**Prerequisites:**
- Docker Desktop (or Engine) must be running.
- No other services should be blocking ports 3100, 3101, 3102, 5432, 6379.

## Steps

1.  **Navigate to Project Root**
    `d:\Google_Antigravity_project\Mini_Game\Mini_Game`

2.  **Start Test Environment**
    // turbo
    ```powershell
    docker-compose -f docker-compose.test.yml up --build -d
    ```

3.  **Verify Status**
    // turbo
    ```powershell
    docker ps --filter name=test
    ```

4.  **Access (Localhost Only)**
    - **Admin Panel:** [http://localhost:3101](http://localhost:3101)
    - **Game Web App:** [http://localhost:3102](http://localhost:3102)
    - **API:** [http://localhost:3100](http://localhost:3100)

## Comparison with Production
- **Test:** Uses `docker-compose.test.yml`. Everything is `localhost`.
- **Production:** Uses `docker-compose.prod.yml`. Uses configurable domain variables.
