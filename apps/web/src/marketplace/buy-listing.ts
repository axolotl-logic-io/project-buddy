// Buying a Marketplace listing (listing-store.ts): the buyer pays its price
// in gold to its seller and gets their own copy of its prompt, an ordinary
// own prompt named as the listing, which remembers the listing it was
// bought from. A free listing moves no gold.
//
// A purchase is one transaction: the payment, the purchase and the copy
// are all saved, or none is. It charges the price the buyer was shown, or
// nothing if the seller has changed it since. The payment names the
// purchase as its reference, so the transfer moves its gold at most once.
// A buyer holds at most one copy of a listing, so a double submit or a race
// charges once; once they delete their copy, buying it again charges again.
// Each buyer may try to buy PURCHASES_PER_HOUR times an hour.
import { and, eq, isNotNull } from "drizzle-orm";
import { z } from "zod";
import {
  listingBuyableBy,
  purchaseMadeBy,
  sellerOfListing,
} from "@/accounts/owner-scope.ts";
import { countPurchase } from "@/accounts/rate-limits.ts";
import { inTransaction, type Transaction } from "@/db/client.ts";
import { listings, purchases } from "@/db/tables/listings.ts";
import { users } from "@/db/tables/users.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import { transferGold } from "@/gold/gold-store.ts";
import {
  type ListingId,
  type OwnPromptId,
  parseListingId,
  parseOwnPromptId,
  USER_ID,
  type UserId,
} from "@/ids.ts";
import { saveBoughtCopy } from "@/prompts/own-prompt-kinds.ts";
import { type PromptKind, STORED_PROMPT_KIND } from "@/prompts/prompt.ts";

// The buyer's copy of a listing: its kind, for its page, and its id.
interface BoughtCopy {
  readonly kind: PromptKind;
  readonly id: OwnPromptId;
}

// A purchase as the buyer asks for it: the listing, by id, and the price
// in whole gold they were shown.
interface BuyRequest {
  readonly listingId: string;
  readonly price: number;
}

// What buying did: bought the listing, giving the buyer's new copy; found
// the buyer already holds a copy, giving it; or refused, moving nothing,
// because the seller has changed the price from the one shown (giving the
// price now), the buyer has less gold than the price (their balance in
// whole gold) or has tried to buy too often this hour; or found no listing
// the buyer may buy: one that is malformed, unknown, unlisted or their own.
type BuyOutcome =
  | { readonly kind: "bought" | "held"; readonly copy: BoughtCopy }
  | { readonly kind: "price-changed"; readonly price: number }
  | {
      readonly kind: "too-little-gold";
      readonly price: number;
      readonly gold: number;
    }
  | { readonly kind: "limited" | "not-found" };

const NOT_FOUND: BuyOutcome = { kind: "not-found" };

const BUYABLE_ROW = z.object({
  sellerId: USER_ID,
  kind: STORED_PROMPT_KIND,
  name: z.string(),
  parts: z.unknown(),
  price: z.number(),
});

// Thrown inside the purchase's transaction to roll back everything it did
// and answer with outcome instead.
class Refusal extends Error {
  readonly outcome: BuyOutcome;

  constructor(outcome: BuyOutcome) {
    super(outcome.kind);
    this.outcome = outcome;
  }
}

// The copy of the listing that the buyer already holds, as another
// purchase has just committed it.
async function heldCopy(
  transaction: Transaction,
  buyer: UserId,
  listing: ListingId,
  kind: PromptKind,
): Promise<BuyOutcome> {
  const [held] = await transaction
    .select({ copyId: purchases.copyId })
    .from(purchases)
    .where(
      and(
        eq(purchases.listingId, listing),
        purchaseMadeBy(buyer),
        isNotNull(purchases.copyId),
      ),
    );
  const id = parseOwnPromptId(held?.copyId ?? "");
  if (id === undefined) {
    return NOT_FOUND;
  }
  return { kind: "held", copy: { kind, id } };
}

// The purchase, within its transaction. The listing stays locked until the
// transaction ends, so it can't be unlisted, or its seller deleted, while
// it is bought. The seller's account is locked first, before the listing
// and their gold, so deleting it waits for the purchase, or the purchase
// for the deletion, rather than each holding what the other needs.
async function purchase(
  transaction: Transaction,
  buyer: UserId,
  { listing, shown }: { readonly listing: ListingId; readonly shown: number },
): Promise<BuyOutcome> {
  const [seller] = await transaction
    .select({ id: users.id })
    .from(users)
    .innerJoin(listings, sellerOfListing())
    .where(and(eq(listings.id, listing), listingBuyableBy(buyer)))
    .for("key share", { of: users });
  if (seller === undefined) {
    return NOT_FOUND;
  }
  const [row] = await transaction
    .select({
      sellerId: listings.sellerId,
      kind: listings.kind,
      name: listings.name,
      parts: listings.parts,
      price: listings.price,
    })
    .from(listings)
    .where(and(eq(listings.id, listing), listingBuyableBy(buyer)))
    .for("share");
  const buyable = BUYABLE_ROW.safeParse(row);
  if (!buyable.success) {
    return NOT_FOUND;
  }
  const { sellerId, kind, name, parts, price } = buyable.data;
  if (price !== shown) {
    return { kind: "price-changed", price };
  }
  const copyId = await saveBoughtCopy(transaction, buyer, {
    kind,
    name,
    definition: parts,
    listing,
  });
  // A listing whose copy the kind's store refuses, such as one beyond its
  // limits, can't be bought; nothing was saved.
  if (copyId === undefined) {
    return NOT_FOUND;
  }
  const [bought] = await transaction
    .insert(purchases)
    .values({ listingId: listing, buyerId: buyer, price, copyId })
    .onConflictDoNothing({
      target: [purchases.listingId, purchases.buyerId],
      where: isNotNull(purchases.copyId),
    })
    .returning({ id: purchases.id });
  if (bought === undefined) {
    throw new Refusal(await heldCopy(transaction, buyer, listing, kind));
  }
  if (price > 0) {
    const paid = await transferGold(
      buyer,
      {
        payee: sellerId,
        gold: price,
        reason: "marketplace-sale",
        referenceId: bought.id,
      },
      transaction,
    );
    switch (paid.kind) {
      case "notEnoughGold":
        throw new Refusal({ kind: "too-little-gold", price, gold: paid.gold });
      case "noPayee":
        throw new Refusal(NOT_FOUND);
      // The purchase's gold has moved, by this transfer or by one already
      // made with its id, which charges nothing more.
      case "moved":
      case "alreadyMoved":
        break;
      default:
        return paid satisfies never;
    }
  }
  return { kind: "bought", copy: { kind, id: copyId } };
}

// Buys the listing the request names for the buyer, at the price they
// were shown, as BuyOutcome describes.
async function buyListing(
  buyer: UserId,
  request: BuyRequest,
): Promise<BuyOutcome> {
  const listing = parseListingId(request.listingId);
  if (listing === undefined) {
    return NOT_FOUND;
  }
  if (!(await countPurchase(buyer, new Date(Date.now())))) {
    return { kind: "limited" };
  }
  return await withAppErrors("buy listing", async () => {
    try {
      return await inTransaction((transaction) =>
        purchase(transaction, buyer, { listing, shown: request.price }),
      );
    } catch (error) {
      if (error instanceof Refusal) {
        return error.outcome;
      }
      throw error;
    }
  });
}

export type { BoughtCopy, BuyOutcome, BuyRequest };
export { buyListing };
