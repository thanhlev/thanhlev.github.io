---
layout: default
title: "Tmux Quick Reference"
short_description: "The tmux commands I actually use: sessions, panes, send-keys scripting, my tmux.conf"
status: "Done"
picture: "assets/images/TMUX-Cheatsheet-Cover-Image.001.jpeg"
latest_release: "2026-11-22: English, scripting and config added"
index: 3
publish: true
---

# Tmux Quick Reference
{: .no_toc }

## Table of contents
{: .no_toc }

1. TOC
{:toc}

---

## Why I keep this page

What I want from tmux: a serial console on `/dev/ttyUSB0`, a long build or an SSH session to a
board keeps running when my laptop sleeps or the Wi-Fi drops, and I reattach later, from another
machine if needed. My session is called `thanhle` almost everywhere (the `boot.sh` of my
[Bluetooth keyboard emulator](/embedded/keyboard-mouse-emulate-rpi) opens one with that name too),
so that's the name in the examples below.

### Concepts

```
┌───────────────────────────────────────────────────────────────────┐
│  tmux server (background process, persists across detach/attach)   │
│                                                                     │
│  ┌─── Session: "dev" ─────────────────────────────────────────┐   │
│  │                                                             │   │
│  │  ┌─── Window 0: "editor" ────┐  ┌─── Window 1: "logs" ──┐ │   │
│  │  │ ┌────────┐ ┌────────────┐ │  │ ┌────────────────────┐ │ │   │
│  │  │ │ Pane 0 │ │  Pane 1    │ │  │ │     Pane 0         │ │ │   │
│  │  │ │  vim   │ │  terminal  │ │  │ │  tail -f log       │ │ │   │
│  │  │ └────────┘ └────────────┘ │  │ └────────────────────┘ │ │   │
│  │  │ ┌───────────────────────┐ │  │ ┌────────────────────┐ │ │   │
│  │  │ │       Pane 2          │ │  │ │     Pane 1         │ │ │   │
│  │  │ │    build output       │ │  │ │  journalctl -f     │ │ │   │
│  │  │ └───────────────────────┘ │  │ └────────────────────┘ │ │   │
│  │  └───────────────────────────┘  └────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─── Session: "monitor" ────────────────────────────────────┐    │
│  │  ...                                                       │    │
│  └────────────────────────────────────────────────────────────┘    │
└───────────────────────────────────────────────────────────────────┘
```

- **Server**: the background process that owns all sessions
- **Session**: a set of windows with a name (`thanhle`)
- **Window**: a full-screen terminal, like a tab
- **Pane**: a split inside a window

The **prefix key** is `Ctrl+b` by default. All key bindings below are typed after pressing the prefix.

## Server Operations

```bash
# Start tmux (creates default session)
tmux

# Start server without creating a session
tmux start-server

# Kill the entire tmux server (destroys all sessions)
tmux kill-server

# Show tmux version
tmux -V
```

## Session Operations

### From the Shell

```bash
# Create a new session named "dev"
tmux new-session -s dev

# Create session in detached mode (background)
tmux new-session -s dev -d

# Create session with a named first window
tmux new-session -s dev -n editor -d

# Create session and run a command
tmux new-session -s monitor -d 'htop'

# List all sessions
tmux list-sessions
tmux ls

# Attach to a session
tmux attach-session -t dev
tmux a -t dev

# Attach to most recent session
tmux attach

# Detach current client (from within tmux)
tmux detach

# Check if a session exists (useful in scripts)
tmux has-session -t dev && echo "exists" || echo "not found"

# Rename a session
tmux rename-session -t dev development

# Kill a specific session
tmux kill-session -t dev

# Kill all sessions except current
tmux kill-session -a

# Kill all sessions except "dev"
tmux kill-session -a -t dev
```

### Key Bindings (inside tmux)

| Key | Action |
|-----|--------|
| `Prefix d` | Detach from session |
| `Prefix s` | List sessions (interactive switcher) |
| `Prefix $` | Rename current session |
| `Prefix (` | Switch to previous session |
| `Prefix )` | Switch to next session |
| `Prefix L` | Switch to last (previously used) session |

## Window Operations

### From the Shell

```bash
# Create a new window in session "dev"
tmux new-window -t dev

# Create with a name
tmux new-window -t dev -n build

# List windows in a session
tmux list-windows -t dev

# Rename a window
tmux rename-window -t dev:build compile

# Select (switch to) a window
tmux select-window -t dev:0
tmux select-window -t dev:editor

# Kill a window
tmux kill-window -t dev:build

# Move window to a different index
tmux move-window -t dev:5

# Swap two windows
tmux swap-window -s dev:0 -t dev:1
```

### Key Bindings

| Key | Action |
|-----|--------|
| `Prefix c` | Create a new window |
| `Prefix ,` | Rename current window |
| `Prefix &` | Kill current window (with confirmation) |
| `Prefix w` | List windows (interactive chooser) |
| `Prefix n` | Next window |
| `Prefix p` | Previous window |
| `Prefix 0-9` | Switch to window by number |
| `Prefix l` | Switch to last active window |
| `Prefix f` | Find window by name |
| `Prefix .` | Move window to a new index |

## Pane Operations

### From the Shell

```bash
# Split current pane horizontally (left/right)
tmux split-window -h -t dev:editor

# Split current pane vertically (top/bottom)
tmux split-window -v -t dev:editor

# Split a specific pane
tmux split-window -h -t dev:editor.0

# List panes in a window
tmux list-panes -t dev:editor

# Kill a pane
tmux kill-pane -t dev:editor.2

# Select (focus) a pane
tmux select-pane -t dev:editor.0

# Resize pane (directions: -U up, -D down, -L left, -R right)
tmux resize-pane -t dev:editor.0 -D 10
tmux resize-pane -t dev:editor.0 -R 20

# Swap two panes
tmux swap-pane -s 0 -t 1

# Move pane to a new window
tmux break-pane -t dev:editor.1

# Join a pane from another window into current
tmux join-pane -s dev:build.0 -t dev:editor
```

### Key Bindings

| Key | Action |
|-----|--------|
| `Prefix %` | Split horizontally (left/right) |
| `Prefix "` | Split vertically (top/bottom) |
| `Prefix x` | Kill current pane (with confirmation) |
| `Prefix o` | Cycle through panes |
| `Prefix ;` | Toggle between last two active panes |
| `Prefix q` | Show pane numbers (press number to select) |
| `Prefix z` | Toggle pane zoom (full-screen / restore) |
| `Prefix {` | Swap pane with previous |
| `Prefix }` | Swap pane with next |
| `Prefix Space` | Cycle through preset layouts |
| `Prefix !` | Break pane into its own window |
| `Prefix Arrow` | Navigate to pane in direction |
| `Prefix Ctrl+Arrow` | Resize pane in direction (1 cell) |
| `Prefix Alt+Arrow` | Resize pane in direction (5 cells) |

### Preset Layouts

Cycle with `Prefix Space` or set explicitly:

```bash
tmux select-layout even-horizontal    # all panes side by side
tmux select-layout even-vertical      # all panes stacked
tmux select-layout main-horizontal    # one large top, rest bottom
tmux select-layout main-vertical      # one large left, rest right
tmux select-layout tiled              # balanced grid
```

## Sending Commands to Panes (Scripting)

`send-keys` is what makes tmux scriptable: it types into a target pane as if you did. `C-m` at the end is the Enter key.

```bash
# Send a command to a specific pane
tmux send-keys -t dev:editor.0 'ls -al' C-m

# C-m = Enter (Ctrl+m)
# C-c = Ctrl+C (cancel)
# C-l = clear screen

# Send to a window (goes to the active pane in that window)
tmux send-keys -t dev:build 'make -j4' C-m

# Send Ctrl+C to stop a process
tmux send-keys -t dev:logs.0 C-c

# Send keys without pressing Enter (partial input)
tmux send-keys -t dev:editor.0 'vim '
```

## Copy Mode (Scrollback & Selection)

tmux maintains a scrollback buffer for each pane. Enter copy mode to scroll, search, and copy text.

| Key | Action |
|-----|--------|
| `Prefix [` | Enter copy mode |
| `q` or `Escape` | Exit copy mode |
| `Arrow keys` / `hjkl` | Navigate |
| `Ctrl+u` / `Ctrl+d` | Page up / down |
| `g` / `G` | Go to top / bottom |
| `/` | Search forward |
| `?` | Search backward |
| `n` / `N` | Next / previous match |
| `Space` | Start selection (then move to select) |
| `Enter` | Copy selection and exit copy mode |
| `Prefix ]` | Paste from buffer |

```bash
# Show paste buffer contents
tmux show-buffer

# Save buffer to file
tmux save-buffer ~/tmux-output.txt

# Copy a pane's visible content to a file
tmux capture-pane -t dev:editor.0 -p > pane_content.txt

# Capture entire scrollback history
tmux capture-pane -t dev:editor.0 -p -S - > full_history.txt
```

## Scripting: a whole setup in one script

Create a development environment with a single script:

```bash
#!/bin/bash
SESSION="dev"

# Kill existing session if present
tmux kill-session -t $SESSION 2>/dev/null

# Create session with first window named "editor"
tmux new-session -s $SESSION -n editor -d

# Split editor window: left (editor) + right (terminal)
tmux split-window -h -t $SESSION:editor
tmux select-pane -t $SESSION:editor.0

# Send commands
tmux send-keys -t $SESSION:editor.0 'vim .' C-m
tmux send-keys -t $SESSION:editor.1 'git status' C-m

# Create second window: "build"
tmux new-window -t $SESSION -n build
tmux send-keys -t $SESSION:build 'make -j$(nproc)' C-m

# Create third window: "logs" with two panes
tmux new-window -t $SESSION -n logs
tmux split-window -v -t $SESSION:logs
tmux send-keys -t $SESSION:logs.0 'tail -f /var/log/syslog' C-m
tmux send-keys -t $SESSION:logs.1 'journalctl -f' C-m

# Select first window and attach
tmux select-window -t $SESSION:editor
tmux attach-session -t $SESSION
```

### Embedded System Example (Boot Script)

```bash
#!/bin/bash
SESSION="embedded"

tmux kill-session -t $SESSION 2>/dev/null
tmux new-session -s $SESSION -n serial -d

# Serial console
tmux send-keys -t $SESSION:serial 'picocom -b 115200 /dev/ttyUSB0' C-m

# Build window with kernel + rootfs panes
tmux new-window -t $SESSION -n build
tmux split-window -h -t $SESSION:build
tmux send-keys -t $SESSION:build.0 'cd ~/kernel && make menuconfig' C-m
tmux send-keys -t $SESSION:build.1 'cd ~/buildroot' C-m

# window for serving images to the board over HTTP
tmux new-window -t $SESSION -n server
tmux send-keys -t $SESSION:server 'cd /srv/tftp && python3 -m http.server 8080' C-m

tmux select-window -t $SESSION:serial
tmux attach -t $SESSION
```

## Configuration (~/.tmux.conf)

### The settings I always set

```bash
# Use Ctrl+a as prefix (more ergonomic than Ctrl+b)
unbind C-b
set -g prefix C-a
bind C-a send-prefix

# Start window/pane numbering at 1 (0 is far from prefix key)
set -g base-index 1
setw -g pane-base-index 1

# Renumber windows when one is closed
set -g renumber-windows on

# Enable mouse support (click to select pane, resize, scroll)
set -g mouse on

# Increase scrollback buffer
set -g history-limit 50000

# Reduce escape delay (important for vim/neovim)
set -sg escape-time 0

# Enable 256 colors
set -g default-terminal "screen-256color"
set -ga terminal-overrides ",xterm-256color:Tc"

# Activity alerts
setw -g monitor-activity on
set -g visual-activity off
```

### Better Key Bindings

```bash
# Split panes with | and - (more intuitive)
bind | split-window -h -c "#{pane_current_path}"
bind - split-window -v -c "#{pane_current_path}"
unbind '"'
unbind %

# New window in current directory
bind c new-window -c "#{pane_current_path}"

# Navigate panes with Alt+Arrow (no prefix needed)
bind -n M-Left select-pane -L
bind -n M-Right select-pane -R
bind -n M-Up select-pane -U
bind -n M-Down select-pane -D

# Resize panes with Prefix+Shift+Arrow
bind -r H resize-pane -L 5
bind -r J resize-pane -D 5
bind -r K resize-pane -U 5
bind -r L resize-pane -R 5

# Quick reload config
bind r source-file ~/.tmux.conf \; display "Config reloaded!"

# Synchronize panes (type in all panes at once)
bind S setw synchronize-panes

# Switch windows with Shift+Arrow (no prefix)
bind -n S-Left previous-window
bind -n S-Right next-window
```

### Status Bar Customization

```bash
# Status bar position
set -g status-position bottom

# Status bar colors
set -g status-style 'bg=#1e1e2e fg=#cdd6f4'

# Left: session name
set -g status-left '#[fg=#89b4fa,bold] #S '
set -g status-left-length 20

# Right: date and time
set -g status-right '#[fg=#a6adc8] %Y-%m-%d  %H:%M '

# Window format
setw -g window-status-format ' #I:#W '
setw -g window-status-current-format '#[fg=#1e1e2e,bg=#89b4fa,bold] #I:#W '

# Pane border colors
set -g pane-border-style 'fg=#45475a'
set -g pane-active-border-style 'fg=#89b4fa'
```

### Vi Mode for Copy

```bash
# Use vi keys in copy mode
setw -g mode-keys vi

# Vi-style copy
bind -T copy-mode-vi v send-keys -X begin-selection
bind -T copy-mode-vi y send-keys -X copy-pipe-and-cancel "xclip -selection clipboard"
bind -T copy-mode-vi r send-keys -X rectangle-toggle

# Also copy to system clipboard on Enter
bind -T copy-mode-vi Enter send-keys -X copy-pipe-and-cancel "xclip -selection clipboard"
```

## Useful Command Combinations

```bash
# Run same command in all panes of current window
tmux setw synchronize-panes on
# Type your command; it goes to all panes
tmux setw synchronize-panes off

# Capture all panes to files (for debugging)
for pane in $(tmux list-panes -F '#{pane_index}'); do
    tmux capture-pane -t :.$pane -p > "pane_${pane}.log"
done

# Send command to ALL windows in a session
for window in $(tmux list-windows -t dev -F '#{window_index}'); do
    tmux send-keys -t dev:$window 'uptime' C-m
done

# Monitor a pane for specific output
tmux pipe-pane -t dev:build.0 'grep --line-buffered "error" >> /tmp/build_errors.log'

# Display a pane in a popup (tmux 3.2+)
tmux display-popup -E 'htop'

# Show environment variables
tmux show-environment -g
```

## Target Syntax Reference

tmux uses a consistent target syntax: `session:window.pane`

```
Target format: [session:]window[.pane]

Examples:
  dev              → session "dev", current window/pane
  dev:0            → session "dev", window index 0
  dev:editor       → session "dev", window named "editor"
  dev:editor.0     → session "dev", window "editor", pane 0
  :0               → current session, window index 0
  :.1              → current session, current window, pane 1
  +1               → next window
  -1               → previous window
```

## Plugin Manager (TPM)

```bash
# Install TPM
git clone https://github.com/tmux-plugins/tpm ~/.tmux/plugins/tpm

# Add to ~/.tmux.conf:
set -g @plugin 'tmux-plugins/tpm'
set -g @plugin 'tmux-plugins/tmux-sensible'      # sensible defaults
set -g @plugin 'tmux-plugins/tmux-resurrect'     # save/restore sessions across restarts
set -g @plugin 'tmux-plugins/tmux-continuum'     # auto-save sessions
set -g @plugin 'tmux-plugins/tmux-yank'          # copy to system clipboard
set -g @plugin 'christoomey/vim-tmux-navigator'  # same keys to move between vim splits and tmux panes

# Initialize TPM (keep at bottom of tmux.conf)
run '~/.tmux/plugins/tpm/tpm'

# Then press Prefix + I to install plugins
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Sessions not persisting after reboot | sessions live in the server's memory; the `tmux-resurrect` plugin saves and restores them |
| Colors look wrong | Set `default-terminal` to `screen-256color` and add `terminal-overrides` |
| Escape key has delay (vim) | Set `escape-time 0` in tmux.conf |
| Mouse scroll shows history instead of scrolling app | The application needs mouse support, or use copy mode (`Prefix [`) |
| Copy doesn't work to system clipboard | Install `xclip` or `xsel` and configure copy-pipe |
| Window stuck at a smaller client's size | `tmux resize-window -A` (or detach the other client: `tmux attach -d`) |

```bash
# Check tmux configuration for errors
tmux source-file ~/.tmux.conf

# Show all key bindings
tmux list-keys

# Show all options
tmux show-options -g

# Show tmux info (debugging)
tmux info
```

## References

- [tmux man page](https://man7.org/linux/man-pages/man1/tmux.1.html)
- [tmux GitHub repository](https://github.com/tmux/tmux)
- [tmux Plugin Manager (TPM)](https://github.com/tmux-plugins/tpm)
- [The Tao of tmux (online book)](https://leanpub.com/the-tao-of-tmux/read)
