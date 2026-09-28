# TypeVoca

> 외우지 말고 그냥 쳐보세요.

TOEFL 단어 PDF를 브라우저에 넣으면 **영어 단어와 한글 뜻만** 뽑아내고,
뜻을 보면서 영어 단어를 계속 따라 치는 개인용 타이핑 학습 웹앱입니다.

- PDF는 서버로 전송되지 않습니다. PDF.js로 브라우저 안에서만 파싱합니다.
- 추출한 단어는 IndexedDB(Dexie)에 저장되어 브라우저를 닫아도 이어서 할 수 있습니다.
- 시험, 점수, 랭킹 없음. 보고 → 치고 → 다음.

## 사용법

1. 배포된 페이지에 접속 → **PDF 넣기**
2. TOEFL PDF 여러 개를 한 번에 드롭 (파일명 숫자 기준으로 자동 정렬)
3. 파일별 추출 단어 수 확인, 잘못 읽힌 단어/뜻은 행 위에 마우스를 올려 수정 또는 삭제
4. **이대로 시작하기** → 바로 타이핑

### Study 단축키

| 키          | 동작                     |
| ----------- | ------------------------ |
| A-Z         | 단어 입력                |
| Backspace   | 한 글자 삭제             |
| ←  /  →     | 이전 / 다음 단어         |
| Esc         | 메뉴 (순서대로 / 랜덤 등)|

정확히 입력하면 150ms 후 자동으로 다음 단어로 넘어갑니다. Enter 불필요.

## CSV 형식

PDF 파싱이 잘 안 되면 CSV로 넣을 수 있습니다. 첫 행 헤더는 있어도 되고 없어도 됩니다.

```csv
english,korean
moderate,"보통의, 중간의"
modest,"겸손한, 적당한"
```

20개씩 한 묶음(페이지)으로 저장되며 PDF와 섞어서 넣어도 됩니다.

## 파싱 대상 PDF 형식

페이지 상단 표 `# | 어휘 | 발음 | 뜻` 에서 1~20번 행만 읽습니다.
발음 column은 저장하지 않습니다.

- 헤더(`어휘`, `발음`, `뜻`)를 찾으면 x 좌표 기준으로 column을 나눕니다.
- 헤더가 없으면 `숫자 → 알파벳 단어 → (발음 무시) → 한글 뜻` 순서로 추정합니다.
- 뜻이 여러 줄로 나뉘어 있으면 공백으로 합칩니다.
- 20개가 아니면 ⚠ 경고만 표시하고 import는 계속합니다.

## 개발

```bash
npm install
npm run dev
```

```bash
npm run build   # tsc + vite build → dist/
```

## 배포

`main` 브랜치에 push하면 GitHub Actions가 빌드해서 GitHub Pages로 배포합니다.
저장소 Settings → Pages → Source를 **GitHub Actions**로 설정해야 합니다.

`vite.config.ts`의 `base`는 `/word-typer/`로 고정되어 있습니다. 저장소 이름이 바뀌면 함께 바꿔주세요.

## 기술 스택

React · TypeScript · Vite · Tailwind CSS v4 · pdfjs-dist · Dexie.js · react-router (HashRouter)

## 원칙

원본 PDF와 추출한 단어 데이터는 저장소에 커밋하지 않습니다. `.gitignore`에 `*.pdf`가 포함되어 있습니다.
