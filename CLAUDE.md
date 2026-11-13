# 입대곡 (ipdaegok)

입대일만 넣으면 전역 D-day·진급일과 **그 시절 계급별 1위곡**을 보여주고, 군필·현역·입대 예정자가 글을 남기는 커뮤니티. 미필부터 예비군·민방위까지 다룬다.

핵심 성격 세 가지. 이걸 깨는 변경은 먼저 확인할 것.

- **회원가입이 없다.** 브라우저가 만든 임의 토큰으로만 "같은 기기의 글"을 구분한다.
- **모바일 전용 레이아웃.** 모든 화면이 `MobileShell`(최대 430px) 안에 들어간다. 데스크톱 전용 UI는 없다.
- **모든 사용자 문구는 한국어.** 코드·주석·커밋 메시지는 영어, 도메인 용어(계급, 군번, 전역)는 한국어 그대로.

---

## 1. 배포 (Cloudflare)

| 항목        | 값                                                           |
| ----------- | ------------------------------------------------------------ |
| 계정        | `yongwoo1207@naver.com` / `32ae6c28a14b05b978daf4224fc782da` |
| Worker 이름 | `ms-song`                                                    |
| 운영 주소   | https://ms-song.ipdaegok.workers.dev                         |
| D1 DB 이름  | `ms-song-db`                                                 |
| D1 DB ID    | `09d9ceab-ede9-4f68-b941-b4f32ba5998e`                       |
| 설정 파일   | `wrangler.jsonc`                                             |

**단일 Worker가 전부를 담당한다.** `/api/*` 는 `worker/index.ts` 가 처리하고, 나머지는 `dist/spa` 정적 파일을 그대로 내보낸다. 없는 주소는 `index.html` 로 폴백해서 클라이언트 라우터가 받는다(`not_found_handling: single-page-application`). 별도의 백엔드 서버는 없다.

**배포는 `main` 에 push 하면 자동으로 된다.** Cloudflare 쪽 Git 연동으로 묶여 있고, 저장소 안에 배포용 워크플로는 없다. 보통 1~4분 걸린다. 수동 배포가 필요하면 `npm run deploy`.

> 배포된 번들 해시가 로컬 `vite build` 결과와 다를 수 있다. Cloudflare가 자기 환경에서 다시 빌드하기 때문이며 정상이다. 반영 여부는 해시가 아니라 **번들 안의 문구**로 확인할 것.

**Cron Trigger: `0 3 * * *`** (UTC 3시 = 한국시간 정오). 삭제한 지 30일 지난 글을 파기한다(아래 6절). `wrangler.jsonc` 의 `triggers.crons` 에 있고 Cloudflare 대시보드에도 등록돼 있다.

---

## 2. GitHub

| 항목        | 값                                     |
| ----------- | -------------------------------------- |
| 저장소      | https://github.com/yongwoo1207/MS_Song |
| 기본 브랜치 | `main` (직접 push, PR 안 씀)           |

**워크플로는 `.github/workflows/update-charts.yml` 하나뿐이다.** 매주 화요일 10:00(KST)에 써클차트 월간 차트를 받아 새 곡의 유튜브 영상을 찾고 `public/data/*.json` 을 갱신해 `main` 에 push 한다. push 되면 자동 배포로 이어진다.

- 필요한 Secret: `YOUTUBE_API_KEY` (YouTube Data API v3)
- 수동 실행: Actions 탭 → Update charts → Run workflow
- **이 봇이 먼저 push 해두는 경우가 잦다.** push 가 거절되면 `git pull --rebase origin main` 후 다시 push. 건드리는 파일이 `data/`, `public/data/` 뿐이라 충돌은 거의 없다.

---

## 3. 로컬 개발

```bash
npm run dev          # 화면만 (vite, 8080)
npm run dev:api      # 워커 + 로컬 D1 (8787). /api 를 쓰려면 둘 다 필요
npm test             # vitest, 현재 68개 통과
npm run typecheck    # tsc && tsc -p worker — worker 쪽을 빼먹지 말 것
npm run format.fix   # prettier
```

- **윈도우 환경.** 저장소는 CRLF다. 파일을 스크립트로 수정할 땐 줄바꿈을 보존할 것. `git add` 시 LF→CRLF 경고는 정상이다.
- `.claude/launch.json` 에 미리보기용 dev server 설정(`ms-song`, 8080)이 있다.
- 커밋 전 최소한 `typecheck` + `test` + `vite build`.

---

## 4. 코드 구조

```
client/
  pages/              화면 하나 = 파일 하나 (Index, Dday, Community, Talk, My,
                      Notifications, Result, Songs, Terms, Privacy, NotFound)
  components/ipdae/   이 서비스 전용 컴포넌트 (32개)
  components/ui/      shadcn/ui 원본. 건드리지 말 것
  hooks/              useServicePlan, useRankChart, useMyPosts …
  lib/                dday(날짜 계산), charts, browse(다른 입대일), cardImage,
                      device, site …
shared/               클라이언트·워커가 함께 쓰는 타입과 상수 (posts.ts 등)
worker/index.ts       API 전부 + scheduled 핸들러. 1100줄 남짓 단일 파일
migrations/           D1 마이그레이션 (0001~0013)
public/data/          차트 JSON (워크플로가 갱신)
```

**정책 상수는 `shared/` 와 `worker/index.ts` 상단에 모여 있다.** 글자 수 제한(`shared/posts.ts`), 신고 자동 숨김 기준(`HIDE_AFTER_REPORTS`, `shared/posts.ts`), 도배 제한(`LIMITS`), 파기 기간(`PURGE_AFTER_DAYS = 30`).

**운영자가 채워야 하는 값은 `client/lib/site.ts` 한 곳에 있다.** 현재 `FEEDBACK_URL` 과 `CONTACT_EMAIL` 이 비어 있다(7절).

---

## 5. DB 구성

SQLite(D1). 모든 시각은 `'YYYY-MM-DDTHH:MM:SS.sssZ'` 문자열 UTC.

### authors — 글쓴이

| 컬럼         | 설명                                                                               |
| ------------ | ---------------------------------------------------------------------------------- |
| `id` PK      | **기기 토큰의 SHA-256 해시**. 원본은 브라우저 `localStorage` 에만 있고 서버에 없다 |
| `created_at` |                                                                                    |
| `banned`     | 1이면 더 이상 글을 쓸 수 없다                                                      |

브라우저가 만든 UUID를 `X-Device-Token` 헤더로 보내면 워커가 해시해서 이 `id` 로 쓴다. **그래서 브라우저 데이터를 지우면 그 사람의 글을 되찾을 방법이 없다.** 이게 지금 설계의 가장 큰 약점이고, 카카오 로그인을 붙일 때 풀어야 할 지점이다(6절).

### posts — 글·댓글 전부

`kind` 하나로 네 종류를 구분하는 단일 테이블.

| kind     | 뜻                                                                                      |
| -------- | --------------------------------------------------------------------------------------- |
| `record` | 노래에 남긴 한마디. `song_key`, `song_title`, `song_artist`, `about_month`, `rank` 필수 |
| `post`   | 커뮤니티 글. `title` 있음                                                               |
| `talk`   | 선후임 소통 글                                                                          |
| `reply`  | 댓글. `parent_id` 필수, `reply_to` 는 대댓글 대상                                       |

주요 컬럼:

- `body` 1~500자, `title` 1~60자 (화면 제한은 `shared/posts.ts` 가 더 엄격)
- `rank` 는 **그 글·좋아요에 대해 글쓴이가 가졌던 계급**이다. 다른 사람 입대일 차트에서 누른 좋아요·한마디처럼 가진 계급이 없으면 NULL (0013에서 record 의 NOT NULL 제약을 풀었다)
- `author_id`, `cohort_month`(군번 'YYYY-MM'), `branch`(육군/해군/공군/해병대/카투사/사회복무), `rank`(이병/일병/상병/병장), `is_reserve`, `days_to_enlist` — **글 쓸 당시의 복무 상태를 박아둔다.** 나중에 계급이 올라가도 글의 표시는 안 바뀐다
- `like_count`, `reply_count`, `report_count` — 비정규화 카운터. 토글·삭제 시 같이 갱신해야 한다
- `status`: `visible` | `hidden`(신고 3회 자동) | `deleted`
- `created_at`, `edited_at`, `deleted_at`

### likes / reports / song_likes / notifications

- `likes(post_id, author_id)` PK — 글 좋아요
- `reports(post_id, author_id, reason)` PK — 사유는 보안/욕설비방/광고/기타
- `song_likes(song_key, author_id)` PK — 노래 좋아요. 글이 아니라 곡에 직접
- `notifications(recipient_id, type, post_id, actor_id, read_at)` — `like`/`reply` 두 종류, `UNIQUE(type, post_id, actor_id)` 로 중복 방지

### events — **사용 안 함**

타임라인 기능이 `5ddf2f1` 에서 빠지면서 읽는 코드가 없어졌다. 행 12개가 남아 있다. 지워도 되지만 아직 안 지웠다.

### 인덱스

전부 **부분 인덱스**다. 피드(`status='visible'`), 댓글(`kind='reply'`), 파기 대상(`status='deleted'`) 처럼 조회 조건을 그대로 담았다. 새 조회 경로를 추가하면 인덱스도 같이 볼 것.

### 마이그레이션

`migrations/0001~0013`. **로컬과 원격을 따로 적용한다.**

```bash
npm run db:migrate:remote     # 운영 (wrangler d1 migrations apply DB --remote)
```

> **순서 주의.** 컬럼을 추가하는 변경은 **원격 마이그레이션을 먼저 적용하고 그다음 push** 해야 한다. 반대로 하면 새 코드가 없는 컬럼을 찾아 배포 직후 몇 분간 에러가 난다. 컬럼 추가는 되돌림 호환이라 먼저 적용해도 기존 코드는 멀쩡하다.
>
> Claude Code 자동 승인 모드가 원격 D1 변경을 "Production Deploy" 로 보고 막는다. 사용자가 직접 실행해야 한다.

### 현재 운영 데이터

글 31개(**visible 0개**), authors 4, likes 2, notifications 2. 전부 개발 중 테스트 데이터이고 실사용자는 아직 없다.

---

## 6. API

전부 `worker/index.ts` 안. 인증은 `X-Device-Token` 헤더 하나뿐이고 세션·쿠키가 없다.

| 메서드           | 경로                                                 | 설명                      |
| ---------------- | ---------------------------------------------------- | ------------------------- |
| GET              | `/api/posts?feed=…`                                  | 커뮤니티 피드             |
| GET              | `/api/posts?song=…`                                  | 특정 곡의 한마디          |
| GET              | `/api/posts?kind=talk`                               | 소통 글 목록              |
| POST             | `/api/posts`                                         | 글·댓글 작성              |
| GET/PATCH/DELETE | `/api/posts/:id`                                     | 스레드 조회 / 수정 / 삭제 |
| POST             | `/api/posts/:id/like`, `/report`                     | 좋아요 토글, 신고         |
| POST             | `/api/songs/like`                                    | 노래 좋아요 토글          |
| GET              | `/api/song-counts`                                   | 곡별 집계                 |
| GET              | `/api/me/posts`                                      | 내가 쓴 글                |
| GET              | `/api/notifications`, POST `/api/notifications/read` | 알림                      |

**scheduled 핸들러**: 매일 삭제 30일 지난 글을 찾아 `likes`→`reports`→`notifications`→댓글→글 순으로 지운다. 한 번에 200건씩 최대 10회.

> 로컬에서 `wrangler dev --test-scheduled` 의 `/__scheduled` 를 쳐도 **에셋 핸들러가 먼저 가로채서 동작하지 않는다.** 파기 로직을 고쳤다면 SQL을 로컬 D1에 직접 실행해 검증할 것. 운영에서는 Cloudflare가 URL이 아니라 `scheduled()` 를 직접 호출하므로 문제없다.

---

## 7. 확정된 기획

여기 적힌 건 결정이 끝난 것들이다.

**서비스**

- 회원가입 없이 바로 쓴다. 이 강점은 유지한다
- 전역일·진급일은 **참고용**이며, 공식 확인이 필요하다고 약관(제7조)과 화면에 명시
- 차트는 2010년 2월 이후. 음원은 직접 제공하지 않고 YouTube(`youtube-nocookie.com`)로 재생
- 커뮤니티는 신고 `HIDE_AFTER_REPORTS`(5)회 자동 숨김 + 도배 제한으로 관리. 좋아요 `POPULAR_MIN_LIKES`(5)개를 넘으면 인기글로 올라가고 글에 "인기" 표시가 붙는다
- 차트는 내 입대일뿐 아니라 **다른 입대일로도** 볼 수 있다(`/songs`, 주소의 `od`·`ob`). 보는 동안 내 입대일은 바뀌지 않는다

**브랜드**

- 이름은 **입대곡 / IPDAEGOK** 유지. (Palfield 등 영문 개명은 검토했으나 채택 안 함)
- 마크는 **기울어진 군번줄**, 올리브 `#4A5A2A`. `BrandMark.tsx` 의 `TagMark` 와 `public/favicon.svg` 가 같은 그림이다. **한쪽만 고치지 말 것**
- 워드마크는 영문 `IPDAEGOK`, Inter 700, 자간 0.09em (`font-brand`)
- 공유 썸네일 `public/og.png` 는 1200×630. 왼쪽 브랜드·헤드라인·태그, 오른쪽 D-day 카드 + 계급별 1위곡 블록

**데이터베이스**

- **D1을 계속 쓴다.** 글 하나가 1~2KB라 유료 플랜 10GB면 수백만 개가 들어간다. 옮길 이유가 없다
- 사람 받기 시작할 때 Workers 유료($5/월)로 올린다

**법적 문서**

- `/terms`, `/privacy` 를 앱 안 페이지로 둔다(외부 링크 아님)
- 개인정보처리방침은 **실제 수집 항목과 정확히 일치해야 한다.** 저장 항목을 바꾸면 `client/pages/Privacy.tsx` 도 같이 고칠 것
- 삭제한 글은 30일 뒤 파기 — 문서와 코드가 지금 일치한다

**앱 (아직 시작 안 함)**

- **별도 저장소를 만들지 않는다.** 이 저장소에 Capacitor를 넣어 `android/`, `ios/` 를 추가한다
- 안드로이드 먼저. iOS는 맥이 있어야 빌드된다(윈도우에서 불가)
- 애플 가이드라인 4.8: **카카오 로그인을 넣으면 애플 로그인도 의무**다
- 애플 4.2(웹 감싼 앱) 반려를 피하려면 홈 화면 D-day 위젯과 푸시 알림이 필요하다
- 구글 플레이: 2023년 11월 이후 개인 계정은 **테스터 12명 × 14일** 비공개 테스트가 필수. 가장 오래 걸리니 먼저 시작

**로그인 (아직 시작 안 함)**

- 익명을 기본으로 두고 카카오는 **선택**으로 붙인다
- **이메일을 받지 않는다.** 카카오 회원번호만 쓰면 비즈앱 전환(사업자등록)이 필요 없다
- 설계: "누구인가(`authors`)"와 "어떻게 증명하나"를 분리한다. `credentials(token_hash, author_id, kind)` 와 `identities(provider, provider_id, author_id)` 두 테이블을 추가하면 기존 사용자는 그대로 두고 기기 이전이 가능해진다
- 토큰 교환은 반드시 서버에서. 키는 `wrangler secret` 으로 넣고 코드에 두지 않는다

---

## 8. 남은 일

1. **`client/lib/site.ts` 의 빈 값 두 개.** `FEEDBACK_URL`(구글 폼 주소)과 `CONTACT_EMAIL`. 전자가 비면 피드백 링크가 아예 안 보이고, 후자는 개인정보처리방침 제10조의 보호책임자 연락처 자리다. **앱 심사와 카카오 로그인 심사 모두 요구한다**
2. **도메인.** 아직 `workers.dev` 다. `index.html` 의 OG 태그에 절대 주소가 박혀 있어 도메인을 붙이면 같이 고쳐야 한다. 메일은 Cloudflare Email Routing이 무료(받기 전용)
3. **앱**(7절 순서대로)
4. **카카오 로그인**(7절 설계대로)
5. `events` 테이블 정리

---

## 9. 알아둘 것

- **푸시 전 체크**: `typecheck`(worker 포함) → `test` → `vite build`. 마이그레이션이 있으면 원격 적용이 먼저
- **커밋 메시지는 영어**, 사용자 문구는 한국어
- `components/ui/` 는 shadcn 원본이라 수정하지 않는다
- 브랜드 마크를 바꾸면 **favicon.svg, favicon.ico, apple-touch-icon.png, BrandMark.tsx, og.png** 다섯 군데가 같이 움직인다
- OG 썸네일은 `public/og.png` 정적 파일이다. 소스 HTML은 저장소에 없으니 바꾸려면 다시 만들어야 한다
- 카톡은 링크 미리보기를 오래 캐시한다. 바꾼 뒤엔 [카카오 공유 디버거](https://developers.kakao.com/tool/debugger/sharing)에서 캐시를 비울 것
- 저장 이미지(`CardSnapshot`)는 화면 캡처가 아니라 **화면 밖에 다시 그린 DOM을 `html-to-image` 로 PNG 변환**하는 방식이다. 글꼴을 CSS에 심어야 글자가 안 깨진다
