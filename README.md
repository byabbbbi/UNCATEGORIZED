# UNCATEGORIZED

**[▶ 플레이하기](https://byabbbbi.github.io/UNCATEGORIZED/)** — 플레이가 LLM을 개조한다.

![UNCATEGORIZED](docs/banner.png)

*RES SINE CATEGORIA* — 네 기둥이 지켜 온 분류 대장에서, 개념을 조합·선포하며 세계의 범주를 무너뜨린다. 무너진 기둥은 생성 규칙을 바꿔, 같은 조합도 다른 결과를 낸다.

## 플레이

1. [배포 URL](https://byabbbbi.github.io/UNCATEGORIZED/)을 연다  
2. **처음부터** 또는 **붕괴된 세계에서**를 고른다  
3. 카드를 드래그해 겹치면 조합, 제단(ARA)에 올리면 선포

## 로컬 실행

```bash
npm install
npm run dev
```

## 배포

```bash
npm run deploy
```

GitHub Pages는 `gh-pages` 브랜치를 사용한다 (`base: /UNCATEGORIZED/`).

## 프리로드 (선택)

```bash
node scripts/preload.mjs 80
npm run deploy
```

## Cloudflare 워커 메모 (수동)

- `MODEL_ID`: 추론(reasoning/thinking) 모델 말고 **빠른 instruct** 계열로 둔다.
- 워커 코드의 `max_tokens`는 **400 → 200**으로 줄인다. JSON 한 개면 충분하고 응답이 빨라진다.
- 변수·코드 수정 후 워커 **Deploy** 필수. 확인: 워커 URL GET → `{"ok":true,"model":"...","key":"set"}`.
