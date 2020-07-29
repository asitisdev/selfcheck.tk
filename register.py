import requests
import csv
import re


HEADER = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.61 Safari/537.36",
    "Accept": "application/json, text/javascript, */*; q=0.01"
}
URL = "https://selfcheck.tk/add"
CSV_FILE = "students.csv"
SCHUL_CODE = "J100000641"
SCHUL_NM = "수성고등학교"

with open(CSV_FILE, "r") as file:
    regex = re.compile('<h2 class="title is-5">(.+?)</h2>')
    reader = csv.DictReader(file, delimiter=",")
    for row in reader:
        print(f"{row['name']} | {row['birth']}")
        data = {
            "schulCode": SCHUL_CODE,
            "schulNm": SCHUL_NM,
            "name": row["name"],
            "birth": row["birth"],
        }

        result_info = requests.post(URL, data=data, headers=HEADER)
        print(re.findall(regex, result_info.text)[0])
