# ĐỜI NÀY CÓ GÌ VUI? — COMPLETE V4

Đây là bản hoàn chỉnh đóng gói để chơi ngay.

## Chơi offline
Mở `index.html`. Game có fallback hội thoại cục bộ nên không cần API để chơi.

## AI NPC thật
Chạy `server.mjs` và đặt `OPENAI_API_KEY` trong biến môi trường. API key không nằm trong browser.

```bash
OPENAI_API_KEY="your_key" OPENAI_MODEL="gpt-5.6" node server.mjs
```

Sau đó mở `http://localhost:3000`.

## Điều khiển
- Nút cảm ứng / WASD / mũi tên: di chuyển
- E: tương tác
- P: điện thoại
- H: về trọ
- Nút 🛏: ngủ ở phòng trọ

## Nội dung
World pixel-art procedural, 8 khu vực, 8 NPC, 3 công việc, điện thoại, tin nhắn AI, hẹn hò, mạng xã hội, shop, sổ đời, quan hệ, memory chat, ngày/đêm, mưa, xe, props Việt Nam, save/load và integrity checker.
