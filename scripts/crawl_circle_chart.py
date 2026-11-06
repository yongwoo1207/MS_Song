"""써클차트(구 가온차트) 월간 디지털차트 TOP N 수집기.

써클차트 페이지가 내부적으로 부르는 JSON API를 직접 호출해서 수집한다.
(브라우저/Selenium 불필요)

출력
- public/data/charts.json  : 앱이 읽는 데이터 (월 키 "YYYY-M" → 순위 목록)
- data/circle_chart_top10.csv : 사람이 엑셀로 확인하기 위한 같은 데이터

사용법 (MS_Song 폴더에서)
    python scripts/crawl_circle_chart.py                 # 비어 있는 달만 새로 수집
    python scripts/crawl_circle_chart.py --refresh       # 전체 다시 수집
    python scripts/crawl_circle_chart.py --start 2024-01 --end 2024-06
"""

from __future__ import annotations

import argparse
import csv
import html
import json
import random
import sys
import time
from datetime import date, datetime, timezone
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent
JSON_PATH = ROOT / "public" / "data" / "charts.json"
CSV_PATH = ROOT / "data" / "circle_chart_top10.csv"

API_URL = "https://circlechart.kr/data/api/chart/onoff"
PAGE_URL = "https://circlechart.kr/page_chart/onoff.circle"
FIRST_MONTH = (2010, 1)  # 월간 차트가 시작되는 달

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/140.0 Safari/537.36"
    ),
    "X-Requested-With": "XMLHttpRequest",
    "Referer": PAGE_URL,
}


def parse_month(text: str) -> tuple[int, int]:
    y, m = text.split("-")
    return int(y), int(m)


def month_range(start: tuple[int, int], end: tuple[int, int]):
    y, m = start
    while (y, m) <= end:
        yield y, m
        m += 1
        if m == 13:
            y, m = y + 1, 1


def last_month() -> tuple[int, int]:
    today = date.today()
    return (today.year - 1, 12) if today.month == 1 else (today.year, today.month - 1)


def fetch_month(session: requests.Session, year: int, month: int, top: int) -> list[dict]:
    """한 달치 차트 TOP N. 아직 발표 전인 달이면 빈 리스트."""
    payload = {
        "nationGbn": "T",
        "serviceGbn": "ALL",  # 디지털 차트(전체 서비스)
        "termGbn": "month",
        "hitYear": str(year),
        "targetTime": f"{month:02d}",
        "yearTime": "3",
        "curUrl": "circlechart.kr/page_chart/onoff.circle?",
    }
    res = session.post(API_URL, data=payload, timeout=20)
    res.raise_for_status()
    data = res.json()
    if data.get("ErrorMsg"):
        raise RuntimeError(data["ErrorMsg"])

    raw = data.get("List") or {}
    rows = [raw[k] for k in sorted(raw, key=int)] if isinstance(raw, dict) else list(raw)

    songs = []
    for row in rows:
        rank = int(row["SERVICE_RANKING"])
        if rank > top:
            continue
        songs.append(
            {
                "rank": rank,
                "title": html.unescape(row["SONG_NAME"]).strip(),
                "artist": html.unescape(row["ARTIST_NAME"]).strip(),
                "album": html.unescape(row.get("ALBUM_NAME") or "").strip(),
            }
        )
    songs.sort(key=lambda s: s["rank"])
    return songs


def load_existing() -> dict[str, list[dict]]:
    if not JSON_PATH.exists():
        return {}
    return json.loads(JSON_PATH.read_text(encoding="utf-8")).get("months", {})


def save(months: dict[str, list[dict]], top: int) -> None:
    ordered = dict(sorted(months.items(), key=lambda kv: parse_month(kv[0])))

    JSON_PATH.parent.mkdir(parents=True, exist_ok=True)
    JSON_PATH.write_text(
        json.dumps(
            {
                "source": "써클차트 월간 디지털차트 (circlechart.kr)",
                "top": top,
                "updatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                "months": ordered,
            },
            ensure_ascii=False,
            separators=(",", ":"),
        ),
        encoding="utf-8",
    )

    CSV_PATH.parent.mkdir(parents=True, exist_ok=True)
    with CSV_PATH.open("w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f, lineterminator="\n")  # LF everywhere, so CI runs do not rewrite every line
        writer.writerow(["year_month", "rank", "title", "artist", "album"])
        for key, songs in ordered.items():
            y, m = parse_month(key)
            for s in songs:
                writer.writerow([f"{y}-{m:02d}", s["rank"], s["title"], s["artist"], s["album"]])


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--start", default=f"{FIRST_MONTH[0]}-{FIRST_MONTH[1]:02d}", help="YYYY-MM (기본 2010-01)")
    parser.add_argument("--end", default=None, help="YYYY-MM (기본: 지난달)")
    parser.add_argument("--top", type=int, default=10, help="달마다 저장할 순위 수 (기본 10)")
    parser.add_argument("--refresh", action="store_true", help="이미 있는 달도 다시 수집")
    parser.add_argument("--delay", type=float, default=1.5, help="요청 사이 대기(초)")
    args = parser.parse_args()

    start = parse_month(args.start)
    end = parse_month(args.end) if args.end else last_month()
    months = load_existing()
    todo = [
        (y, m)
        for y, m in month_range(start, end)
        if args.refresh or f"{y}-{m}" not in months
    ]
    print(f"수집 대상 {len(todo)}개월 ({start[0]}-{start[1]:02d} ~ {end[0]}-{end[1]:02d}), 기존 {len(months)}개월")

    session = requests.Session()
    session.headers.update(HEADERS)
    failed: list[str] = []
    added = 0

    for i, (y, m) in enumerate(todo, 1):
        key = f"{y}-{m}"
        try:
            songs = fetch_month(session, y, m, args.top)
        except Exception as e:  # noqa: BLE001 - 한 달 실패해도 계속
            print(f"[{i}/{len(todo)}] {key} 실패: {e}")
            failed.append(key)
        else:
            if songs:
                added += months.get(key) != songs
                months[key] = songs
                print(f"[{i}/{len(todo)}] {key} {len(songs)}곡 · 1위 {songs[0]['title']} - {songs[0]['artist']}")
            else:
                print(f"[{i}/{len(todo)}] {key} 아직 발표 전")
        if i % 12 == 0 and added:
            save(months, args.top)  # 중간 저장
        if i < len(todo):
            time.sleep(args.delay + random.uniform(0, 0.8))

    if added:
        save(months, args.top)
        print(f"\n저장: {JSON_PATH.relative_to(ROOT)} ({len(months)}개월, 새로 {added}개월), {CSV_PATH.relative_to(ROOT)}")
    else:
        print("\n새로 발표된 달이 없어 파일을 그대로 둠")
    if failed:
        print("실패한 달 (다시 실행하면 이 달들만 재시도):", ", ".join(failed))
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
