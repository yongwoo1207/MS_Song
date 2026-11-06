"""차트 곡마다 유튜브 영상을 찾아 public/data/youtube.json 에 연결한다.

동작
1. public/data/charts.json 의 곡 중 youtube.json 에 아직 없는 곡만 처리
2. 유튜브 검색 결과 상위 몇 개를 점수화 (제목·가수 일치, 공식 채널, MV 여부,
   커버/가사/1시간/직캠 등 감점, 길이)
3. 1위 후보가 임베드 재생 가능한지 oEmbed 로 확인
4. 점수가 기준 이상이면 youtube.json 에 저장, 애매한 곡은 리뷰 CSV 에만 기록

출력
- public/data/youtube.json        : "가수|곡명" → 영상 ID (앱이 사용)
- data/youtube_matches.csv        : 곡마다 고른 영상·점수·상태 (사람이 검토)

youtube.json 에 이미 있는 곡(손으로 고친 것 포함)은 건드리지 않는다.
잘못 연결된 곡은 youtube.json 에서 값을 직접 고치면 된다.

검색 방식
- 환경변수 YOUTUBE_API_KEY 가 있으면 YouTube Data API v3 로 검색한다
  (GitHub Actions 처럼 유튜브가 봇 확인 화면을 띄우는 서버 환경용).
  한 곡에 약 101 단위(검색 100 + 영상 정보 1), 무료 한도는 하루 10,000 단위.
- 없으면 유튜브 검색 페이지를 직접 읽는다 (집 PC 에서 돌릴 때).

사용법 (MS_Song 폴더에서)
    python scripts/match_youtube.py              # 비어 있는 곡 전부
    python scripts/match_youtube.py --limit 20   # 20곡만 시험
"""

from __future__ import annotations

import argparse
import csv
import html
import json
import os
import random
import re
import sys
import time
from pathlib import Path
from urllib.parse import quote

import requests

ROOT = Path(__file__).resolve().parent.parent
CHARTS = ROOT / "public" / "data" / "charts.json"
YOUTUBE = ROOT / "public" / "data" / "youtube.json"
REVIEW = ROOT / "data" / "youtube_matches.csv"

ACCEPT_SCORE = 6  # 이 점수 이상이면 자동 연결

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/140.0 Safari/537.36"
    ),
    "Accept-Language": "ko-KR,ko;q=0.9",
}

OFFICIAL_CHANNELS = [
    "1thek", "smtown", "hybe labels", "jyp entertainment", "big hit", "bighit",
    "yg entertainment", "blackpink", "bangtantv", "stone music", "genie music",
    "kakao m", "starshiptv", "cube entertainment", "fnc", "woollim",
    "pledis", "rbw", "mnh", "the black label", "ador", "kq entertainment",
    "mystic story", "antenna", "loen", "warner music korea", "sony music korea",
    "dreamus", "mbk", "tvn", "mnet", "jtbc", "sbs", "kbs", "mbc", "tv chosun",
    "미스&미스터트롯", "topic", "official", "vevo",
]
BAD_WORDS = [
    "cover", "커버", "lyrics", "lyric", "가사", "1시간", "1 hour", "1hour", "반복",
    "live", "라이브", "직캠", "fancam", "reaction", "리액션", "practice", "연습",
    "teaser", "티저", "karaoke", "노래방", "piano", "피아노", "inst", "mr ",
    "remix", "sped up", "slowed", "playlist", "플레이리스트", "shorts", "#shorts",
    "behind", "비하인드", "making", "메이킹", "교차편집", "stage mix", "응원법",
    "acapella", "8d", "nightcore", "tutorial", "mirrored", "거울모드",
]
GOOD_WORDS = ["mv", "m/v", "music video", "뮤직비디오", "official video", "official audio"]
# 곡은 맞지만 공식 영상보다는 덜 좋은 것: 방송 무대, 팬 영상, 자막 재업로드
SOFT_BAD_WORDS = [
    "music core", "음악중심", "inkigayo", "인기가요", "music bank", "뮤직뱅크",
    "m countdown", "엠카", "show champion", "쇼챔", "the show", "@ sbs", "@ kbs",
    "@ mbc", "fan mv", "팬 mv", "fmv", "字幕", "eng sub", "자막", "sub)", "[sub",
]


def norm(text: str) -> str:
    return re.sub(r"[\s\W_]+", "", text.lower())


def title_core(title: str) -> str:
    """'UNFORGIVEN (feat. Nile Rodgers)' → 'UNFORGIVEN'"""
    core = re.split(r"\s*[\(\[]", title, maxsplit=1)[0]
    return core.strip() or title


def title_aliases(title: str) -> list[str]:
    """'퀸카 (Queencard)' → ['퀸카 (Queencard)', '퀸카', 'Queencard']"""
    out = [title, title_core(title)]
    for inner in re.findall(r"\(([^)]*)\)", title):
        if not re.match(r"(?i)\s*(feat|prod|with|from|inst)", inner):
            out.append(inner)
    return [a for a in dict.fromkeys(out) if norm(a)]


def artist_aliases(artist: str) -> list[str]:
    """'IVE (아이브)' → ['IVE', '아이브'], '가인, 조권' → ['가인', '조권']"""
    parts = re.split(r"[,&()\[\]/]| x | X |feat\.?", artist)
    return [p.strip() for p in parts if len(norm(p)) >= 2] or [artist]


def parse_length(text: str | None) -> int | None:
    if not text:
        return None
    nums = [int(n) for n in text.split(":") if n.isdigit()]
    secs = 0
    for n in nums:
        secs = secs * 60 + n
    return secs


API_KEY = os.environ.get("YOUTUBE_API_KEY", "").strip()
API_BASE = "https://www.googleapis.com/youtube/v3"


class QuotaExceeded(RuntimeError):
    """API 하루 한도를 다 썼다. 남은 곡은 다음 실행 때 처리한다."""


def iso_seconds(text: str) -> int | None:
    """'PT3M45S' → 225"""
    m = re.fullmatch(r"P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", text or "")
    if not m:
        return None
    d, h, mi, s = (int(x or 0) for x in m.groups())
    return ((d * 24 + h) * 60 + mi) * 60 + s


def api_get(session: requests.Session, path: str, params: dict) -> dict:
    res = session.get(f"{API_BASE}/{path}", params={**params, "key": API_KEY}, timeout=20)
    if res.status_code == 403 and "quota" in res.text.lower():
        raise QuotaExceeded("YouTube Data API 하루 한도 초과")
    if res.status_code != 200:
        try:
            reason = res.json()["error"]["message"]
        except Exception:  # noqa: BLE001
            reason = res.text[:200]
        raise RuntimeError(f"YouTube API {res.status_code}: {reason}")
    return res.json()


def search_api(session: requests.Session, query: str, limit: int = 8) -> list[dict]:
    found = api_get(
        session,
        "search",
        {"part": "snippet", "type": "video", "q": query, "maxResults": limit,
         "regionCode": "KR", "relevanceLanguage": "ko"},
    )
    ids = [it["id"]["videoId"] for it in found.get("items", []) if it.get("id", {}).get("videoId")]
    if not ids:
        return []
    info = api_get(session, "videos", {"part": "snippet,contentDetails,status", "id": ",".join(ids)})
    by_id = {v["id"]: v for v in info.get("items", [])}
    results = []
    for vid in ids:  # 검색 순서 유지
        v = by_id.get(vid)
        if not v:
            continue
        results.append(
            {
                "id": vid,
                "title": html.unescape(v["snippet"]["title"]),
                "channel": html.unescape(v["snippet"].get("channelTitle", "")),
                "seconds": iso_seconds(v.get("contentDetails", {}).get("duration", "")),
                "embeddable": v.get("status", {}).get("embeddable", True),
            }
        )
    return results


def search(session: requests.Session, query: str, limit: int = 8) -> list[dict]:
    if API_KEY:
        return search_api(session, query, limit)
    url = f"https://www.youtube.com/results?search_query={quote(query)}&hl=ko&gl=KR"
    html = session.get(url, timeout=20).text
    m = re.search(r"var ytInitialData = (\{.*?\});</script>", html, re.S)
    if not m:
        raise RuntimeError("검색 결과를 해석하지 못함 (페이지 구조 변경 가능)")
    data = json.loads(m.group(1))
    sections = (
        data["contents"]["twoColumnSearchResultsRenderer"]["primaryContents"]
        ["sectionListRenderer"]["contents"]
    )
    results = []
    for section in sections:
        for item in section.get("itemSectionRenderer", {}).get("contents", []):
            v = item.get("videoRenderer")
            if not v:
                continue
            results.append(
                {
                    "id": v["videoId"],
                    "title": "".join(r["text"] for r in v["title"]["runs"]),
                    "channel": (v.get("ownerText", {}).get("runs") or [{}])[0].get("text", ""),
                    "seconds": parse_length(v.get("lengthText", {}).get("simpleText")),
                }
            )
            if len(results) >= limit:
                return results
    return results


def score(cand: dict, title: str, artist: str, year: int) -> int:
    vt = cand["title"].lower()
    ch = cand["channel"].lower()
    nvt, nch = norm(vt), norm(ch)
    s = 0

    if any(norm(a) in nvt for a in title_aliases(title)):
        s += 4
    else:
        s -= 6  # 곡명이 없으면 거의 확실히 다른 영상

    if any(norm(a) in nvt or norm(a) in nch for a in artist_aliases(artist)):
        s += 3
    if any(norm(a) in nch for a in artist_aliases(artist)):
        s += 1  # 가수 본인 채널
    if any(norm(c) in nch for c in OFFICIAL_CHANNELS):
        s += 2
    if any(w in vt for w in GOOD_WORDS):
        s += 2
    if any(w in vt for w in BAD_WORDS) and not any(w in title.lower() for w in BAD_WORDS):
        s -= 5
    if any(w in vt for w in SOFT_BAD_WORDS):
        s -= 3
    # 차트에 오른 해보다 한참 뒤 연도가 붙은 영상 = 리메이크/재녹음
    if any(int(y) > year + 3 for y in re.findall(r"(?<!\d)(20[1-3]\d)(?!\d)", vt)):
        s -= 4

    secs = cand["seconds"]
    if secs is not None and (secs < 90 or secs > 600):
        s -= 4
    return s


def embeddable(session: requests.Session, video_id: str) -> bool:
    """oEmbed: 200 = 임베드 가능, 401 = 임베드 막힘, 404 = 삭제/비공개."""
    if API_KEY:
        return True  # API 모드에서는 videos.list 의 status.embeddable 로 이미 걸렀다
    url = f"https://www.youtube.com/oembed?format=json&url=https://www.youtube.com/watch?v={video_id}"
    return session.get(url, timeout=15).status_code == 200


def match_song(session: requests.Session, artist: str, title: str, year: int) -> tuple[dict | None, int, str]:
    query = f"{artist_aliases(artist)[0]} {title_core(title)} MV"
    cands = search(session, query)
    if not cands:
        # 로그인 안 한 상태에서 일부 검색어는 '연령을 인증하세요' 화면만 나온다.
        # 검색어를 바꾸면 보통 결과가 나오므로 순서대로 다시 시도한다.
        aliases = artist_aliases(artist)
        core = title_core(title)
        alts = [f"{aliases[-1]} {core}", f"{aliases[0]} {core} 뮤직비디오", f"{core} {aliases[0]}"]
        for alt in alts[:1] if API_KEY else alts:
            if alt == query:
                continue
            time.sleep(0.8)
            cands = search(session, alt)
            if cands:
                break
    rate = lambda c: score(c, title, artist, year)  # noqa: E731
    ranked = sorted(cands, key=rate, reverse=True)
    for cand in ranked[:3]:
        if rate(cand) < ACCEPT_SCORE:
            return cand, rate(cand), "low"
        if cand.get("embeddable", True) and embeddable(session, cand["id"]):
            return cand, rate(cand), "ok"
    best = ranked[0] if ranked else None
    return best, rate(best) if best else 0, "none" if not best else "blocked"


def songs_by_first_seen() -> dict[tuple[str, str], int]:
    """(가수, 곡명) → 처음 차트에 오른 해. 최근 곡부터 처리하도록 정렬."""
    months = json.loads(CHARTS.read_text(encoding="utf-8"))["months"]
    seen: dict[tuple[str, str], int] = {}
    for key in sorted(months, key=lambda k: tuple(map(int, k.split("-")))):
        for s in months[key]:
            seen.setdefault((s["artist"], s["title"]), int(key.split("-")[0]))
    return dict(reversed(list(seen.items())))


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--limit", type=int, default=0, help="처리할 곡 수 (시험용)")
    parser.add_argument("--delay", type=float, default=1.2, help="곡 사이 대기(초)")
    parser.add_argument("--redo", action="store_true", help="스크립트가 자동 연결했던 곡(검토 CSV 의 ok)도 다시 매칭")
    args = parser.parse_args()

    videos: dict[str, str] = json.loads(YOUTUBE.read_text(encoding="utf-8")) if YOUTUBE.exists() else {}
    if args.redo and REVIEW.exists():
        # 손으로 넣은 연결은 두고, 이전 실행이 자동으로 넣은 것만 지운다
        with REVIEW.open(encoding="utf-8-sig") as f:
            for r in csv.reader(f):
                if r and r[0] != "artist" and r[2] == "ok" and videos.get(f"{r[0]}|{r[1]}") == r[4]:
                    videos.pop(f"{r[0]}|{r[1]}")
    first_year = songs_by_first_seen()
    todo = [(a, t) for a, t in first_year if f"{a}|{t}" not in videos]
    if args.limit:
        todo = todo[: args.limit]
    print(f"매칭 대상 {len(todo)}곡 (이미 연결 {len(videos)}곡) · 검색: {'YouTube Data API' if API_KEY else '검색 페이지'}")

    # 이전 실행의 검토 기록은 유지하고, 이번에 다시 처리하는 곡의 줄만 새로 쓴다
    rows: list[list] = []
    if REVIEW.exists():
        redo = set(todo)
        with REVIEW.open(encoding="utf-8-sig") as f:
            rows = [r for r in csv.reader(f) if r and r[0] != "artist" and (r[0], r[1]) not in redo]

    session = requests.Session()
    session.headers.update(HEADERS)
    session.cookies.set("CONSENT", "YES+", domain=".youtube.com")

    def save() -> None:
        YOUTUBE.write_text(json.dumps(dict(sorted(videos.items())), ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        REVIEW.parent.mkdir(parents=True, exist_ok=True)
        with REVIEW.open("w", newline="", encoding="utf-8-sig") as f:
            w = csv.writer(f, lineterminator="\n")  # LF everywhere, so CI runs do not rewrite every line
            w.writerow(["artist", "title", "status", "score", "video_id", "video_title", "channel"])
            w.writerows(rows)

    counts = {"ok": 0, "low": 0, "blocked": 0, "none": 0, "error": 0}
    for i, (artist, title) in enumerate(todo, 1):
        try:
            cand, sc, status = match_song(session, artist, title, first_year[(artist, title)])
        except QuotaExceeded as e:
            print(f"[{i}/{len(todo)}] {e} → 남은 곡은 다음 실행 때 처리")
            break
        except Exception as e:  # noqa: BLE001
            cand, sc, status = None, 0, "error"
            print(f"[{i}/{len(todo)}] {artist} - {title}: 오류 {e}")
        counts[status] += 1
        if status == "ok" and cand:
            videos[f"{artist}|{title}"] = cand["id"]
        rows.append([artist, title, status, sc, cand["id"] if cand else "", cand["title"] if cand else "", cand["channel"] if cand else ""])
        if status != "error":
            print(f"[{i}/{len(todo)}] {status:7} {sc:3} {artist} - {title} → {cand['title'] if cand else '-'}")
        if i % 25 == 0:
            save()
        if i < len(todo):
            time.sleep(args.delay + random.uniform(0, 0.6))

    save()
    print(f"\n결과: {counts} · youtube.json {len(videos)}곡 · 검토용 {REVIEW.relative_to(ROOT)}")
    write_summary(videos)
    return 0


def write_summary(videos: dict[str, str]) -> None:
    """GitHub Actions 실행 화면에 영상 못 찾은 곡 목록을 남긴다."""
    path = os.environ.get("GITHUB_STEP_SUMMARY")
    if not path:
        return
    missing = [(a, t) for a, t in songs_by_first_seen() if f"{a}|{t}" not in videos]
    lines = [f"### 영상 없는 곡 {len(missing)}곡", ""]
    lines += [f"- {a} - {t}" for a, t in missing] or ["모든 곡에 영상이 연결됐어요."]
    with open(path, "a", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")


if __name__ == "__main__":
    raise SystemExit(main())
