# AICaht / OpenCode Agent 原型品牌規格

來源：`image.png` 截圖視覺參考。畫面採用 ChatGPT 式低彩度工作台：左側淺灰導覽、中央留白、圓角輸入列、黑色主要操作按鈕，將技術執行狀態藏在安靜的面板與細線之中。

## OKLch tokens

```css
:root {
  --bg: oklch(97.6% 0 0);
  --surface: oklch(100% 0 0);
  --fg: oklch(17% 0 0);
  --muted: oklch(58% 0 0);
  --border: oklch(91.5% 0 0);
  --accent: oklch(18% 0 0);
}
```

## Typography

- Display: `Inter`, `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `system-ui`, `sans-serif`
- Body: `Inter`, `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `system-ui`, `sans-serif`
- Mono: `ui-monospace`, `JetBrains Mono`, `SF Mono`, `Menlo`, `monospace`

## Observed posture rules

1. 介面密度低、中央任務優先：初始狀態把注意力留給「今天有什麼計畫？」與輸入框。
2. 側欄是工具與歷史，不搶主畫面：選中列使用非常淡的灰底，不用彩色高亮。
3. 主要行動是黑色圓形 / 膠囊按鈕；其他控制只用文字、線框與灰階。
4. Agent / 工具狀態以小尺寸狀態列呈現，避免把技術 trace 做成喧賓奪主的 dashboard。
5. 圓角柔和但不玩裝飾：輸入列、側欄項目、浮層採 10–24px 圓角，陰影非常克制。
