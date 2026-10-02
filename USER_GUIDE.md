# Estimated Delivery Date — User Guide

Estimated Delivery Date shows shoppers when an order is likely to arrive. You set the shipping rules once, design the message, choose where it appears, and publish. Customers then see a clear delivery estimate on the product page, the cart page, or both.

This guide is for store staff using the app inside Shopify admin. You do not need to write code.

## What shoppers see

A published widget can show:

- A title and a short delivery message
- A countdown to your daily processing cutoff (`{counter}`)
- Earliest and latest delivery dates
- A visual layout, such as a timeline, tracking steps, or a compact date bar
- An optional pincode check, so the estimate appears only when you deliver to that location

The widget name you type in the app is for your team. Customers see the title and description you design, not the internal widget name.

## Before you start

1. Install the app on your Shopify store and open it from **Apps** in Shopify admin.
2. Turn on the theme app embed. Widgets stay hidden until this is on.
3. Create a **product page** widget first if you also want a cart estimate. The cart widget uses the delivery rules from your live product widgets.

### Turn on the app embed

On the app **Home** page:

1. Check **App embed** in **Store overview**. It should say **Active**.
2. If it says **Off**, select **Open theme editor** (or **Manage in Theme Editor**).
3. In the theme editor, turn on **Estimated delivery embed**.
4. Select **Save** in the theme editor.
5. Return to the app. The status updates to **Active**.

If the embed is off, the home page shows a warning: widgets will not appear on the storefront until you save the embed in the theme editor.

The embed loads the delivery widget on product and cart pages. For a precise position, you can also place the theme blocks described in [Where the widget sits on the page](#where-the-widget-sits-on-the-page).

## Home page

Open the app to land on **Estimated delivery**.

**Store overview** shows:

| Card | Meaning |
| --- | --- |
| Live widgets | How many widgets are published now, plus scheduled and total counts |
| Impressions | How many times widgets were viewed in the last 30 days |
| Delivery requests | Pincode requests waiting for you to accept or decline |
| App embed | Whether the theme embed is on |

Below that, widgets are grouped into **Product page** and **Cart page**. If you have older checkout widgets, they appear under **Checkout (legacy)**. New checkout widgets cannot be created.

Each widget row shows its name, where it applies, and its status. Use **Edit** to open it. The **⋯** menu can:

- **Duplicate** — copy the widget as a new draft (not available for checkout widgets)
- **Publish** or **Unpublish** — show or hide it on the storefront
- **Publish now** or **Cancel schedule** — for a widget that is waiting to go live
- **Delete** — remove the widget, its settings, and its analytics. This cannot be undone.

**Create widget** starts a new widget.

## Create a widget

1. On Home, select **Create widget**.
2. Choose a placement type:
   - **Product page** — on the product page, above or below Add to cart
   - **Cart page** — on the cart page, above the checkout button, or in a position you place yourself
3. Select **Select this placement type**.

The editor opens on the **Conditions** tab. Work through the three tabs in order:

1. **Conditions** — shipping time, markets, and (on product widgets) how the widget appears
2. **Design** — template, text, colors, and icons
3. **Placement** — which products, and where on the page

Select **Continue to Design** and **Continue to Placement** to move forward. You can also click a tab at any time.

Changes are saved from the editor save bar. The status badge shows **Unsaved**, **Saving**, **Saved**, or **Save failed**. If a save fails, select **Retry**. Your latest edits stay in the editor.

### Widget status

At the bottom of the editor, choose how the widget goes live:

| Status | What happens |
| --- | --- |
| **Draft** | Saved, but hidden on the storefront |
| **Schedule** | Added to the page and shown automatically at the date and time you pick. The time must be in the future. |
| **Publish** | Shown immediately |

A scheduled widget shows a countdown until it goes live. When that time arrives, it publishes on its own. If another live widget already covers the same placement, the app asks you which one should stay live. See [When two widgets overlap](#when-two-widgets-overlap).

## Product page widget — Conditions

### Widget details

**Title** is the name in your widget list. Customers do not see this title.

### Order processing

This is the time you need before the order leaves your facility.

- **Minimum days** and **Maximum days** — how long preparation takes. Each value can be from 0 to 60. Maximum must be equal to or greater than minimum.
- **Timezone** — the clock used for the cutoff and the dates. It starts from your store timezone.
- **Processing cutoff time** — orders placed after this time start processing on the next working day. The `{counter}` tag in your message counts down to this cutoff.
- **Processing days** — the weekdays you prepare and ship. Select the day pills (M through S). At least one day is required.
- **Blocked dates** — holidays or closed days when you will not process orders.

To add a blocked date:

1. Select **Add blocked date**.
2. Choose a **Start date**. **End date** is optional. Only today and future dates are allowed.
3. Enter a **Name**, such as “Holiday”.
4. Leave **Repeat every year** checked if the closure happens on the same dates each year.
5. Select **Add date**.

Remove a date with the **×** on its chip.

### Delivery time

This is transit time after the order leaves you.

- **Minimum days** and **Maximum days** are required. Each can be from 0 to 60, and maximum must be at least the minimum.
- The delivery date range starts from the last processing date, then adds transit days.
- **Processing days** here means days the carrier moves the package.
- **Transit blocked dates** are carrier holidays. Those days are not counted as transit days. Add them the same way as processing blocked dates.

### Markets

Choose where the widget is visible:

- **All markets** — every Shopify market
- **Specific market** — search and select markets

The first time you choose specific markets, Shopify may ask you to approve market access for the app. Approve it to search your markets. If access is denied, switch back to **All markets** or approve the permission and try again.

### How the widget appears

The first time you edit a product widget, you must choose one of these before the widget can be saved:

| Option | Storefront behavior |
| --- | --- |
| **Enter pincode and show widget** | The customer enters a postal code first. If you deliver there, they see availability, the widget, and the dates. |
| **Show widget directly** | The widget appears on the product page with no postal-code step. |

You can change this later in **How should widget appear?**

### Pincode and delivery locations

This section appears when you choose **Enter pincode and show widget**.

1. Select a **Country**.
2. For that country, choose:
   - **Specific cities** — search and add cities. Each city includes every postal code in that city. The app looks up those codes for you.
   - **Entire country** — every city and every postal code in that country is included.
3. Repeat for more countries if you ship to more than one.

While codes are loading, the city shows a fetching message. If lookup fails, use **Retry** on that city, or remove it and add it again.

Customers who enter a covered code see that delivery is available and get the date estimate. A code you do not cover is treated as unavailable.

### Delivery requests

If a shopper asks for a postal code you have not set up, that request appears here and on Home under **Delivery requests**.

- **Accept** adds that place as an eligible delivery location so you can keep using your transit rules for it.
- **Decline** marks the request rejected. It does not add the location.

Pending requests are listed first. Accepted and rejected requests stay in the list so you can see what you already decided.

## Cart page widget — Conditions

A cart widget does not have its own processing and transit settings. A banner on the Conditions tab explains this: delivery logic comes from your product page widgets.

**Widget mode**:

| Mode | What the cart shows |
| --- | --- |
| **General** | One delivery date for the whole cart. The estimate uses the item with the longest delivery time. |
| **Per product** | A delivery line for each cart item, using that product’s live product-page widget. Items with no matching product widget are left out. |

Markets work the same way as on a product widget.

If the cart has no matching live product widget, the cart estimate cannot be calculated from product rules. Publish the product widget that should supply those rules first.

## Design

Open the **Design** tab.

### Choose a template

Four popular templates are shown first. Select one to apply it and open customization. **View more templates** opens the full set. **Customize selected template** reopens customization without changing the template.

Templates are starting points. After you pick one, edit the text, icons, colors, and spacing. The preview updates as you edit. Switch the preview between desktop and mobile.

| Template | Best for |
| --- | --- |
| Same Day | Rush and local delivery with a countdown |
| Cutoff | Ordering before today’s dispatch window |
| Made to Order | Custom goods and crafting progress |
| 3 Steps | Order, ship, and arrive in three panels |
| Tracking | Courier-style milestones |
| Doorstep | Pack-to-door home delivery |
| Standard | Everyday retail estimate with a timeline |
| Mobile | Vertical steps that stay clear on phones |
| Quick Dates | Compact date chips |
| Notice | A quiet delivery bar |
| Promise | A bold delivery promise |
| Status | A status-first strip |
| Brand | A playful track for lifestyle brands |
| Hero | A large arrival headline |
| Drop | A release or drop delivery date |
| Minimal | A single clean estimate |
| Checklist | A simple step list |
| Pickup | In-store or curbside pickup |
| Pre-Order | An upcoming ship window |
| Wholesale | A split layout for longer B2B timelines |
| Calendar | Three date cards |

### Customize the template

In the customization panel you can change:

- **Title and header** — show or hide the title, edit the title text, set title weight, and turn the header icon on or off
- **Description** — show or hide the message, and edit the wording
- **Date format** — long date (`Aug 21, 2026`), day/month/year (`21/08/2026`), or month/day/year (`08/21/2026`). Choose a separator (`/`, `-`, or `.`) and whether to include the year.
- **Icons and steps** — icon, optional color, label, which date the step shows, and text size for each step
- **Card background** — a solid color, or a gradient with start color, end color, and direction
- **Spacing and size** — padding, the gap under the description, and icon size
- **Alignment** — left, center, or right
- **Progress bar** — color and thickness of the line between steps
- **Typography** — theme font or Inter, Arial, Georgia, or Times New Roman; description size and color; accent color for dynamic text such as dates
- **Check delivery** — label, field, and button styling when the pincode step is on
- **Custom CSS** — optional rules for the live storefront only. The editor preview does not apply custom CSS. Save, publish, then check the store.

### Message tags

Type these tags in the title or description. The storefront replaces them with live values.

| Tag | Replaced with |
| --- | --- |
| `{counter}` | Time left until today’s processing cutoff |
| `{delivery_from}` | Earliest delivery date |
| `{delivery_to}` | Latest delivery date |
| `{delivery_date}` | The full delivery date range |
| `{processing_from}` | Earliest processing date |
| `{processing_to}` | Latest processing date |
| `{ordered_date}` | The order date |
| `{product_name}` | The product name |

Example:

> Order today within {counter}, you'll receive your package between {delivery_from} to {delivery_to}

## Placement

Open the **Placement** tab.

### Product widgets — which products

**Apply to** controls which products can show this widget:

| Choice | Result |
| --- | --- |
| **All products** | Every product |
| **Collections** | Products in the collections you select, and those collection pages |
| **Specific Products** | Only the products you select |

Search, tick the rows you want, and use the header checkbox to select or clear the visible list.

If you choose collections or specific products and then select none, the widget stays hidden. It does not fall back to all products.

### Product widgets — where on the page

| Position | Result |
| --- | --- |
| **Above Add to Cart** | Just above the Add to cart button |
| **Below Add to Cart** | Just below the Add to cart button |
| **Theme editor / custom** | You place the **Product delivery date** app block yourself in the theme editor |

### Cart widgets — where on the page

| Position | Result |
| --- | --- |
| **Default** | At the bottom of the cart, above the checkout button. Publishing adds this automatically. |
| **Custom** | You place the **Cart delivery date** app block yourself in the theme editor |

Cart widgets do not pick products on this tab. Which cart lines get an estimate depends on the cart **Widget mode** and on which product widgets are live.

## Where the widget sits on the page

Two things must be true before shoppers see a widget:

1. The widget status is **Publish** (or a schedule has reached its time).
2. **Estimated delivery embed** is saved as on in the theme editor.

Automatic positions (above or below Add to cart, or the default cart position) are applied when you publish.

For a custom position:

1. In the widget, set placement to **Theme editor / custom** (product) or **Custom** (cart).
2. On Home, select **Manage in Theme Editor**.
3. Open the product template or the cart template.
4. Add the app block:
   - **Product delivery date** on product or collection templates
   - **Cart delivery date** on the cart template
5. Drag the block to the exact spot you want.
6. Select **Save**.

In the theme editor’s design mode, an empty placeholder can say that estimated delivery will appear there for live widgets. On the real storefront, the published widget replaces that placeholder.

## When two widgets overlap

Only one live widget can cover the same placement.

- **All products** can have only one live product widget.
- The same **collection** cannot be live on two product widgets. Other collections can still use a different widget.
- The same **product** cannot be live on two product widgets. Other products can still use a different widget.
- A specific-product widget and a collection widget can both be live. On a product page, the specific-product widget is preferred.
- Only one **cart** widget can be live at a time.

If you publish or schedule a widget that overlaps one that is already live or scheduled, a dialog lists both. Choose which one should stay live. The other moves to draft.

The Placement tab also warns you while you are still editing, before you publish.

A product widget set to collections and a different product widget set to specific products do not block each other.

## How the delivery date is calculated

The estimate uses the widget timezone.

1. If the order is placed after the processing cutoff, or on a non-working or blocked processing day, processing starts on the next valid processing day.
2. Processing minimum and maximum days are counted only on processing days, skipping blocked processing dates.
3. Transit minimum and maximum days are then counted from the end of processing, only on transit days, skipping transit blocked dates.
4. The shopper sees the resulting earliest and latest dates in the date format you chose.

Days are capped at 60 so a widget cannot be configured with an unbounded range.

On a **General** cart widget, the cart shows one range based on the item with the longest delivery time. On **Per product**, each line uses its own product widget’s rules.

## Analytics

Home shows impressions for the last 30 days.

The app also records, for the last 30 days:

- **Impressions** — widget views
- **Clicks** — interactions with the widget
- **Add to cart** — adds after the widget was seen
- **Conversion rate** — orders after a widget interaction

These events do not store customer names, emails, phone numbers, or addresses.

Deleting a widget deletes its analytics with it.

## Checkout widgets

Checkout placement is no longer available. Shopify checkout app blocks of this kind are limited to Shopify Plus, and this app no longer creates checkout widgets.

If an older checkout widget is still in your list under **Checkout (legacy)**:

- Unpublish it or delete it.
- Keep using product and cart widgets. Those work on all plans.

A checkout widget, when it was used, showed one estimate from the products in the order and stayed hidden if no matching product-page widget was found. Do not rely on that behavior for new setups.

## Recommended setup

1. Turn on **Estimated delivery embed** and save the theme.
2. Create a **Product page** widget.
3. Set processing days, cutoff, timezone, and delivery days. Add holidays.
4. Choose **Show widget directly**, or **Enter pincode and show widget** and add the countries and cities you ship to.
5. Pick a template and write the message with `{counter}`, `{delivery_from}`, and `{delivery_to}` if you want a countdown and a date range.
6. Apply it to all products, or to the collections and products that should show it.
7. Place it below Add to cart, unless you want it above the button or in a custom theme position.
8. Set status to **Publish** and save.
9. Open a product on your store and confirm the date, the cutoff countdown, and the position.
10. If you want the same estimate in the cart, create a **Cart page** widget, choose **General** or **Per product**, publish it, and check the cart.

## Everyday tasks

**Change the message or colors.** Edit the widget, open **Design**, select **Customize selected template**, then save. If the widget is already published, saving publishes the update.

**Hide a widget without deleting it.** On Home, open **⋯** and select **Unpublish**. Or set status to **Draft** in the editor and save.

**Run a campaign later.** Set status to **Schedule**, pick a future date and time, and save. You can **Publish now** or **Cancel schedule** from the **⋯** menu before that time.

**Copy a widget.** Open **⋯** and select **Duplicate**. The copy is a draft named with “copy” at the end. Publish it only after you change placement so it does not overlap the original.

**Add a holiday.** Edit the product widget, open **Conditions**, and add a blocked date under order processing, transit, or both.

**Ship to a new city.** On a pincode widget, add the country and city under **Pincode / delivery**, or accept a delivery request from Home.

**Move the widget.** Either change **Above Add to Cart** / **Below Add to Cart**, or switch to custom placement and drag the app block in the theme editor. Save the theme after a custom move.

## If something looks wrong

**The widget is missing on the storefront.**

- Confirm the widget is **Published**, not draft.
- Confirm **App embed** is **Active**, and that you selected **Save** in the theme editor.
- For collections or specific products, confirm at least one collection or product is selected.
- For a pincode widget, enter a postal code you included. Other codes stay unavailable, and the full widget may stay hidden until a valid code is entered.
- For a cart widget, confirm a matching product widget is live. Per-product mode skips cart lines that have no product widget.
- For a custom position, confirm the **Product delivery date** or **Cart delivery date** block is still on the template and the theme is saved.
- Check **Markets**. A widget limited to specific markets stays hidden in other markets.

**The date looks a day late.**

- Check the processing cutoff and timezone. Orders after the cutoff start the next working day.
- Check processing days and blocked dates. Weekends and holidays are skipped when they are not selected as working days or when they are blocked.

**Two widgets, but only one shows.**

- Overlapping placements cannot both be live. Open the conflict dialog and keep the widget you want, or narrow **Apply to** so the products and collections do not overlap.
- If one widget is for specific products and another is for collections, the product-specific widget is the one shoppers see on those products.

**Save failed.**

- Select **Retry**.
- Fill required delivery minimum and maximum days. Maximum must be at least the minimum, and no value can be above 60.
- Choose how the product widget appears (pincode or direct) before the first save.
- For a schedule, pick a date and time in the future.

**Pincodes did not load for a city.**

- Use **Retry** on that city.
- If it still fails, remove the city and add it again.
- You can switch that country to **Entire country** if you deliver everywhere there.

**Custom CSS did not show in the editor preview.**

- That is expected. Custom CSS applies on the storefront after you save. Use **Preview** on the store to check it.

**A checkout widget is still listed.**

- Unpublish or delete it under **Checkout (legacy)**. Create a product or cart widget instead.
