# Server paths sensitivity

Synthetic extra delay per DB HTTP request. Values are median [min–max] milliseconds. Span sums include overlap and are not a serial critical path.

| Journey | Added delay | n | Headers | Complete body | DB calls | DB duration sum | First chunk | Shell markup | Main markup | Textarea markup |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| home | 0 | 3 | 2 [2–201] | 29 [24–229] | 4 [4–4] | 24 [23–31] | not captured/not present | not captured/not present | not captured/not present | not captured/not present |
| home | 50 | 3 | 2 [2–4] | 178 [178–182] | 4 [4–4] | 228 [226–229] | not captured/not present | not captured/not present | not captured/not present | not captured/not present |
| quests | 0 | 3 | 2 [2–2] | 21 [21–22] | 6 [6–6] | 39 [38–40] | not captured/not present | not captured/not present | not captured/not present | not captured/not present |
| quests | 50 | 3 | 2 [2–2] | 123 [123–125] | 6 [6–6] | 345 [341–350] | not captured/not present | not captured/not present | not captured/not present | not captured/not present |
| quest | 0 | 3 | 2 [2–3] | 29 [28–32] | 9 [9–9] | 67 [58–69] | not captured/not present | not captured/not present | not captured/not present | not captured/not present |
| quest | 50 | 3 | 2 [2–2] | 183 [180–187] | 9 [9–9] | 523 [514–525] | not captured/not present | not captured/not present | not captured/not present | not captured/not present |
| adventures | 0 | 3 | 2 [2–2] | 21 [19–21] | 5 [5–5] | 31 [29–33] | not captured/not present | not captured/not present | not captured/not present | not captured/not present |
| adventures | 50 | 3 | 2 [2–2] | 125 [121–128] | 5 [5–5] | 288 [286–289] | not captured/not present | not captured/not present | not captured/not present | not captured/not present |
| long-adventure | 0 | 3 | 2 [2–2] | 113 [104–120] | 4 [4–4] | 26 [24–26] | not captured/not present | not captured/not present | not captured/not present | not captured/not present |
| long-adventure | 50 | 3 | 2 [2–3] | 267 [262–272] | 4 [4–4] | 233 [229–233] | not captured/not present | not captured/not present | not captured/not present | not captured/not present |
| activities | 0 | 3 | 2 [2–2] | 21 [21–24] | 6 [6–6] | 37 [36–43] | not captured/not present | not captured/not present | not captured/not present | not captured/not present |
| activities | 50 | 3 | 3 [2–3] | 124 [123–124] | 6 [6–6] | 341 [341–348] | not captured/not present | not captured/not present | not captured/not present | not captured/not present |
| workshop | 0 | 3 | 2 [2–2] | 23 [21–48] | 5 [5–5] | 30 [29–39] | not captured/not present | not captured/not present | not captured/not present | not captured/not present |
| workshop | 50 | 3 | 2 [2–2] | 125 [121–127] | 5 [5–5] | 282 [280–288] | not captured/not present | not captured/not present | not captured/not present | not captured/not present |
| editor | 0 | 3 | 2 [2–4] | 33 [32–39] | 7 [7–7] | 38 [37–41] | not captured/not present | not captured/not present | not captured/not present | not captured/not present |
| editor | 50 | 3 | 2 [2–2] | 241 [238–247] | 7 [7–7] | 400 [399–410] | not captured/not present | not captured/not present | not captured/not present | not captured/not present |
