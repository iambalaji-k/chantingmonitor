# Build a Production-Ready Hare Krishna Chanting Progressive Web App

## Project Overview

Build a complete, production-quality Progressive Web App (PWA) for Hare Krishna Japa meditation.

The app is intended to be a distraction-free digital chanting companion that automatically tracks rounds, displays mantra progress, records statistics, and supports focused devotional practice.

This application will be hosted on GitHub Pages and must work entirely client-side with no backend infrastructure.

The final deliverable should be fully functional, polished, mobile-first, installable as a PWA, and capable of running completely offline after the first load.

---

# Technical Stack

Use:

* React
* TypeScript
* Vite
* IndexedDB for storage
* PWA architecture using service workers
* GitHub Pages compatible deployment

Do NOT use:

* Backend services
* Authentication
* User accounts
* Cloud databases
* Analytics services
* Third-party tracking

Everything must run locally in the browser.

---

# Audio Assets

Audio assets will be provided separately.

The following files exist:

## Opening Pranam Mantra

Single audio file.

Played at the beginning of every round.

---

## Hare Krishna Maha-Mantra

Multiple audio files.

Each file contains ONE complete repetition of the Maha-Mantra.

Separate versions exist for different speeds.

Examples:

* Slow
* Medium
* Fast

Default selection:

Fastest available speed.

Users may switch speeds at any time.

Changing speed should affect subsequent mantra repetitions without breaking the current session.

---

## Bell Chime

Single audio file.

Played at the end of every round.

Used as the official round completion indicator.

---

# Round Structure

One round consists of:

1. Opening Pranam Mantra (played once)
2. Hare Krishna Maha-Mantra repeated exactly 108 times
3. Opening Pranam Mantra (played once) (same audio asset as the opening)
4. Bell Chime

Round completion occurs only after the bell chime finishes playing.

Immediately after round completion:

* Round count increases by 1
* Statistics update
* Session data saved
* Haptic feedback triggered if supported
* Next round automatically starts

Auto-repeat is mandatory and enabled by default.

There should be no interruption between rounds.

---

# Mantra Counting Logic

Because the Hare Krishna audio asset contains a single repetition of the Maha-Mantra:

* The app must programmatically play the selected mantra audio file 108 times per round.
* The mantra counter must increment after each completed repetition.

Then:

* Play bell chime
* Complete round
* Increment round counter
* Start next round automatically

Do not estimate mantra counts based on audio duration.

Count actual completed audio repetitions.


## Display Elements

Show:

### Today's Round Count

Example:

Rounds Today

5 / 16

---

### Current Round Progress

Example:

Mantra

42 / 108

---

### Current Speed

Example:

Fast

---

### Current Session Duration

Example:

45m 22s

---

### Current Streak

Example:

23 Days

---

# Central Mantra Card

The center of the screen must display:

Hare Krishna Hare Krishna

Krishna Krishna Hare Hare

Hare Rama Hare Rama

Rama Rama Hare Hare

# Playback Controls

Controls should be minimal and unobtrusive.

Required controls:

* Play
* Pause
* Resume
* Restart Current Round
* Speed Selector

Controls should automatically fade away after a short delay.

The mantra card should never disappear.

Also add a option to change the current round or current count in a round manually if needed by the user. The changer should be beautiful. Like a number slider as in a clock app.
---

# Daily Goal

Default:

16 rounds

Users may change this value.

Examples:

* 4
* 8
* 16
* 32
* Custom

Display progress clearly.

Example:

10 / 16 completed

---

# Daily Reset

At local device midnight:

00:00

Automatically:

* Archive current day
* Create new day
* Reset round count
* Reset daily session metrics

No user action required.

---

# Historical Data Retention

Store only the most recent seven days.

Rolling seven-day window.

When a new day is created:

* Data older than seven days must be permanently deleted.

No lifetime storage.

No long-term history.

---

# Statistics Screen

Create a dedicated statistics screen.

Purpose:

Motivation, accountability, consistency.

---

## Daily Summary

Display the last seven days.

Show:

* Date
* Rounds completed
* Goal achieved status
* Time spent chanting

---

## Seven-Day Bar Chart

Display a simple vertical bar chart.

Example:

Mon 16

Tue 12

Wed 16

Thu 18

Fri 10

Sat 14

Sun 16

Chart should be clean and mobile-friendly.

---

## Session Metrics

Display:

### Today

* Total chanting time
* Rounds completed
* Goal completion percentage

### Seven-Day Metrics

* Average rounds per day
* Average chanting time per day
* Average time per round
* Current streak
* Longest streak within retained data

---

# Session Recovery

Critical feature.

If:

* Browser closes
* Tab crashes
* Device reboots
* App is removed from memory

The user should return to:

* Current round
* Current mantra count
* Current speed
* Playback position
* Session timer

Recovery should feel seamless.

---

# Offline Support

After first installation:

The app must function completely offline.

Requirements:

* Audio playback
* Statistics
* Session recovery
* Goal tracking
* History

No network required.

Cache all required assets.

---

# Background Playback

Support:

* Screen off
* Device locked
* User switches apps
* Browser minimized

Playback should continue whenever browser and OS policies permit.

Implement best-practice Media Session APIs.

---

# Audio Focus Handling

Handle interruptions gracefully.

Examples:

* Incoming calls
* Navigation voice prompts
* Other media playback

Behavior:

* Automatically pause
* Resume when appropriate
* Preserve state

Never lose progress.

---

# Haptic Feedback

When a round completes:

Trigger a subtle vibration.

Requirements:

* Short pulse
* Non-intrusive
* Graceful fallback if unsupported

---

# Theme System

# Data Export

Allow exporting all stored data as JSON.

---

# Data Import

Allow restoring exported JSON.

Validate imported data before applying.

---

# Reset Data

Provide:

Reset All Data

Confirmation required.

---

# Storage Architecture

Use IndexedDB.

Store:

* Current session
* Round progress
* Mantra progress
* Speed preference
* Goal setting
* Daily statistics
* Seven-day history
* Theme preference

Design storage architecture for reliability and crash recovery.

---

# PWA Requirements

Must be installable on:

* Android
* iPhone
* Windows
* macOS

Provide:

* Manifest
* Service Worker
* Offline support
* App icons
* Splash screens where possible

---

# Performance Requirements

Target:

* First load under 3 seconds
* Offline launch under 1 second
* Smooth playback
* Minimal battery consumption
* No memory leaks

---

# Error Handling

Handle gracefully:

* Missing audio files
* Corrupted IndexedDB data
* Browser storage limitations
* Playback interruptions
* Unsupported APIs

Show user-friendly error messages.

Never lose user progress unnecessarily.

---

# Expected Deliverable

Produce a polished, production-ready, GitHub Pages deployable PWA with:

* Clean architecture
* TypeScript typing throughout
* Modular components
* Responsive design
* Offline-first behavior
* Proper accessibility support
* Robust session recovery
* Devotional, distraction-free user experience

The finished application should feel like a dedicated digital japa companion rather than a generic audio player.