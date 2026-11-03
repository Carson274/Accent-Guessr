"""Picks which Speech Accent Archive speakers to use in Accents mode.

This is how the speaker list in clips/accent-speakers.json was first chosen.
It writes a fresh list, so running it again drops the hand edits and the
start/end times in the current file. To add speakers, run it to a new file
and copy the entries you want over by hand.

Rules, per birth country:
- Only speakers whose native language is the country's most common one in the
  archive (so a Korean speaker born in the US doesn't count as a US accent).
- Non-native English speakers must have started English at age 5 or later and
  lived at most 6 years in an English-speaking country, so the accent is clear.
- Up to 3 speakers per country, mixing genders when possible.

Usage:
  python3 select-accent-speakers.py <speaker_information.xlsx> <out.json>
The spreadsheet comes from the archive's OSF repository (https://osf.io/yh23d).
Requires openpyxl.
"""
import collections
import json
import pathlib
import random
import sys

import openpyxl

COUNTRIES_GEOJSON = pathlib.Path(__file__).resolve().parents[2] / "client" / "src" / "data" / "countries.json"

# Archive country names that don't match the map's country names exactly.
ALIASES = {
    "usa": "USA", "uk": "GBR", "virginia": "USA", "new york": "USA", "serbia": "SRB",
    "republic of georgia": "GEO", "tanzania": "TZA", "democratic republic of congo": "COD",
    "slovak republic": "SVK", "timor-leste": "TLS", "kyrgystan": "KGZ", "trinidad": "TTO",
    "bosnia": "BIH", "el salvadore": "SLV", "indonesisa": "IDN", "philippiness": "PHL",
    "sicily": "ITA", "curacao": "CUW", "us virgin islands": "VIR",
}


def number(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def main():
    xlsx_path, out_path = sys.argv[1:3]
    features = json.loads(COUNTRIES_GEOJSON.read_text())["features"]
    by_name = {f["properties"]["ADMIN"].lower(): f["properties"]["ISO_A3"] for f in features}

    def country_code(name):
        name = (name or "").strip().lower()
        code = ALIASES.get(name) or by_name.get(name)
        return code if code and code != "-99" else None

    rows = list(openpyxl.load_workbook(xlsx_path, read_only=True).worksheets[0].iter_rows(values_only=True))
    speakers = [dict(zip(rows[0], row)) for row in rows[1:]]

    by_country = collections.defaultdict(list)
    for s in speakers:
        code = country_code(s["country"])
        if code:
            s["lang"] = (s["native_language"] or "").strip().lower()
            by_country[code].append(s)

    random.seed(494)
    selected = []
    for code, group in sorted(by_country.items()):
        top_language = collections.Counter(s["lang"] for s in group).most_common(1)[0][0]
        candidates = [s for s in group if s["lang"] == top_language]
        if top_language == "english":
            random.shuffle(candidates)
            candidates.sort(key=lambda s: bool(s["notes"]))
        else:
            candidates = [
                s for s in candidates
                if (number(s["onset_age"]) or 0) >= 5
                and (number(s["length_of_residence"]) if number(s["length_of_residence"]) is not None else 99) <= 6
            ]
            candidates.sort(key=lambda s: (bool(s["notes"]), number(s["length_of_residence"])))

        picked = []
        for gender in ("female", "male"):
            picked += [s for s in candidates if s["gender"] == gender][:2]
        picked = sorted(picked, key=candidates.index)[:3]

        for s in picked:
            selected.append({
                "file": s["speech_sample"],
                "country": code,
                "nativeLanguage": s["lang"],
                "birthplace": ", ".join(x for x in (s["city"], s["country"]) if x and x != "NULL"),
                "gender": s["gender"],
                "age": s["age"],
            })

    pathlib.Path(out_path).write_text(json.dumps(selected, indent=2) + "\n")
    print(f"{len(selected)} speakers from {len({s['country'] for s in selected})} countries")


if __name__ == "__main__":
    main()
