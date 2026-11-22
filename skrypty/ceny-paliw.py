"""Publish the Mazowieckie retail averages reported by AutoCentrum."""
import json
import re
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.request import Request, urlopen

SOURCE = "https://www.autocentrum.pl/paliwa/"


class PriceRows(HTMLParser):
    def __init__(self):
        super().__init__()
        self.rows = []
        self.row = None
        self.cell = None

    def handle_starttag(self, tag, attrs):
        if tag == "tr":
            self.row = []
        elif tag in ("td", "th") and self.row is not None:
            self.cell = []

    def handle_data(self, data):
        if self.cell is not None:
            self.cell.append(data)

    def handle_endtag(self, tag):
        if tag in ("td", "th") and self.cell is not None:
            self.row.append(" ".join("".join(self.cell).split()))
            self.cell = None
        elif tag == "tr" and self.row is not None:
            self.rows.append(self.row)
            self.row = None


def parse_prices(html):
    parser = PriceRows()
    parser.feed(html)
    columns = None
    headers = {"95": "Pb95", "98": "Pb98", "ON": "ON", "LPG": "LPG"}
    for row in parser.rows:
        if all(label in row for label in headers):
            # Headers may omit the empty cell above the region name.
            offset = int(bool(row) and row[0] in headers)
            columns = {name: row.index(label) + offset for label, name in headers.items()}
        if columns and row and row[0].casefold() == "mazowieckie":
            prices = {}
            for name, position in columns.items():
                cell = row[position].removesuffix(" zł")
                if cell in ("", "-", "—", "–"):
                    prices[name] = None
                elif re.fullmatch(r"\d{1,2}[,.]\d{2}", cell):
                    prices[name] = float(cell.replace(",", "."))
                else:
                    raise ValueError(f"Unexpected {name} price")
            if not any(prices.values()):
                raise ValueError("No regional prices")
            return prices
    raise ValueError("Mazowieckie price row not found")


if __name__ == "__main__":
    request = Request(SOURCE, headers={"User-Agent": "Dziennik-zlecen/1.0 (regional fuel prices)"})
    with urlopen(request, timeout=25) as response:
        html = response.read().decode("utf-8")
    data = {"odczyt": datetime.now(timezone.utc).isoformat(timespec="seconds"), "ceny": parse_prices(html)}
    Path("ceny-paliw.json").write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
