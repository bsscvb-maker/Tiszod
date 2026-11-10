"""Send a private VIN-level recall report using the Garage workbook."""
import base64
from datetime import datetime
from email.message import EmailMessage
from html import escape
import json
import os
from pathlib import Path
import re
import smtplib
import ssl
import subprocess
import tempfile
import time
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo


def request_json(url, token=None, form=None):
    headers = {"Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    request = Request(url, data=urlencode(form).encode() if form else None, headers=headers)
    with urlopen(request, timeout=12) as response:
        return json.load(response)


def b64(data):
    return base64.urlsafe_b64encode(data).rstrip(b"=")


def sheet_token(account):
    now = int(time.time())
    claims = {
        "iss": account["client_email"],
        "scope": "https://www.googleapis.com/auth/spreadsheets.readonly",
        "aud": "https://oauth2.googleapis.com/token",
        "iat": now, "exp": now + 600,
    }
    unsigned = b64(b'{"alg":"RS256","typ":"JWT"}') + b"." + b64(json.dumps(claims).encode())
    with tempfile.NamedTemporaryFile(mode="w") as key:
        key.write(account["private_key"])
        key.flush()
        signature = subprocess.run(
            ["openssl", "dgst", "-sha256", "-sign", key.name],
            input=unsigned, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, check=True,
        ).stdout
    assertion = (unsigned + b"." + b64(signature)).decode()
    return request_json(claims["aud"], form={
        "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
        "assertion": assertion,
    })["access_token"]


def inventory(ranges):
    vehicles = {}
    for table, columns in zip(ranges, [(11, 1, 2, 3, 4, 7), (4, None, 1, 2, 3, 0)], strict=True):
        vin_col, name_col, year, make, model, category = columns
        for row in table["values"][1:]:
            cells = [str(value).strip() for value in row] + [""] * 12
            vin = cells[vin_col].upper()
            if vin:
                name = (cells[name_col] if name_col is not None else "") or " ".join(
                    cells[index] for index in (year, make, model) if cells[index]
                )
                vehicles.setdefault(vin, (name or "Unnamed vehicle", cells[category]))
    return vehicles


def lookup(vin, api_key):
    if not re.fullmatch(r"[A-HJ-NPR-Z0-9]{17}", vin):
        return "Manufacturer lookup needed (nonstandard VIN)", []
    for attempt in range(2):
        try:
            result = request_json("https://api.auto.dev/openrecalls/" + quote(vin, safe=""), api_key)
            campaigns = result.get("data")
            count = result.get("openRecalls")
            if (not isinstance(campaigns, list) or type(count) is not int
                    or count != len(campaigns) or not all(isinstance(item, dict) for item in campaigns)):
                return "Lookup unavailable (incomplete response)", []
            return (f"{count} open" if count else "No open recalls reported"), campaigns
        except HTTPError as error:
            if error.code == 404:
                return "Manufacturer lookup needed (VIN unavailable)", []
            if error.code not in (429, 500, 502, 503, 504):
                return f"Lookup unavailable (HTTP {error.code})", []
        except (TimeoutError, URLError, ValueError):
            pass
        if not attempt:
            time.sleep(2)
    return "Lookup unavailable (provider error)", []


def report(vehicles, api_key, date):
    text = [f"TisZod Garage daily recall check | {date} Eastern"]
    rows = []
    open_vehicles = unavailable = 0
    for vin, (name, category) in sorted(vehicles.items(), key=lambda pair: pair[1][0].casefold()):
        status, campaigns = lookup(vin, api_key)
        open_vehicles += bool(campaigns)
        unavailable += not campaigns and status != "No open recalls reported"
        official = "https://www.nhtsa.gov/recalls"
        if re.fullmatch(r"[A-HJ-NPR-Z0-9]{17}", vin):
            official += "?vin=" + vin
        elif re.search(r"boat|watercraft", category, re.I):
            official = "https://uscgboating.org/content/recalls.php"
        elif re.search(r"off.road|equipment|atv|golf cart", category, re.I):
            official = "https://www.cpsc.gov/Recalls"
        title = f"{name} ({category})" if category else name
        text.append(f"{title} | {vin} | {status} | {official}")
        details = []
        for item in campaigns:
            parts = [
                "NHTSA campaign " + str(item.get("nhtsaCampaignNumber") or "unlisted"),
                "Manufacturer campaign " + str(item["mfrCampaignNumber"]) if item.get("mfrCampaignNumber") else "",
                "Do not drive" if item.get("parkIt") is True else "",
                "Park outside" if item.get("parkOutSide") is True else "",
                item.get("component"), item.get("summary"), item.get("consequence"), item.get("remedy"),
            ]
            summary = " | ".join(str(part) for part in parts if part)
            text.append("  " + summary)
            details.append("<p>" + escape(summary) + "</p>")
        rows.append(
            f'<tr><td style="padding:8px;border-bottom:1px solid #a5bacd">'
            f'<strong>{escape(title)}</strong><br>{escape(vin)}</td>'
            f'<td style="padding:8px;border-bottom:1px solid #a5bacd"><strong>{escape(status)}</strong>'
            f'{"".join(details)}<br><a href="{official}">Official lookup</a></td></tr>'
        )
    totals = f"{len(vehicles)} VINs · {open_vehicles} with open recalls · {unavailable} need verification"
    note = "Source: Auto.dev VIN-specific open recall lookup. For unavailable results, check the official source or contact the manufacturer."
    html = (
        '<div style="font-family:Arial,sans-serif;color:#142b3b">'
        '<div style="background:#0d2035;color:#fff;padding:18px">'
        '<img alt="TisZod logo" width="64" src="cid:tiszod-crest">'
        f'<h1 style="margin:8px 0">TisZod Garage · Daily Recall Report</h1>{escape(date)} Eastern</div>'
        f'<p><strong>{escape(totals)}</strong></p><table style="border-collapse:collapse">{"".join(rows)}</table>'
        f'<p>{escape(note)}</p></div>'
    )
    return "\n".join([text[0], totals, *text[1:], note]), html


def main():
    config = {key: os.environ[key] for key in (
        "RECALL_SHEETS_ACCOUNT", "RECALL_SHEET_ID", "RECALL_API_KEY",
        "RECALL_EMAIL_FROM", "RECALL_EMAIL_TO", "RECALL_EMAIL_APP_PASSWORD",
    )}
    if not all(value.strip() for value in config.values()):
        raise ValueError("Missing recall report configuration")
    token = sheet_token(json.loads(config["RECALL_SHEETS_ACCOUNT"]))
    query = urlencode([
        ("ranges", "'Portal Asset Profiles'!A1:L"),
        ("ranges", "'Vehicle Registry'!A1:G"),
        ("valueRenderOption", "FORMATTED_VALUE"),
    ])
    sheet = quote(config["RECALL_SHEET_ID"], safe="")
    data = request_json(f"https://sheets.googleapis.com/v4/spreadsheets/{sheet}/values:batchGet?{query}", token)
    vehicles = inventory(data["valueRanges"])
    if not vehicles:
        raise ValueError("Garage inventory returned no VINs")
    date = datetime.now(ZoneInfo("America/New_York")).strftime("%Y-%m-%d %I:%M %p")
    text, html = report(vehicles, config["RECALL_API_KEY"], date)
    message = EmailMessage()
    message["Subject"] = f"TisZod Garage · Daily Recall Report · {date[:10]}"
    message["From"] = config["RECALL_EMAIL_FROM"]
    message["To"] = config["RECALL_EMAIL_TO"]
    message.set_content(text)
    message.add_alternative(html, subtype="html")
    logo = Path(__file__).with_name("recall-crest.png").read_bytes()
    message.get_payload()[-1].add_related(logo, maintype="image", subtype="png", cid="<tiszod-crest>")
    with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=ssl.create_default_context(), timeout=20) as mail:
        mail.login(config["RECALL_EMAIL_FROM"], config["RECALL_EMAIL_APP_PASSWORD"].replace(" ", ""))
        mail.send_message(message)
    print("Private recall report sent.")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        # Provider exceptions can contain request URLs or private credentials.
        raise SystemExit(f"Recall report failed ({type(error).__name__}). Check the private workflow configuration.") from None
