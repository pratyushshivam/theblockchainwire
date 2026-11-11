// Public RSS/Atom feeds the wire reads. Only headline, link, time and a short summary are kept.
export const SOURCES = [
  { name: "CoinDesk", site: "https://www.coindesk.com", feed: "https://www.coindesk.com/arc/outboundfeeds/rss/" },
  { name: "Cointelegraph", site: "https://cointelegraph.com", feed: "https://cointelegraph.com/rss" },
  { name: "Decrypt", site: "https://decrypt.co", feed: "https://decrypt.co/feed" },
  { name: "The Block", site: "https://www.theblock.co", feed: "https://www.theblock.co/rss.xml" },
  { name: "Blockworks", site: "https://blockworks.co", feed: "https://blockworks.co/feed" },
  { name: "Bitcoin Magazine", site: "https://bitcoinmagazine.com", feed: "https://bitcoinmagazine.com/feed" },
  { name: "The Defiant", site: "https://thedefiant.io", feed: "https://thedefiant.io/feed" },
  { name: "DL News", site: "https://www.dlnews.com", feed: "https://www.dlnews.com/arc/outboundfeeds/rss/" },
  { name: "CryptoSlate", site: "https://cryptoslate.com", feed: "https://cryptoslate.com/feed/" },
  { name: "Protos", site: "https://protos.com", feed: "https://protos.com/feed/" },
  { name: "Ledger Insights", site: "https://www.ledgerinsights.com", feed: "https://www.ledgerinsights.com/feed/" },
  { name: "Unchained", site: "https://unchainedcrypto.com", feed: "https://unchainedcrypto.com/feed/" },
  { name: "Ethereum Foundation", site: "https://blog.ethereum.org", feed: "https://blog.ethereum.org/feed.xml" },
];

// First match wins, top to bottom.
export const SECTIONS = [
  { id: "regulation", name: "Regulation", re: /\b(sec|cftc|mica|regulat\w*|lawsuit|court|judge|congress|senate|bill|law|ban(s|ned)?|policy|sanction\w*|enforcement|legal|license[sd]?|compliance)\b/i },
  { id: "enterprise", name: "Enterprise", re: /\b(enterprise|banks?|banking|tokeni[sz]\w*|cbdc|supply chain|institution\w*|blackrock|jpmorgan|swift|settlement|treasur\w+|real[- ]world assets?|rwa|visa|mastercard|custody|central bank)\b/i },
  { id: "bitcoin", name: "Bitcoin", re: /\b(bitcoin|btc|lightning|miners?|mining|halving|satoshi|ordinals)\b/i },
  { id: "ethereum", name: "Ethereum", re: /\b(ethereum|ether|eth|vitalik|layer[- ]?2|l2|rollups?|arbitrum|optimism|staking|validators?)\b/i },
  { id: "defi", name: "DeFi", re: /\b(defi|dex|lending|stablecoins?|yield|uniswap|aave|liquidity|usdt|usdc|tether|circle|protocol)\b/i },
  { id: "markets", name: "Markets", re: /\b(price|etfs?|rally|rallies|markets?|traders?|funding|raises?|raised|valuation|ipo|sell[- ]?off|surges?|slump\w*|all[- ]time high)\b/i },
  { id: "industry", name: "Industry", re: /./ },
];
