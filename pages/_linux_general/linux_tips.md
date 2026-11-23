---
layout: default
title: "Linux Tips & Tricks"
short_description: "My scratchpad of shell one-liners: fstab, cleanup, time, git, sed, awk, find"
status: "Done"
picture: "assets/images/linux_tips_cover.jpg"   # 2026-11-23 cover, story_cover.py
latest_release: "2026-11-22: rewritten as a STAR story"
index: 2
publish: true
tags: [linux, tools]
---

# Linux Tips & Tricks
{: .no_toc }

![Linux tips in one picture]({{ '/assets/images/linux_tips_cover.jpg' | relative_url }})
*Thirteen groups of shell lines I never remember; the fstab block is the one I open most.*

## Table of contents
{: .no_toc }

1. TOC
{:toc}

---

## Situation

Some shell lines I type once a year and never remember: the fstab line for my SSD, the timezone
name for Ho Chi Minh, the `awk` field tricks, the git rebase. Every time, it was a web search
again for something I had already worked out once.

## Task

Keep them all on one page, grouped by what I'm trying to do (disk, time, network, git, text), so
the TOC or Ctrl+F gets me there faster than a search engine does.

## Action

Everything below is the reference itself. Placeholders like `<PID>`, `eth0` or `HDMI1` are mine
to replace; the UUID in the fstab line is the one from my own SSD.

### Process & System Info

#### Count Processes and Threads

```bash
# Count all processes
ps -A | wc -l

# Count all threads (including kernel threads)
ps -LA | wc -l

# Count only kernel threads
ps aux | awk '{print $11}' | grep "^\[" | wc -l

# Top 10 processes by memory
ps aux --sort=-%mem | head -11

# Top 10 processes by CPU
ps aux --sort=-%cpu | head -11
```

#### System Resource Usage

```bash
# Memory usage summary
free -h

# Disk usage by directory (sorted, human-readable)
du -sh /* 2>/dev/null | sort -rh | head -20

# Disk usage of current directory (one level deep)
du -sh */ | sort -rh

# Show open files by a process
lsof -p $(pgrep nginx | head -1)

# Count open file descriptors per process
for pid in /proc/[0-9]*; do
    echo "$(ls $pid/fd 2>/dev/null | wc -l) $(cat $pid/comm 2>/dev/null)"
done | sort -rn | head -20

# Watch system calls of a running process
strace -p <PID> -c    # summary
strace -p <PID> -e trace=network    # only network calls
```

### Disk & Filesystem

#### Auto-Mount a Disk at Boot

```bash
# 1. Find the UUID of the partition
sudo blkid
# or
ls -al /dev/disk/by-uuid/

# 2. Create mount point
sudo mkdir -p /mnt/data

# 3. Add entry to /etc/fstab
# Format: UUID=<uuid> <mountpoint> <type> <options> <dump> <pass>
echo "UUID=b071688a-414a-4665-a45e-102432e06315 /mnt/data ext4 defaults,noatime 0 2" | sudo tee -a /etc/fstab

# 4. Verify fstab syntax (catches errors before reboot)
findmnt --verify

# 5. Test mount without reboot
sudo mount -a
```

#### fstab Options Reference

| Option | Meaning |
|--------|---------|
| `defaults` | rw, suid, dev, exec, auto, nouser, async |
| `noatime` | Don't update access time (improves SSD performance) |
| `nofail` | Boot won't fail if device is missing |
| `discard` | Enable TRIM for SSDs |
| `ro` | Read-only |
| `x-systemd.automount` | Mount on first access (lazy mount) |

#### Disk Cleanup

```bash
# Check disk usage
df -h

# Find large files (> 100 MiB)
find / -type f -size +100M -exec ls -lh {} \; 2>/dev/null | sort -k5 -rh

# Clear systemd journal logs (keep 3 days)
sudo journalctl --vacuum-time=3d

# Clear systemd journal (keep 500 MiB max)
sudo journalctl --vacuum-size=500M

# Clean APT cache
sudo apt clean
sudo apt autoremove --purge

# Remove old snap revisions
snap list --all | awk '/disabled/{print $1, $3}' | while read snapname revision; do
    sudo snap remove "$snapname" --revision="$revision"
done

# Remove old kernels (keep current)
sudo apt autoremove --purge

# Find and remove orphaned packages
sudo deborphan | xargs sudo apt-get -y remove --purge

# Clear thumbnail cache
rm -rf ~/.cache/thumbnails/*

# Docker cleanup (unused images, containers, volumes)
docker system prune -a --volumes
```

### Time & Timezone

#### Set Timezone

```bash
# List available timezones
timedatectl list-timezones
timedatectl list-timezones | grep "New_York"

# Set timezone
sudo timedatectl set-timezone America/New_York
sudo timedatectl set-timezone Asia/Ho_Chi_Minh
sudo timedatectl set-timezone UTC

# Verify
timedatectl status
```

#### Hardware Clock (RTC)

```bash
# Read hardware clock
sudo hwclock --show
sudo hwclock --show --verbose

# Sync system time → hardware clock
sudo hwclock --systohc

# Sync hardware clock → system time
sudo hwclock --hctosys

# Set system date/time manually
sudo date -s "2026-06-24 14:30:00"

# Then sync to hardware clock
sudo hwclock --systohc

# Enable NTP synchronization
sudo timedatectl set-ntp true
```

### Networking

#### NetworkManager: leave some interfaces alone

```ini
# /etc/NetworkManager/NetworkManager.conf

# Filter by interface name
[keyfile]
unmanaged-devices=interface-name:docker*;interface-name:veth*;interface-name:br-*

# Filter by MAC address
[keyfile]
unmanaged-devices=mac:00:11:22:33:44:55;mac:66:77:88:99:00:aa

# Filter by interface type
[keyfile]
unmanaged-devices=type:bridge;type:vlan
```

After editing, reload:
```bash
sudo systemctl reload NetworkManager
```

#### Quick Network Diagnostics

```bash
# Show all IPs and interfaces
ip -br addr show

# Show routes
ip route show

# Show listening ports
ss -tlnp    # TCP
ss -ulnp    # UDP

# Show established connections
ss -tnp state established

# DNS lookup with timing
dig +stats google.com

# Trace route with packet loss stats
mtr -c 10 --report 8.8.8.8

# Capture packets on an interface
sudo tcpdump -i eth0 -nn -c 100

# Show bandwidth usage per interface (requires nload)
nload eth0

# Test TCP connectivity
nc -zv hostname 443

# Show ARP table
ip neigh show
```

### Git

#### Rewrite Pushed Commits (Interactive Rebase)

```bash
# Edit last N commits
git rebase -i HEAD~N
```

Interactive rebase commands:

| Command | Action |
|---------|--------|
| `p` / `pick` | Keep commit as-is |
| `r` / `reword` | Keep commit, edit message |
| `e` / `edit` | Pause to amend the commit |
| `s` / `squash` | Merge into previous commit (keep message) |
| `f` / `fixup` | Merge into previous commit (discard message) |
| `d` / `drop` | Remove commit entirely |

```bash
# After editing, force push (CAUTION: rewrites remote history)
git push --force-with-lease    # safer than --force
```

#### Other Useful Git Commands

```bash
# Undo last commit (keep changes staged)
git reset --soft HEAD~1

# Show what changed in the last N commits
git log --oneline -10
git log --stat -5

# Find which commit introduced a bug
git bisect start
git bisect bad HEAD
git bisect good v1.0
# git checks out commits; mark each one good or bad until it finds the culprit

# Show file at a specific commit
git show HEAD~3:path/to/file

# Stash with a message
git stash push -m "work in progress on feature X"
git stash list
git stash pop stash@{0}

# Cherry-pick a commit from another branch
git cherry-pick <commit-hash>

# Find a deleted file in history
git log --all --full-history -- "**/filename.txt"

# Clean untracked files (dry run first)
git clean -n
git clean -fd    # actually delete

# Show branch graph
git log --oneline --graph --all --decorate
```

### Shell Scripting

#### Special Variables

| Variable | Meaning |
|----------|---------|
| `$0` | Name of the script |
| `$1`, `$2`, ... | Positional parameters |
| `$#` | Number of arguments passed |
| `$*` | All arguments as a single string |
| `$@` | All arguments as an array (respects quoting) |
| `${@:2}` | All arguments from index 2 onwards |
| `$?` | Exit status of last command |
| `$$` | PID of current script |
| `$!` | PID of last background process |
| `$_` | Last argument of previous command |

#### Arithmetic

```bash
# Integer arithmetic
val=$((val + 256))
result=$((5 * 3 + 2))

# Using expr (POSIX, slower)
val=$(expr "$val" + 256)

# Floating point (use awk or bc)
awk 'BEGIN {printf "%.3f\n", 2005.50 / 3}'
echo "scale=3; 2005.50 / 3" | bc

# Hexadecimal / binary conversion
printf "%d\n" 0xFF        # hex → decimal: 255
printf "0x%x\n" 255       # decimal → hex: 0xff
echo "obase=2; 255" | bc  # decimal → binary: 11111111
```

#### Conditionals and Loops

```bash
# String comparison
[[ "$str" == "hello" ]]
[[ "$str" =~ ^[0-9]+$ ]]    # regex match

# Numeric comparison
[[ $num -gt 10 ]]
(( num > 10 ))               # arithmetic context

# File tests
[[ -f "$file" ]]    # exists and is regular file
[[ -d "$dir" ]]     # exists and is directory
[[ -s "$file" ]]    # exists and is non-empty
[[ -x "$file" ]]    # exists and is executable

# Loop over files
for f in /var/log/*.log; do
    echo "$(wc -l < "$f") $f"
done | sort -rn | head -10

# Loop with index
for i in $(seq 1 10); do echo "$i"; done

# While read (process lines)
while IFS= read -r line; do
    echo "Processing: $line"
done < input.txt

# Process substitution
diff <(ls dir1) <(ls dir2)
```

#### Useful Patterns

```bash
# Default value for variable
name="${1:-default_value}"

# Error handling
set -euo pipefail    # exit on error, undefined vars, pipe failures

# Temporary file with auto-cleanup
tmp=$(mktemp)
trap "rm -f $tmp" EXIT

# Parallel execution (limited concurrency)
find . -name "*.jpg" | xargs -P 4 -I {} convert {} -resize 800x600 resized/{}

# Progress indicator
for i in $(seq 1 100); do
    printf "\rProgress: %d%%" "$i"
    sleep 0.01
done
echo
```

### sed

#### Replace Text

```bash
# Replace first occurrence per line
sed 's/old/new/' file

# Replace all occurrences (global)
sed 's/old/new/g' file

# Replace in-place (modify file)
sed -i 's/old/new/g' file

# Replace using a variable (use double quotes)
new_ssid="MyNetwork"
sed -i "s/\(ssid=\).*/\1\"$new_ssid\"/" /etc/wpa_supplicant/wpa_supplicant.conf

# Replace with different delimiter (useful when / appears in pattern)
sed 's|/usr/local/bin|/opt/bin|g' file
```

#### Delete Lines

```bash
# Delete lines matching a pattern
sed -i "/${pattern}/d" file

# Delete line N
sed -i '5d' file

# Delete lines 3-7
sed -i '3,7d' file

# Delete empty lines
sed -i '/^$/d' file

# Delete lines starting with #
sed -i '/^#/d' file
```

#### Insert and Append

```bash
# Insert before line 3
sed -i '3i\New line inserted here' file

# Append after line matching pattern
sed -i '/pattern/a\New line after pattern' file

# Insert at beginning of file
sed -i '1i\First line' file

# Append at end of file
sed -i '$a\Last line' file
```

#### Extract and Transform

```bash
# Print only lines matching pattern (like grep)
sed -n '/pattern/p' file

# Print lines 10-20
sed -n '10,20p' file

# Extract text between markers
sed -n '/START/,/END/p' file

# Remove HTML tags
sed 's/<[^>]*>//g' file.html

# Convert CRLF to LF
sed -i 's/\r$//' file
```

### awk

`awk` processes text line-by-line. Each line is split into fields (`$1`, `$2`, ..., `$NF`). The pattern before `{ }` selects lines; the action inside `{ }` processes them.

#### Print Fields

```bash
# Print first column (default delimiter: whitespace)
awk '{print $1}' file

# Use : as delimiter, print first field
awk -F':' '{print $1}' /etc/passwd

# Print last field
awk '{print $NF}' file

# Print multiple fields with custom format
awk '{printf "%-20s %s\n", $1, $NF}' file

# Print fields 2 through end
awk '{$1=""; print $0}' file
```

#### Pattern Matching

```bash
# Print lines where field 9 equals 500
awk '$9 == 500' /var/log/httpd/access.log

# Print lines matching regex
awk '/error|warning|critical/' /var/log/syslog

# Print lines where field 3 is greater than 1000
awk '$3 > 1000 {print $1, $3}' data.txt

# Print line N
awk "NR==1{print; exit}" file

# Print specific line range
awk 'NR>=10 && NR<=20' file

# Negate pattern (lines NOT matching)
awk '!/pattern/' file
```

#### Calculations

```bash
# Sum values in column 1
awk '{total += $1} END {print total}' data.txt

# Average of column 3
awk '{sum += $3; n++} END {print sum/n}' data.txt

# Min and max of a column
awk 'NR==1 || $3>max {max=$3} NR==1 || $3<min {min=$3} END {print "min:", min, "max:", max}' data.txt

# Floating-point arithmetic (shell can't do this, awk can)
awk 'BEGIN {printf "%.3f\n", 2005.50 / 3}'

# Count occurrences of each value in a column
awk '{count[$1]++} END {for (k in count) print count[k], k}' file | sort -rn
```

#### Multi-line Programs (awk scripts)

```bash
# Parse Wi-Fi scan results into a clean table
# Save as wlan_scan.awk:
/^BSS/ {
    mac = gensub(/^BSS[[:space:]]*([0-9a-fA-F:]+).*$/, "\\1", "g", $0);
}
/^[[:space:]]*signal:/ {
    signal = gensub(/^[[:space:]]*signal:[[:space:]]*(-?[0-9.]+).*$/, "\\1", "g", $0);
}
/^[[:space:]]*SSID:/ {
    ssid = gensub(/^[[:space:]]*SSID:[[:space:]]*(.*)$/, "\\1", "g", $0);
    printf "%s dBm  %s  %s\n", signal, mac, ssid;
}

# Usage:
sudo iw wlan0 scan | awk -f wlan_scan.awk | sort -g
```

#### Useful One-Liners

```bash
# Print unique lines (like sort -u but preserves order)
awk '!seen[$0]++' file

# Transpose columns to rows
awk '{for (i=1; i<=NF; i++) a[NR][i]=$i} END {for (j=1; j<=NF; j++) {for (i=1; i<=NR; i++) printf "%s ", a[i][j]; print ""}}' file

# Print lines between two patterns
awk '/START/,/END/' file

# Join lines (paste every 3 lines into one)
awk 'ORS=NR%3?"\t":"\n"' file

# Replace field in specific column
awk -F',' '{$3="replaced"; print}' OFS=',' file.csv
```

### find

```bash
# Find files modified in the last 24 hours
find /var/log -mtime -1 -type f

# Find files larger than 100 MiB
find / -size +100M -type f 2>/dev/null

# Find and delete files older than 30 days
find /tmp -type f -mtime +30 -delete

# Find files by extension
find . -name "*.log" -type f

# Find and execute command on each result
find . -name "*.txt" -exec grep -l "pattern" {} \;

# Find with multiple conditions
find . -name "*.py" -not -path "./.venv/*" -newer reference_file

# Find empty directories
find . -type d -empty

# Find broken symlinks
find . -xtype l

# Find setuid files (security audit)
find / -perm -4000 -type f 2>/dev/null

# Find files owned by a specific user
find /home -user username -type f
```

### xargs

```bash
# Delete files found by find
find . -name "*.tmp" -print0 | xargs -0 rm -f

# Parallel execution (4 processes)
find . -name "*.png" -print0 | xargs -0 -P 4 -I {} optipng {}

# Pass as arguments to a command
echo "file1 file2 file3" | xargs ls -la

# One argument per line
cat urls.txt | xargs -I {} curl -sO {}

# Limit arguments per command invocation
echo {1..100} | xargs -n 10 echo
```

### Display & Desktop

#### Virtual Display (Intel, X11)

```bash
# 1. Create /etc/X11/xorg.conf.d/20-intel.conf
Section "Device"
    Identifier "intelgpu0"
    Driver "intel"
    Option "VirtualHeads" "1"
EndSection

# 2. Generate modeline and add virtual display
cvt 1920 1080 60
xrandr --newmode "1920x1080_60.00" 173.00 1920 2048 2248 2576 1080 1083 1088 1120 -hsync +vsync
xrandr --addmode VIRTUAL1 1920x1080_60.00

# 3. Activate (replace HDMI1 with your physical display)
xrandr --output VIRTUAL1 --mode 1920x1080_60.00 --right-of HDMI1

# 4. Turn off virtual display
xrandr --output VIRTUAL1 --off
```

#### Screen Brightness

```bash
# Get current brightness
cat /sys/class/backlight/*/brightness

# Set brightness (value depends on max_brightness)
echo 500 | sudo tee /sys/class/backlight/intel_backlight/brightness

# Using xrandr (software, works on external monitors too)
xrandr --output HDMI-1 --brightness 0.8
```

### Sorting

#### Natural Sort (Numeric-Aware)

```bash
# Standard sort treats numbers as strings: 1, 10, 11, 2, 20, 3...
# Version sort (-V) handles embedded numbers correctly
sort -V filelist.txt

# Natural sort with natsort (Python package)
pip install natsort
{% raw %}docker ps --format '{{.Names}}' | natsort{% endraw %}

# Sort by numeric column
sort -n -k2 data.txt       # sort by 2nd column numerically
sort -h -k1 data.txt       # sort by human-readable sizes (1K, 2M, 3G)
sort -t',' -k3 -rn data.csv  # CSV, 3rd column, reverse numeric
```

### Miscellaneous One-Liners

```bash
# Generate random password
openssl rand -base64 32 | tr -d '/+=' | head -c 20

# Watch command output (refresh every 2s)
watch -n 2 'ss -s'

# Run command on file change (requires inotify-tools)
inotifywait -m -e modify file.txt | while read; do echo "File changed!"; done

# Create a quick HTTP server
python3 -m http.server 8000

# Repeat last command with sudo
sudo !!

# Compare two directories
diff <(ls dir1) <(ls dir2)
rsync -rvn --delete dir1/ dir2/    # dry-run shows differences

# Extract specific columns from CSV
cut -d',' -f1,3,5 data.csv

# Show ANSI colors in terminal
for i in {0..255}; do printf "\e[38;5;${i}m%3d " $i; done; echo

# Base64 encode/decode
echo -n "hello" | base64
echo "aGVsbG8=" | base64 -d

# URL encode/decode
python3 -c "import urllib.parse; print(urllib.parse.quote('hello world'))"
python3 -c "import urllib.parse; print(urllib.parse.unquote('hello%20world'))"

# JSON pretty-print
cat file.json | python3 -m json.tool
echo '{"key":"val"}' | jq .

# Monitor file growth in real time
tail -f /var/log/syslog

# Kill process by port
sudo fuser -k 8080/tcp

# Show listening processes and their ports
sudo ss -tlnp | awk 'NR>1 {print $4, $NF}'
```

## Result

This page is the one I open instead of searching. The blocks I reach for most are the ones from the
Situation: the fstab steps (with `findmnt --verify` before rebooting, so a typo doesn't leave me at
an emergency shell), `timedatectl set-timezone Asia/Ho_Chi_Minh`, and the `awk` field and sum
one-liners. A side note for anyone copying this into their own Jekyll site: the `docker ps --format`
line under Sorting sits inside a Liquid `raw` block, because Jekyll would otherwise read its double
braces as a template variable and print nothing there.

## References

- [The Art of Command Line](https://github.com/jlevy/the-art-of-command-line)
- [Bash Reference Manual](https://www.gnu.org/software/bash/manual/bash.html)
- [GNU sed manual](https://www.gnu.org/software/sed/manual/sed.html)
- [GNU awk manual](https://www.gnu.org/software/gawk/manual/gawk.html)
- [Advanced Bash-Scripting Guide](https://tldp.org/LDP/abs/html/)
