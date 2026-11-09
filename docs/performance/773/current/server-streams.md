# Server streams sensitivity

Synthetic extra delay per DB HTTP request. Values are median [min–max] milliseconds. Span sums include overlap and are not a serial critical path.

| Journey | Added delay | n | Headers | Complete body | DB calls | DB duration sum | First chunk | Shell markup | Main markup | Textarea markup |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| home | 0 | 3 | 2 [2–27] | 23 [22–54] | 4 [4–4] | 22 [20–28] | 13 [13–39] | 13 [13–39] | 13 [13–39] | not captured/not present |
| home | 50 | 3 | 2 [2–3] | 178 [177–181] | 4 [4–4] | 227 [226–231] | 64 [64–64] | 64 [64–64] | 64 [64–64] | not captured/not present |
| quests | 0 | 3 | 2 [2–2] | 21 [19–23] | 6 [6–6] | 38 [35–39] | 14 [13–16] | 14 [13–16] | 14 [13–16] | not captured/not present |
| quests | 50 | 3 | 2 [2–2] | 124 [123–126] | 6 [6–6] | 345 [340–349] | 66 [64–68] | 66 [64–68] | 66 [64–68] | not captured/not present |
| quest | 0 | 3 | 2 [2–3] | 27 [26–31] | 9 [9–9] | 62 [59–62] | 13 [13–16] | 13 [13–16] | 13 [13–16] | not captured/not present |
| quest | 50 | 3 | 2 [2–2] | 181 [181–183] | 9 [9–9] | 520 [519–525] | 64 [63–66] | 64 [63–66] | 64 [63–66] | not captured/not present |
| adventures | 0 | 3 | 2 [2–2] | 21 [19–22] | 5 [5–5] | 31 [28–33] | 12 [11–13] | 12 [11–13] | 12 [11–13] | not captured/not present |
| adventures | 50 | 3 | 2 [2–2] | 125 [122–126] | 5 [5–5] | 288 [285–289] | 64 [63–64] | 64 [63–64] | 64 [63–64] | not captured/not present |
| long-adventure | 0 | 3 | 2 [2–3] | 112 [108–139] | 4 [4–4] | 29 [24–29] | 15 [12–15] | 15 [12–15] | 15 [12–15] | 112 [108–137] |
| long-adventure | 50 | 3 | 2 [2–3] | 260 [258–270] | 4 [4–4] | 232 [231–238] | 64 [63–66] | 64 [63–66] | 64 [63–66] | 260 [258–270] |
| activities | 0 | 3 | 2 [2–2] | 21 [19–26] | 6 [6–6] | 37 [33–42] | 14 [13–18] | 14 [13–18] | 14 [13–18] | not captured/not present |
| activities | 50 | 3 | 2 [2–3] | 124 [121–130] | 6 [6–6] | 349 [339–351] | 65 [63–66] | 65 [63–66] | 65 [63–66] | not captured/not present |
| workshop | 0 | 3 | 2 [2–2] | 21 [19–24] | 5 [5–5] | 35 [25–37] | 16 [13–20] | 16 [13–20] | 16 [13–20] | not captured/not present |
| workshop | 50 | 3 | 2 [2–2] | 124 [120–125] | 5 [5–5] | 288 [281–289] | 65 [63–71] | 65 [63–71] | 65 [63–71] | not captured/not present |
| editor | 0 | 3 | 2 [2–2] | 31 [31–32] | 7 [7–7] | 38 [37–40] | 13 [13–13] | 13 [13–13] | 13 [13–13] | 31 [30–31] |
| editor | 50 | 3 | 2 [2–2] | 240 [239–241] | 7 [7–7] | 396 [394–406] | 65 [63–65] | 65 [63–65] | 65 [63–65] | 236 [236–241] |
