# Controlled server comparison

Values are median [min–max] milliseconds. Initial (n=3) and confirmation (n=10) cohorts are separate. Synthetic extra DB delay: 50 ms per HTTP request. The static route name `editor` means the own construct editor only. Activity and spell editors have the same code change but were not measured. See the [capture record](README.md) for uncertainty and definitions.

## Document transport

| Phase | Route | Variant | n | Headers | Shell markup | Primary markup | Complete body |
| --- | --- | --- | --- | --- | --- | --- | --- |
| initial | home | before | 3 | 4.0 [3.8–268.5] | 131.1 [126.4–498.0] | 188.3 [184.7–558.8] | 188.6 [184.9–560.8] |
| initial | home | after | 3 | 3.9 [3.5–51.5] | 131.5 [125.5–271.2] | 185.2 [182.0–327.6] | 185.4 [182.3–327.9] |
| initial | editor | before | 3 | 4.0 [3.7–7.2] | 186.1 [185.3–228.3] | 246.3 [243.1–341.0] | 246.5 [243.8–341.4] |
| initial | editor | after | 3 | 4.5 [3.9–8.9] | 188.6 [187.5–295.6] | 188.8 [187.5–295.7] | 189.5 [188.2–296.9] |
| confirmation | home | before | 10 | 2.7 [2.4–3.8] | 125.9 [123.1–131.1] | 183.4 [180.3–185.3] | 183.8 [180.6–186.4] |
| confirmation | home | after | 10 | 2.8 [2.1–3.8] | 125.0 [121.1–128.5] | 182.3 [178.5–185.2] | 182.8 [178.6–185.3] |
| confirmation | editor | before | 10 | 3.1 [2.8–3.9] | 183.7 [181.3–186.0] | 241.1 [239.5–244.1] | 241.3 [239.8–244.4] |
| confirmation | editor | after | 10 | 2.9 [2.8–4.1] | 183.9 [182.1–187.2] | 184.3 [182.3–187.3] | 184.9 [183.4–188.1] |

## Browser navigation and DOM insertion

| Phase | Profile | Route | Cache | Variant | n | Navigation to headers | Request to headers | Shell DOM | Primary DOM | Document complete |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| initial | desktop | home | cold | before | 3 | 4.9 [4.1–55.9] | 4.1 [3.3–54.3] | 137.6 [131.7–309.9] | 201.9 [195.8–375.5] | 193.4 [188.0–365.7] |
| initial | desktop | home | cold | after | 3 | 3.5 [3.4–61.2] | 2.5 [2.4–60.2] | 133.4 [131.1–303.5] | 198.7 [198.7–365.9] | 188.2 [185.9–358.4] |
| initial | desktop | home | warm | before | 3 | 3.9 [3.3–4.0] | 3.0 [2.5–3.1] | 130.6 [129.6–133.1] | 186.8 [186.6–188.3] | 186.1 [185.9–187.8] |
| initial | desktop | home | warm | after | 3 | 4.4 [3.3–5.3] | 3.6 [2.4–4.2] | 131.6 [131.5–134.3] | 186.7 [186.5–189.3] | 186.0 [185.8–188.7] |
| initial | desktop | editor | cold | before | 3 | 4.2 [3.3–6.0] | 3.4 [2.4–5.0] | 197.9 [189.7–239.2] | 316.5 [304.3–393.9] | 253.9 [245.1–360.2] |
| initial | desktop | editor | cold | after | 3 | 4.3 [4.3–6.1] | 3.2 [3.2–5.3] | 203.8 [193.4–307.9] | 204.5 [194.1–308.9] | 200.5 [189.6–304.5] |
| initial | desktop | editor | warm | before | 3 | 3.7 [3.5–3.7] | 2.8 [2.6–2.8] | 188.1 [187.9–188.8] | 251.1 [250.3–252.3] | 243.3 [242.5–244.3] |
| initial | desktop | editor | warm | after | 3 | 3.6 [3.5–4.3] | 2.6 [2.6–3.4] | 191.3 [190.1–194.5] | 192.3 [190.8–195.4] | 188.3 [187.2–191.5] |
| initial | phone | home | cold | before | 3 | 3.4 [3.2–3.7] | 2.5 [2.5–2.8] | 622.9 [622.1–629.6] | 625.9 [625.3–633.4] | 201.7 [201.5–201.9] |
| initial | phone | home | cold | after | 3 | 3.5 [3.2–4.7] | 2.7 [2.4–3.9] | 623.7 [621.3–629.9] | 627.3 [624.9–633.1] | 202.1 [201.4–202.4] |
| initial | phone | home | warm | before | 3 | 3.7 [3.2–4.6] | 2.9 [2.5–3.7] | 188.4 [185.8–192.2] | 258.8 [248.9–259.1] | 199.7 [198.3–203.5] |
| initial | phone | home | warm | after | 3 | 3.3 [3.1–4.0] | 2.4 [2.3–3.1] | 185.4 [184.1–189.7] | 253.2 [248.6–255.7] | 203.2 [201.1–205.2] |
| initial | phone | editor | cold | before | 3 | 3.5 [3.4–4.2] | 2.7 [2.5–3.0] | 623.0 [622.3–630.2] | 630.8 [628.0–636.0] | 283.8 [283.4–284.2] |
| initial | phone | editor | cold | after | 3 | 3.3 [3.3–3.8] | 2.6 [2.5–3.0] | 623.3 [621.4–623.8] | 625.8 [625.2–626.8] | 261.6 [260.4–261.6] |
| initial | phone | editor | warm | before | 3 | 3.6 [3.2–4.4] | 2.8 [2.4–3.7] | 200.1 [196.1–200.9] | 321.8 [312.3–326.7] | 285.5 [283.6–287.7] |
| initial | phone | editor | warm | after | 3 | 3.6 [3.2–4.2] | 2.9 [2.4–3.5] | 199.7 [194.2–202.2] | 270.4 [265.5–271.2] | 256.7 [250.7–257.8] |
| confirmation | desktop | home | cold | before | 10 | 3.2 [2.8–3.7] | 2.3 [2.0–2.8] | 131.3 [129.7–134.6] | 196.5 [194.0–200.4] | 186.1 [184.2–188.3] |
| confirmation | desktop | home | cold | after | 10 | 2.9 [2.7–4.0] | 2.1 [1.9–3.1] | 130.2 [126.0–134.5] | 192.9 [191.1–194.6] | 184.3 [179.7–186.7] |
| confirmation | desktop | home | warm | before | 10 | 3.3 [3.0–3.7] | 2.5 [2.1–2.8] | 129.2 [127.1–130.8] | 184.8 [181.5–187.8] | 184.1 [180.8–187.1] |
| confirmation | desktop | home | warm | after | 10 | 3.1 [3.0–3.6] | 2.3 [2.2–2.7] | 128.7 [125.3–132.0] | 183.6 [179.7–186.8] | 182.8 [179.2–186.3] |
| confirmation | desktop | editor | cold | before | 10 | 3.2 [2.8–3.5] | 2.3 [2.0–2.6] | 188.8 [186.5–190.9] | 303.1 [299.5–315.7] | 244.0 [240.4–246.7] |
| confirmation | desktop | editor | cold | after | 10 | 3.0 [2.9–4.1] | 2.2 [2.1–3.2] | 189.8 [187.6–191.4] | 190.4 [188.5–192.0] | 186.4 [184.4–188.5] |
| confirmation | desktop | editor | warm | before | 10 | 3.4 [3.0–4.1] | 2.5 [2.2–2.8] | 187.0 [183.7–189.9] | 249.6 [246.7–254.5] | 241.1 [239.1–245.5] |
| confirmation | desktop | editor | warm | after | 10 | 3.1 [2.8–3.9] | 2.4 [2.1–3.0] | 188.5 [185.7–194.5] | 189.3 [186.6–195.4] | 185.5 [183.0–191.6] |
| confirmation | phone | home | cold | before | 10 | 3.2 [2.9–3.7] | 2.4 [2.0–2.8] | 622.0 [620.9–622.8] | 625.6 [624.9–626.5] | 201.2 [200.2–202.0] |
| confirmation | phone | home | cold | after | 10 | 3.0 [2.7–3.5] | 2.2 [1.9–2.8] | 622.8 [620.4–632.0] | 626.2 [623.2–634.8] | 201.8 [200.0–217.0] |
| confirmation | phone | home | warm | before | 10 | 3.2 [2.9–3.5] | 2.5 [2.1–2.6] | 188.8 [183.7–191.7] | 255.5 [248.9–264.0] | 202.5 [197.2–218.1] |
| confirmation | phone | home | warm | after | 10 | 3.2 [2.9–3.8] | 2.4 [2.2–3.0] | 184.6 [180.3–194.6] | 249.7 [245.5–261.4] | 199.4 [197.5–205.2] |
| confirmation | phone | editor | cold | before | 10 | 3.5 [3.0–4.4] | 2.5 [2.2–3.3] | 622.8 [621.7–623.5] | 628.2 [626.8–628.7] | 284.1 [283.3–284.9] |
| confirmation | phone | editor | cold | after | 10 | 3.2 [3.1–4.6] | 2.3 [2.2–3.5] | 623.0 [621.5–630.3] | 626.3 [624.4–633.6] | 253.8 [252.7–254.5] |
| confirmation | phone | editor | warm | before | 10 | 3.3 [3.0–3.8] | 2.5 [2.3–3.0] | 199.7 [191.5–203.7] | 321.1 [311.6–350.9] | 282.0 [278.3–289.4] |
| confirmation | phone | editor | warm | after | 10 | 3.3 [2.9–4.5] | 2.5 [2.1–3.6] | 197.2 [194.7–208.9] | 266.5 [250.1–274.4] | 253.6 [250.7–265.8] |

## Domain operations

Document-only spans exclude browser prefetch. The operations below overlap; sum columns must not be treated as a serial route duration.

| Phase | Route | Variant | Operation | n | Duration | Query count |
| --- | --- | --- | --- | --- | --- | --- |
| initial | home | before | current-user | 3 | 59.4 [58.3–102.7] | 1.0 [1.0–1.0] |
| initial | home | before | today | 3 | 118.4 [118.1–126.0] | 5.0 [5.0–5.0] |
| initial | home | after | current-user | 3 | 60.3 [58.7–98.1] | 1.0 [1.0–1.0] |
| initial | home | after | home-summary | 3 | 116.2 [114.3–117.9] | 3.0 [3.0–3.0] |
| initial | editor | before | construct-data | 3 | 56.0 [55.9–58.0] | 1.0 [1.0–1.0] |
| initial | editor | before | construct-metadata | 3 | 58.7 [58.2–58.7] | 1.0 [1.0–1.0] |
| initial | editor | before | current-user | 3 | 60.7 [59.5–70.9] | 1.0 [1.0–1.0] |
| initial | editor | before | workshop-options | 3 | 59.3 [58.8–59.4] | 2.0 [2.0–2.0] |
| initial | editor | after | construct-data | 3 | 59.9 [57.4–62.4] | 0.0 [0.0–0.0] |
| initial | editor | after | construct-metadata | 3 | 60.0 [57.4–62.5] | 1.0 [1.0–1.0] |
| initial | editor | after | current-user | 3 | 60.7 [58.4–71.7] | 1.0 [1.0–1.0] |
| initial | editor | after | workshop-options | 3 | 59.5 [57.8–61.0] | 2.0 [2.0–2.0] |
| confirmation | home | before | current-user | 10 | 58.6 [57.5–59.7] | 1.0 [1.0–1.0] |
| confirmation | home | before | today | 10 | 117.7 [116.6–118.7] | 5.0 [5.0–5.0] |
| confirmation | home | after | current-user | 10 | 59.0 [57.4–60.4] | 1.0 [1.0–1.0] |
| confirmation | home | after | home-summary | 10 | 116.3 [115.1–117.5] | 3.0 [3.0–3.0] |
| confirmation | editor | before | construct-data | 10 | 57.2 [56.2–58.4] | 1.0 [1.0–1.0] |
| confirmation | editor | before | construct-metadata | 10 | 58.8 [58.0–60.2] | 1.0 [1.0–1.0] |
| confirmation | editor | before | current-user | 10 | 59.1 [58.2–60.1] | 1.0 [1.0–1.0] |
| confirmation | editor | before | workshop-options | 10 | 58.9 [58.2–60.0] | 2.0 [2.0–2.0] |
| confirmation | editor | after | construct-data | 10 | 58.1 [57.5–58.6] | 0.0 [0.0–0.0] |
| confirmation | editor | after | construct-metadata | 10 | 58.1 [57.5–58.7] | 1.0 [1.0–1.0] |
| confirmation | editor | after | current-user | 10 | 59.0 [58.5–59.9] | 1.0 [1.0–1.0] |
| confirmation | editor | after | workshop-options | 10 | 58.4 [57.7–59.8] | 2.0 [2.0–2.0] |
