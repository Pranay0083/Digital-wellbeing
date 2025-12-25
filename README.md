
---

# 📘 **DigitalWell (macOS)**

### *CLI-based Website Time Tracking, Blocking & Focus Mode with Parental Lock*

---

## 🚀 Overview

**DigitalWell** is a macOS digital wellbeing system that helps you:

* Track how much time you spend on websites
* Block distracting domains
* Set daily time limits
* Enable Focus Mode to allow only specific websites
* Protect all settings with a **parental/admin password**
* Run automatically in the background
* Install with a simple command:

```
npm i -g digitalwell
```

DigitalWell tracks you across **Chrome, Safari, Edge, and Brave**, handles multiple tabs, rapid tab switching, and idle time.

---

## 🧱 Architecture

```
                           ┌──────────────────────┐
                           │        CLI (dw)      │
                           │  User Commands & UI  │
                           └──────────┬───────────┘
                                      │
                                      ▼
                       ┌────────────────────────────┐
                       │   Auth Layer (Password)    │
                       │   Keychain-secured tokens  │
                       └──────────┬─────────────────┘
                                  │
                                  ▼
                ┌────────────────────────────────────────┐
                │          DigitalWell Daemon             │
                │     (runs via launchd at login)         │
                ├──────────────────┬──────────────────────┤
                │ Browser Tracker  │ Rules Engine         │
                │ AppleScript/JXA  │ Limits / Blocks      │
                ├──────────────────┼──────────────────────┤
                │ Idle Detector    │ Usage Session Logger │
                │ macOS Quartz API │ SQLite writer        │
                └──────────────────┴──────────────────────┘
                                  │
                                  ▼
                     ┌───────────────────────────┐
                     │       SQLite Database      │
                     │  sessions / limits / logs  │
                     └───────────────────────────┘
```

### Core Components

| Component              | Responsibility                                    |
| ---------------------- | ------------------------------------------------- |
| **CLI (`dw`)**         | Command interface to manage limits, blocks, stats |
| **Daemon**             | Tracks active tab, enforces rules                 |
| **AppleScript Bridge** | Reads active tab URL from browsers                |
| **Quartz Idle API**    | Detects inactivity and pauses timers              |
| **SQLite DB**          | Stores sessions, domains, settings                |
| **launchd**            | Auto-starts daemon at login                       |
| **Keychain**           | Stores parental password securely                 |

---

## ✨ Features

### ✔ Website Usage Tracking

Accurate per-domain usage tracking using:

* Active tab detection
* Active window detection
* Idle detection
* Multi-tab and rapid-switching handling

### ✔ Website Blocking

Block distracting websites:

```
dw block youtube.com
```

### ✔ Time Limits

Limit usage:

```
dw limit instagram.com 20m
```

### ✔ Focus Mode

Allow only selected websites:

```
dw focus allow google.com chat.openai.com
```

### ✔ Parental Lock

Settings protected with password stored securely in Keychain.

### ✔ Auto-Start Daemon

Daemon starts automatically after installation.

---

## 📦 Installation (via npm)

Install globally:

```
npm i -g digitalwell
```

This will:

* Install CLI (`dw`)
* Install daemon
* Create DigitalWell directories
* Initialize SQLite database
* Install LaunchAgent for macOS auto-start
* Ask for macOS permissions

Verify installation:

```
dw --version
```

---

## 🛠 Setup

### 1. Set parental password

```
dw setup password
```

### 2. Grant macOS permissions

macOS will prompt automatically.

You must allow:

* **Accessibility**
* **Automation (Chrome/Safari control)**
* **Full Disk Access** (optional for logs/db)

### 3. Check daemon status

```
dw daemon status
```

If not running:

```
dw daemon start
```

---

## 🖥 How Tracking Works

DigitalWell tracks time only when:

* Browser window is the active foreground app
* Tab is active
* URL is readable via AppleScript
* User is not idle
* macOS session is unlocked

Idle time > 60 seconds → tracking pauses.

Multiple tabs?
Only the **visible active tab** is timed.

Switching apps?
Timers stop instantly.

Watching a YouTube video?
Time counts unless idle threshold exceeded.

---

## 📟 CLI Usage

### 🔹 Check today’s usage

```
dw stats today
```

### 🔹 Last 7 days

```
dw stats week
```

### 🔹 Top websites

```
dw stats top
```

---

## ⏳ Setting Limits

Set limit:

```
dw limit youtube.com 30m
```

Remove limit:

```
dw limit remove youtube.com
```

List limits:

```
dw limit list
```

---

## 🚫 Blocking Websites

Block:

```
dw block tiktok.com
```

Unblock:

```
dw unblock tiktok.com
```

List blocks:

```
dw block list
```

---

## 🎯 Focus Mode

Allow only:

```
dw focus allow google.com notion.so github.com
```

Disable focus mode:

```
dw focus off
```

---

## 🔐 Parental Lock

All protected commands (limits, block, focus off, daemon stop) ask for password:

```
Enter parental password:
```

Change password:

```
dw auth change-password
```

Reset (requires macOS login prompt):

```
dw auth reset
```

---

## ⚙️ Managing the Daemon

Status:

```
dw daemon status
```

Start:

```
dw daemon start
```

Stop (requires password):

```
dw daemon stop
```

Restart:

```
dw daemon restart
```

---

## 🧹 Uninstall

Protected uninstall:

```
npm uninstall -g digitalwell
```

CLI will ask for:

```
Enter parental password:
```

If password incorrect → uninstall blocked.

---

## 🛠 Troubleshooting

### ❗ Usage not tracking

Check permissions:

```
System Settings → Privacy & Security → Accessibility
System Settings → Privacy & Security → Automation
```

### ❗ Website not blocking

Verify rules:

```
dw block list
dw limit list
```

### ❗ Daemon not running

Reload:

```
dw daemon restart
```

---

## 📜 License

MIT License

---

## 🤝 Contributing

Pull requests welcome!

---
