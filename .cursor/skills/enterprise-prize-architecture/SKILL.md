---
name: Enterprise Prize Architecture
description: Specialized skill for managing dynamic prize types, behavior strategies, and external fulfillment integrations.
---

# Enterprise Prize Architecture

This skill defines the technical standards and patterns for the dynamic prize system in the Mini Game platform. It replaces hardcoded prize logic with a strategy-based architecture.

## Core Concepts

### 1. Dynamic Prize Types
Prize types are no longer hardcoded Enums. They are entities stored in the database, allowing admins to create, name, and categorize them (e.g., "Cash", "E-Gift", "Physical Reward").

### 2. Behavior Strategies
Each Prize Type is associated with a **Strategy** that determines how the system handles a win:

| Strategy | Behavior Description |
| :--- | :--- |
| `BALANCE_CREDIT` | Automatically credit the user's wallet/balance. |
| `MANUAL_FULFILL` | Mark as PENDING, requires admin action (shipping/handover). |
| `VIRTUAL_CODE` | Issue a voucher code or digital key. |
| `EXTERNAL_WEBHOOK` | Trigger an API call to a 3rd party system for activation. |

## Implementation Standards

### Backend (NestJS)
- **Entity**: `PrizeType` stores the name, slug, strategy, and configuration (JSONB).
- **Service**: `PrizeStrategyService` acts as a dispatcher. It looks up the strategy for a won prize and executes the corresponding logic.
- **Hook Points**: The `ScoresService` should call the `PrizeStrategyService` immediately after a win is recorded.

### Frontend (Vue/Soybean)
- **Prize Type Manager**: A CRUD interface for defining new types.
- **Dynamic Configuration**: Game instance prize settings must fetch the list of dynamic types from the API instead of using static options.
- **Adaptive UI**: The Prize Ledger should use the `showValue` flag and `strategy` metadata to conditionally render columns and buttons (e.g., "Claim" vs. "Ship").

## Best Practices
- **Never Hardcode Labels**: Always use the name field from the `PrizeType` entity for UI display.
- **Fail Gracefully**: If an `EXTERNAL_WEBHOOK` fails, the prize should remain in a `RETRY_PENDING` state rather than disappearing.
- **Versioning**: When a `PrizeType` is updated, existing wins should retain a snapshot of the strategy used at the time of the win.
