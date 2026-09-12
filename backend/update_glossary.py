import json
from pathlib import Path

NEW_TERMS = [
    {
        "term": "SIP (Systematic Investment Plan)",
        "slug": "sip",
        "eli5": "A Systematic Investment Plan (SIP) is a disciplined way to invest a fixed amount of money regularly (e.g., monthly) into mutual funds or stocks, rather than investing a huge lump sum all at once.",
        "analogy": "Like a gym routine for your savings — instead of trying to bench-press 300 lbs on day one, you build financial muscle bit by bit every single month.",
        "keywords": ["sip", "systematic investment plan", "monthly investment", "dca", "recurring investment", "auto invest", "periodic plan"]
    },
    {
        "term": "DCA (Dollar-Cost Averaging)",
        "slug": "dollar-cost-averaging",
        "eli5": "Dollar-Cost Averaging means investing the same fixed amount of money on a set schedule regardless of market prices. You buy more shares when prices are cheap and fewer when prices are high.",
        "analogy": "Like buying groceries every Sunday — some weeks milk is on sale, some weeks it's pricier, but over the year your average cost evens out pleasantly.",
        "keywords": ["dca", "dollar cost averaging", "periodic investing", "sip", "regular investing", "timing the market"]
    },
    {
        "term": "Mutual Fund",
        "slug": "mutual-fund",
        "eli5": "A mutual fund pools together money from thousands of everyday investors to buy a professionally managed bundle of stocks, bonds, and other assets.",
        "analogy": "A potluck dinner — instead of cooking a 10-course banquet by yourself, everyone contributes, and everybody enjoys a diverse, hearty feast.",
        "keywords": ["mutual fund", "amc", "nav", "fund manager", "pooled investment", "units", "active fund"]
    },
    {
        "term": "Compound Interest",
        "slug": "compound-interest",
        "eli5": "Compound interest is earning interest on your original deposit PLUS on all the interest you previously accumulated. Over decades, it turns modest savings into immense wealth.",
        "analogy": "A snowball rolling down a steep hill — it starts the size of a golf ball, but gathers more snow with every turn until it's an unstoppable boulder.",
        "keywords": ["compounding", "compound interest", "exponential growth", "rule of 72", "wealth building"]
    },
    {
        "term": "NAV (Net Asset Value)",
        "slug": "net-asset-value",
        "eli5": "Net Asset Value (NAV) is the market value of one unit of a mutual fund or ETF, calculated daily by subtracting total liabilities from total assets and dividing by outstanding units.",
        "analogy": "Counting all the cash in a piggy bank and dividing it by the number of coins inside to find the exact value of each coin slice.",
        "keywords": ["nav", "net asset value", "fund unit price", "book value", "per unit value"]
    },
    {
        "term": "IPO (Initial Public Offering)",
        "slug": "ipo",
        "eli5": "An IPO is when a privately owned company sells shares of stock to the general public on an open stock exchange for the very first time.",
        "analogy": "A popular underground indie bakery opening its doors to nationwide supermarket shelves for everyone to buy.",
        "keywords": ["ipo", "initial public offering", "going public", "listing", "stock debut", "flotation"]
    },
    {
        "term": "Bull Market",
        "slug": "bull-market",
        "eli5": "A bull market is a sustained period where asset prices are trending upward and consumer/investor confidence is high, usually backed by economic expansion.",
        "analogy": "A charging bull thrusting its horns upward into the sky — full of momentum, power, and climbing higher.",
        "keywords": ["bull market", "bullish", "rally", "uptrend", "market surge", "green days"]
    },
    {
        "term": "Bear Market",
        "slug": "bear-market",
        "eli5": "A bear market is a prolonged downturn where asset prices fall by 20% or more from recent peaks, accompanied by cautious sentiment and economic slowdown.",
        "analogy": "A bear swiping its paws down to hibernate for the winter — hunkering down while the storm passes.",
        "keywords": ["bear market", "bearish", "downtrend", "crash", "market dip", "red days"]
    },
    {
        "term": "ROI (Return on Investment)",
        "slug": "roi",
        "eli5": "Return on Investment (ROI) measures how much money you gained or lost relative to what you originally invested, expressed as a percentage.",
        "analogy": "Planting 1 apple seed and harvesting 5 juicy apples from the tree — those extra 4 apples represent your return on the seed.",
        "keywords": ["roi", "return on investment", "gain", "profitability", "percentage return", "yield"]
    },
    {
        "term": "Inflation",
        "slug": "inflation",
        "eli5": "Inflation is the gradual rise in prices across the economy, which decreases the purchasing power of your money so each dollar buys fewer goods over time.",
        "analogy": "A bag of potato chips that stays $2, but every year the manufacturer puts 3 fewer chips inside the bag.",
        "keywords": ["inflation", "cpi", "purchasing power", "cost of living", "price index"]
    },
    {
        "term": "Liquidity",
        "slug": "liquidity",
        "eli5": "Liquidity measures how quickly and smoothly you can convert an asset into spendable cash without having to accept a heavy discount on its value.",
        "analogy": "Cash in your checking account is like liquid tap water available immediately; a house is like a block of ice you must melt for months to drink.",
        "keywords": ["liquidity", "liquid assets", "cash conversion", "market depth", "order book"]
    },
    {
        "term": "FOMO (Fear Of Missing Out)",
        "slug": "fomo",
        "eli5": "FOMO is the psychological urge to buy a skyrocketing asset because you see others boasting about massive profits and dread being left behind.",
        "analogy": "Seeing a huge crowd run screaming into a store and joining the stampede without knowing what is even on sale.",
        "keywords": ["fomo", "hype", "impulse buying", "panic buying", "fear of missing out", "meme stock"]
    },
    {
        "term": "HODL",
        "slug": "hodl",
        "eli5": "HODL is investor slang for refusing to sell your assets during sharp market crashes, committing to hold them long-term through thick and thin.",
        "analogy": "Staying securely strapped into your rollercoaster seat during a vertical drop rather than trying to jump off mid-loop.",
        "keywords": ["hodl", "hold on for dear life", "diamond hands", "long term hold", "crypto slang"]
    },
    {
        "term": "Stop-Loss",
        "slug": "stop-loss",
        "eli5": "A stop-loss is an automated order placed with your broker to sell an investment if its price drops to a predetermined level, capping your maximum loss.",
        "analogy": "An emergency brake on a runaway train — if the train starts rolling backward down a cliff, the brakes lock before you crash.",
        "keywords": ["stop loss", "stop order", "downside protection", "risk management", "exit plan"]
    },
    {
        "term": "APY (Annual Percentage Yield)",
        "slug": "apy",
        "eli5": "Annual Percentage Yield (APY) is the real yearly rate of return earned on an investment or savings account, factoring in the boost from compounding interest.",
        "analogy": "The true speed reading of how quickly your bank balance naturally multiplies over a full 12-month calendar year.",
        "keywords": ["apy", "annual percentage yield", "interest yield", "savings rate", "apr", "effective interest"]
    }
]

def update_file(path_str):
    p = Path(path_str)
    if not p.exists():
        print(f"File not found: {p}")
        return
    with open(p, "r", encoding="utf-8-sig") as f:
        terms = json.load(f)

    existing_slugs = {t.get("slug", "").lower() for t in terms}
    existing_terms = {t.get("term", "").lower() for t in terms}

    added = 0
    for nt in NEW_TERMS:
        if nt["slug"].lower() not in existing_slugs and nt["term"].lower() not in existing_terms:
            terms.append(nt)
            added += 1

    with open(p, "w", encoding="utf-8") as f:
        json.dump(terms, f, indent=2, ensure_ascii=False)
    print(f"Updated {p}: Added {added} new terms (Total: {len(terms)})")

if __name__ == "__main__":
    update_file("backend/data/glossary.json")
    update_file("frontend/src/data/glossary.json")
