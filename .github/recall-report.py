"""Send a private VIN-level recall report using the Garage workbook."""
import base64
from datetime import datetime, timedelta
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
from urllib.error import URLError
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
    for table, columns in zip(ranges, [(11, 1, 2, 3, 4, 7, 8), (4, None, 1, 2, 3, 0, 6)], strict=True):
        vin_col, name_col, year, make, model, category, status = columns
        for row in table["values"][1:]:
            cells = [str(value).strip() for value in row] + [""] * 12
            vin = cells[vin_col].upper()
            if vin:
                name = (cells[name_col] if name_col is not None else "") or " ".join(
                    cells[index] for index in (year, make, model) if cells[index]
                )
                fields = (name, cells[category], cells[year], cells[make], cells[model], cells[status])
                previous = vehicles.get(vin, ("",) * len(fields))
                vehicles[vin] = tuple(old or new for old, new in zip(previous, fields, strict=True))
    return vehicles


def lookup(year, make, model, category):
    if (not re.fullmatch(r"[0-9]{4}", year) or not make or not model
            or re.search(r"boat|watercraft|equipment|bicycle|golf cart", category, re.I)):
        return "Manufacturer or specialty lookup needed", []
    query = urlencode({"make": make, "model": model, "modelYear": year})
    try:
        result = request_json("https://api.nhtsa.gov/recalls/recallsByVehicle?" + query)
        campaigns = result.get("results")
        if not isinstance(campaigns, list) or not all(isinstance(item, dict) for item in campaigns):
            return "Campaign lookup unavailable", []
    except (TimeoutError, URLError, ValueError):
        return "Campaign lookup unavailable", []
    cutoff = datetime.now(ZoneInfo("America/New_York")).date() - timedelta(days=30)
    recent = []
    for item in campaigns:
        try:
            recorded = datetime.strptime(item["ReportReceivedDate"], "%d/%m/%Y").date()
        except (KeyError, ValueError, TypeError):
            try:
                recorded = datetime.strptime(item["ReportReceivedDate"], "%m/%d/%Y").date()
            except (KeyError, ValueError, TypeError):
                return "Campaign dates unavailable; verify with NHTSA", []
        if recorded >= cutoff:
            recent.append(item)
    if not campaigns:
        return "No matching campaigns returned; verify by VIN", []
    return (f"{len(recent)} recent campaign matches" if recent else "No matching campaigns in the last 30 days"), recent


def report(vehicles, date):
    text = [f"TisZod Garage daily recall check | {date} Eastern"]
    rows, fun_rows, fun_text = [], [], []
    matched = unavailable = 0
    checked = {}
    for vin, (name, category, year, make, model, ownership) in sorted(vehicles.items(), key=lambda pair: pair[1][0].casefold()):
        key = (year, make.upper(), model.upper(), category)
        if key not in checked:
            checked[key] = lookup(year, make, model, category)
        status, campaigns = checked[key]
        matched += bool(campaigns)
        unavailable += "unavailable" in status.lower() or "needed" in status.lower() or "verify by vin" in status.lower()
        official = "https://www.nhtsa.gov/recalls"
        if re.fullmatch(r"[A-HJ-NPR-Z0-9]{17}", vin):
            official += "?vin=" + vin
        elif re.search(r"boat|watercraft", category, re.I):
            official = "https://uscgboating.org/content/recalls.php"
        elif re.search(r"off.road|equipment|atv|golf cart", category, re.I):
            official = "https://www.cpsc.gov/Recalls"
        title = " · ".join(part for part in (name or "Unnamed vehicle", category, ownership) if part)
        fun = (ownership.casefold() not in {"active","managed"} or not re.fullmatch(r"[A-HJ-NPR-Z0-9]{17}", vin)
               or re.search(r"boat|watercraft|off.road|equipment|bicycle|golf cart|atv", category, re.I))
        target_text, target_rows = (fun_text, fun_rows) if fun else (text, rows)
        target_text.append(f"{title} | {vin} | {status} | {official}")
        details = []
        for item in campaigns:
            parts = [
                "NHTSA campaign " + str(item.get("NHTSACampaignNumber") or "unlisted"),
                item.get("Component"), item.get("Summary"), item.get("Consequence"), item.get("Remedy"),
            ]
            summary = " | ".join(str(part) for part in parts if part)
            target_text.append("  " + summary)
            details.append("<p>" + escape(summary) + "</p>")
        target_rows.append(
            f'<tr><td style="padding:8px;border-bottom:1px solid #a5bacd">'
            f'<strong>{escape(title)}</strong><br>{escape(vin)}</td>'
            f'<td style="padding:8px;border-bottom:1px solid #a5bacd"><strong>{escape(status)}</strong>'
            f'{"".join(details)}<br><a href="{official}">Official lookup</a></td></tr>'
        )
    totals = f"{len(vehicles)} VINs · {matched} with recent campaign matches · {unavailable} need verification"
    note = "Source: NHTSA year, make and model campaigns reported in the last 30 days. A campaign match does not verify an open repair for your VIN. Use the official links for VIN verification."
    fun_html = '<h2>Just for FUN</h2><table style="border-collapse:collapse">' + "".join(fun_rows) + '</table>' if fun_rows else ''
    html = (
        '<div style="font-family:Arial,sans-serif;color:#142b3b">'
        '<div style="background:#0d2035;color:#fff;padding:18px">'
        '<img alt="TisZod logo" width="64" src="cid:tiszod-crest">'
        f'<h1 style="margin:8px 0">TisZod Garage · Daily Recall Report</h1>{escape(date)} Eastern</div>'
        f'<p><strong>{escape(totals)}</strong></p><table style="border-collapse:collapse">{"".join(rows)}</table>'
        f'{fun_html}<p>{escape(note)}</p></div>'
    )
    return "\n".join([text[0], totals, *text[1:], *(["", "Just for FUN", *fun_text] if fun_text else []), note]), html


def main():
    config = {key: os.environ[key] for key in (
        "RECALL_SHEETS_ACCOUNT", "RECALL_SHEET_ID",
        "RECALL_EMAIL_FROM", "RECALL_EMAIL_TO", "RECALL_EMAIL_APP_PASSWORD",
    )}
    if not all(value.strip() for value in config.values()):
        raise ValueError("Missing recall report configuration")
    token = sheet_token(json.loads(config["RECALL_SHEETS_ACCOUNT"]))
    query = urlencode([
        ("ranges", "'Portal Asset Profiles'!A1:L"),
        ("ranges", "'Vehicle Registry'!A1:G"),
        ("ranges", "'TisZod Recall Selection'!A1"),
        ("valueRenderOption", "FORMATTED_VALUE"),
    ])
    sheet = quote(config["RECALL_SHEET_ID"], safe="")
    data = request_json(f"https://sheets.googleapis.com/v4/spreadsheets/{sheet}/values:batchGet?{query}", token)
    ranges = data["valueRanges"]
    selected = set(json.loads(ranges[2].get("values", [["[]"]])[0][0]))
    vehicles = {vin: item for vin, item in inventory(ranges[:2]).items() if vin in selected}
    if not vehicles:
        raise ValueError("No Garage vehicles are selected for recalls")
    date = datetime.now(ZoneInfo("America/New_York")).strftime("%Y-%m-%d %I:%M %p")
    text, html = report(vehicles, date)
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
