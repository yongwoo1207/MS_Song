-- 사건 (timeline events). Operator-curated; safe to run again (upserts by id).
--   npm run db:events          → local D1
--   npm run db:events:remote   → Cloudflare D1
--
-- Shown on timeline months as "이 달의 주요 이슈" (no comments under them).
-- Rules: facts only, mainly how they changed service life (leave, pay,
-- service length, alerts). No opinions. Every row cites a source.
-- Drafted 2026-11-08 from news/government sources; review before launch.

INSERT INTO events (id, month, date, title, summary, scope, source_url) VALUES
('cheonan-sinking', '2010-03', '2010-03-26', '천안함 피격',
 '서해 백령도 인근에서 해군 초계함 천안함이 침몰해 장병 46명이 전사했습니다.',
 '전 군종', 'https://ko.wikipedia.org/wiki/%EC%B2%9C%EC%95%88%ED%95%A8_%ED%94%BC%EA%B2%A9_%EC%82%AC%EA%B1%B4'),

('yeonpyeong-shelling', '2010-11', '2010-11-23', '연평도 포격',
 '북한이 연평도에 포격을 가해 해병대 장병 2명이 전사하고 16명이 다쳤습니다. 해병대 연평부대가 K9 자주포로 대응사격했습니다.',
 '전 군종', 'https://www.ajunews.com/view/20211123141631326'),

('dmz-mine-2015', '2015-08', '2015-08-04', 'DMZ 목함지뢰·포격 도발',
 'DMZ 목함지뢰 폭발로 부사관 2명이 크게 다쳤고, 8월 20일 서부전선 포격 뒤 최고 경계태세인 진돗개 하나가 발령됐습니다. 8월 25일 남북 합의로 긴장이 풀렸습니다.',
 '전 군종', 'https://www.dailian.co.kr/news/view/1697524/'),

('service-cut-start', '2018-10', '2018-10-01', '복무기간 단계적 단축 시작',
 '2017년 1월 3일 입대자(육군 기준)부터 2주마다 하루씩 복무기간이 줄기 시작했습니다. 육군·해병대 18개월, 해군 20개월, 공군 21개월까지 줄어듭니다.',
 '전 군종', 'https://www.wikitree.co.kr/articles/359160'),

('weekday-outing', '2019-02', '2019-02-01', '평일 일과 후 외출 전면 시행',
 '평일 오후 5시 30분부터 9시 30분까지 외출할 수 있게 됐습니다. 개인 용무 외출은 한 사람당 월 2회 이내입니다.',
 '전 군종', 'https://m.go.seoul.co.kr/news/2019/02/01/20190201014013'),

('phone-trial', '2019-04', NULL, '일과 후 휴대전화 사용 시범운영 확대',
 '국방부 직할부대 시범운영을 거쳐 전 부대에서 병사의 일과 후 휴대전화 사용 시범운영이 시작됐습니다.',
 '전 군종', 'https://www.ytn.co.kr/_ln/0101_202408071230453569'),

('covid-leave-ban', '2020-02', '2020-02-22', '코로나19로 휴가·외출 통제',
 '전 장병의 휴가·외출·외박·면회가 통제됐습니다. 경조사 청원휴가는 예외였고, 전역 전 휴가자는 복귀 없이 전역하도록 조정됐습니다. 통제는 몇 달간 이어졌습니다.',
 '전 군종', 'https://m.seoul.co.kr/news/2020/02/22/20200222500008'),

('phone-full', '2020-07', NULL, '병사 휴대전화 사용 전면 허용',
 '시범운영을 마치고 모든 부대에서 병사의 일과 후 휴대전화 사용이 허용됐습니다. 평일 일과 후와 휴일에 쓸 수 있습니다.',
 '전 군종', 'https://www.ytn.co.kr/_ln/0101_202408071230453569'),

('service-cut-done', '2021-12', '2021-12-14', '복무기간 단축 완료',
 '2018년 10월부터 이어진 단계적 복무기간 단축이 끝났습니다. 이후 입대자는 육군·해병대 18개월, 해군 20개월, 공군 21개월을 복무합니다.',
 '전 군종', 'https://www.korea.kr/news/policyNewsView.do?newsId=148896977'),

('pay-2023', '2023-01', '2023-01-01', '병장 봉급 월 100만 원',
 '병장 봉급이 월 100만 원으로 올랐습니다. 정부는 2025년까지 150만 원으로 올리는 계획을 함께 밝혔습니다.',
 '전 군종', 'https://www.newsis.com/view/NISX20230105_0002148795'),

('pay-2024', '2024-01', '2024-01-01', '병장 봉급 월 125만 원',
 '병 봉급이 병장 125만 원, 상병 100만 원, 일병 80만 원, 이병 64만 원으로 올랐습니다.',
 '전 군종', 'https://view.asiae.co.kr/article/2023123113000433602'),

('pay-2025', '2025-01', '2025-01-01', '병장 봉급 월 150만 원',
 '병장 봉급이 150만 원, 이병 봉급이 75만 원으로 올랐습니다. 장병내일준비지원금도 월 55만 원으로 늘었습니다.',
 '전 군종', 'https://biz.sbs.co.kr/amp/article/20000209962')

ON CONFLICT(id) DO UPDATE SET
  month = excluded.month,
  date = excluded.date,
  title = excluded.title,
  summary = excluded.summary,
  scope = excluded.scope,
  source_url = excluded.source_url;
