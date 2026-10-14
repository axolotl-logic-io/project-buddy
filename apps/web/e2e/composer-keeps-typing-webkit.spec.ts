// Her typing survives a reply finishing, in WebKit, where the round 2 merge
// saw it lost (typing-across-reply-finish.ts).
import { test } from "./fixtures.ts";
import { testTypingAcrossReplyFinish } from "./typing-across-reply-finish.ts";

test.use({ browserName: "webkit" });

testTypingAcrossReplyFinish("webkit");
