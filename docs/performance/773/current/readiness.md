# Repeated control and stabilization observations

Times are milliseconds, median [min–max]. Confirmed control response is an upper bound sampled with 100 ms pauses and automation overhead. Direct times include navigation/server wait. Stable-useful is max(primary presence, confirmed control, last observed document-geometry/shift change), conditional on a final 500 ms quiet interval in this fixed window. Deliberate tab/menu/edit movement remains identified; this is not official CLS.

| State | Profile | Journey | Mode | n | Primary | Confirmed control | Stable-useful | Final quiet | All-shift max | Initial CLS max | Long-task total | Long-task max | Max interaction event | Response headers |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| populated | desktop | home | cold-direct | 3 | 312 [309–320] | 431 [429–437] | 431 [429–437] | 3/3 | 0.2167 | 0.2167 | 0 [0–0] | 0 [0–0] | 24 [24–24] | 3 [3–4] |
| populated | desktop | home | warm-direct | 3 | 311 [309–314] | 430 [428–433] | 430 [428–433] | 3/3 | 0.2167 | 0.2167 | 0 [0–0] | 0 [0–0] | 24 [24–24] | 3 [3–4] |
| populated | desktop | home | client-navigation | 3 | 372 [372–373] | 512 [511–513] | 512 [511–513] | 3/3 | 0.2167 | source metric excluded | 0 [0–0] | 0 [0–0] | 56 [56–56] | source metric excluded |
| populated | desktop | quests | cold-direct | 3 | 96 [96–181] | 283 [274–303] | 283 [274–303] | 3/3 | 0.0000 | 0.0000 | 0 [0–0] | 0 [0–0] | 32 [16–40] | 3 [3–4] |
| populated | desktop | quests | warm-direct | 3 | 315 [312–316] | 437 [433–437] | 437 [433–437] | 3/3 | 0.0000 | 0.0000 | 0 [0–0] | 0 [0–0] | 16 [16–24] | 3 [3–4] |
| populated | desktop | quests | client-navigation | 3 | 51 [51–54] | 168 [167–169] | 168 [167–169] | 3/3 | 0.2167 | source metric excluded | 0 [0–0] | 0 [0–0] | 16 [16–16] | source metric excluded |
| populated | desktop | quest | cold-direct | 3 | 316 [309–320] | 448 [437–451] | 448 [437–451] | 3/3 | 0.0000 | 0.0000 | 0 [0–0] | 0 [0–0] | 32 [24–32] | 3 [3–4] |
| populated | desktop | quest | warm-direct | 3 | 316 [311–319] | 443 [435–444] | 443 [435–444] | 3/3 | 0.0000 | 0.0000 | 0 [0–0] | 0 [0–0] | 24 [24–24] | 3 [3–3] |
| populated | desktop | quest | client-navigation | 3 | 351 [344–351] | 474 [468–475] | 474 [468–475] | 3/3 | 0.0000 | source metric excluded | 0 [0–0] | 0 [0–0] | 24 [24–24] | source metric excluded |
| populated | desktop | adventures | cold-direct | 3 | 101 [90–312] | 277 [274–447] | 277 [274–447] | 3/3 | 0.0000 | 0.0000 | 0 [0–0] | 0 [0–0] | 24 [24–32] | 3 [3–4] |
| populated | desktop | adventures | warm-direct | 3 | 308 [307–314] | 433 [432–438] | 433 [432–438] | 3/3 | 0.0000 | 0.0000 | 0 [0–0] | 0 [0–0] | 24 [24–24] | 3 [3–3] |
| populated | desktop | adventures | client-navigation | 3 | 67 [48–347] | 187 [172–473] | 187 [172–473] | 3/3 | 0.2167 | source metric excluded | 0 [0–0] | 0 [0–0] | 24 [24–40] | source metric excluded |
| populated | desktop | long-adventure | cold-direct | 3 | 540 [539–564] | 747 [727–761] | 747 [727–761] | 3/3 | 0.0000 | 0.0000 | 132 [128–142] | 80 [73–82] | 3416 [3408–3416] | 4 [4–5] |
| populated | desktop | long-adventure | warm-direct | 3 | 348 [340–351] | 532 [529–541] | 532 [529–541] | 3/3 | 0.0000 | 0.0000 | 0 [0–0] | 0 [0–0] | 48 [0–48] | 3 [3–4] |
| populated | desktop | long-adventure | client-navigation | 3 | 386 [385–389] | 579 [577–582] | 579 [577–582] | 3/3 | 0.0007 | source metric excluded | 0 [0–0] | 0 [0–0] | 104 [96–104] | source metric excluded |
| populated | desktop | activities | cold-direct | 3 | 310 [307–316] | 438 [436–445] | 438 [436–445] | 3/3 | 0.0000 | 0.0000 | 0 [0–0] | 0 [0–0] | 32 [24–32] | 3 [3–4] |
| populated | desktop | activities | warm-direct | 3 | 303 [303–306] | 428 [427–430] | 428 [427–430] | 3/3 | 0.0000 | 0.0000 | 0 [0–0] | 0 [0–0] | 24 [24–24] | 4 [3–4] |
| populated | desktop | activities | client-navigation | 3 | 346 [346–355] | 474 [472–481] | 474 [472–481] | 3/3 | 0.2167 | source metric excluded | 0 [0–0] | 0 [0–0] | 24 [24–32] | source metric excluded |
| populated | desktop | workshop | cold-direct | 3 | 316 [312–318] | 442 [437–444] | 442 [437–444] | 3/3 | 0.0000 | 0.0000 | 0 [0–0] | 0 [0–0] | 40 [40–40] | 3 [2–4] |
| populated | desktop | workshop | warm-direct | 3 | 316 [314–318] | 437 [434–438] | 437 [434–438] | 3/3 | 0.0000 | 0.0000 | 0 [0–0] | 0 [0–0] | 24 [24–24] | 2 [2–2] |
| populated | desktop | workshop | client-navigation | 3 | 64 [63–348] | 182 [181–470] | 182 [181–470] | 3/3 | 0.2167 | source metric excluded | 0 [0–0] | 0 [0–0] | 40 [24–56] | source metric excluded |
| populated | desktop | editor | cold-direct | 3 | 499 [486–500] | 652 [628–654] | 652 [628–654] | 3/3 | 0.1008 | 0.1008 | 0 [0–0] | 0 [0–0] | 72 [48–176] | 3 [3–3] |
| populated | desktop | editor | warm-direct | 3 | 396 [395–399] | 546 [546–548] | 546 [546–548] | 3/3 | 0.1008 | 0.1008 | 0 [0–0] | 0 [0–0] | 64 [64–64] | 3 [3–4] |
| populated | desktop | editor | client-navigation | 3 | 386 [384–402] | 533 [526–552] | 533 [526–552] | 3/3 | 0.1008 | source metric excluded | 0 [0–0] | 0 [0–0] | 64 [48–88] | source metric excluded |
| populated | phone | home | cold-direct | 3 | 737 [734–740] | 2878 [2869–2909] | 2878 [2869–2909] | 3/3 | 0.0463 | 0.0000 | 149 [149–184] | 149 [149–184] | 40 [40–40] | 3 [3–3] |
| populated | phone | home | warm-direct | 3 | 550 [550–554] | 691 [687–694] | 691 [687–694] | 3/3 | 0.0000 | 0.0000 | 0 [0–0] | 0 [0–0] | 24 [24–24] | 24 [16–38] |
| populated | phone | home | client-navigation | 3 | 302 [301–352] | 442 [441–489] | 442 [441–489] | 3/3 | 0.0000 | source metric excluded | 0 [0–0] | 0 [0–0] | 48 [32–56] | source metric excluded |
| populated | phone | quests | cold-direct | 3 | 731 [728–734] | 2845 [2833–2877] | 2845 [2833–2877] | 3/3 | 0.0006 | 0.0000 | 297 [287–310] | 158 [155–162] | 144 [136–152] | 3 [3–4] |
| populated | phone | quests | warm-direct | 3 | 506 [501–507] | 651 [643–656] | 651 [643–656] | 3/3 | 0.0000 | 0.0000 | 0 [0–0] | 0 [0–0] | 16 [16–16] | 3 [3–3] |
| populated | phone | quests | client-navigation | 3 | 563 [561–587] | 698 [683–718] | 698 [683–718] | 3/3 | 0.0000 | source metric excluded | 0 [0–0] | 0 [0–0] | 16 [16–16] | source metric excluded |
| populated | phone | quest | cold-direct | 3 | 732 [732–733] | 2906 [2899–2908] | 2906 [2899–2908] | 3/3 | 0.0106 | 0.0000 | 325 [325–333] | 170 [167–171] | 176 [176–176] | 3 [3–3] |
| populated | phone | quest | warm-direct | 3 | 530 [526–544] | 694 [685–700] | 694 [685–700] | 3/3 | 0.0000 | 0.0000 | 0 [0–0] | 0 [0–0] | 40 [40–40] | 3 [3–3] |
| populated | phone | quest | client-navigation | 3 | 568 [275–573] | 706 [426–717] | 706 [426–717] | 3/3 | 0.0000 | source metric excluded | 0 [0–0] | 0 [0–0] | 32 [32–32] | source metric excluded |
| populated | phone | adventures | cold-direct | 3 | 733 [729–733] | 2715 [2706–2733] | 2715 [2706–2733] | 3/3 | 0.0014 | 0.0000 | 284 [282–292] | 151 [148–153] | 144 [136–152] | 3 [3–3] |
| populated | phone | adventures | warm-direct | 3 | 517 [506–519] | 670 [670–677] | 670 [670–677] | 3/3 | 0.0000 | 0.0000 | 0 [0–0] | 0 [0–0] | 40 [40–40] | 3 [3–3] |
| populated | phone | adventures | client-navigation | 3 | 287 [284–580] | 436 [435–732] | 436 [435–732] | 3/3 | 0.0000 | source metric excluded | 0 [0–0] | 0 [0–0] | 40 [40–40] | source metric excluded |
| populated | phone | long-adventure | cold-direct | 3 | 790 [788–790] | 5826 [5822–5911] | 5826 [5822–5911] | 3/3 | 0.0441 | 0.0000 | 1704 [1667–1759] | 695 [695–722] | 704 [704–736] | 3 [3–4] |
| populated | phone | long-adventure | warm-direct | 3 | 640 [567–659] | 1673 [1660–1705] | 1673 [1660–1705] | 3/3 | 0.0331 | 0.0000 | 844 [837–915] | 362 [352–387] | 376 [368–400] | 3 [3–3] |
| populated | phone | long-adventure | client-navigation | 3 | 1016 [987–1029] | 1543 [1526–1576] | 1543 [1526–1576] | 3/3 | 0.0000 | source metric excluded | 629 [603–634] | 202 [186–206] | 32 [24–32] | source metric excluded |
| populated | phone | activities | cold-direct | 3 | 732 [732–732] | 2738 [2738–2742] | 2738 [2738–2742] | 3/3 | 0.0458 | 0.0000 | 272 [268–273] | 161 [158–167] | 120 [112–120] | 3 [3–3] |
| populated | phone | activities | warm-direct | 3 | 507 [499–514] | 664 [652–672] | 664 [652–672] | 3/3 | 0.0000 | 0.0000 | 0 [0–0] | 0 [0–0] | 40 [40–40] | 3 [3–3] |
| populated | phone | activities | client-navigation | 3 | 287 [285–541] | 436 [432–710] | 436 [432–710] | 3/3 | 0.0000 | source metric excluded | 0 [0–0] | 0 [0–0] | 40 [32–40] | source metric excluded |
| populated | phone | workshop | cold-direct | 3 | 733 [732–733] | 2817 [2807–2832] | 2817 [2807–2832] | 3/3 | 0.0436 | 0.0000 | 259 [257–285] | 156 [154–156] | 112 [112–136] | 3 [3–3] |
| populated | phone | workshop | warm-direct | 3 | 532 [526–536] | 683 [677–687] | 683 [677–687] | 3/3 | 0.0000 | 0.0000 | 0 [0–0] | 0 [0–0] | 32 [32–32] | 3 [3–3] |
| populated | phone | workshop | client-navigation | 3 | 593 [579–673] | 742 [728–820] | 742 [728–820] | 3/3 | 0.0000 | source metric excluded | 0 [0–0] | 0 [0–0] | 32 [24–40] | source metric excluded |
| populated | phone | editor | cold-direct | 3 | 740 [739–742] | 4280 [4250–4294] | 4280 [4250–4294] | 3/3 | 0.0019 | 0.0000 | 429 [414–431] | 165 [164–180] | 112 [112–160] | 3 [3–3] |
| populated | phone | editor | warm-direct | 3 | 580 [578–586] | 843 [834–852] | 843 [834–852] | 3/3 | 0.0000 | 0.0000 | 0 [0–0] | 0 [0–0] | 32 [24–32] | 3 [3–4] |
| populated | phone | editor | client-navigation | 3 | 613 [608–708] | 893 [857–954] | 954 [953–988] | 3/3 | 0.0000 | source metric excluded | 0 [0–0] | 0 [0–0] | 16 [16–24] | source metric excluded |
| empty | desktop | home | cold-direct | 1 | 86 [86–86] | 246 [246–246] | 246 [246–246] | 1/1 | 0.0000 | 0.0000 | 0 [0–0] | 0 [0–0] | 24 [24–24] | 3 [3–3] |
| empty | desktop | home | warm-direct | 1 | 313 [313–313] | 430 [430–430] | 430 [430–430] | 1/1 | 0.2167 | 0.2167 | 0 [0–0] | 0 [0–0] | 24 [24–24] | 3 [3–3] |
| empty | desktop | home | client-navigation | 1 | 351 [351–351] | 492 [492–492] | 492 [492–492] | 1/1 | 0.2167 | source metric excluded | 0 [0–0] | 0 [0–0] | 56 [56–56] | source metric excluded |
| empty | desktop | quests | cold-direct | 1 | 95 [95–95] | 265 [265–265] | 265 [265–265] | 1/1 | 0.0000 | 0.0000 | 0 [0–0] | 0 [0–0] | 24 [24–24] | 3 [3–3] |
| empty | desktop | quests | warm-direct | 1 | 316 [316–316] | 436 [436–436] | 436 [436–436] | 1/1 | 0.0000 | 0.0000 | 0 [0–0] | 0 [0–0] | 16 [16–16] | 3 [3–3] |
| empty | desktop | quests | client-navigation | 1 | 49 [49–49] | 168 [168–168] | 168 [168–168] | 1/1 | 0.2167 | source metric excluded | 0 [0–0] | 0 [0–0] | 16 [16–16] | source metric excluded |
| empty | desktop | adventures | cold-direct | 1 | 312 [312–312] | 442 [442–442] | 442 [442–442] | 1/1 | 0.0000 | 0.0000 | 0 [0–0] | 0 [0–0] | 24 [24–24] | 3 [3–3] |
| empty | desktop | adventures | warm-direct | 1 | 55 [55–55] | 183 [183–183] | 183 [183–183] | 1/1 | 0.0000 | 0.0000 | 0 [0–0] | 0 [0–0] | 24 [24–24] | 3 [3–3] |
| empty | desktop | adventures | client-navigation | 1 | 49 [49–49] | 173 [173–173] | 173 [173–173] | 1/1 | 0.2167 | source metric excluded | 0 [0–0] | 0 [0–0] | 24 [24–24] | source metric excluded |
| empty | desktop | activities | cold-direct | 1 | 90 [90–90] | 272 [272–272] | 272 [272–272] | 1/1 | 0.0000 | 0.0000 | 0 [0–0] | 0 [0–0] | 24 [24–24] | 3 [3–3] |
| empty | desktop | activities | warm-direct | 1 | 318 [318–318] | 443 [443–443] | 443 [443–443] | 1/1 | 0.0000 | 0.0000 | 0 [0–0] | 0 [0–0] | 24 [24–24] | 3 [3–3] |
| empty | desktop | activities | client-navigation | 1 | 344 [344–344] | 470 [470–470] | 470 [470–470] | 1/1 | 0.2167 | source metric excluded | 0 [0–0] | 0 [0–0] | 40 [40–40] | source metric excluded |
| empty | desktop | workshop | cold-direct | 1 | 93 [93–93] | 268 [268–268] | 268 [268–268] | 1/1 | 0.0000 | 0.0000 | 0 [0–0] | 0 [0–0] | 40 [40–40] | 4 [4–4] |
| empty | desktop | workshop | warm-direct | 1 | 313 [313–313] | 434 [434–434] | 434 [434–434] | 1/1 | 0.0000 | 0.0000 | 0 [0–0] | 0 [0–0] | 24 [24–24] | 2 [2–2] |
| empty | desktop | workshop | client-navigation | 1 | 50 [50–50] | 170 [170–170] | 170 [170–170] | 1/1 | 0.2167 | source metric excluded | 0 [0–0] | 0 [0–0] | 24 [24–24] | source metric excluded |
| empty | phone | home | cold-direct | 1 | 735 [735–735] | 2870 [2870–2870] | 2870 [2870–2870] | 1/1 | 0.0004 | 0.0000 | 154 [154–154] | 154 [154–154] | 40 [40–40] | 3 [3–3] |
| empty | phone | home | warm-direct | 1 | 491 [491–491] | 630 [630–630] | 630 [630–630] | 1/1 | 0.0000 | 0.0000 | 0 [0–0] | 0 [0–0] | 24 [24–24] | 2 [2–2] |
| empty | phone | home | client-navigation | 1 | 262 [262–262] | 388 [388–388] | 388 [388–388] | 1/1 | 0.0000 | source metric excluded | 0 [0–0] | 0 [0–0] | 40 [40–40] | source metric excluded |
| empty | phone | quests | cold-direct | 1 | 729 [729–729] | 2804 [2804–2804] | 2804 [2804–2804] | 1/1 | 0.0005 | 0.0000 | 247 [247–247] | 150 [150–150] | 96 [96–96] | 4 [4–4] |
| empty | phone | quests | warm-direct | 1 | 498 [498–498] | 638 [638–638] | 638 [638–638] | 1/1 | 0.0000 | 0.0000 | 0 [0–0] | 0 [0–0] | 16 [16–16] | 3 [3–3] |
| empty | phone | quests | client-navigation | 1 | 541 [541–541] | 666 [666–666] | 666 [666–666] | 1/1 | 0.0000 | source metric excluded | 0 [0–0] | 0 [0–0] | 16 [16–16] | source metric excluded |
| empty | phone | adventures | cold-direct | 1 | 726 [726–726] | 2698 [2698–2698] | 2698 [2698–2698] | 1/1 | 0.0014 | 0.0000 | 263 [263–263] | 152 [152–152] | 120 [120–120] | 3 [3–3] |
| empty | phone | adventures | warm-direct | 1 | 491 [491–491] | 652 [652–652] | 652 [652–652] | 1/1 | 0.0000 | 0.0000 | 0 [0–0] | 0 [0–0] | 40 [40–40] | 3 [3–3] |
| empty | phone | adventures | client-navigation | 1 | 280 [280–280] | 435 [435–435] | 435 [435–435] | 1/1 | 0.0000 | source metric excluded | 0 [0–0] | 0 [0–0] | 40 [40–40] | source metric excluded |
| empty | phone | activities | cold-direct | 1 | 731 [731–731] | 2708 [2708–2708] | 2708 [2708–2708] | 1/1 | 0.0458 | 0.0000 | 251 [251–251] | 150 [150–150] | 112 [112–112] | 3 [3–3] |
| empty | phone | activities | warm-direct | 1 | 496 [496–496] | 651 [651–651] | 651 [651–651] | 1/1 | 0.0000 | 0.0000 | 0 [0–0] | 0 [0–0] | 40 [40–40] | 4 [4–4] |
| empty | phone | activities | client-navigation | 1 | 297 [297–297] | 448 [448–448] | 448 [448–448] | 1/1 | 0.0000 | source metric excluded | 0 [0–0] | 0 [0–0] | 40 [40–40] | source metric excluded |
| empty | phone | workshop | cold-direct | 1 | 732 [732–732] | 2800 [2800–2800] | 2800 [2800–2800] | 1/1 | 0.0397 | 0.0000 | 249 [249–249] | 151 [151–151] | 104 [104–104] | 3 [3–3] |
| empty | phone | workshop | warm-direct | 1 | 520 [520–520] | 669 [669–669] | 669 [669–669] | 1/1 | 0.0000 | 0.0000 | 0 [0–0] | 0 [0–0] | 32 [32–32] | 3 [3–3] |
| empty | phone | workshop | client-navigation | 1 | 576 [576–576] | 709 [709–709] | 709 [709–709] | 1/1 | 0.0000 | source metric excluded | 0 [0–0] | 0 [0–0] | 24 [24–24] | source metric excluded |
| empty-detail | desktop | quest | cold-direct | 1 | 312 [312–312] | 439 [439–439] | 439 [439–439] | 1/1 | 0.0000 | 0.0000 | 0 [0–0] | 0 [0–0] | 32 [32–32] | 4 [4–4] |
| empty-detail | desktop | quest | warm-direct | 1 | 317 [317–317] | 442 [442–442] | 442 [442–442] | 1/1 | 0.0000 | 0.0000 | 0 [0–0] | 0 [0–0] | 24 [24–24] | 4 [4–4] |
| empty-detail | desktop | quest | client-navigation | 1 | 347 [347–347] | 473 [473–473] | 473 [473–473] | 1/1 | 0.0000 | source metric excluded | 0 [0–0] | 0 [0–0] | 24 [24–24] | source metric excluded |
| empty-detail | desktop | long-adventure | cold-direct | 1 | 311 [311–311] | 473 [473–473] | 473 [473–473] | 1/1 | 0.0000 | 0.0000 | 87 [87–87] | 87 [87–87] | 32 [32–32] | 3 [3–3] |
| empty-detail | desktop | long-adventure | warm-direct | 1 | 307 [307–307] | 468 [468–468] | 468 [468–468] | 1/1 | 0.0000 | 0.0000 | 0 [0–0] | 0 [0–0] | 32 [32–32] | 4 [4–4] |
| empty-detail | desktop | long-adventure | client-navigation | 1 | 347 [347–347] | 504 [504–504] | 504 [504–504] | 1/1 | 0.0007 | source metric excluded | 0 [0–0] | 0 [0–0] | 16 [16–16] | source metric excluded |
| empty-detail | phone | quest | cold-direct | 1 | 734 [734–734] | 2883 [2883–2883] | 2883 [2883–2883] | 1/1 | 0.0106 | 0.0000 | 315 [315–315] | 166 [166–166] | 176 [176–176] | 4 [4–4] |
| empty-detail | phone | quest | warm-direct | 1 | 530 [530–530] | 690 [690–690] | 690 [690–690] | 1/1 | 0.0000 | 0.0000 | 0 [0–0] | 0 [0–0] | 40 [40–40] | 3 [3–3] |
| empty-detail | phone | quest | client-navigation | 1 | 297 [297–297] | 455 [455–455] | 455 [455–455] | 1/1 | 0.0000 | source metric excluded | 0 [0–0] | 0 [0–0] | 32 [32–32] | source metric excluded |
| empty-detail | phone | long-adventure | cold-direct | 1 | 730 [730–730] | 5141 [5141–5141] | 5141 [5141–5141] | 1/1 | 0.0339 | 0.0000 | 607 [607–607] | 291 [291–291] | 168 [168–168] | 3 [3–3] |
| empty-detail | phone | long-adventure | warm-direct | 1 | 521 [521–521] | 872 [872–872] | 872 [872–872] | 1/1 | 0.0331 | 0.0000 | 0 [0–0] | 0 [0–0] | 40 [40–40] | 4 [4–4] |
| empty-detail | phone | long-adventure | client-navigation | 1 | 345 [345–345] | 657 [657–657] | 657 [657–657] | 1/1 | 0.0000 | source metric excluded | 0 [0–0] | 0 [0–0] | 48 [48–48] | source metric excluded |

Completed observations: 186 / 186. Populated cells target n=3; empty states n=1. No percentile inference. Read conditions and capture corrections in [the current capture record](README.md).
