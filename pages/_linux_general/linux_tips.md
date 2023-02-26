---
layout: default
title: "Linux Tips"
short_description: "Các task hay dùng với Linux"
status: "In Progress"
picture: "assets/images/linux_tips.jpg"
latest_release: "Init document"
index: 2
---

<h2>Linux general</h2>
<table class="project_table">
  <thead>
    <tr>
      <th>Items</th>
      <th>Details</th>
    </tr>
  </thead>
  <tbody>
    <!-- Row 1 -->
    <tr>
      <td>
        <h6>Auto mount SSD at bootup</h6>
      </td>
      <td>
        <h6>Get the uuid of SSD</h6>
        <div style="width:1000px;overflow:auto">
          <pre><code>sudo blkid
ls -al /dev/disk/by-uuid/</code></pre>
        </div>
        <h6>Edit the file <code>/etc/fstab</code> </h6>
        <div style="width:1000px;overflow:auto">
          <pre><code>UUID=b071688a-414a-4665-a45e-102432e06315 /media/thanh/ssd      ext4    defaults        0       0</code></pre>
        </div>
        <h6>Test the fstab file</h6>
        <div style="width:1000px;overflow:auto">
          <pre><code>findmnt --verify</code></pre>
        </div>
      </td>
    </tr>
    <!-- Row 3 -->
    <tr>
      <td>
        <h6>Virtual Display</h6>
      </td>
      <td>
        <h6>Create /etc/X11/xorg.conf.d/20-intel.conf</h6>
        <div style="width:1000px;overflow:auto">
          <pre><code>Section "Device"
  Identifier "intelgpu0"
  Driver "intel"
  Option "VirtualHeads" "1"
EndSection</code></pre>
        </div>
        <h6>Generate modeline with or cvt </h6>
        <div style="width:1000px;overflow:auto">
          <pre><code>cvt 1920 1080
xrandr --newmode "1920x1080_60.00"  173.00  1920 2048 2248 2576  1080 1083 1088 1120 -hsync +vsync
xrandr --addmode VIRTUAL1 1920x1080_60.00</code></pre>
        </div>
        <h6>Activate virtual display: (Replace HDMI1 with your real display)</h6>
        <div style="width:1000px;overflow:auto">
          <pre><code>xrandr --output VIRTUAL1 --mode 1920x1080_60.00 --right-of HDMI1</code></pre>
        </div>
      </td>
    </tr>
    <!-- Row 4 -->
    <tr>
      <td>
        <h6>Edit pushed commits</h6>
      </td>
      <td>
        <div style="width:1000px;overflow:auto">
          <pre><code>git rebase -i HEAD~N # N là số commit muốn chỉnh sữa tính từ commit gần đây nhât. </code></pre>
        </div>
        <h6>Edit commit</h6>
        <div style="width:1000px;overflow:auto">
          <pre><code># p, pick = use commit
# r, reword = use commit, but edit the commit message
# e, edit = use commit, but stop for amending
# s, squash = use commit, but meld into previous commit
# f, fixup = like "squash", but discard this commit's log message
# x, exec = run command (the rest of the line) using shell
</code></pre>
        </div>
        <h6>Force push update</h6>
        <div style="width:1000px;overflow:auto">
          <pre><code>git push --force</code></pre>
        </div>
      </td>
    </tr>
    <!-- Row 5 -->
    <tr>
      <td>
        <h6>Network Manager skip managing device</h6>
      </td>
      <td>
        <div style="width:1000px;overflow:auto">
          <pre><code># file: /etc/NetworkManager/NetworkManager.conf
[keyfile]
unmanaged-devices=interface-name:interface_1;interface-name:interface_2;...</code></pre>
          <!-- Row 6 -->
        </div>
      </td>
    </tr>
    <tr>
      <td>
        <h6>Calculation</h6>
      </td>
      <td>
        <div style="width:1000px;overflow:auto">
          <pre><code>val=$(expr "$val" + 256)
</code></pre>
        </div>
      </td>
    </tr>
    <!-- Row 7 -->
    <tr>
      <td>
        <h6>Cleanup Disk</h6>
      </td>
      <td>
        <div style="width:1000px;overflow:auto">
          <pre><code># Clear systemd journal logs
sudo journalctl --vacuum-time=3d # clear log older 3 days
# Clean snap
set -eu
snap list --all | awk '/disabled/{print $1, $3}' |
while read snapname revision; do
    snap remove "$snapname" --revision="$revision"
done
# remove old kernel
sudo apt-get remove --purge $(dpkg -l 'linux-*' | sed '/^ii/!d;/'"$(uname -r | sed "s/\(.*\)-\([^0-9]\+\)/\1/")"'/d;s/^[^ ]* [^ ]* \([^ ]*\).*/\1/;/[0-9]/!d')
</code></pre>
        </div>
      </td>
    </tr>
    <!-- Row 8 -->
    <tr>
      <td>
        <h6>Set timezone</h6>
      </td>
      <td>
        <div style="width:1000px;overflow:auto">
          <pre><code># get timezone name
timedatectl list-timezones | grep "Ho"
# set timezone
timedatectl set-timezone Asia/Ho_Chi_Minh
</code></pre>
        </div>
      </td>
    </tr>
    <!-- Row 9 -->
    <tr>
      <td>
        <h6>Các biến script đặc biệt</h6>
      </td>
      <td>
        <div style="width:1000px;overflow:auto">
          <pre><code>- $0: tên file script đang chạy
- $#: tổng số tham số truyền vào ( = 0 nếu không truyền tham số nào)
- $*: for val in $*; do echo "val: $val"; done : dồn các biến thành 1 biến
- $@: for val in $@; do echo "val: $val"; done : là array của các biến <br> có thể truy cập bằng index
- ${@:2}: lấy từ index thứ 2 cho đến hết</code></pre>
        </div>
      </td>
    </tr>
    <!-- Row 10 -->
    <tr>
      <td>
        <h6>Natural sort</h6>
      </td>
      <td>
        <div style="width:1000px;overflow:auto">
          <pre><code>apt install python3-natsort
docker ps | awk '{print $NF}' | natsort</code></pre>
        </div>
      </td>
    </tr>
  </tbody>
</table>
<!-- sed -->
<h2>sed</h2>
<table class="project_table">
  <thead>
    <tr>
      <th>Items</th>
      <th>Details</th>
    </tr>
  </thead>
  <tbody>
    <!-- Row -->
    <tr>
      <td>
        <h6>Replace sub string</h6>
      </td>
      <td>
        <div style="width:1000px;overflow:auto">
          <pre><code>a="\"$1\""
sed -i -e "s/\(ssid=\).*/\1$a/" /etc/wpa_supplicant/wpa_supplicant.conf</code></pre>
        </div>
      </td>
    </tr>
    <!-- Row -->
    <tr>
      <td>
        <h6>remove a line</h6>
      </td>
      <td>
        <div style="width:1000px;overflow:auto">
          <pre><code>sed -i /${filter}/d ${FILE}</code></pre>
        </div>
      </td>
    </tr>
  </tbody>
</table>


<!-- AWK -->
<h2>awk</h2>
- Phần bên trong dấu ngoặc nhọn là action, phần bên ngoài là pattern
<table class="project_table">
  <thead>
    <tr>
      <th>Items</th>
      <th>Details</th>
    </tr>
  </thead>
  <tbody>
    <!-- Row 1 -->
    <tr>
      <td>
        <h6>Print Specific Field</h6>
      </td>
      <td>
        <div style="width:1000px;overflow:auto">
          <pre><code># sử dụng ký tự `:` làm ký tự  phân chia và in cột đầu tiên
awk -F':' '{ print $1 }' /etc/passwd

# In cột cuối cùng
docker ps | grep my-name | awk {'print $NF'}</code></pre>
        </div>
      </td>
    </tr>
    <!-- Row 2 -->
    <tr>
      <td>
        <h6>Pattern Matching</h6>
      </td>
      <td>
        <div style="width:1000px;overflow:auto">
          <pre><code># In ra dòng nào trong file access.log có mã lỗi 500(mã lỗi xuất hiện ở cột thứ 9)
awk '$9 == 500 { print $0}' access.log

# Cách cách sử dụng khác nhau
awk '$9 == 500 ' /var/log/httpd/access.log # không có action, mặc định in toàn bộ dòng nào khớp
awk '$9 == 500 {print} ' /var/log/httpd/access.log # không chỉ định in field nào, in hết
awk '$9 == 500 {print $0} ' /var/log/httpd/access.log # $0 tương đương in hết.

# In dòng nào có chứa string mèo , chuột và chó.
awk '/mèo|chuột|chó/' /etc/passwd

# In dòng đầu tiên của file
awk "NR==1{print;exit}" /etc/resolv.conf
awk "NR==$line{print;exit}" /etc/resolv.conf</code></pre>
        </div>
      </td>
    </tr>
    <!-- Row 3 -->
    <tr>
      <td>
        <h6>Tính toán đơn giản</h6>
      </td>
      <td>
        <div style="width:1000px;overflow:auto">
          <pre><code># Tính tổng các số trong 1 cột
awk '{total += $1} END {print total}' earnings.txt

# shell không thể tính toán số thực, nhưng awk có thể.
awk 'BEGIN {printf "%.3f\n", 2005.50 / 3}'</code></pre>
        </div>
      </td>
    </tr>
    <!-- Row 4 -->
    <tr>
      <td>
        <h6>Use pattern file</h6>
      </td>
      <td>
        <div style="width:1000px;overflow:auto">
          <pre><code># nội dung file wlan_scan.awk
/^BSS/ {
    mac = gensub ( /^BSS[[:space:]]*([0-9a-fA-F:]+).*?$/, "\\1", "g", $0 );
}
/^[[:space:]]*signal:/ {
    signal = gensub ( /^[[:space:]]*signal:[[:space:]]*(\-?[0-9.]+).*?$/, "\\1", "g", $0 );
}
/^[[:space:]]*freq:/ {
    freq = gensub ( /^[[:space:]]*freq:[[:space:]]*(\-?[0-9.]+).*?$/, "\\1", "g", $0 );
}
/^[[:space:]]*SSID:/ {
    ssid = gensub ( /^[[:space:]]*SSID:[[:space:]]*([^\n]*).*?$/, "\\1", "g", $0 );
    printf ( "%s %s %s\n", signal, mac, ssid );

# Sử dụng
sudo iw wlan0 scan | awk -f wlan_scan.awk  | sort -gr</code></pre>
        </div>
      </td>
    </tr>
  </tbody>
</table>
