---
layout: default
title: "Tmux Quick Reference"
short_description: "Các lệnh hay dùng với tmux"
status: "In Progress"
picture: "assets/images/TMUX-Cheatsheet-Cover-Image.001.jpeg"
latest_release: "Init document"
videos: []
---

# Linux tips
{: .no_toc }

## Table of contents
{: .no_toc }

1. TOC
{:toc}

-----------------------------------

## Revision history

| Revision | Date          | Remark      |
|:---------|:------------- |:------------|
| 0.1      | Feb-14-2023   | {{page.latest_release}} |



## Thao tác cấp độ server

- Kill tmux server : `tmux kill-server`
- Start tmux server : `tmux start-server`

## Thao tác cấp độ sessions

- Kill Tmux sessions: `tmux kill-session -t thanhle`

- Check tmux sessions list:

```yaml
tmux list-sessions
tmux ls
---
0: 1 windows (created Tue Dec 15 09:04:58 2020) [211x53]
thanhle: 1 windows (created Tue Dec 15 16:52:05 2020) [211x53] (attached)
```

- Tạo mới session thanhle, với tên window đầu tiên là `pi_bluetooth`  và detach. Nếu không có option -d thì cửa sổ tmux sẽ được attach vào terminal hiện tại.

```yaml
tmux new-session -s thanhle -n pi_bluetooth -d
```

- Attach một tmux session vào terminal hiện tại.

```yaml
tmux attach-session -t thanhle
tmux a -t thanhle
```

- Kiểm tra một session có tồn tại hay không

```yaml
tmux has-session -t thanhle
echo $? #0: có session, 1: không có session
```

## Thao tác cấp độ windows

- Check windows list of session thanhle

```yaml
tmux list-windows -t thanhle
0: pi_bluetooth* (3 panes) [211x53] [layout ba54,211x53,0,0{105x53,0,0,3,105x53,106,0[105x26,106,0,4,105x26,106,27,5]}] @2 (active)
```

- Thêm mới 1 windows vào session thanhle và đặt tên là my_window(key binding tương đương : ctl^b + c)

```yaml
tmux new-window -t thanhle -n my_window
```
- Gửi command đến my_window vừa tạo.

```yaml
tmux send-keys -t thanhle:my_window 'reset' C-m
```
- Gửi command đến window pi_bluetooth

```yaml
tmux send-keys -t thanhle:pi_bluetooth 'ls -al' C-m
```
- Chia nhỏ `my_window`

```yaml
mux split-window -h -t thanhle:my_window
```
- Rename window

```yaml
tmux rename-window -t thanhle:pi_bluetooth pi
```
- Delete an window

```yaml
tmux kill-window -t thanhle:pi
```
- Chọn window làm actice window

```yaml
tmux selec-window -t [window index|window name]
```
- Attach vào một window có index >= 10

```yaml
ctrl b w
```

## Thao tác cấp độ pannels

- Kiểm tra số lượng pannel trong my_window

```console
tmux list-panes -t thanhle:my_window
0: [105x53] [history 0/2000, 0 bytes] %6
1: [105x53] [history 0/2000, 0 bytes] %7 (active)
```

- Chia nhỏ pane 0

```yaml
tmux split-window -h -t thanhle:my_window.0
...
tmux list-panes -t thanhle:my_window
0: [52x53] [history 0/2000, 0 bytes] %6
1: [52x53] [history 0/2000, 0 bytes] %8 (active)
2: [105x53] [history 0/2000, 0 bytes] %7
```
- Chia nhỏ pane 2

```yaml
tmux split-window -v -t thanhle:my_window.2
...
tmux list-panes -t thanhle:my_window
0: [52x53] [history 0/2000, 0 bytes] %6
1: [52x53] [history 0/2000, 0 bytes] %8
2: [105x26] [history 0/2000, 0 bytes] %7
3: [105x26] [history 0/2000, 0 bytes] %9 (active)
```
- Send key đến pane

```yaml
tmux send-keys -t thanhle:my_window.0 'ls -al' C-m
tmux send-keys -t thanhle:my_window.1 'ls -al' C-m
tmux send-keys -t thanhle:my_window.2 'ls -al' C-m
tmux send-keys -t thanhle:my_window.3 'ls -al' C-m
```
- Xóa pane

```yaml
tmux kill-panel -t thanhle:my_window.x
```
- Chọn 1 panel làm active panel(Chọn trên windows đang active)
  - Chọn trên windows đang active

```yaml
tmux select-pane -t 0 # trên active window
```
  - Chọn trên 1 window khác

```yaml
tmux select-pane -t s1:thanhle.0
```
