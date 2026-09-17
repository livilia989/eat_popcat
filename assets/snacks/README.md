# 간식 이미지 (선택 사항)

기본적으로 간식은 **이모지**(🍪 🍗 🍩)로 표시된다. 이미지를 쓰고 싶다면
이 폴더에 아래 파일명으로 투명 배경 PNG 를 넣고,
`constants/assets.ts` 의 `SNACK_IMAGES` 에서 주석 처리된 `require` 를 해제하면 된다.

```
assets/snacks/cookie.png
assets/snacks/chicken.png
assets/snacks/donut.png
```

`SNACK_IMAGES` 값이 `null` 이면 자동으로 이모지로 fallback 된다.
