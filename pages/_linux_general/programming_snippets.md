---
layout: default
title: "Programming Language snippets"
short_description: "Các snippet code hay dùng"
status: "In Progress"
picture: "assets/images/C_and_Python_Logos.png"
latest_release: "Init document"
index: 7
---

<h2>Python</h2>
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
                <h6>Open/write/close/ a file</h6>
            </td>
            <td>
                <div style="width:1000px;overflow:auto">
                    <pre><code># check file is exists
os.path.isfile("config.json")

# Open for reading
fh = open(configFile, "r")
data = fh.read()

# Open for writing
file = open("config.json", "w")
file.write(json.dumps(json_object, indent=4, sort_keys=True))
file.flush()
file.close()</code></pre>
                </div>
            </td>
        </tr>
        <!-- Row 2 -->
        <tr>
            <td>
                <h6>Atexit</h6>
            </td>
            <td>
                <div style="width:1000px;overflow:auto">
                    <pre><code>import atexit

@atexit.register
def goodbye():
    print('You are now leaving the Python sector.')</code></pre>
                </div>
            </td>
        </tr>
        <!-- Row 3 -->
        <tr>
            <td>
                <h6>AppOpps</h6>
            </td>
            <td>
                <div style="width:1000px;overflow:auto">
                    <pre><code>from optparse import OptionParser

def parseOpt(self, args):
    usage = "usage: %prog [options] arg"
    parser = OptionParser(usage)
    parser.add_option("-t", "--test", action="store", type="string", dest="test",help="Test store string")
    parser.add_option("--bool",action="store_const", const=1, dest="bool",help="Test store bool")
    parser.add_option("--value", action="store", type="int", dest="value",help="common value for other command")

    (options, args) = parser.parse_args(args)
    if len(args) != 1:
        parser.error("incorrect number of arguments")
    if options.bool:
        print(options.bool)
    if options.value:
        print("value = ", options.value)
    if options.test:
        print("test = ", options.test)

if __name__ == "__main__":
    parseOpt(sys.argv)</code></pre>
                </div>
            </td>
        </tr>
        <!-- Row 4 -->
        <tr>
            <td>
                <h6>json</h6>
            </td>
            <td>
                <div style="width:1000px;overflow:auto">
                    <pre><code># load from string data
j_obj = json.loads(str_data)

# Level 1 keys
for key in j_obj.keys():
    print(f"key {key}, data: {j_obj[key]}")
                    </code></pre>
                </div>
            </td>
        </tr>
        <!-- Row 5 -->
        <tr>
            <td>
                <h6>Regular Expression</h6>
            </td>
            <td>
                <div style="width:1000px;overflow:auto">
                    <pre><code>import re
string = "hello MY_PC_NAME , value: 1.34"

# match name and value
pattern = 'hello (\D+) , value: (\d+.\d+)'
match = re.search(pattern, string)
if match:
    print(f'str: {match.group(1)}, value: {match.group(2)}')</code></pre>
                </div>
            </td>
        </tr>
        <!-- Row 5 -->
        <tr>
            <td>
                <h6>subprocess</h6>
            </td>
            <td>
                <div style="width:1000px;overflow:auto">
                    <pre><code>import subprocess

def system_call(command):
    return str(subprocess.getoutput(command))</code></pre>
                </div>
            </td>
        </tr>
        <!-- Row 6 -->
        <tr>
            <td>
                <h6>Natural Sort</h6>
            </td>
            <td>
                <div style="width:1000px;overflow:auto">
                    <pre><code>from natsort import natsorted

list = ["1", "10", "2", "22", "3", "55"]
print(natsorted(list)) # 1,2,3,10,22,55
</code></pre>
                </div>
            </td>
        </tr>
        <!-- Row 7 -->
        <tr>
            <td>
                <h6>Play beep audio</h6>
            </td>
            <td>
                <div style="width:1000px;overflow:auto">
                    <pre><code>import beepy as beep

beep.beep(1)
beep.beep(2)
...
beep.beep(10)
</code></pre>
                </div>
            </td>
        </tr>
        <!-- Row 8 -->
        <tr>
            <td>
                <h6>trim string white space</h6>
            </td>
            <td>
                <div style="width:1000px;overflow:auto">
                    <pre><code>str("   hello    ").strip()</code></pre>
                </div>
            </td>
        </tr>
        <!-- Row 9 -->
        <tr>
            <td>
                <h6>Date and time</h6>
            </td>
            <td>
                <div style="width:1000px;overflow:auto">
                    <pre><code>from datetime import datetime, date

datetime.utcnow()
datetime.utcnow().hour
datetime.utcnow().minute
datetime.utcnow().second
datetime.utcnow().timetuple().tm_yday // day of year
datetime.utcnow().timetuple().tm_year
datetime.utcnow().timetuple().tm_mon
datetime.utcnow().timetuple().tm_mday
datetime.utcnow().timetuple().tm_hour
datetime.utcnow().timetuple().tm_min
datetime.utcnow().timetuple().tm_sec
datetime.utcnow().timetuple().tm_wday
import calendar
today = date.today()
weekday = today.weekday()
day_name = calendar.day_name[today.weekday()]
current_day = today.strftime("%b-%d-%Y")
current_day_object = datetime.strptime(current_day, '%b-%d-%Y')
current_day_utc = current_day_object.utcnow().strftime("%b-%d-%Y")
</code></pre>
                </div>
            </td>
        </tr>
    </tbody>
</table>

