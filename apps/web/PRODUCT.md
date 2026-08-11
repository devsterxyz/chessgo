# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Casual and competitive chess players looking for fast, lightweight online matchmaking.

## Product Purpose

ChessGo provides an instant, responsive real-time chess platform with seamless matchmaking, clean live gameplay, and essential performance tracking.

## Positioning

A minimal, ultra-responsive chess experience focused on zero-friction play, fast time controls (3 min, 5 min, 10 min), and sleek stats tracking without social clutter.

## Operating Context

Desktop-first web application designed for focused chess sessions, quick real-time 1v1 matches via WebSocket backend, and player profiles.

## Capabilities and Constraints

- Real-time 1v1 chess matchmaking via WebSockets (`ws://localhost:8080`)
- Time controls: 3+0, 5+0, 10+0
- Token-based user sessions in local storage
- Dynamic player profiles (`/[username]`) with ratings (Blitz, Rapid, Bullet), performance breakdown (Wins/Draws/Losses), and rating sparklines
- Desktop-first responsive layout with structured two-column grids

## Brand Commitments

- Name: ChessGo
- Aesthetic: Modern, clean, light background (`#f7f5f0`), white card containers with neutral borders, and emerald green action accents (`#10b981`).

## Evidence on Hand

- Runnable Next.js 16 app with App Router
- Active routes: `/`, `/play`, `/game/[gameId]`, `/[username]`
- SVG piece set and chess board image assets in `public/`

## Product Principles

1. **Distraction-Free Play**: Prioritize board view, clock clarity, and low-latency interaction over feature bloat.
2. **Speed & Clarity**: Instant feedback for matchmaking states, move confirmation, and rating changes.
3. **Structured Desktop Design**: Polished high-contrast cards, emerald accent hierarchy, and clean typography.
